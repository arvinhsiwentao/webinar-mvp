'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackGA4 } from '@/lib/analytics';
import { resolveAngle, US_STOCK_PRODUCT_ID } from '@/lib/usStockCourse';

type PageStatus = 'loading' | 'fulfilled' | 'processing' | 'timeout' | 'error';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;
const SUPPORT_EMAIL = 'cmoney_overseas@cmoney.com.tw';
const WHATSAPP_URL = 'https://wa.me/886917642752?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E5%92%A8%E8%AF%A2%E8%AF%BE%E7%A8%8B%E7%9B%B8%E5%85%B3%E9%97%AE%E9%A2%98';

function ReturnInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const angle = resolveAngle(searchParams.get('angle'));
  const purchaseTracked = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const [status, setStatus] = useState<PageStatus>('loading');
  const [customerEmail, setCustomerEmail] = useState('');
  const [activationCodes, setActivationCodes] = useState<{ productId: string; productName: string; code: string }[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    function stopPolling() {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    async function poll() {
      try {
        const res = await fetch(`/api/checkout/session-status?session_id=${encodeURIComponent(sessionId!)}`);
        if (!res.ok) throw new Error('Failed to check status');
        const data = await res.json();

        if (data.status === 'complete') {
          // Fire the dedicated $1-funnel purchase conversion once.
          // NOTE: do NOT fire the shared `purchase` event — that would pollute the
          // webinar funnel's Google Ads Smart Bidding via the shared GA4 property.
          if (!purchaseTracked.current) {
            purchaseTracked.current = true;
            setCustomerEmail(data.customerEmail || '');
            // Real $1 amount — never fall back to the $599 webinar default.
            const purchaseValue = typeof data.amountTotal === 'number' ? data.amountTotal / 100 : 1;
            const purchaseCurrency = (data.currency || 'usd').toUpperCase();
            const purchaseItems = Array.isArray(data.items) && data.items.length > 0
              ? data.items
              : [{
                  item_id: US_STOCK_PRODUCT_ID,
                  item_name: data.productName || '$1 美股入门套餐',
                  price: purchaseValue,
                  quantity: 1,
                }];
            trackGA4('c_us_stock_course_purchase', {
              transaction_id: sessionId || `session_${Date.now()}`,
              value: purchaseValue,
              currency: purchaseCurrency,
              items: purchaseItems,
              angle,
            });
          }

          if (data.orderStatus === 'fulfilled' && data.activationCode) {
            setActivationCodes(
              Array.isArray(data.activationCodes) && data.activationCodes.length > 0
                ? data.activationCodes
                : [{ productId: '', productName: '商品启用序号', code: data.activationCode }]
            );
            setCustomerEmail(data.customerEmail || '');
            setStatus('fulfilled');
            stopPolling();
            return;
          }

          setStatus('processing');
          if (Date.now() - pollStartRef.current >= POLL_TIMEOUT_MS) {
            setStatus('timeout');
            stopPolling();
          }
        } else {
          setStatus('error');
          stopPolling();
        }
      } catch {
        setStatus('error');
        stopPolling();
      }
    }

    pollStartRef.current = Date.now();
    poll();
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => stopPolling();
  }, [sessionId, angle]);

  if (status === 'loading' || status === 'processing') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">{status === 'loading' ? '确认支付中…' : '订单处理中，请稍候…'}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">结帐页面已过期</h1>
          <p className="text-neutral-500 mb-6">请返回重新结帐</p>
          <button
            onClick={() => window.history.back()}
            className="bg-[#B8953F] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#A6842F] transition-colors"
          >
            重新结帐
          </button>
        </div>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg w-full">
          <div className="w-16 h-16 rounded-full bg-[#B8953F]/12 border border-[#B8953F]/30 flex items-center justify-center mx-auto mb-8">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">订单正在处理中</h1>
          <p className="text-neutral-600 leading-relaxed mb-2">你的商品启用序号将通过邮件发送至</p>
          <p className="font-medium text-[#B8953F] mb-6">{customerEmail}</p>
          <p className="text-neutral-500 text-sm mb-8">如 10 分钟内未收到，请联系客服</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-block bg-[#B8953F] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#A6842F] transition-colors">
            联系客服：{SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    );
  }

  // --- Fulfilled ---
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-700">
      <header className="border-b border-[#E8E5DE] bg-white">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Stepper />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-8 md:py-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4 mt-2">
          <span className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#B8953F] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">购买成功</h1>
        </div>

        {/* Key reminders — enlarged, must-read (2 things) */}
        <div className="bg-[#FBF7EC] border border-[#E8D9B0] rounded-xl p-5 md:p-6 text-left mb-6">
          <p className="text-base md:text-lg font-bold text-[#8A6D24] mb-4 text-center">⚠️ 请务必完成以下 2 件事</p>
          <ul className="space-y-3 text-base md:text-lg text-neutral-700 leading-relaxed">
            <li>📸 <span className="font-bold text-neutral-900">截图保存或点击复制</span>，将两组序号保存于您方便管理的地方，避免日后遗失</li>
            <li>📧 确认信已寄到 <span className="font-semibold text-[#8A6D24] break-all">{customerEmail}</span>，<span className="font-bold text-neutral-900">没收到请检查垃圾邮件 / 促销邮件</span></li>
          </ul>
        </div>

        {/* Activation codes — labeled boxes + a single copy-all button below */}
        <div className="my-6 space-y-3">
          {activationCodes.map((item, idx) => (
            <div key={idx} className="border-2 border-[#B8953F] rounded-xl p-5 text-center bg-[#B8953F]/[0.05]">
              <p className="text-base md:text-lg text-[#B8953F] mb-2 font-semibold">{item.productName || '商品启用序号'}</p>
              <p className="text-2xl font-bold tracking-[3px] text-neutral-900 break-all">{item.code}</p>
            </div>
          ))}
          <button
            onClick={() => {
              const text = activationCodes.map(c => `${c.productName || '商品启用序号'}：${c.code}`).join('\n');
              navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg text-sm md:text-base font-semibold transition-colors bg-[#B8953F] text-white hover:bg-[#A6842F]"
          >
            {copied ? '✓ 已复制两组序号' : '一键复制两组序号'}
          </button>
        </div>

        {/* How to activate — standalone block, links to the tutorial page */}
        <div className="bg-white rounded-xl border border-[#E8E5DE] shadow-sm p-6 md:p-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-neutral-900 mb-5">如何启用序号？</h2>
          <a
            href="/us-stock-course/tutorial"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#B8953F] text-white text-lg font-semibold hover:bg-[#A6842F] transition-colors"
          >
            点此看启用图文教学 →
          </a>
          <p className="text-sm text-[#B8953F] mt-5">※ 每个序号仅限单次使用，启用后即失效，请勿分享给他人</p>
        </div>

        {/* Support */}
        <div className="bg-white rounded-xl border border-[#E8E5DE] shadow-sm p-6 md:p-7 text-center mt-4">
          <p className="text-base md:text-lg text-neutral-600 mb-4">※ 如遇任何问题，欢迎联系客服</p>
          <div className="flex flex-col items-center gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#25D366] hover:bg-[#20BD5A] text-white text-base font-medium transition-colors">
              WhatsApp 咨询客服
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#B8953F] underline underline-offset-2 text-base">{SUPPORT_EMAIL}</a>
          </div>
          <p className="text-sm text-neutral-400 mt-4">服务时间：北京时间周一到周五 8:30 ~ 17:30</p>
        </div>
      </main>
    </div>
  );
}

// Light-theme progress stepper for the purchase-complete page (matches the
// checkout page's stepper). All three steps are reached; 购买完成 is current.
function Stepper() {
  const steps = [
    { label: '课程页', state: 'done' as const },
    { label: '付款', state: 'done' as const },
    { label: '购买完成', state: 'current' as const },
  ];
  return (
    <div className="flex-1 flex items-center justify-center">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                s.state === 'current'
                  ? 'bg-[#B8953F] text-white shadow-[0_0_0_3px_rgba(184,149,63,0.15)]'
                  : 'bg-[#B8953F]/15 text-[#B8953F] border border-[#B8953F]/40'
              }`}
            >
              ✓
            </span>
            <span
              className={`text-xs md:text-sm whitespace-nowrap ${
                s.state === 'current' ? 'font-bold text-[#B8953F]' : 'text-neutral-600'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && <span className="mx-2 md:mx-3 h-px w-4 md:w-8 bg-[#B8953F]/40" />}
        </div>
      ))}
    </div>
  );
}

export default function UsStockCourseReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReturnInner />
    </Suspense>
  );
}
