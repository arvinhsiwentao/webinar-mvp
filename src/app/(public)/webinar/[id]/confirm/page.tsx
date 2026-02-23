'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge, Card } from '@/components/ui';
import { Webinar, Session } from '@/lib/types';
import CountdownTimer from '@/components/countdown/CountdownTimer';
import { generateICSContent } from '@/lib/utils';

export default function ConfirmPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const webinarId = params.id as string;
  const sessionId = searchParams.get('session') || '';
  const name = searchParams.get('name') || '你';

  const router = useRouter();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const handleCountdownComplete = useCallback(() => {
    router.push(`/webinar/${webinarId}/waiting?session=${sessionId}&name=${encodeURIComponent(name)}`);
  }, [router, webinarId, sessionId, name]);

  useEffect(() => {
    async function fetchWebinar() {
      const res = await fetch(`/api/webinar/${webinarId}`);
      if (!res.ok) return;
      const data = await res.json();
      setWebinar(data.webinar);
      const found = data.webinar.sessions.find((s: Session) => s.id === sessionId);
      setSession(found || data.webinar.sessions[0]);
    }
    fetchWebinar();
  }, [webinarId, sessionId]);

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

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900 flex items-center justify-center px-6">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#B8953F]/8 rounded-full blur-3xl" />
      </div>

      <Card className="relative z-10 max-w-md w-full text-center p-10 border-green-500/20">
        {/* Confetti celebration */}
        <div className="relative mb-6">
          <div className="text-6xl mb-2">🎉</div>
          <div className="absolute -top-2 left-1/4 text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎊</div>
          <div className="absolute -top-1 right-1/4 text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>✨</div>
        </div>

        <Badge variant="success" className="mb-6">报名成功</Badge>

        <h1 className="text-2xl font-bold mb-4">
          {name}，你已成功报名！
        </h1>

        <p className="text-neutral-500 mb-8 leading-relaxed">
          我们已将直播信息发送到你的邮箱。<br />
          请在直播开始前进入等候室。
        </p>

        {/* Countdown Timer */}
        {session && (
          <div className="mb-8">
            <p className="text-neutral-500 text-sm mb-3">距离直播还有</p>
            <CountdownTimer
              targetTime={session.startTime}
              size="md"
              showDays={true}
              showLabels={true}
              onComplete={handleCountdownComplete}
            />
          </div>
        )}

        {/* Promotional Image */}
        {webinar?.promoImageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden border border-[#E8E5DE]">
            <img
              src={webinar.promoImageUrl}
              alt={webinar.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Action Cards */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer"
               className="flex-1 bg-[#F5F5F0] hover:bg-neutral-100 border border-[#E8E5DE] rounded-lg p-4 text-center transition-colors">
              📅 Google 日历
            </a>
            <button onClick={handleDownloadICS}
              className="flex-1 bg-[#F5F5F0] hover:bg-neutral-100 border border-[#E8E5DE] rounded-lg p-4 text-center transition-colors">
              📅 iCal 下载
            </button>
          </div>

          <div className="flex items-center gap-4 p-4 bg-[#F5F5F0] rounded-lg border border-[#E8E5DE] text-left">
            <div className="w-10 h-10 rounded-full bg-[#B8953F]/10 flex items-center justify-center flex-shrink-0">
              <span>📧</span>
            </div>
            <div>
              <p className="text-sm text-neutral-500">确认邮件</p>
              <p className="font-medium">检查你的收件箱</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Link href={`/webinar/${webinarId}/waiting?session=${sessionId}&name=${encodeURIComponent(name)}`}>
          <Button variant="gold" size="lg" className="w-full">
            进入等候室
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        </Link>

        <p className="text-neutral-400 text-xs mt-6">
          直播开始前 10 分钟可进入直播间
        </p>
      </Card>
    </div>
  );
}
