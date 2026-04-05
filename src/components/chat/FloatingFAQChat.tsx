'use client';

import { useState, useRef, useEffect } from 'react';
import { faqItems, WHATSAPP_LINK, WHATSAPP_NUMBER, type FAQItem } from '@/lib/faq-data';
import { trackGA4 } from '@/lib/analytics';

interface FloatingFAQChatProps {
  webinarId?: string;
  /** Which page the chatbot is on — stored with submitted inquiries */
  pageSource: 'live' | 'checkout' | 'end';
  /** If set, chatbot stays hidden until currentTime >= this value (seconds).
   *  Used on live page to sync with first CTA appearance. */
  showAfterSec?: number;
  /** Current video time — required when showAfterSec is set */
  currentTime?: number;
}

type View = 'faq' | 'ask';

export default function FloatingFAQChat({ webinarId, pageSource, showAfterSec, currentTime }: FloatingFAQChatProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('faq');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  // Delay-based visibility: hide until video reaches showAfterSec
  const hasActivated = useRef(false);
  const [visible, setVisible] = useState(showAfterSec == null);

  useEffect(() => {
    if (hasActivated.current || showAfterSec == null) return;
    if ((currentTime ?? 0) >= showAfterSec) {
      setVisible(true);
      hasActivated.current = true;
    }
  }, [currentTime, showAfterSec]);

  // Tooltip hint — show 3s after becoming visible, stays until user clicks or opens panel
  const [showHint, setShowHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  useEffect(() => {
    if (hintDismissed || !visible) return;
    const showTimer = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(showTimer);
  }, [hintDismissed, visible]);

  // Hide hint when panel opens
  useEffect(() => {
    if (open && showHint) {
      setShowHint(false);
      setHintDismissed(true);
    }
  }, [open, showHint]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Don't render anything until activation time
  if (!visible) return null;

  const toggleFaq = (id: string) => {
    const willExpand = expandedId !== id;
    setExpandedId(willExpand ? id : null);
    if (willExpand) {
      const item = faqItems.find(f => f.id === id);
      trackGA4('c_chatbot_faq_click', { page_source: pageSource, faq_id: id, faq_question: item?.question || id });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!contactEmail.trim() || !question.trim()) {
      setFormError('请填写邮箱和问题');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinarId,
          name: name.trim(),
          email: contactEmail.trim(),
          question: question.trim(),
          pageSource,
        }),
      });

      if (!res.ok) throw new Error('Submit failed');
      setSubmitted(true);
      trackGA4('c_chatbot_inquiry_submit', { page_source: pageSource });
    } catch {
      setFormError('提交失败，请稍后重试或直接通过 WhatsApp 联系我们');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setContactEmail('');
    setQuestion('');
    setSubmitted(false);
    setFormError('');
    setView('faq');
  };

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-[340px] max-h-[520px] bg-white rounded-lg border border-[#E8E5DE] shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="bg-[#FAFAF7] border-b border-[#E8E5DE] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#B8953F] flex items-center justify-center text-white text-xs">
                ?
              </span>
              <span className="font-semibold text-sm text-neutral-900">课程小帮手</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="关闭"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-[#E8E5DE] shrink-0">
            <button
              onClick={() => setView('faq')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                view === 'faq'
                  ? 'text-[#B8953F] border-b-2 border-[#B8953F]'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              常见问题
            </button>
            <button
              onClick={() => setView('ask')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                view === 'ask'
                  ? 'text-[#B8953F] border-b-2 border-[#B8953F]'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              提交问题
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {view === 'faq' ? (
              <FAQList
                items={faqItems}
                expandedId={expandedId}
                onToggle={toggleFaq}
              />
            ) : (
              <AskForm
                name={name}
                contactEmail={contactEmail}
                question={question}
                onNameChange={setName}
                onContactEmailChange={setContactEmail}
                onQuestionChange={setQuestion}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitted={submitted}
                formError={formError}
                onReset={resetForm}
              />
            )}
          </div>

          {/* Footer — contact options */}
          <div className="border-t border-[#E8E5DE] px-4 py-3 bg-[#FAFAF7] shrink-0 space-y-2">
            <p className="text-xs text-neutral-400 text-center">或直接联系客服</p>
            <div className="flex gap-2">
              <button
                onClick={() => setView('ask')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border border-[#E8E5DE] bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Email 提问
              </button>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackGA4('c_chatbot_whatsapp_click', { page_source: pageSource })}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-medium transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hint tooltip */}
      {showHint && !open && (
        <button
          onClick={() => { setShowHint(false); setHintDismissed(true); setOpen(true); trackGA4('c_chatbot_open', { page_source: pageSource }); }}
          className="bg-white border border-[#E8E5DE] rounded-lg shadow-lg px-4 py-2.5 text-sm text-neutral-800 animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer hover:bg-[#FAFAF7] transition-colors flex items-center gap-2"
        >
          <span>有课程问题？点我咨询</span>
          <span className="text-[#B8953F]">&#10132;</span>
        </button>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          if (willOpen) trackGA4('c_chatbot_open', { page_source: pageSource });
        }}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? 'bg-neutral-700 hover:bg-neutral-600 rotate-0'
            : 'bg-[#B8953F] hover:bg-[#A6842F] hover:scale-105'
        }`}
        aria-label={open ? '关闭小帮手' : '打开课程小帮手'}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

/* ---- Sub-components ---- */

function FAQList({
  items,
  expandedId,
  onToggle,
}: {
  items: FAQItem[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-[#E8E5DE]">
      {items.map((item) => (
        <div key={item.id}>
          <button
            onClick={() => onToggle(item.id)}
            className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-[#FAFAF7] transition-colors"
          >
            <span className="text-sm text-neutral-800">{item.question}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 text-neutral-400 transition-transform duration-200 ${
                expandedId === item.id ? 'rotate-180' : ''
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedId === item.id && (
            <div className="px-4 pb-3 text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AskForm({
  name,
  contactEmail,
  question,
  onNameChange,
  onContactEmailChange,
  onQuestionChange,
  onSubmit,
  submitting,
  submitted,
  formError,
  onReset,
}: {
  name: string;
  contactEmail: string;
  question: string;
  onNameChange: (v: string) => void;
  onContactEmailChange: (v: string) => void;
  onQuestionChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  submitted: boolean;
  formError: string;
  onReset: () => void;
}) {
  if (submitted) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#B8953F]/10 flex items-center justify-center mx-auto mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm font-medium text-neutral-900 mb-1">已收到你的问题！</p>
        <p className="text-xs text-neutral-500 mb-4">
          客服会尽快通过邮件回复你
        </p>
        <button
          onClick={onReset}
          className="text-xs text-[#B8953F] hover:text-[#A6842F] font-medium transition-colors"
        >
          返回常见问题
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="px-4 py-4 space-y-3">
      <p className="text-xs text-neutral-500">
        留下你的邮箱和问题，客服会尽快回复你！
      </p>

      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="你的称呼（选填）"
        className="w-full px-3 py-2 border border-[#E8E5DE] rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#B8953F] focus:ring-1 focus:ring-[#B8953F]"
      />

      <input
        type="email"
        value={contactEmail}
        onChange={(e) => onContactEmailChange(e.target.value)}
        placeholder="你的邮箱 *"
        required
        className="w-full px-3 py-2 border border-[#E8E5DE] rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#B8953F] focus:ring-1 focus:ring-[#B8953F]"
      />

      <textarea
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        placeholder="你的问题 *"
        required
        rows={3}
        className="w-full px-3 py-2 border border-[#E8E5DE] rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#B8953F] focus:ring-1 focus:ring-[#B8953F] resize-none"
      />

      {formError && (
        <p className="text-xs text-red-500">{formError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 rounded-md bg-[#B8953F] hover:bg-[#A6842F] disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {submitting ? '提交中...' : '提交问题'}
      </button>
    </form>
  );
}
