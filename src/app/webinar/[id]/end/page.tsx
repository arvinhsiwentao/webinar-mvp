'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Webinar } from '@/lib/types';

export default function EndPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const webinarId = params.id as string;
  const userName = searchParams.get('name') || '觀眾';
  const sessionId = searchParams.get('session') || '';

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${webinarId}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setWebinar(data.webinar);
      } catch {
        console.error('Failed to fetch webinar');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  }, [webinarId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">找不到直播</h1>
          <Link href="/" className="text-[#C9A962] hover:underline">返回首頁</Link>
        </div>
      </div>
    );
  }

  const firstCTA = webinar.ctaEvents?.[0];
  const replayUrl = `/webinar/${webinarId}/live?session=${sessionId}&name=${encodeURIComponent(userName)}&replay=true`;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        {/* Thank you header */}
        <div className="mb-10">
          <div className="w-16 h-16 bg-[#C9A962]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">
            感謝你的參與，{userName}！
          </h1>
          <p className="text-neutral-400 text-lg">
            {webinar.title} 已結束
          </p>
        </div>

        {/* Speaker info */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            {webinar.speakerImage && (
              <img
                src={webinar.speakerImage}
                alt={webinar.speakerName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A962]/30"
              />
            )}
            <div className="text-left">
              <p className="font-bold text-lg">{webinar.speakerName}</p>
              {webinar.speakerTitle && (
                <p className="text-sm text-[#C9A962]">{webinar.speakerTitle}</p>
              )}
            </div>
          </div>
          <p className="text-neutral-400 text-sm">
            感謝 {webinar.speakerName} 的精彩分享！
          </p>
        </div>

        {/* CTA section */}
        {firstCTA && (
          <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-lg p-6 mb-8">
            {firstCTA.promoText && (
              <p className="text-lg font-bold text-white mb-3">{firstCTA.promoText}</p>
            )}
            <a
              href={firstCTA.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold text-lg px-8 py-3 rounded-lg transition-colors"
            >
              {firstCTA.buttonText}
            </a>
          </div>
        )}

        {/* Replay link */}
        <div className="mb-8">
          <Link
            href={replayUrl}
            className="inline-block bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            🔄 觀看重播
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-800 pt-6 mt-8">
          <p className="text-neutral-600 text-sm">
            © 2026 {webinar.speakerName}. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
