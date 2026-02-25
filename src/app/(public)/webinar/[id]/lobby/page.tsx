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
  const [registrationCount, setRegistrationCount] = useState(0);

  const countdownTarget = slotTime || session?.startTime || '';

  // Fetch webinar data
  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${webinarId}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);
        setRegistrationCount(data.registrationCount || 0);

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
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(webinar.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(`讲者: ${webinar.speakerName}`)}`;
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

  // Progress step index: 0=registered, 1=waiting/ready, 2=live
  const progressStep = canEnter ? 1 : 0;

  // ========== MAIN LOBBY RENDER ==========
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900 flex items-center justify-center px-6 py-12">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B8953F]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full">

        {/* Progress Bar */}
        <div className="flex items-center justify-center gap-0 mb-10">
          <ProgressStep label="已注册" step={0} current={progressStep} />
          <ProgressConnector active={progressStep >= 1} />
          <ProgressStep label={canEnter ? '已开放' : '等待中'} step={1} current={progressStep} />
          <ProgressConnector active={false} />
          <ProgressStep label="观看直播" step={2} current={progressStep} />
        </div>

        {/* Success Banner (Phase A only) */}
        {!canEnter && (
          <div className="flex items-center gap-3 p-4 mb-8 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-green-800 text-sm">报名成功</p>
              <p className="text-green-600 text-xs">确认邮件已发送至你的邮箱</p>
            </div>
          </div>
        )}

        {/* "即将开始" Badge (Phase B only) */}
        {canEnter && (
          <div className="text-center mb-6">
            <Badge variant="gold" pulse>即将开始</Badge>
          </div>
        )}

        {/* Speaker / Promo Image (both phases) */}
        {(webinar.promoImageUrl || webinar.speakerAvatar || webinar.speakerImage) && (
          <div className="relative w-full max-w-lg mx-auto mb-6 rounded-lg overflow-hidden border border-[#E8E5DE]">
            {webinar.promoImageUrl ? (
              <img
                src={webinar.promoImageUrl}
                alt={webinar.title}
                className="w-full h-auto"
              />
            ) : (
              <div className="flex items-center justify-center py-8 bg-white/80">
                <img
                  src={webinar.speakerAvatar || webinar.speakerImage}
                  alt={webinar.speakerName}
                  className="w-28 h-28 rounded-full object-cover border-2 border-[#B8953F]/30"
                />
              </div>
            )}
          </div>
        )}

        {/* Webinar Title + Speaker (both phases) */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">
            {webinar.title}
          </h1>
          <p className="text-neutral-500">
            讲者：{webinar.speakerName}
            {webinar.speakerTitle && (
              <span className="text-neutral-400"> · {webinar.speakerTitle}</span>
            )}
          </p>
        </div>

        {/* Welcome + Social Proof */}
        <div className="text-center mb-8">
          <p className="text-neutral-600 mb-1">
            欢迎，{userName}
          </p>
          {registrationCount > 0 && (
            <p className="text-sm text-neutral-400">
              已有 <span className="font-semibold text-[#B8953F]">{registrationCount}</span> 人报名
            </p>
          )}
        </div>

        {/* Enter Live Room Button (Phase B — ABOVE countdown for prominence) */}
        {canEnter && (
          <div className="text-center mb-8">
            <Button
              variant="gold"
              size="lg"
              className="w-full max-w-md mx-auto animate-[pulse_3s_ease-in-out_infinite]"
              onClick={handleEnterLive}
            >
              进入直播间
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <p className="text-sm text-neutral-400 mt-3">直播间已开放，点击立即进入</p>
          </div>
        )}

        {/* Countdown Timer (both phases — smaller in Phase B) */}
        <div className={`max-w-md mx-auto mb-8 ${canEnter ? 'opacity-80' : ''}`}>
          <p className="text-center text-neutral-500 text-sm mb-3">
            {canEnter ? '距离直播开始' : '距离直播还有'}
          </p>
          <CountdownTimer
            targetTime={countdownTarget}
            size={canEnter ? 'md' : 'lg'}
            showDays={true}
            showLabels={true}
            onComplete={handleCountdownComplete}
          />
        </div>

        {/* Calendar Card (both phases — elevated in Phase A) */}
        <Card glow={!canEnter} className={`max-w-md mx-auto mb-8 ${!canEnter ? 'border-[#B8953F]/20' : ''}`}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#B8953F]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#B8953F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900 text-sm mb-1">添加到日历</p>
              <p className="text-xs text-neutral-400 mb-3">设置提醒，确保不会错过直播</p>
              <div className="flex gap-2">
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#F5F5F0] hover:bg-[#EEEEE8] border border-[#E8E5DE] rounded-md px-3 py-2 text-center text-xs font-medium transition-colors"
                >
                  Google 日历
                </a>
                <button
                  onClick={handleDownloadICS}
                  className="flex-1 bg-[#F5F5F0] hover:bg-[#EEEEE8] border border-[#E8E5DE] rounded-md px-3 py-2 text-center text-xs font-medium transition-colors"
                >
                  iCal 下载
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Webinar Highlights (both phases) */}
        {webinar.highlights && webinar.highlights.length > 0 && (
          <div className="max-w-md mx-auto mb-8">
            <p className="text-sm font-semibold text-neutral-700 mb-4 text-center">讲座中你将学到</p>
            <div className="space-y-3">
              {webinar.highlights.map((highlight, i) => (
                <div key={i} className="flex items-start gap-3 text-left">
                  <div className="w-5 h-5 rounded-full bg-[#B8953F]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-[#B8953F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed">{highlight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subtle info line (Phase A only — replaces old email card) */}
        {!canEnter && (
          <p className="text-center text-xs text-neutral-400 mt-4">
            直播开始前 30 分钟可进入直播间
          </p>
        )}
      </div>
    </div>
  );
}

/* ========== Progress Bar Sub-components ========== */

function ProgressStep({ label, step, current }: { label: string; step: number; current: number }) {
  const isCompleted = step < current || (step === 0); // Step 0 (registered) is always completed
  const isCurrent = step === current && step !== 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`
        w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors
        ${isCompleted
          ? 'bg-[#B8953F]/10 text-[#B8953F] border border-[#B8953F]/30'
          : isCurrent
            ? 'bg-[#B8953F] text-white border border-[#B8953F]'
            : 'bg-[#F5F5F0] text-neutral-400 border border-[#E8E5DE]'
        }
      `}>
        {isCompleted ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : isCurrent ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
        ) : (
          <span>{step + 1}</span>
        )}
      </div>
      <span className={`text-[11px] ${isCompleted || isCurrent ? 'text-neutral-700 font-medium' : 'text-neutral-400'}`}>
        {label}
      </span>
    </div>
  );
}

function ProgressConnector({ active }: { active: boolean }) {
  return (
    <div className={`w-12 md:w-16 h-px mx-1 mb-5 ${active ? 'bg-[#B8953F]/30' : 'bg-[#E8E5DE]'}`} />
  );
}
