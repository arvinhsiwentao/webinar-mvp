'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import CountdownTimer from '@/components/countdown/CountdownTimer';
import { Button, Badge, Card } from '@/components/ui';
import { Webinar, Session } from '@/lib/types';

export default function WaitingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const webinarId = params.id as string;
  const sessionId = searchParams.get('session') || '';
  const userName = searchParams.get('name') || '觀眾';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!webinar || !session) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">找不到研討會</h1>
          <Button variant="ghost" onClick={() => router.push('/')}>
            返回首頁
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#C9A962]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Speaker Image */}
        {webinar.speakerImage && (
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-[#C9A962]/20 rounded-full blur-xl" />
            <img
              src={webinar.speakerImage}
              alt={webinar.speakerName}
              className="relative w-full h-full rounded-full object-cover border-2 border-[#C9A962]/30"
            />
          </div>
        )}

        <Badge variant="gold" className="mb-6">候場中</Badge>

        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {webinar.title}
        </h1>

        <p className="text-neutral-400 text-lg mb-2">
          講者：{webinar.speakerName}
        </p>

        <p className="text-neutral-500 mb-12">
          歡迎，{userName}！直播即將開始
        </p>

        {/* Countdown */}
        <Card className="p-8 mb-8 border-[#C9A962]/20">
          <p className="text-neutral-400 mb-4">距離直播開始</p>
          <CountdownTimer
            targetTime={session.startTime}
            size="lg"
            showDays={true}
            showLabels={true}
            onComplete={handleCountdownComplete}
          />
        </Card>

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
              🎬 進入直播間
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          ) : (
            '直播開始前 30 分鐘可進入'
          )}
        </Button>

        {/* Tips */}
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <Tip icon="🔔" title="開啟通知" desc="確保不會錯過直播" />
          <Tip icon="🎧" title="準備耳機" desc="獲得最佳聲音體驗" />
          <Tip icon="📝" title="準備筆記" desc="記錄重要內容" />
        </div>
      </div>
    </div>
  );
}

function Tip({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 text-left">
      <span className="text-2xl mb-2 block">{icon}</span>
      <p className="font-medium text-white text-sm">{title}</p>
      <p className="text-neutral-500 text-xs">{desc}</p>
    </div>
  );
}
