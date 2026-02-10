'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Webinar, Session } from '@/lib/types';
import { formatDateTime, validateEmail } from '@/lib/utils';
import CountdownTimer from '@/components/countdown/CountdownTimer';
import { Button, Input, Badge, Card, CardContent } from '@/components/ui';

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

      router.push(`/webinar/${webinarId}/confirm?session=${selectedSession}&name=${encodeURIComponent(name)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '報名失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !webinar) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{error || '找不到研討會'}</h1>
          <Button variant="ghost" onClick={() => router.push('/')}>
            返回首頁
          </Button>
        </div>
      </div>
    );
  }

  const selectedSessionData = webinar.sessions.find((s: Session) => s.id === selectedSession);

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      
      {/* ========== Hero Section ========== */}
      <section className="relative min-h-screen flex items-center">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div className="space-y-8 animate-fade-in-up">
            <Badge variant="gold" pulse>
              🔥 限時公開
            </Badge>
            
            <div>
              <p className="text-amber-400/80 text-sm tracking-[0.3em] uppercase mb-3 font-medium">
                Financial Freedom
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {webinar.title}
              </h1>
            </div>
            
            {webinar.subtitle && (
              <p className="text-xl text-gray-400 leading-relaxed max-w-lg">
                {webinar.subtitle}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-8 py-6 border-y border-gray-800">
              <Stat number="4" label="年達成財務自由" />
              <div className="w-px h-12 bg-gray-700" />
              <Stat number="15萬+" label="追蹤者信任" />
              <div className="w-px h-12 bg-gray-700" />
              <Stat number="10x" label="特斯拉早期回報" />
            </div>

            {/* Countdown */}
            {selectedSessionData && (
              <div>
                <p className="text-gray-500 text-sm mb-3">⏰ 距離直播開始</p>
                <CountdownTimer 
                  targetTime={selectedSessionData.startTime}
                  size="lg"
                  showDays={true}
                  showLabels={true}
                />
              </div>
            )}

            <Button size="lg" variant="gold" onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}>
              📺 立即預約觀看
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>

            <p className="text-gray-600 text-sm">
              ✅ 已有 <span className="text-amber-500 font-semibold">1,247</span> 人報名
            </p>
          </div>

          {/* Right: Speaker Image */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent rounded-3xl blur-2xl" />
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-gray-800">
              {webinar.speakerImage ? (
                <Image
                  src={webinar.speakerImage}
                  alt={webinar.speakerName}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <span className="text-6xl text-gray-600 font-serif">M</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
            </div>
            {/* Decorative Frame */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 border border-amber-500/30 rounded-lg" />
          </div>
        </div>
      </section>

      {/* ========== About Section ========== */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent to-gray-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-8">
            <div className="hidden md:block">
              <span className="text-xs tracking-[0.3em] text-amber-500 [writing-mode:vertical-rl] rotate-180">
                ABOUT
              </span>
            </div>
            
            <div className="flex-1">
              <p className="text-amber-400/80 text-sm mb-2 font-medium">Who is</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-8">{webinar.speakerName}</h2>
              
              <div className="prose prose-invert prose-lg max-w-none">
                <p className="text-gray-400 leading-relaxed whitespace-pre-line">
                  {webinar.speakerBio}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 mt-8">
                <CredentialBadge icon="🎓" text="美國金融背景" />
                <CredentialBadge icon="🌏" text="全球旅居生活" />
                <CredentialBadge icon="📈" text="10年+ 投資經驗" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Quote Section ========== */}
      <section className="py-20 px-6 text-center relative">
        <div className="absolute left-1/2 top-0 w-px h-20 bg-gradient-to-b from-transparent via-amber-500 to-transparent -translate-x-1/2" />
        
        <blockquote className="max-w-2xl mx-auto">
          <p className="text-2xl md:text-3xl font-serif italic text-gray-200 leading-relaxed">
            "財務自由不是終點，<br />
            而是<span className="text-amber-400">選擇權</span>的開始。"
          </p>
          <cite className="block mt-6 text-amber-500 not-italic tracking-wider text-sm">
            — {webinar.speakerName}
          </cite>
        </blockquote>
        
        <div className="absolute left-1/2 bottom-0 w-px h-20 bg-gradient-to-b from-amber-500 via-amber-500 to-transparent -translate-x-1/2" />
      </section>

      {/* ========== What You'll Learn ========== */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-400/80 text-sm mb-2 tracking-wider">What You'll Discover</p>
            <h2 className="text-3xl md:text-4xl font-bold">直播課程內容</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 stagger-children">
            {webinar.highlights.map((highlight: string, idx: number) => (
              <Card key={idx} hover glow={idx === webinar.highlights.length - 1}>
                <div className="flex gap-4">
                  <span className="text-4xl font-serif text-gray-700">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <CardContent className="pt-2">
                    <p className="text-gray-300 leading-relaxed">{highlight}</p>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Sessions Selection ========== */}
      <section className="py-16 px-6 bg-gray-900/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-amber-400/80 text-sm mb-2 tracking-wider">Choose Your Session</p>
            <h2 className="text-3xl font-bold">選擇直播場次</h2>
          </div>

          <div className="space-y-4">
            {webinar.sessions.map((session: Session, idx: number) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className={`
                  w-full p-5 rounded-xl border-2 transition-all text-left flex items-center justify-between
                  ${selectedSession === session.id 
                    ? 'border-amber-500 bg-amber-500/10' 
                    : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${selectedSession === session.id ? 'border-amber-500' : 'border-gray-600'}
                  `}>
                    {selectedSession === session.id && (
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white">場次 {idx + 1}</div>
                    <div className="text-gray-400 text-sm">{formatDateTime(session.startTime)}</div>
                  </div>
                </div>
                {idx === 0 && (
                  <Badge variant="success">最近場次</Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Registration Form ========== */}
      <section id="register" className="py-24 px-6">
        <div className="max-w-md mx-auto">
          <Card className="p-8 border-amber-500/20">
            <div className="text-center mb-8">
              <Badge variant="gold" className="mb-4">🎁 免費報名</Badge>
              <h2 className="text-2xl font-bold text-white">立即預約席位</h2>
              <p className="text-gray-500 text-sm mt-2">
                填寫以下資料，我們會在開播前通知你
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {webinar.sessions.length > 1 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">選擇場次</label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-amber-500 focus:outline-none"
                  >
                    {webinar.sessions.map((session: Session, idx: number) => (
                      <option key={session.id} value={session.id}>
                        場次 {idx + 1}：{formatDateTime(session.startTime)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="姓名 *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="請輸入你的姓名"
                required
              />

              <Input
                label="Email *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />

              <Input
                label="手機 (選填)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
              />

              {formError && (
                <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <Button type="submit" variant="gold" size="lg" className="w-full" loading={submitting}>
                🚀 立即報名（免費）
              </Button>
            </form>

            <p className="text-center text-gray-600 text-xs mt-6">
              🔒 你的資料安全且不會被分享
            </p>
          </Card>
        </div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-amber-500 rounded flex items-center justify-center">
              <span className="font-serif text-amber-500">M</span>
            </div>
            <span className="font-semibold">{webinar.speakerName}</span>
          </div>
          
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-amber-500 transition-colors">YouTube</a>
            <a href="#" className="hover:text-amber-500 transition-colors">Instagram</a>
            <a href="#" className="hover:text-amber-500 transition-colors">Podcast</a>
          </div>
          
          <p className="text-gray-600 text-xs">
            © 2026 {webinar.speakerName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-amber-400 font-serif">{number}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function CredentialBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
