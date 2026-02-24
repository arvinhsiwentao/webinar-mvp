'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Webinar, Session } from '@/lib/types';
import PersistentCountdown from '@/components/countdown/PersistentCountdown';
import { useRegistrationForm } from '@/components/registration/useRegistrationForm';
import RegistrationModal from '@/components/registration/RegistrationModal';

// Mike是麦克 专属 Landing Page
// 这是一个 Single-purpose site，默认显示 Mike 的 webinar
const DEFAULT_WEBINAR_ID = '1';

export default function HomePage() {
  const router = useRouter();

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const form = useRegistrationForm({
    webinarId: DEFAULT_WEBINAR_ID,
    onSuccess: (sessionId, name) => {
      router.push(`/webinar/${DEFAULT_WEBINAR_ID}/confirm?session=${sessionId}&name=${encodeURIComponent(name)}`);
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${DEFAULT_WEBINAR_ID}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);
        if (data.webinar.sessions.length > 0) {
          const now = new Date();
          const futureSession = data.webinar.sessions.find(
            (s: Session) => new Date(s.startTime) > now
          );
          form.setSelectedSession(futureSession?.id || data.webinar.sessions[0].id);
        }
      } catch {
        setError('找不到此研讨会');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const openModal = () => setIsModalOpen(true);

  // Sort sessions chronologically for date display
  const sortedSessions = [...webinar.sessions].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900">

      {/* ========== Section 1: HERO — Urgency-First, Compelling ========== */}
      <section className="min-h-[65vh] md:min-h-[70vh] relative overflow-hidden flex items-center">
        {/* Background */}
        {webinar.heroImageUrl ? (
          <>
            <Image
              src={webinar.heroImageUrl}
              alt=""
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/75" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#2D2520] to-[#1A1A1A]" />
        )}

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 text-center py-16 text-white">
          {/* Urgency Banner — Prominent, Animated */}
          <div className="inline-flex items-center gap-2.5 bg-[#B8953F] px-6 py-2.5 mb-8 shadow-[0_0_30px_rgba(184,149,63,0.35)] animate-[heroFadeIn_0.8s_ease-out]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span className="text-sm md:text-base font-semibold tracking-widest text-white uppercase">
              限时公开内容
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.15] mb-5 animate-[heroFadeIn_0.8s_ease-out_0.15s_both]">
            如何用美股实现财务自由？
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl font-light text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed animate-[heroFadeIn_0.8s_ease-out_0.3s_both]">
            从负债到 4 年达成财务自由的完整路径
          </p>

          {/* Primary CTA */}
          <div className="animate-[heroFadeIn_0.8s_ease-out_0.45s_both]">
            <button
              onClick={openModal}
              className="group inline-flex items-center gap-2 bg-[#B8953F] text-white px-12 py-4 text-lg font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_50px_rgba(184,149,63,0.4)] transition-all duration-300"
            >
              观看讲座
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <p className="text-xs text-white/40 mt-3 tracking-wide">免费参加 · 名额有限</p>
          </div>
        </div>
      </section>

      {/* ========== Section 2: SPEAKER INTRO — Avatar Left, Bio Right ========== */}
      <section className="py-12 md:py-16 px-6 lg:px-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-6 md:gap-10">
            {/* Circular Avatar */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-[#F5F5F0] shadow-sm">
                {(webinar.speakerAvatar || webinar.speakerImage) ? (
                  <Image
                    src={webinar.speakerAvatar || webinar.speakerImage!}
                    alt={webinar.speakerName}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-[#F5F5F0]" />
                )}
              </div>
            </div>

            {/* Name + Bio */}
            <div className="text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-bold text-neutral-900 mb-3">
                {webinar.speakerName}
              </h2>
              <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
                2018年开始美股投资，成为特斯拉（TSLA）早期投资者。2022年通过投资美股，4年内实现财务自由。目前拥有20万+ YouTube订阅者，3,000+付费会员社群。现在他想把这套方法分享给你......
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Section 3+4: DATE SCHEDULE + COUNTDOWN (unified) ========== */}
      <section className="py-12 md:py-16 px-6 lg:px-12 bg-[#F5F5F0]">
        <div className="max-w-2xl mx-auto">
          {/* Date Schedule */}
          <div className="space-y-4 mb-10">
            {sortedSessions.map((session) => {
              const date = new Date(session.startTime);
              const month = date.getMonth() + 1;
              const day = date.getDate();
              const fullDate = date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
              const time = date.toLocaleTimeString('zh-CN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <div
                  key={session.id}
                  className="flex items-center gap-4 md:gap-6"
                >
                  {/* Month Badge + Day */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="bg-[#B8953F] text-white text-xs font-medium px-2 py-0.5 rounded-sm mb-0.5">
                      {month}月
                    </div>
                    <div className="text-xl font-bold text-neutral-900">{day}</div>
                  </div>

                  {/* Date + Time */}
                  <div>
                    <p className="text-base md:text-lg font-semibold text-neutral-900">{fullDate}</p>
                    <p className="text-sm text-neutral-500">
                      {time} Central Standard Time
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Countdown Timer */}
          <PersistentCountdown sessions={webinar.sessions} />
        </div>
      </section>

      {/* ========== Section 5: BENEFITS — Checklist Style ========== */}
      <section className="py-16 md:py-24 px-6 lg:px-12 bg-[#FAFAF7]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-10 text-center">
            讲座中你将会获得什么：
          </h2>

          <div className="space-y-6">
            {(webinar.highlights && webinar.highlights.length > 0
              ? webinar.highlights
              : [
                  '学习如何辨识美股「抄底」时机，在股价低点精准布局',
                  '掌握「存股」策略，挑选高股息、低估值绩优股，建立被动收入',
                  '了解 Mike 如何在 4 年内达成财务自由的完整路径',
                  '独家公开 Mike 的美股持仓清单与选股逻辑',
                  '认识【MIKE是麥克】APP 的核心功能与实战应用',
                ]
            ).map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                {/* Gold checkmark circle */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#B8953F] flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg text-neutral-800 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Section 6: MID-PAGE CTA ========== */}
      <section className="py-14 md:py-20 px-6 lg:px-12 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xl md:text-2xl text-neutral-800 mb-2">准备好改变了吗？</p>
          <p className="text-[#B8953F] text-lg mb-8">这场免费在线直播，就是为你准备的。</p>
          <button
            onClick={openModal}
            className="inline-block bg-[#B8953F] text-white px-10 py-4 text-base font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_40px_rgba(184,149,63,0.3)] transition-all"
          >
            免费报名，立即预约
          </button>
        </div>
      </section>

      {/* ========== Section 7: URGENCY / DISCLAIMER ========== */}
      <section className="py-16 md:py-20 px-6 lg:px-12 bg-white border-t-[3px] border-[#B8953F]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">&#x26A0;&#xFE0F;</div>
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">
            限时公开，名额有限
          </h2>
          <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
            {webinar.disclaimerText || '本次讲座内容仅为知识分享与经验探讨，不构成任何形式的投资建议、理财推荐或收益保证。所有提及的策略、工具及案例均为 Mike 个人投资经验分享。'}
          </p>
          <button
            onClick={openModal}
            className="inline-block bg-[#B8953F] text-white px-10 py-4 text-lg font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_40px_rgba(184,149,63,0.3)] transition-all"
          >
            锁定名额，观看讲座
          </button>
        </div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="py-8 px-6 bg-[#F5F5F0] border-t border-[#E8E5DE]">
        <div className="max-w-4xl mx-auto text-center text-xs text-neutral-400 space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <a href="#" className="hover:text-[#B8953F] underline">隐私政策</a>
            <span>|</span>
            <a href="#" className="hover:text-[#B8953F] underline">服务条款</a>
            <span>|</span>
            <a href="#" className="hover:text-[#B8953F] underline">退款政策</a>
          </div>
          <p>&copy; {new Date().getFullYear()} {webinar.speakerName}. All rights reserved.</p>
        </div>
      </footer>

      {/* ========== Registration Modal ========== */}
      <RegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sessions={webinar.sessions}
        selectedSession={form.selectedSession}
        onSessionChange={form.setSelectedSession}
        name={form.name}
        onNameChange={form.setName}
        email={form.email}
        onEmailChange={form.setEmail}
        phone={form.phone}
        onPhoneChange={form.setPhone}
        onSubmit={form.handleSubmit}
        submitting={form.submitting}
        formError={form.formError}
      />
    </div>
  );
}
