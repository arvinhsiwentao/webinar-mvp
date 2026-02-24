'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import CountdownTimer from '@/components/countdown/CountdownTimer';
import MissedSessionPrompt from '@/components/evergreen/MissedSessionPrompt';
import { Button, Badge, Card } from '@/components/ui';
import { Webinar, Session } from '@/lib/types';
import { getEvergreenState, getSlotExpiresAt } from '@/lib/evergreen';
import { generateICSContent } from '@/lib/utils';

export default function LobbyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const webinarId = params.id as string;
  const sessionId = searchParams.get('session') || '';
  const userName = searchParams.get('name') || '观众';
  const slotTime = searchParams.get('slot');

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEnter, setCanEnter] = useState(false);
  const [evergreenState, setEvergreenState] = useState<string | null>(null);
  const [nextSlotTime, setNextSlotTime] = useState<string>('');

  const countdownTarget = slotTime || session?.startTime || '';

  // Fetch webinar data
  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${webinarId}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);

        const foundSession = data.webinar.sessions.find((s: Session) => s.id === sessionId);
        setSession(foundSession || data.webinar.sessions[0]);

        // Check evergreen state
        if (slotTime && data.webinar.evergreen?.enabled) {
          const expiresAt = getSlotExpiresAt(slotTime, data.webinar.evergreen.videoDurationMinutes);
          const state = getEvergreenState(slotTime, expiresAt, true);
          setEvergreenState(state);

          if (state === 'LIVE') {
            const slotParam = `&slot=${encodeURIComponent(slotTime)}`;
            router.push(`/webinar/${webinarId}/live?session=${sessionId}&name=${encodeURIComponent(userName)}${slotParam}`);
            return;
          }

          if (state === 'MISSED') {
            try {
              const slotRes = await fetch(`/api/webinar/${webinarId}/next-slot`);
              if (slotRes.ok) {
                const slotData = await slotRes.json();
                if (slotData.countdownTarget) {
                  setNextSlotTime(slotData.countdownTarget);
                }
              }
            } catch { /* use empty nextSlotTime */ }
          }
        }
      } catch {
        console.error('Failed to fetch webinar');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  }, [webinarId, sessionId, slotTime, router, userName]);

  // Check if user can enter (30 minutes before start)
  useEffect(() => {
    if (!countdownTarget) return;

    const checkCanEnter = () => {
      const startTime = new Date(countdownTarget).getTime();
      const now = Date.now();
      const minutesUntilStart = (startTime - now) / (1000 * 60);
      setCanEnter(minutesUntilStart <= 30);
    };

    checkCanEnter();
    const interval = setInterval(checkCanEnter, 10000);
    return () => clearInterval(interval);
  }, [countdownTarget]);

  const buildLiveUrl = useCallback(() => {
    const slotParam = slotTime ? `&slot=${encodeURIComponent(slotTime)}` : '';
    return `/webinar/${webinarId}/live?session=${sessionId}&name=${encodeURIComponent(userName)}${slotParam}`;
  }, [webinarId, sessionId, userName, slotTime]);

  const handleCountdownComplete = useCallback(() => {
    router.push(buildLiveUrl());
  }, [router, buildLiveUrl]);

  const handleEnterLive = () => {
    router.push(buildLiveUrl());
  };

  function handleDownloadICS() {
    if (!webinar || !session) return;
    const ics = generateICSContent(
      webinar.title,
      countdownTarget || session.startTime,
      webinar.duration,
      `讲者: ${webinar.speakerName}`,
      `${window.location.origin}/webinar/${webinar.id}/lobby?session=${session.id}`
    );
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${webinar.title}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getGoogleCalendarUrl(): string {
    if (!webinar || !session) return '#';
    const start = new Date(countdownTarget || session.startTime);
    const end = new Date(start.getTime() + webinar.duration * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${encodeURIComponent(webinar.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(`讲者: ${webinar.speakerName}`)}`;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not found
  if (!webinar || !session) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center text-neutral-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">找不到研讨会</h1>
          <Button variant="ghost" onClick={() => router.push('/')}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  // Missed session (evergreen)
  if (evergreenState === 'MISSED' && nextSlotTime) {
    const sticky = typeof window !== 'undefined' ? localStorage.getItem(`webinar-${webinarId}-evergreen`) : null;
    const registrationId = sticky ? JSON.parse(sticky).registrationId : '';

    return (
      <MissedSessionPrompt
        missedSlotTime={slotTime!}
        nextSlotTime={nextSlotTime}
        webinarId={webinarId}
        registrationId={registrationId || ''}
        onReassigned={(newSlot, expiresAt) => {
          if (sticky) {
            const parsed = JSON.parse(sticky);
            parsed.assignedSlot = newSlot;
            parsed.expiresAt = expiresAt;
            localStorage.setItem(`webinar-${webinarId}-evergreen`, JSON.stringify(parsed));
          }
          router.push(`/webinar/${webinarId}/lobby?session=${sessionId}&name=${encodeURIComponent(userName)}&slot=${encodeURIComponent(newSlot)}`);
        }}
      />
    );
  }

  // ========== MAIN LOBBY RENDER ==========
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900 flex items-center justify-center px-6">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {canEnter ? (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#B8953F]/8 rounded-full blur-3xl" />
        ) : (
          <>
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-50 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#B8953F]/8 rounded-full blur-3xl" />
          </>
        )}
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Phase A: Celebration (>30 min) */}
        {!canEnter && (
          <>
            <div className="relative mb-6">
              <div className="text-6xl mb-2">🎉</div>
              <div className="absolute -top-2 left-1/4 text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎊</div>
              <div className="absolute -top-1 right-1/4 text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>✨</div>
            </div>

            <Badge variant="success" className="mb-6">报名成功</Badge>

            <h1 className="text-2xl font-bold mb-4">
              {userName}，你已成功报名！
            </h1>

            <p className="text-neutral-500 mb-8 leading-relaxed">
              我们已将直播信息发送到你的邮箱。<br />
              直播开始前 30 分钟可进入直播间。
            </p>
          </>
        )}

        {/* Phase B: Ready to Enter (<=30 min) */}
        {canEnter && (
          <>
            {/* Speaker/Promo Image */}
            <div className="relative w-full max-w-lg mx-auto mb-8 rounded-lg overflow-hidden border border-[#E8E5DE]">
              {webinar.promoImageUrl ? (
                <img
                  src={webinar.promoImageUrl}
                  alt={webinar.title}
                  className="w-full h-auto"
                />
              ) : (webinar.speakerAvatar || webinar.speakerImage) ? (
                <div className="flex items-center justify-center py-8 bg-white/80">
                  <img
                    src={webinar.speakerAvatar || webinar.speakerImage}
                    alt={webinar.speakerName}
                    className="w-32 h-32 rounded-full object-cover border-2 border-[#B8953F]/30"
                  />
                </div>
              ) : null}
            </div>

            <Badge variant="gold" className="mb-6">即将开始</Badge>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {webinar.title}
            </h1>

            <p className="text-neutral-500 text-lg mb-2">
              讲者：{webinar.speakerName}
            </p>

            <p className="text-neutral-400 mb-8">
              欢迎，{userName}！直播即将开始
            </p>
          </>
        )}

        {/* Countdown Timer (both phases) */}
        <Card className={`p-8 mb-8 ${canEnter ? 'border-[#B8953F]/25' : 'border-green-500/20'}`}>
          <p className="text-neutral-500 mb-4">
            {canEnter ? '距离下一场讲座开始' : '距离直播还有'}
          </p>
          <CountdownTimer
            targetTime={countdownTarget}
            size={canEnter ? 'lg' : 'md'}
            showDays={true}
            showLabels={true}
            onComplete={handleCountdownComplete}
          />
        </Card>

        {/* Phase A: Promo image (shown below countdown in Phase A) */}
        {!canEnter && webinar.promoImageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden border border-[#E8E5DE]">
            <img
              src={webinar.promoImageUrl}
              alt={webinar.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Enter Live Room Button (Phase B only) */}
        {canEnter && (
          <Button
            variant="gold"
            size="lg"
            className="w-full max-w-md mx-auto mb-8"
            onClick={handleEnterLive}
          >
            🎬 进入直播间
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        )}

        {/* Calendar buttons (both phases) */}
        <div className="flex gap-3 max-w-md mx-auto mb-8">
          <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer"
             className="flex-1 bg-white/80 hover:bg-white border border-[#E8E5DE] rounded-lg p-3 text-center text-sm transition-colors">
            📅 Google 日历
          </a>
          <button onClick={handleDownloadICS}
            className="flex-1 bg-white/80 hover:bg-white border border-[#E8E5DE] rounded-lg p-3 text-center text-sm transition-colors">
            📅 iCal 下载
          </button>
        </div>

        {/* Email confirmation card (Phase A only) */}
        {!canEnter && (
          <div className="flex items-center gap-4 p-4 bg-white/80 rounded-lg border border-[#E8E5DE] text-left max-w-md mx-auto mb-8">
            <div className="w-10 h-10 rounded-full bg-[#B8953F]/10 flex items-center justify-center flex-shrink-0">
              <span>📧</span>
            </div>
            <div>
              <p className="text-sm text-neutral-500">确认邮件</p>
              <p className="font-medium">检查你的收件箱</p>
            </div>
          </div>
        )}

        {/* Preparation tips (both phases) */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Tip icon="🔔" title="开启通知" desc="确保不会错过直播" />
          <Tip icon="🎧" title="准备耳机" desc="获得最佳音效体验" />
          <Tip icon="📝" title="准备笔记" desc="记录重要内容" />
        </div>
      </div>
    </div>
  );
}

function Tip({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white/80 border border-neutral-200 rounded-lg p-4 text-left">
      <span className="text-2xl mb-2 block">{icon}</span>
      <p className="font-medium text-neutral-900 text-sm">{title}</p>
      <p className="text-neutral-400 text-xs">{desc}</p>
    </div>
  );
}
