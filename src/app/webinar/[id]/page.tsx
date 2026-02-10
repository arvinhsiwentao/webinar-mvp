'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Webinar, Session } from '@/lib/types';
import { formatDateTime, validateEmail } from '@/lib/utils';
import CountdownTimer from '@/components/countdown/CountdownTimer';

export default function LandingPage() {
  const params = useParams();
  const router = useRouter();
  const webinarId = params.id as string;

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${webinarId}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);
        if (data.webinar.sessions.length > 0) {
          setSelectedSession(data.webinar.sessions[0].id);
        }
      } catch {
        setError('找不到此研討會');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  }, [webinarId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('請輸入姓名');
      return;
    }
    if (!validateEmail(email)) {
      setFormError('請輸入有效的 Email');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinarId,
          sessionId: selectedSession,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Redirect to confirmation page
      router.push(`/webinar/${webinarId}/confirm?session=${selectedSession}&name=${encodeURIComponent(name)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '報名失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !webinar) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">😕 {error || '找不到研討會'}</h1>
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

  const selectedSessionData = webinar.sessions.find((s: Session) => s.id === selectedSession);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Hero Section */}
      <section className="relative py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 bg-red-600/20 text-red-400 px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">免費線上直播</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {webinar.title}
          </h1>
          {webinar.subtitle && (
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              {webinar.subtitle}
            </p>
          )}

          {/* Countdown */}
          {selectedSessionData && (
            <div className="mb-8">
              <p className="text-gray-400 text-sm mb-3">距離直播開始</p>
              <CountdownTimer 
                targetTime={selectedSessionData.startTime}
                size="lg"
                showDays={true}
                showLabels={true}
              />
            </div>
          )}
        </div>
      </section>

      {/* Speaker + Highlights */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          {/* Speaker */}
          <div className="bg-gray-800/30 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6">講者介紹</h2>
            <div className="flex gap-6">
              {webinar.speakerImage && (
                <div className="flex-shrink-0">
                  <Image
                    src={webinar.speakerImage}
                    alt={webinar.speakerName}
                    width={100}
                    height={100}
                    className="rounded-full object-cover"
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-white">{webinar.speakerName}</h3>
                {webinar.speakerTitle && (
                  <p className="text-blue-400 text-sm mb-3">{webinar.speakerTitle}</p>
                )}
                {webinar.speakerBio && (
                  <p className="text-gray-400 text-sm leading-relaxed">{webinar.speakerBio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="bg-gray-800/30 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6">你將學到</h2>
            <ul className="space-y-4">
              {webinar.highlights.map((highlight: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm">
                    ✓
                  </span>
                  <span className="text-gray-300">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              立即免費報名
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Session Select */}
              {webinar.sessions.length > 1 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">選擇場次</label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {webinar.sessions.map((session: Session) => (
                      <option key={session.id} value={session.id}>
                        {formatDateTime(session.startTime)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">姓名 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="請輸入你的姓名"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">電話 (選填)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
                />
              </div>

              {/* Error */}
              {formError && (
                <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '報名中...' : '🎯 立即報名（免費）'}
              </button>
            </form>

            <p className="text-center text-gray-500 text-xs mt-4">
              點擊報名即表示同意我們的服務條款與隱私政策
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2026 Webinar MVP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
