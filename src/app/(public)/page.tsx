'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Webinar, Session } from '@/lib/types';
import { formatDateTime, validateEmail } from '@/lib/utils';
import CountdownTimer from '@/components/countdown/CountdownTimer';

// Mike是麦克 专属 Landing Page
// 这是一个 Single-purpose site，默认显示 Mike 的 webinar
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
          // 选择最近的未过期场次，或第一个场次
          const now = new Date();
          const futureSession = data.webinar.sessions.find(
            (s: Session) => new Date(s.startTime) > now
          );
          setSelectedSession(futureSession?.id || data.webinar.sessions[0].id);
        }
      } catch {
        setError('找不到此研讨会');
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
      setFormError('请输入姓名');
      return;
    }
    if (!validateEmail(email)) {
      setFormError('请输入有效的邮箱地址');
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
      setFormError(err instanceof Error ? err.message : '报名失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="w-8 h-8 border border-[#E8E5DE] border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !webinar) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center text-neutral-900">
          <p className="text-xl mb-4">{error || '找不到研讨会'}</p>
          <a href="/admin" className="text-neutral-500 hover:text-neutral-900">
            前往后台设置
          </a>
        </div>
      </div>
    );
  }

  const selectedSessionData = webinar.sessions.find((s: Session) => s.id === selectedSession);

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900">

      {/* ========== Section 1: HERO — Urgency-First ========== */}
      <section className="min-h-screen relative overflow-hidden flex items-center">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF7] via-[#FAFAF7] to-white" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(184,149,63,0.06),transparent_60%)]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 text-center py-20">
          {/* Urgency Badge */}
          <div className="inline-flex items-center gap-2 border border-[#B8953F]/30 bg-[#B8953F]/8 px-5 py-2 mb-10">
            <span className="w-2 h-2 rounded-full bg-[#B8953F] animate-pulse" />
            <span className="text-sm text-[#B8953F]">免费名额有限 — 额满即止</span>
          </div>

          {/* Main Headline — Pain Point */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light leading-[1.15] tracking-tight mb-6">
            <span className="block text-neutral-500 text-2xl md:text-3xl font-normal mb-4">你还在用时间换薪水？</span>
            <span className="block font-semibold">
              90 分钟揭秘
              <span className="bg-gradient-to-r from-[#B8953F] to-[#B8953F]/0 bg-[length:100%_2px] bg-no-repeat bg-bottom pb-2">
                财务自由完整路径
              </span>
            </span>
          </h1>

          {/* Subheadline — Specific Promise */}
          <p className="text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed mb-8">
            43 岁达成财务自由的美股投资人 Mike，将毫无保留地分享他从负债到自由的完整策略与持仓清单。
          </p>

          {/* Countdown Timer */}
          {selectedSessionData && (
            <div className="flex justify-center mb-10">
              <div className="text-[#B8953F]">
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
            className="group inline-flex items-center gap-3 bg-[#B8953F] text-white px-10 py-4 text-base font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_40px_rgba(184,149,63,0.3)] transition-all"
          >
            立即预约免费席位
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>

          {/* Social Proof Strip */}
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 mt-12 text-sm text-neutral-400">
            <span>20 万+ YouTube 订阅</span>
            <span className="hidden md:inline text-neutral-300">|</span>
            <span>3,000+ 付费会员</span>
            <span className="hidden md:inline text-neutral-300">|</span>
            <span>4 年达成财务自由</span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-400">
          <span className="text-xs tracking-widest">SCROLL</span>
          <div className="w-px h-12 bg-gradient-to-b from-neutral-400 to-transparent" />
        </div>
      </section>

      {/* ========== Section 2: PROBLEM — Pain Amplification ========== */}
      <section className="py-24 md:py-32 px-6 lg:px-12 bg-white/80">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase mb-12 text-center">听起来熟悉吗？</p>

          <div className="space-y-6">
            {[
              '每天辛苦工作，存款增加的速度永远追不上物价',
              '想投资美股，但信息太多、太杂，不知从何下手',
              '看别人靠被动收入过自己想要的生活，自己却不知道怎么开始',
              '担心选错标的，赔掉辛苦存下来的钱',
            ].map((pain, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-5 border border-neutral-200/80 bg-neutral-50 hover:border-[#B8953F]/30 transition-colors"
              >
                <div className="flex-shrink-0 w-6 h-6 border border-neutral-400 flex items-center justify-center mt-0.5">
                  <svg className="w-3.5 h-3.5 text-[#B8953F]/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg text-neutral-600">{pain}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-xl text-neutral-800">
              如果你至少勾了一项——
            </p>
            <p className="text-[#B8953F] text-lg mt-2">
              这场免费在线直播，就是为你准备的。
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
                    <div className="w-full h-full bg-[#F5F5F0]" />
                  )}
                </div>
                {/* Name Overlay */}
                <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-[#FAFAF7] px-6 py-4">
                  <p className="text-sm text-neutral-500">讲师</p>
                  <p className="text-xl font-medium">{webinar.speakerName}</p>
                </div>
              </div>
            </div>

            {/* Right — Content */}
            <div className="lg:col-span-7 space-y-8">
              <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">他是谁？</p>

              <blockquote className="text-2xl md:text-3xl font-light leading-relaxed text-neutral-800">
                <span className="text-[#B8953F]">"</span>你赚不到认知以外的钱。<span className="text-[#B8953F]">"</span>
              </blockquote>

              {/* Transformation Timeline */}
              <div className="space-y-3 text-neutral-500">
                <p>从一般上班族、背负债务，到移民美国后开始接触美股；</p>
                <p>2018 年认真投入，2022 年达成财务自由。</p>
                <p>Mike 用 4 年走完大多数人不敢想的路。</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                {[
                  { number: '4', unit: '年', label: '达成财务自由' },
                  { number: '20', unit: '万+', label: 'YouTube 订阅' },
                  { number: '15-20', unit: '%', label: '年化收益率' },
                  { number: '3,000', unit: '+', label: '付费会员' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center md:text-left">
                    <div className="text-2xl md:text-3xl font-light text-[#B8953F]">
                      {stat.number}<span className="text-base text-[#B8953F]/70">{stat.unit}</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Credential Pills */}
              <div className="flex flex-wrap gap-3 pt-2">
                {[
                  'CMoney 合作讲师',
                  '畅销书《破局致富》作者',
                  '特斯拉早期投资者',
                  '美国金融背景',
                ].map((item) => (
                  <span key={item} className="text-sm text-[#B8953F]/80 border border-[#B8953F]/25 px-4 py-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Section 4: BENEFITS — Transformation-Focused ========== */}
      <section className="py-24 md:py-32 px-6 lg:px-12 bg-white/80">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase mb-4">90 分钟，你会带走什么？</p>
            <h2 className="text-3xl md:text-4xl font-light">
              不只是知识，是<span className="text-[#B8953F]">行动的方向</span>
            </h2>
          </div>

          <div className="space-y-0 divide-y divide-neutral-200">
            {[
              {
                headline: '学会辨识"别人恐惧时的买入机会"',
                result: '不再追涨杀跌，用纪律战胜情绪',
              },
              {
                headline: '掌握建立被动收入的存股策略',
                result: '让钱为你工作，而不是你为钱工作',
              },
              {
                headline: '了解从零到财务自由的完整路径',
                result: '有清楚的方向感，知道下一步该做什么',
              },
              {
                headline: '看到 Mike 真实持仓清单',
                result: '知道有经验的人怎么配置，少走弯路',
              },
              {
                headline: '认识能帮你省时间的投资工具',
                result: '不用每天盯盘，把时间留给生活',
              },
            ].map((benefit, idx) => (
              <div
                key={idx}
                className="py-8 grid md:grid-cols-12 gap-4 items-start group border-l-2 border-transparent hover:border-[#B8953F] transition-colors pl-4 md:pl-0"
              >
                <span className="md:col-span-1 text-[#B8953F]/70 text-sm font-medium">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="md:col-span-11">
                  <p className="text-xl text-neutral-800 group-hover:text-neutral-900 transition-colors">
                    {benefit.headline}
                  </p>
                  <p className="text-neutral-400 mt-1">
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
              className="group inline-flex items-center gap-3 bg-[#B8953F] text-white px-10 py-4 text-base font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_40px_rgba(184,149,63,0.3)] transition-all"
            >
              免费报名，立即预约
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ========== Section 5: SESSION + REGISTER — Combined ========== */}
      <section id="register" className="py-24 md:py-32 px-6 lg:px-12 bg-gradient-to-b from-white via-white to-[#B8953F]/[0.03]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.2em] text-[#B8953F]/80 uppercase mb-4">免费报名</p>
            <h2 className="text-3xl font-light mb-3">选择场次，预约你的席位</h2>
            <p className="text-neutral-400 text-sm">每场限额 200 名 — 额满即止</p>
          </div>

          {/* Session Selector */}
          <div className="space-y-3 mb-10">
            {webinar.sessions.map((session: Session, idx: number) => (
              <button
                key={session.id || `session-${idx}`}
                onClick={() => setSelectedSession(session.id)}
                className={`
                  w-full p-5 text-left transition-all border
                  ${selectedSession === session.id
                    ? 'border-[#B8953F] bg-[#B8953F]/8'
                    : 'border-neutral-200 hover:border-neutral-400'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={`
                      w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${selectedSession === session.id ? 'border-[#B8953F]' : 'border-neutral-400'}
                    `}>
                      {selectedSession === session.id && (
                        <div className="w-2 h-2 rounded-full bg-[#B8953F]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">场次 {idx + 1}</p>
                      <p className="text-sm text-neutral-500">{formatDateTime(session.startTime)}</p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="text-xs text-[#B8953F]/70">最近场次</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-neutral-500 mb-2">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-[#E8E5DE] py-3 text-neutral-900 placeholder-neutral-400 focus:border-[#B8953F] focus:outline-none transition-colors"
                placeholder="你的名字"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-500 mb-2">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-[#E8E5DE] py-3 text-neutral-900 placeholder-neutral-400 focus:border-[#B8953F] focus:outline-none transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-500 mb-2">手机号码 <span className="text-neutral-400">（选填）</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent border-b border-[#E8E5DE] py-3 text-neutral-900 placeholder-neutral-400 focus:border-[#B8953F] focus:outline-none transition-colors"
                placeholder="09xx-xxx-xxx"
              />
            </div>

            {formError && (
              <p className="text-red-400 text-sm">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#B8953F] text-white py-4 font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_30px_rgba(184,149,63,0.3)] transition-all disabled:opacity-50 mt-4"
            >
              {submitting ? '处理中...' : '确认报名 — 100% 免费'}
            </button>
          </form>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-neutral-400">
            <span>100% 免费</span>
            <span>|</span>
            <span>不会被推销</span>
            <span>|</span>
            <span>资料仅用于活动通知</span>
          </div>
        </div>
      </section>

      {/* ========== Section 6: FINAL CTA — Scarcity + Transformation ========== */}
      <section className="py-24 md:py-32 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote className="text-2xl md:text-3xl font-light leading-relaxed text-neutral-800 mb-8">
            <span className="text-[#B8953F]">"</span>投资这条路不会一夜暴富，<br className="hidden md:inline" />但它会让你越来越自由。<span className="text-[#B8953F]">"</span>
          </blockquote>
          <p className="text-neutral-400 mb-4">— {webinar.speakerName}</p>

          <p className="text-lg text-neutral-500 max-w-xl mx-auto mb-10">
            每天不行动，差距就在拉大。你光是出现在这里，就已经领先 90% 的人。
            <br />
            现在只差一步——填好资料，我们线上见。
          </p>

          <a
            href="#register"
            className="group inline-flex items-center gap-3 bg-[#B8953F] text-white px-10 py-4 text-base font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_40px_rgba(184,149,63,0.3)] transition-all"
          >
            免费报名，把握最后机会
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="py-12 px-6 border-t border-[#B8953F]/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-neutral-400">
          <span>{webinar.speakerName}</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
