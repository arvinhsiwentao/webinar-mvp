'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Webinar, Session } from '@/lib/types';
import { formatDateTime, generateICSContent, getTimeUntil } from '@/lib/utils';
import CountdownTimer from '@/components/countdown/CountdownTimer';

export default function ConfirmPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const webinarId = params.id as string;
  const sessionId = searchParams.get('session');
  const userName = searchParams.get('name') || 'Guest';

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleDownloadICS = () => {
    if (!webinar || !session) return;

    const icsContent = generateICSContent(
      webinar.title,
      session.startTime,
      webinar.duration,
      `${webinar.subtitle || ''}\n\n講者: ${webinar.speakerName}`,
      `${window.location.origin}/webinar/${webinarId}/live?session=${session.id}`
    );

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${webinar.title}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddToGoogleCalendar = () => {
    if (!webinar || !session) return;

    const startTime = new Date(session.startTime);
    const endTime = new Date(startTime.getTime() + webinar.duration * 60 * 1000);

    const formatGoogleDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const googleUrl = new URL('https://calendar.google.com/calendar/render');
    googleUrl.searchParams.set('action', 'TEMPLATE');
    googleUrl.searchParams.set('text', webinar.title);
    googleUrl.searchParams.set('dates', `${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}`);
    googleUrl.searchParams.set('details', `講者: ${webinar.speakerName}\n直播連結: ${window.location.origin}/webinar/${webinarId}/live?session=${session.id}`);

    window.open(googleUrl.toString(), '_blank');
  };

  const handleEnterLive = () => {
    if (!session) return;
    
    const secondsUntil = getTimeUntil(session.startTime);
    
    if (secondsUntil > 30 * 60) {
      // More than 30 minutes, show waiting room
      router.push(`/webinar/${webinarId}/waiting?session=${session.id}&name=${encodeURIComponent(userName)}`);
    } else if (secondsUntil > 0) {
      // Within 30 minutes, go to waiting room
      router.push(`/webinar/${webinarId}/waiting?session=${session.id}&name=${encodeURIComponent(userName)}`);
    } else {
      // Already started, go to live room
      router.push(`/webinar/${webinarId}/live?session=${session.id}&name=${encodeURIComponent(userName)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  if (!webinar || !session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">找不到研討會資訊</h1>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 py-16 px-4">
      <div className="max-w-lg mx-auto">
        {/* Success Card */}
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-8 text-center border border-gray-700">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">報名成功！</h1>
          <p className="text-gray-400 mb-8">
            {userName}，你已成功報名以下直播
          </p>

          {/* Webinar Info */}
          <div className="bg-gray-900/50 rounded-xl p-6 mb-8 text-left">
            <h2 className="text-xl font-semibold text-white mb-3">{webinar.title}</h2>
            <div className="space-y-2 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>{formatDateTime(session.startTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>👤</span>
                <span>{webinar.speakerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⏱️</span>
                <span>{webinar.duration} 分鐘</span>
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="mb-8">
            <p className="text-gray-400 text-sm mb-4">距離直播還有</p>
            <CountdownTimer 
              targetTime={session.startTime}
              size="md"
              showDays={true}
              showLabels={true}
            />
          </div>

          {/* Calendar Buttons */}
          <div className="space-y-3 mb-8">
            <button
              onClick={handleAddToGoogleCalendar}
              className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-medium py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              加入 Google 日曆
            </button>
            <button
              onClick={handleDownloadICS}
              className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-medium py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              下載 iCal 日曆檔
            </button>
          </div>

          {/* Enter Webinar Button */}
          <button
            onClick={handleEnterLive}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            🚀 進入直播間
          </button>

          <p className="text-gray-500 text-sm mt-4">
            📧 我們會在直播前發送提醒通知
          </p>
        </div>
      </div>
    </div>
  );
}
