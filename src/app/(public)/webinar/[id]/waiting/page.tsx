'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import CountdownTimer from '@/components/countdown/CountdownTimer';
import { Button, Badge, Card } from '@/components/ui';
import { Webinar, Session } from '@/lib/types';
import { generateICSContent } from '@/lib/utils';

export default function WaitingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const webinarId = params.id as string;
  const sessionId = searchParams.get('session') || '';
  const userName = searchParams.get('name') || '观众';

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEnter, setCanEnter] = useState(false);

  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${webinarId}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);

        const foundSession = data.webinar.sessions.find((s: Session) => s.id === sessionId);
        setSession(foundSession || data.webinar.sessions[0]);
      } catch {
        console.error('Failed to fetch webinar');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  }, [webinarId, sessionId]);

  // Check if user can enter (10 minutes before start)
  useEffect(() => {
    if (!session) return;

    const checkCanEnter = () => {
      const startTime = new Date(session.startTime).getTime();
      const now = Date.now();
      const minutesUntilStart = (startTime - now) / (1000 * 60);
      setCanEnter(minutesUntilStart <= 30);
    };

    checkCanEnter();
    const interval = setInterval(checkCanEnter, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const handleCountdownComplete = useCallback(() => {
    router.push(`/webinar/${webinarId}/live?session=${sessionId}&name=${encodeURIComponent(userName)}`);
  }, [router, webinarId, sessionId, userName]);

  const handleEnterLive = () => {
    router.push(`/webinar/${webinarId}/live?session=${sessionId}&name=${encodeURIComponent(userName)}`);
  };

  function handleDownloadICS() {
    if (!webinar || !session) return;
    const ics = generateICSContent(
      webinar.title,
      session.startTime,
      webinar.duration,
      `讲者: ${webinar.speakerName}`,
      `${window.location.origin}/webinar/${webinar.id}/waiting?session=${session.id}`
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
    const start = new Date(session.startTime);
    const end = new Date(start.getTime() + webinar.duration * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${encodeURIComponent(webinar.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(`讲者: ${webinar.speakerName}`)}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900 flex items-center justify-center px-6">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#B8953F]/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
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

        <Badge variant="gold" className="mb-6">候場中</Badge>

        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {webinar.title}
        </h1>

        <p className="text-neutral-500 text-lg mb-2">
          讲者：{webinar.speakerName}
        </p>

        <p className="text-neutral-400 mb-12">
          欢迎，{userName}！直播即将开始
        </p>

        {/* Countdown */}
        <Card className="p-8 mb-8 border-[#B8953F]/25">
          <p className="text-neutral-500 mb-4">距离下一场讲座开始</p>
          <CountdownTimer
            targetTime={session.startTime}
            size="lg"
            showDays={true}
            showLabels={true}
            onComplete={handleCountdownComplete}
          />
        </Card>

        {/* Calendar buttons */}
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

        {/* Enter Button */}
        <Button
          variant="gold"
          size="lg"
          className="w-full max-w-md mx-auto"
          onClick={handleEnterLive}
          disabled={!canEnter}
        >
          {canEnter ? (
            <>
              🎬 进入直播间
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          ) : (
            '直播开始前 30 分钟可进入'
          )}
        </Button>

        {/* Tips */}
        <div className="mt-12 grid md:grid-cols-3 gap-4">
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
