'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Webinar } from '@/lib/types';

export default function EndPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const webinarId = params.id as string;
  const userName = searchParams.get('name') || '观众';
  const sessionId = searchParams.get('session') || '';

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

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
      <div className="min-h-screen bg-[#14161a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-[#14161a] flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">找不到直播</h1>
          <Link href="/" className="text-[#7C3AED] hover:underline">返回首页</Link>
        </div>
      </div>
    );
  }

  const firstCTA = webinar.ctaEvents?.[0];
  const replayUrl = `/webinar/${webinarId}/live?session=${sessionId}&name=${encodeURIComponent(userName)}&replay=true`;

  return (
    <div className="min-h-screen bg-[#14161a] text-white">
      {/* "THIS EVENT IS OVER" banner */}
      <div className="bg-red-600 text-white text-center py-3 text-sm font-bold uppercase tracking-widest">
        本次讲座已结束
      </div>

      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        {/* Hero section with speaker image */}
        <div className="relative w-full max-w-3xl mx-auto aspect-video mb-8 rounded-lg overflow-hidden">
          {(webinar.speakerAvatar || webinar.speakerImage) ? (
            <img
              src={webinar.speakerImage || webinar.speakerAvatar}
              alt={webinar.speakerName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800" />
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <p className="text-white text-2xl md:text-4xl font-bold text-center px-4">
              本次讲座已结束
            </p>
          </div>
        </div>

        {/* Thank you header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3">
            感谢你的参与，{userName}！
          </h1>
          <p className="text-neutral-400 text-lg">
            {webinar.title} 已结束
          </p>
        </div>

        {/* CTA section */}
        {(webinar.endPageCtaText || firstCTA) && (
          <div className="mb-10">
            <a
              href={webinar.endPageCtaUrl || firstCTA?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-white font-bold text-lg px-10 py-4 rounded-lg hover:opacity-90 transition-opacity shadow-lg"
              style={{ backgroundColor: webinar.endPageCtaColor || '#7C3AED' }}
            >
              {webinar.endPageCtaText || firstCTA?.buttonText || '了解更多'}
            </a>
          </div>
        )}

        {/* Sales copy section */}
        {webinar.endPageSalesCopy && (
          <div className="max-w-2xl mx-auto mb-10 text-neutral-300 text-sm leading-relaxed space-y-4">
            {webinar.endPageSalesCopy.split('\n').filter(Boolean).map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        )}

        {/* Social sharing buttons */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className="text-neutral-400 text-sm">分享:</span>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-neutral-700 hover:bg-blue-600 flex items-center justify-center text-white transition-colors"
            title="分享到 Facebook"
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(webinar.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-neutral-700 hover:bg-sky-500 flex items-center justify-center text-white transition-colors"
            title="分享到 Twitter"
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
          </a>
        </div>

        {/* Replay link */}
        <div className="mb-8">
          <Link
            href={replayUrl}
            className="inline-block bg-neutral-700 hover:bg-neutral-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            观看回放
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-700 pt-6 mt-8">
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 mb-2 flex-wrap">
            <a href="#" className="hover:text-white underline">隐私政策</a>
            <span>|</span>
            <a href="#" className="hover:text-white underline">服务条款</a>
            <span>|</span>
            <a href="#" className="hover:text-white underline">退款政策</a>
          </div>
          <p className="text-neutral-500 text-xs">
            &copy; {new Date().getFullYear()} {webinar.speakerName}. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
