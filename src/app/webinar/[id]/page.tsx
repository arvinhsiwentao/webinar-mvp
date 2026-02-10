'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Webinar, Session } from '@/lib/types';
import { formatDateTime, validateEmail } from '@/lib/utils';
import CountdownTimer from '@/components/countdown/CountdownTimer';

export default function LandingPage() {
  const params = useParams();
  const router = useRouter();
  const webinarId = params.id as string;

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${webinarId}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);
        if (data.webinar.sessions.length > 0) {
          setSelectedSession(data.webinar.sessions[0].id);
        }
      } catch {
        setError('找不到此研討會');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  }, [webinarId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('請輸入姓名');
      return;
    }
    if (!validateEmail(email)) {
      setFormError('請輸入有效的 Email');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinarId,
          sessionId: selectedSession,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push(`/webinar/${webinarId}/confirm?session=${selectedSession}&name=${encodeURIComponent(name)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '報名失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !webinar) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">😕 {error || '找不到研討會'}</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-400 hover:text-blue-300"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const selectedSessionData = webinar.sessions.find((s: Session) => s.id === selectedSession);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      
      {/* ========== 區塊 1：限時公開 + 觀看講座 CTA ========== */}
      <section className="relative py-12 md:py-20 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/20 to-transparent blur-3xl" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* 限時公開 Badge */}
          <div className="inline-flex items-center gap-2 bg-red-600/90 text-white px-5 py-2.5 rounded-full mb-6 shadow-lg shadow-red-600/30">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="font-bold tracking-wide">🔥 限時公開</span>
          </div>

          {/* 主標題 */}
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
            {webinar.title}
          </h1>
          
          {/* 副標題 */}
          {webinar.subtitle && (
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              {webinar.subtitle}
            </p>
          )}

          {/* 倒數計時 */}
          {selectedSessionData && (
            <div className="mb-8">
              <p className="text-gray-400 text-sm mb-3">🕐 距離直播開始</p>
              <div className="inline-block">
                <CountdownTimer 
                  targetTime={selectedSessionData.startTime}
                  size="lg"
                  showDays={true}
                  showLabels={true}
                />
              </div>
            </div>
          )}

          {/* 觀看講座 CTA Button */}
          <a 
            href="#register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xl py-4 px-10 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-blue-600/30"
          >
            <span>📺 立即預約觀看</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>

          {/* 已報名人數 (社會證明) */}
          <p className="text-gray-500 text-sm mt-4">
            ✅ 已有 <span className="text-blue-400 font-semibold">1,247</span> 人報名
          </p>
        </div>
      </section>

      {/* ========== 區塊 2：人物介紹 ========== */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
            👨‍🏫 講者介紹
          </h2>
          
          <div className="bg-gray-800/50 rounded-2xl p-8 md:p-10 border border-gray-700/50">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Speaker Image */}
              {webinar.speakerImage && (
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-50" />
                    <Image
                      src={webinar.speakerImage}
                      alt={webinar.speakerName}
                      width={150}
                      height={150}
                      className="relative rounded-full object-cover border-4 border-gray-700"
                    />
                  </div>
                </div>
              )}
              
              {/* Speaker Info */}
              <div className="text-center md:text-left flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">{webinar.speakerName}</h3>
                {webinar.speakerTitle && (
                  <p className="text-blue-400 font-medium mb-4">{webinar.speakerTitle}</p>
                )}
                {webinar.speakerBio && (
                  <p className="text-gray-400 leading-relaxed">{webinar.speakerBio}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 區塊 3：直播席次 ========== */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
            📅 選擇直播場次
          </h2>
          
          <div className="grid gap-4 max-w-2xl mx-auto">
            {webinar.sessions.map((session: Session, idx: number) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className={`
                  relative p-5 rounded-xl border-2 transition-all text-left
                  ${selectedSession === session.id 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Radio indicator */}
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${selectedSession === session.id ? 'border-blue-500' : 'border-gray-600'}
                    `}>
                      {selectedSession === session.id && (
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                      )}
                    </div>
                    
                    <div>
                      <div className="text-white font-semibold">
                        場次 {idx + 1}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {formatDateTime(session.startTime)}
                      </div>
                    </div>
                  </div>
                  
                  {idx === 0 && (
                    <span className="bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1 rounded-full">
                      最近場次
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 區塊 4：講座中你會獲得什麼 ========== */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
            🎯 講座中你會獲得什麼
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {webinar.highlights.map((highlight: string, idx: number) => (
              <div 
                key={idx}
                className="flex items-start gap-4 bg-gray-800/30 rounded-xl p-5 border border-gray-700/50"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-300 leading-relaxed">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 區塊 5：最終 Call to Action (報名表單) ========== */}
      <section id="register" className="py-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-700">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <span>🎁</span>
                <span>免費報名</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                立即預約席位
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                填寫以下資料，我們會在開播前通知你
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Session Select (if multiple) */}
              {webinar.sessions.length > 1 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">選擇場次</label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {webinar.sessions.map((session: Session, idx: number) => (
                      <option key={session.id} value={session.id}>
                        場次 {idx + 1}：{formatDateTime(session.startTime)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">姓名 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="請輸入你的姓名"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">手機 (選填)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
                />
              </div>

              {/* Error */}
              {formError && (
                <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    報名中...
                  </span>
                ) : (
                  '🚀 立即報名（免費）'
                )}
              </button>
            </form>

            <p className="text-center text-gray-500 text-xs mt-4">
              🔒 你的資料安全且不會被分享
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2026 Webinar MVP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
