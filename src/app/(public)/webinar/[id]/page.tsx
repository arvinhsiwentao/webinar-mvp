'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Webinar, Session } from '@/lib/types';
import { formatDateTime, validateEmail } from '@/lib/utils';
import CountdownTimer from '@/components/countdown/CountdownTimer';
import { track } from '@/lib/tracking';

export default function LandingPage() {
  const params = useParams();
  const router = useRouter();
  const webinarId = params.id as string;

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
    track('page_view', { page: 'landing', webinarId });
  }, [webinarId]);

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
        setError('找不到此研讨会');
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
      setFormError('请输入姓名');
      return;
    }
    if (!validateEmail(email)) {
      setFormError('请输入有效的 Email');
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
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      track('form_submit', { webinarId, sessionId: selectedSession });
      router.push(`/webinar/${webinarId}/confirm?session=${selectedSession}&name=${encodeURIComponent(name)}`);
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
          <button onClick={() => router.push('/')} className="text-neutral-500 hover:text-neutral-900">
            返回
          </button>
        </div>
      </div>
    );
  }

  const selectedSessionData = webinar.sessions.find((s: Session) => s.id === selectedSession);

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900">

      {/* ========== Hero ========== */}
      <section className="min-h-screen relative overflow-hidden">
        {/* Diagonal Split Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-white transform origin-top-right skew-x-[-8deg] translate-x-20" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 min-h-screen flex items-center">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-4 items-center w-full py-20">

            {/* Left Content - 7 cols */}
            <div className="lg:col-span-7 space-y-8">
              {/* Eyebrow */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-px bg-[#B8953F]/60" />
                <span className="text-xs tracking-[0.2em] text-[#B8953F] uppercase">Live Webinar</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-light leading-[1.1] tracking-tight">
                <span className="block">从零开始</span>
                <span className="block font-semibold"><span className="bg-gradient-to-r from-[#B8953F] to-[#B8953F]/0 bg-[length:100%_2px] bg-no-repeat bg-bottom pb-2">美股财务自由</span></span>
              </h1>

              {/* Subtitle - asymmetric width */}
              <p className="text-lg text-neutral-500 max-w-md leading-relaxed">
                {webinar.speakerName} 将分享他如何在四年内，通过美股投资达成财务自由的完整路径。
              </p>

              {/* Key Numbers - horizontal, minimal */}
              <div className="flex items-baseline gap-12 pt-4">
                <div>
                  <span className="text-5xl font-light text-[#B8953F]">4</span>
                  <span className="text-neutral-400 ml-2">年财务自由</span>
                </div>
                <div>
                  <span className="text-5xl font-light text-[#B8953F]">15</span>
                  <span className="text-neutral-400 ml-1">萬訂閱</span>
                </div>
              </div>

              {/* CTA Area */}
              <div className="pt-8 flex items-center gap-6">
                <a
                  href="#register"
                  className="group inline-flex items-center gap-3 bg-[#B8953F] text-white px-8 py-4 text-sm font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_30px_rgba(184,149,63,0.3)] transition-all"
                >
                  预约免费席位
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>

                {selectedSessionData && (
                  <div className="text-sm text-[#B8953F]/80">
                    <CountdownTimer
                      targetTime={selectedSessionData.startTime}
                      size="sm"
                      showDays={true}
                      showLabels={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right - Speaker Image - 5 cols, offset */}
            <div className="lg:col-span-5 lg:pl-12">
              <div className="relative">
                {/* Main Image */}
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
                <div className="absolute -bottom-6 -left-6 bg-[#FAFAF7] px-6 py-4">
                  <p className="text-sm text-neutral-500">讲者</p>
                  <p className="text-xl font-medium">{webinar.speakerName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-400">
          <span className="text-xs tracking-widest">SCROLL</span>
          <div className="w-px h-12 bg-gradient-to-b from-neutral-400 to-transparent" />
        </div>
      </section>

      {/* ========== About ========== */}
      <section className="py-32 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-16">
            {/* Left - Label */}
            <div className="lg:col-span-3">
              <div className="lg:sticky lg:top-32">
                <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">关于讲者</span>
              </div>
            </div>

            {/* Right - Content */}
            <div className="lg:col-span-8">
              <blockquote className="text-3xl md:text-4xl font-light leading-relaxed text-neutral-800 mb-12">
                <span className="text-[#B8953F]">「</span>财务自由不是终点，<br/>是选择的开始。<span className="text-[#B8953F]">」</span>
              </blockquote>

              <div className="prose prose-lg prose-neutral max-w-none">
                <p className="text-neutral-500 leading-loose">
                  {webinar.speakerBio}
                </p>
              </div>

              {/* Credentials - minimal pills */}
              <div className="flex flex-wrap gap-3 mt-12">
                {['美国金融背景', '特斯拉早期投资者', '全球旅居'].map((item) => (
                  <span key={item} className="text-sm text-[#B8953F]/80 border border-[#B8953F]/25 px-4 py-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== What You'll Learn ========== */}
      <section className="py-32 px-6 lg:px-12 bg-white/80">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-3">
              <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">课程内容</span>
            </div>

            <div className="lg:col-span-9">
              <div className="space-y-0 divide-y divide-neutral-200">
                {webinar.highlights.map((highlight: string, idx: number) => (
                  <div key={idx} className="py-8 grid md:grid-cols-12 gap-4 items-start group border-l-2 border-transparent hover:border-[#B8953F] transition-colors">
                    <span className="md:col-span-1 text-[#B8953F]/70 text-sm">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="md:col-span-11 text-xl text-neutral-600 group-hover:text-neutral-900 transition-colors">
                      {highlight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Sessions ========== */}
      <section className="py-32 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase mb-8">选择场次</p>

          <div className="space-y-3">
            {webinar.sessions.map((session: Session, idx: number) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className={`
                  w-full p-6 text-left transition-all border
                  ${selectedSession === session.id
                    ? 'border-[#B8953F] bg-[#B8953F]/8'
                    : 'border-neutral-200 hover:border-neutral-400'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
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
                    <span className="text-xs text-[#B8953F]/70">最近</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Register ========== */}
      <section id="register" className="py-32 px-6 lg:px-12 bg-gradient-to-b from-white via-white to-[#B8953F]/[0.03]">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.2em] text-[#B8953F]/80 uppercase mb-4">免费报名</p>
            <h2 className="text-3xl font-light">预约你的席位</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-neutral-500 mb-2">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => track('form_start', { webinarId })}
                className="w-full bg-transparent border-b border-[#E8E5DE] py-3 text-neutral-900 placeholder-neutral-400 focus:border-[#B8953F] focus:outline-none transition-colors"
                placeholder="你的名字"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-500 mb-2">Email</label>
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
              <label className="block text-sm text-neutral-500 mb-2">手机号码（选填）</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent border-b border-[#E8E5DE] py-3 text-neutral-900 placeholder-neutral-400 focus:border-[#B8953F] focus:outline-none transition-colors"
                placeholder="(555) 123-4567"
              />
            </div>

            {formError && (
              <p className="text-red-400 text-sm">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#B8953F] text-white py-4 font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_30px_rgba(184,149,63,0.3)] transition-all disabled:opacity-50 mt-8"
            >
              {submitting ? '处理中...' : '确认报名'}
            </button>
          </form>

          <p className="text-center text-neutral-400 text-xs mt-8">
            你的资料仅用于本次活动通知
          </p>
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
