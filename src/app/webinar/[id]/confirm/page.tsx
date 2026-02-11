'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<Session | null>(null);

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
      `講者: ${webinar.speakerName}`,
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
    return `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${encodeURIComponent(webinar.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(`講者: ${webinar.speakerName}`)}`;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#C9A962]/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative z-10 max-w-md w-full text-center p-10 border-green-500/20">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <Badge variant="success" className="mb-6">報名成功</Badge>

        <h1 className="text-2xl font-bold mb-4">
          {name}，你已成功報名！
        </h1>

        <p className="text-neutral-400 mb-8 leading-relaxed">
          我們已將直播資訊寄送到你的信箱。<br />
          請在直播開始前進入候場室。
        </p>

        {/* Countdown Timer */}
        {session && (
          <div className="mb-8">
            <p className="text-neutral-400 text-sm mb-3">距離直播還有</p>
            <CountdownTimer
              targetTime={session.startTime}
              size="md"
              showDays={true}
              showLabels={true}
            />
          </div>
        )}

        {/* Action Cards */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer"
               className="flex-1 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 rounded-lg p-4 text-center transition-colors">
              📅 Google 日曆
            </a>
            <button onClick={handleDownloadICS}
              className="flex-1 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 rounded-lg p-4 text-center transition-colors">
              📅 iCal 下載
            </button>
          </div>

          <div className="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700 text-left">
            <div className="w-10 h-10 rounded-full bg-[#C9A962]/20 flex items-center justify-center flex-shrink-0">
              <span>📧</span>
            </div>
            <div>
              <p className="text-sm text-neutral-400">確認信</p>
              <p className="font-medium">檢查你的收件匣</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Link href={`/webinar/${webinarId}/waiting?session=${sessionId}&name=${encodeURIComponent(name)}`}>
          <Button variant="gold" size="lg" className="w-full">
            進入候場室
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        </Link>

        <p className="text-neutral-600 text-xs mt-6">
          直播開始前 10 分鐘可進入直播間
        </p>
      </Card>
    </div>
  );
}
