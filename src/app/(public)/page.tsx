'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Webinar, Session } from '@/lib/types';
import { formatDateTime, validateEmail } from '@/lib/utils';
import CountdownTimer from '@/components/countdown/CountdownTimer';

// Mike是麥克 專屬 Landing Page
// 這是一個 Single-purpose site，預設顯示 Mike 的 webinar
const DEFAULT_WEBINAR_ID = '1';

export default function HomePage() {
  const router = useRouter();

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedSession, setSelectedSession] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${DEFAULT_WEBINAR_ID}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);
        if (data.webinar.sessions.length > 0) {
          // 選擇最近的未過期場次，或第一個場次
          const now = new Date();
          const futureSession = data.webinar.sessions.find(
            (s: Session) => new Date(s.startTime) > now
          );
          setSelectedSession(futureSession?.id || data.webinar.sessions[0].id);
        }
      } catch {
        setError('找不到此研討會');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  }, []);

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
          webinarId: DEFAULT_WEBINAR_ID,
          sessionId: selectedSession,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      router.push(`/webinar/${DEFAULT_WEBINAR_ID}/confirm?session=${selectedSession}&name=${encodeURIComponent(name)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '報名失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border border-neutral-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !webinar) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">{error || '找不到研討會'}</p>
          <a href="/admin" className="text-neutral-400 hover:text-white">
            前往後台設定
          </a>
        </div>
      </div>
    );
  }

  const selectedSessionData = webinar.sessions.find((s: Session) => s.id === selectedSession);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">

      {/* ========== Section 1: HERO — Urgency-First ========== */}
      <section className="min-h-screen relative overflow-hidden flex items-center">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,169,98,0.05),transparent_60%)]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 text-center py-20">
          {/* Urgency Badge */}
          <div className="inline-flex items-center gap-2 border border-[#C9A962]/30 bg-[#C9A962]/5 px-5 py-2 mb-10">
            <span className="w-2 h-2 rounded-full bg-[#C9A962] animate-pulse" />
            <span className="text-sm text-[#C9A962]">免費名額有限 — 額滿即止</span>
          </div>

          {/* Main Headline — Pain Point */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light leading-[1.15] tracking-tight mb-6">
            <span className="block text-neutral-400 text-2xl md:text-3xl font-normal mb-4">你還在用時間換薪水？</span>
            <span className="block font-semibold">
              90 分鐘揭露
              <span className="bg-gradient-to-r from-[#C9A962] to-[#C9A962]/0 bg-[length:100%_2px] bg-no-repeat bg-bottom pb-2">
                財務自由完整路徑
              </span>
            </span>
          </h1>

          {/* Subheadline — Specific Promise */}
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed mb-8">
            43 歲達成財務自由的美股投資人 Mike，將毫無保留地分享他從負債到自由的完整策略與持倉清單。
          </p>

          {/* Countdown Timer */}
          {selectedSessionData && (
            <div className="flex justify-center mb-10">
              <div className="text-[#C9A962]/80">
                <CountdownTimer
                  targetTime={selectedSessionData.startTime}
                  size="sm"
                  showDays={true}
                  showLabels={true}
                />
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <a
            href="#register"
            className="group inline-flex items-center gap-3 bg-[#C9A962] text-neutral-950 px-10 py-4 text-base font-semibold tracking-wide hover:bg-[#D4BA7A] hover:shadow-[0_0_40px_rgba(201,169,98,0.3)] transition-all"
          >
            立即預約免費席位
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>

          {/* Social Proof Strip */}
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 mt-12 text-sm text-neutral-500">
            <span>20 萬+ YouTube 訂閱</span>
            <span className="hidden md:inline text-neutral-700">|</span>
            <span>3,000+ 付費會員</span>
            <span className="hidden md:inline text-neutral-700">|</span>
            <span>4 年達成財務自由</span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-500">
          <span className="text-xs tracking-widest">SCROLL</span>
          <div className="w-px h-12 bg-gradient-to-b from-neutral-500 to-transparent" />
        </div>
      </section>

      {/* ========== Section 2: PROBLEM — Pain Amplification ========== */}
      <section className="py-24 md:py-32 px-6 lg:px-12 bg-neutral-900/50">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.2em] text-neutral-500 uppercase mb-12 text-center">聽起來熟悉嗎？</p>

          <div className="space-y-6">
            {[
              '每天辛苦工作，存款增加的速度永遠追不上物價',
              '想投資美股，但資訊太多、太雜，不知從何下手',
              '看別人靠被動收入過自己想要的生活，自己卻不知道怎麼開始',
              '擔心選錯標的，賠掉辛苦存下來的錢',
            ].map((pain, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-5 border border-neutral-800/50 bg-neutral-900/30 hover:border-[#C9A962]/30 transition-colors"
              >
                <div className="flex-shrink-0 w-6 h-6 border border-neutral-600 flex items-center justify-center mt-0.5">
                  <svg className="w-3.5 h-3.5 text-[#C9A962]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg text-neutral-300">{pain}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-xl text-neutral-200">
              如果你至少勾了一項——
            </p>
            <p className="text-[#C9A962] text-lg mt-2">
              這場免費研討會，就是為你準備的。
            </p>
          </div>
        </div>
      </section>

      {/* ========== Section 3: CREDIBILITY — Speaker + Social Proof ========== */}
      <section className="py-24 md:py-32 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            {/* Left — Speaker Image */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="aspect-[3/4] relative">
                  {webinar.speakerImage ? (
                    <Image
                      src={webinar.speakerImage}
                      alt={webinar.speakerName}
                      fill
                      className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-800" />
                  )}
                </div>
                {/* Name Overlay */}
                <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-neutral-950 px-6 py-4">
                  <p className="text-sm text-neutral-400">講者</p>
                  <p className="text-xl font-medium">{webinar.speakerName}</p>
                </div>
              </div>
            </div>

            {/* Right — Content */}
            <div className="lg:col-span-7 space-y-8">
              <p className="text-xs tracking-[0.2em] text-neutral-500 uppercase">他是誰？</p>

              <blockquote className="text-2xl md:text-3xl font-light leading-relaxed text-neutral-200">
                <span className="text-[#C9A962]">「</span>你賺不到認知以外的錢。<span className="text-[#C9A962]">」</span>
              </blockquote>

              {/* Transformation Timeline */}
              <div className="space-y-3 text-neutral-400">
                <p>從一般上班族、背負債務，到移民美國後開始接觸美股；</p>
                <p>2018 年認真投入，2022 年達成財務自由。</p>
                <p>Mike 用 4 年走完大多數人不敢想的路。</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                {[
                  { number: '4', unit: '年', label: '達成財務自由' },
                  { number: '20', unit: '萬+', label: 'YouTube 訂閱' },
                  { number: '15-20', unit: '%', label: '年化報酬率' },
                  { number: '3,000', unit: '+', label: '付費會員' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center md:text-left">
                    <div className="text-2xl md:text-3xl font-light text-[#C9A962]">
                      {stat.number}<span className="text-base text-[#C9A962]/60">{stat.unit}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Credential Pills */}
              <div className="flex flex-wrap gap-3 pt-2">
                {[
                  'CMoney 合作講師',
                  '暢銷書《破局致富》作者',
                  '特斯拉早期投資者',
                  '美國金融背景',
                ].map((item) => (
                  <span key={item} className="text-sm text-[#C9A962]/70 border border-[#C9A962]/20 px-4 py-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Section 4: BENEFITS — Transformation-Focused ========== */}
      <section className="py-24 md:py-32 px-6 lg:px-12 bg-neutral-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.2em] text-neutral-500 uppercase mb-4">90 分鐘，你會帶走什麼？</p>
            <h2 className="text-3xl md:text-4xl font-light">
              不只是知識，是<span className="text-[#C9A962]">行動的方向</span>
            </h2>
          </div>

          <div className="space-y-0 divide-y divide-neutral-800">
            {[
              {
                headline: '學會辨識「別人恐懼時的買入機會」',
                result: '不再追高殺低，用紀律戰勝情緒',
              },
              {
                headline: '掌握建立被動收入的存股策略',
                result: '讓錢為你工作，而不是你為錢工作',
              },
              {
                headline: '了解從零到財務自由的完整路徑',
                result: '有清楚的方向感，知道下一步該做什麼',
              },
              {
                headline: '看到 Mike 真實持倉清單',
                result: '知道有經驗的人怎麼配置，少走冤枉路',
              },
              {
                headline: '認識能幫你省時間的投資工具',
                result: '不用每天盯盤，把時間留給生活',
              },
            ].map((benefit, idx) => (
              <div
                key={idx}
                className="py-8 grid md:grid-cols-12 gap-4 items-start group border-l-2 border-transparent hover:border-[#C9A962] transition-colors pl-4 md:pl-0"
              >
                <span className="md:col-span-1 text-[#C9A962]/60 text-sm font-medium">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="md:col-span-11">
                  <p className="text-xl text-neutral-200 group-hover:text-white transition-colors">
                    {benefit.headline}
                  </p>
                  <p className="text-neutral-500 mt-1">
                    → {benefit.result}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Mid-page CTA */}
          <div className="text-center mt-16">
            <a
              href="#register"
              className="group inline-flex items-center gap-3 bg-[#C9A962] text-neutral-950 px-10 py-4 text-base font-semibold tracking-wide hover:bg-[#D4BA7A] hover:shadow-[0_0_40px_rgba(201,169,98,0.3)] transition-all"
            >
              免費報名，立即預約
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ========== Section 5: SESSION + REGISTER — Combined ========== */}
      <section id="register" className="py-24 md:py-32 px-6 lg:px-12 bg-gradient-to-b from-neutral-900 via-neutral-900 to-[#C9A962]/[0.03]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.2em] text-[#C9A962]/70 uppercase mb-4">免費報名</p>
            <h2 className="text-3xl font-light mb-3">選擇場次，預約你的席位</h2>
            <p className="text-neutral-500 text-sm">每場限額 200 名 — 額滿即止</p>
          </div>

          {/* Session Selector */}
          <div className="space-y-3 mb-10">
            {webinar.sessions.map((session: Session, idx: number) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className={`
                  w-full p-5 text-left transition-all border
                  ${selectedSession === session.id
                    ? 'border-[#C9A962] bg-[#C9A962]/5'
                    : 'border-neutral-800 hover:border-neutral-600'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={`
                      w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${selectedSession === session.id ? 'border-[#C9A962]' : 'border-neutral-600'}
                    `}>
                      {selectedSession === session.id && (
                        <div className="w-2 h-2 rounded-full bg-[#C9A962]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">場次 {idx + 1}</p>
                      <p className="text-sm text-neutral-400">{formatDateTime(session.startTime)}</p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="text-xs text-[#C9A962]/60">最近場次</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-neutral-700 py-3 text-white placeholder-neutral-600 focus:border-[#C9A962] focus:outline-none transition-colors"
                placeholder="你的名字"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-neutral-700 py-3 text-white placeholder-neutral-600 focus:border-[#C9A962] focus:outline-none transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">手機號碼 <span className="text-neutral-600">（選填）</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent border-b border-neutral-700 py-3 text-white placeholder-neutral-600 focus:border-[#C9A962] focus:outline-none transition-colors"
                placeholder="09xx-xxx-xxx"
              />
            </div>

            {formError && (
              <p className="text-red-400 text-sm">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#C9A962] text-neutral-950 py-4 font-semibold tracking-wide hover:bg-[#D4BA7A] hover:shadow-[0_0_30px_rgba(201,169,98,0.3)] transition-all disabled:opacity-50 mt-4"
            >
              {submitting ? '處理中...' : '確認報名 — 100% 免費'}
            </button>
          </form>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-neutral-600">
            <span>100% 免費</span>
            <span>|</span>
            <span>不會被推銷</span>
            <span>|</span>
            <span>資料僅用於活動通知</span>
          </div>
        </div>
      </section>

      {/* ========== Section 6: FINAL CTA — Scarcity + Transformation ========== */}
      <section className="py-24 md:py-32 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote className="text-2xl md:text-3xl font-light leading-relaxed text-neutral-200 mb-8">
            <span className="text-[#C9A962]">「</span>投資這條路不會一夜暴富，<br className="hidden md:inline" />但它會讓你越來越自由。<span className="text-[#C9A962]">」</span>
          </blockquote>
          <p className="text-neutral-500 mb-4">— {webinar.speakerName}</p>

          <p className="text-lg text-neutral-400 max-w-xl mx-auto mb-10">
            每天不行動，差距就在拉大。你光是出現在這裡，就已經領先 90% 的人。
            <br />
            現在只差一步——填好資料，我們線上見。
          </p>

          <a
            href="#register"
            className="group inline-flex items-center gap-3 bg-[#C9A962] text-neutral-950 px-10 py-4 text-base font-semibold tracking-wide hover:bg-[#D4BA7A] hover:shadow-[0_0_40px_rgba(201,169,98,0.3)] transition-all"
          >
            免費報名，把握最後機會
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="py-12 px-6 border-t border-[#C9A962]/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-neutral-500">
          <span>{webinar.speakerName}</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
