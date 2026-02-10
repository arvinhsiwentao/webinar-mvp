'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Webinar, Session } from '@/lib/types';
import { getTimeUntil } from '@/lib/utils';
import CountdownTimer from '@/components/countdown/CountdownTimer';

export default function WaitingRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const webinarId = params.id as string;
  const sessionId = searchParams.get('session');
  const userName = searchParams.get('name') || 'Guest';

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalSeconds, setTotalSeconds] = useState(0);

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

  // Countdown and auto-redirect
  useEffect(() => {
    if (!session) return;

    const updateCountdown = () => {
      const seconds = getTimeUntil(session.startTime);
      setTotalSeconds(seconds);

      // Auto-redirect when countdown reaches 0
      if (seconds <= 0) {
        router.push(`/webinar/${webinarId}/live?session=${session.id}&name=${encodeURIComponent(userName)}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session, webinarId, userName, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
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

  // If more than 30 minutes away, show a different message
  const isEarlyArrival = totalSeconds > 30 * 60;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Animated Gradient Ring */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-spin-slow opacity-50 blur-md" />
          <div className="absolute inset-2 rounded-full bg-gray-950 flex items-center justify-center">
            <span className="text-6xl">🎬</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {webinar.title}
        </h1>

        <p className="text-gray-400 mb-8">
          講者: {webinar.speakerName}
        </p>

        {isEarlyArrival ? (
          <>
            {/* Early Arrival Message */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-yellow-400 mb-2">
                ⏰ 你來得有點早！
              </h2>
              <p className="text-gray-400 text-sm">
                直播尚未開始，請於開播前 30 分鐘再進入候場頁面。
              </p>
            </div>

            {/* Long Countdown */}
            <div className="mb-8">
              <p className="text-gray-400 text-sm mb-4">距離直播開始</p>
              <CountdownTimer 
                targetTime={session.startTime}
                size="md"
                showDays={true}
                showLabels={true}
              />
            </div>
          </>
        ) : (
          <>
            {/* Waiting Message */}
            <h2 className="text-xl text-purple-400 mb-6 animate-pulse">
              即將開始...
            </h2>

            {/* Short Countdown (mm:ss) */}
            <div className="mb-8">
              <CountdownTimer 
                targetTime={session.startTime}
                size="lg"
                variant="urgent"
                showDays={false}
                showLabels={true}
              />
            </div>

            {/* Tips */}
            <div className="bg-gray-800/30 rounded-xl p-4 text-left">
              <p className="text-gray-400 text-sm mb-2">📌 小提醒：</p>
              <ul className="text-gray-500 text-sm space-y-1">
                <li>• 請保持此頁面開啟，開播後自動進入</li>
                <li>• 建議使用耳機獲得最佳體驗</li>
                <li>• 準備好筆記本記錄重點內容</li>
              </ul>
            </div>
          </>
        )}

        {/* Back Button */}
        <button
          onClick={() => router.push(`/webinar/${webinarId}/confirm?session=${session.id}&name=${encodeURIComponent(userName)}`)}
          className="mt-8 text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← 返回確認頁
        </button>
      </div>

      {/* Add custom animation */}
      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
