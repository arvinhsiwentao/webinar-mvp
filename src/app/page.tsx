'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Webinar, Session } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export default function HomePage() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWebinars() {
      try {
        const res = await fetch('/api/webinar');
        const data = await res.json();
        setWebinars((data.webinars || []).filter((w: Webinar) => w.status === 'published'));
      } catch (err) {
        console.error('Failed to fetch webinars:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWebinars();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">🎬 Webinar MVP</h1>
          <div className="flex gap-4">
            <Link
              href="/demo"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Demo
            </Link>
            <Link
              href="/admin"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          即將舉辦的直播研討會
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          免費線上直播，與專家一起學習最新趨勢
        </p>
      </section>

      {/* Webinar List */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : webinars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">目前沒有即將舉辦的研討會</p>
            <Link
              href="/demo"
              className="text-blue-400 hover:text-blue-300"
            >
              查看 Demo 頁面 →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {webinars.map((webinar) => (
              <WebinarCard key={webinar.id} webinar={webinar} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2026 Webinar MVP. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/demo" className="hover:text-white transition-colors">
              Demo
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin Panel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function WebinarCard({ webinar }: { webinar: Webinar }) {
  const nextSession = webinar.sessions.find((s: Session) => new Date(s.startTime) > new Date());

  return (
    <Link href={`/webinar/${webinar.id}`}>
      <div className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700 hover:border-gray-600 transition-all hover:transform hover:scale-[1.02]">
        {/* Thumbnail */}
        {webinar.thumbnailUrl && (
          <div className="aspect-video relative">
            <img
              src={webinar.thumbnailUrl}
              alt={webinar.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4">
              <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-2">{webinar.title}</h3>
          {webinar.subtitle && (
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{webinar.subtitle}</p>
          )}

          {/* Speaker */}
          <div className="flex items-center gap-3 mb-4">
            {webinar.speakerImage && (
              <img
                src={webinar.speakerImage}
                alt={webinar.speakerName}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <p className="text-white text-sm font-medium">{webinar.speakerName}</p>
              {webinar.speakerTitle && (
                <p className="text-gray-500 text-xs">{webinar.speakerTitle}</p>
              )}
            </div>
          </div>

          {/* Next Session */}
          {nextSession && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>📅</span>
              <span>{formatDateTime(nextSession.startTime)}</span>
            </div>
          )}

          {/* CTA */}
          <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors">
            免費報名 →
          </button>
        </div>
      </div>
    </Link>
  );
}
