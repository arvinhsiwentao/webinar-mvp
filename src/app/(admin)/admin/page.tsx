'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Webinar, Session, AutoChatMessage, CTAEvent, Registration } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

type TabType = 'list' | 'create' | 'edit' | 'registrations';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [editingWebinar, setEditingWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch webinars
  useEffect(() => {
    fetchWebinars();
  }, []);

  async function fetchWebinars() {
    try {
      const res = await fetch('/api/admin/webinar');
      const data = await res.json();
      setWebinars(data.webinars || []);
    } catch (err) {
      console.error('Failed to fetch webinars:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (webinar: Webinar) => {
    setEditingWebinar(webinar);
    setActiveTab('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此研討會嗎？')) return;

    try {
      await fetch(`/api/admin/webinar/${id}`, { method: 'DELETE' });
      setWebinars(webinars.filter(w => w.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleSaved = () => {
    fetchWebinars();
    setActiveTab('list');
    setEditingWebinar(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Webinar Admin Panel</h1>
          <Link href="/" className="text-gray-400 hover:text-white text-sm">
            ← 返回首頁
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-neutral-900/50 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-4">
            <button
              onClick={() => { setActiveTab('list'); setEditingWebinar(null); }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              📋 場次管理
            </button>
            <button
              onClick={() => { setActiveTab('create'); setEditingWebinar(null); }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              ➕ 建立 Webinar
            </button>
            <button
              onClick={() => { setActiveTab('registrations'); setEditingWebinar(null); }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'registrations'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              📋 報名名單
            </button>
            {activeTab === 'edit' && (
              <span className="py-3 px-4 text-sm font-medium border-b-2 border-blue-500 text-blue-400">
                ✏️ 編輯 Webinar
              </span>
            )}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'list' && (
          <WebinarList
            webinars={webinars}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        {activeTab === 'create' && (
          <WebinarForm onSaved={handleSaved} />
        )}
        {activeTab === 'registrations' && (
          <RegistrationList webinars={webinars} />
        )}
        {activeTab === 'edit' && editingWebinar && (
          <WebinarForm webinar={editingWebinar} onSaved={handleSaved} />
        )}
      </main>
    </div>
  );
}

// Webinar List Component
function WebinarList({
  webinars,
  loading,
  onEdit,
  onDelete
}: {
  webinars: Webinar[];
  loading: boolean;
  onEdit: (w: Webinar) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (webinars.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">尚未建立任何研討會</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {webinars.map((webinar) => (
        <div
          key={webinar.id}
          className="bg-neutral-900 rounded-lg p-6 border border-neutral-800 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{webinar.title}</h3>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  webinar.status === 'published'
                    ? 'bg-green-500/20 text-green-400'
                    : webinar.status === 'ended'
                    ? 'bg-gray-500/20 text-gray-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {webinar.status === 'published' ? '已發布' : webinar.status === 'ended' ? '已結束' : '草稿'}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                講者: {webinar.speakerName} | 時長: {webinar.duration} 分鐘
              </p>

              {/* Sessions */}
              <div className="flex flex-wrap gap-2 mb-3">
                {webinar.sessions.map((session: Session) => (
                  <span
                    key={session.id}
                    className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded"
                  >
                    📅 {formatDateTime(session.startTime)}
                  </span>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4 text-xs text-gray-500">
                <span>💬 {webinar.autoChat.length} 自動訊息</span>
                <span>🎯 {webinar.ctaEvents.length} CTA</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Link
                href={`/webinar/${webinar.id}`}
                target="_blank"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded transition-colors text-center"
              >
                👁️ 預覽
              </Link>
              <button
                onClick={() => onEdit(webinar)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                ✏️ 編輯
              </button>
              <button
                onClick={() => onDelete(webinar.id)}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm px-4 py-2 rounded transition-colors"
              >
                🗑️ 刪除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// CSV Export
function exportCSV(registrations: Registration[], webinarTitle: string) {
  const headers = ['姓名', 'Email', '電話', '場次', '報名時間'];
  const rows = registrations.map(r => [
    r.name, r.email, r.phone || '', r.sessionId, r.registeredAt
  ]);
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${webinarTitle}-registrations.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Registration List Component
function RegistrationList({ webinars }: { webinars: Webinar[] }) {
  const [registrationMap, setRegistrationMap] = useState<Record<string, Registration[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRegistrations() {
      setLoading(true);
      const map: Record<string, Registration[]> = {};
      await Promise.all(
        webinars.map(async (w) => {
          try {
            const res = await fetch(`/api/admin/webinar/${w.id}`);
            const data = await res.json();
            map[w.id] = data.registrations || [];
          } catch {
            map[w.id] = [];
          }
        })
      );
      setRegistrationMap(map);
      setLoading(false);
    }
    if (webinars.length > 0) {
      fetchRegistrations();
    } else {
      setLoading(false);
    }
  }, [webinars]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const totalRegistrations = Object.values(registrationMap).reduce((sum, regs) => sum + regs.length, 0);

  if (totalRegistrations === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">尚無報名資料</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {webinars.map((webinar) => {
        const regs = registrationMap[webinar.id] || [];
        if (regs.length === 0) return null;
        return (
          <div key={webinar.id} className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {webinar.title}
                <span className="ml-2 text-sm text-gray-400">({regs.length} 筆報名)</span>
              </h3>
              <button
                onClick={() => exportCSV(regs, webinar.title)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                匯出 CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-gray-400">
                    <th className="text-left py-2 pr-4">姓名</th>
                    <th className="text-left py-2 pr-4">Email</th>
                    <th className="text-left py-2 pr-4">電話</th>
                    <th className="text-left py-2 pr-4">場次</th>
                    <th className="text-left py-2">報名時間</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-800/50 text-gray-300">
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 pr-4">{r.email}</td>
                      <td className="py-2 pr-4">{r.phone || '-'}</td>
                      <td className="py-2 pr-4">{r.sessionId}</td>
                      <td className="py-2">{formatDateTime(r.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Webinar Form Component
function WebinarForm({
  webinar,
  onSaved
}: {
  webinar?: Webinar;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    title: webinar?.title || '',
    subtitle: webinar?.subtitle || '',
    speakerName: webinar?.speakerName || '',
    speakerTitle: webinar?.speakerTitle || '',
    speakerBio: webinar?.speakerBio || '',
    speakerImage: webinar?.speakerImage || '',
    videoUrl: webinar?.videoUrl || '',
    thumbnailUrl: webinar?.thumbnailUrl || '',
    duration: webinar?.duration || 60,
    highlights: webinar?.highlights?.join('\n') || '',
    viewerBaseCount: webinar?.viewerBaseCount || 100,
    viewerMultiplier: webinar?.viewerMultiplier || 3,
    webhookUrl: webinar?.webhookUrl || '',
    status: webinar?.status || 'draft',
  });

  const [sessions, setSessions] = useState<Array<{ startTime: string }>>(
    webinar?.sessions.map(s => ({ startTime: s.startTime.slice(0, 16) })) || [{ startTime: '' }]
  );

  const [autoChat, setAutoChat] = useState<Array<{ timeSec: string; name: string; message: string }>>(
    webinar?.autoChat.map(m => ({
      timeSec: String(m.timeSec),
      name: m.name,
      message: m.message
    })) || []
  );

  const [ctaEvents, setCtaEvents] = useState<Array<{
    showAtSec: string;
    hideAtSec: string;
    buttonText: string;
    url: string;
    promoText: string;
    showCountdown: boolean;
  }>>(
    webinar?.ctaEvents.map(c => ({
      showAtSec: String(c.showAtSec),
      hideAtSec: String(c.hideAtSec),
      buttonText: c.buttonText,
      url: c.url,
      promoText: c.promoText || '',
      showCountdown: c.showCountdown,
    })) || []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        ...formData,
        highlights: formData.highlights.split('\n').filter(h => h.trim()),
        sessions: sessions.filter(s => s.startTime).map(s => ({
          startTime: new Date(s.startTime).toISOString(),
        })),
        autoChat: autoChat.filter(m => m.message).map(m => ({
          timeSec: parseInt(m.timeSec) || 0,
          name: m.name,
          message: m.message,
        })),
        ctaEvents: ctaEvents.filter(c => c.buttonText && c.url).map(c => ({
          showAtSec: parseInt(c.showAtSec) || 0,
          hideAtSec: parseInt(c.hideAtSec) || 0,
          buttonText: c.buttonText,
          url: c.url,
          promoText: c.promoText || undefined,
          showCountdown: c.showCountdown,
        })),
      };

      const url = webinar ? `/api/admin/webinar/${webinar.id}` : '/api/admin/webinar';
      const method = webinar ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold mb-4">基本資訊</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">標題 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">副標題</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">影片 URL *</label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://example.com/video.mp4、.m3u8 或 YouTube 連結"
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              支援格式：MP4 直連、M3U8 (HLS) 串流、YouTube 影片連結
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">時長 (分鐘)</label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Speaker Info */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold mb-4">講者資訊</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">講者姓名 *</label>
            <input
              type="text"
              value={formData.speakerName}
              onChange={(e) => setFormData({ ...formData, speakerName: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">講者頭銜</label>
            <input
              type="text"
              value={formData.speakerTitle}
              onChange={(e) => setFormData({ ...formData, speakerTitle: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">講者照片 URL</label>
            <input
              type="url"
              value={formData.speakerImage}
              onChange={(e) => setFormData({ ...formData, speakerImage: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">講者簡介</label>
            <textarea
              value={formData.speakerBio}
              onChange={(e) => setFormData({ ...formData, speakerBio: e.target.value })}
              rows={3}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold mb-4">學習重點</h2>
        <p className="text-gray-500 text-sm mb-2">每行一個重點</p>
        <textarea
          value={formData.highlights}
          onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
          rows={4}
          placeholder="了解 2026 年最具潛力的投資趨勢&#10;學習 AI 產業的核心投資邏輯&#10;掌握數位資產配置的黃金比例"
          className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
      </section>

      {/* Sessions */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">場次設定</h2>
          <button
            type="button"
            onClick={() => setSessions([...sessions, { startTime: '' }])}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            + 新增場次
          </button>
        </div>
        <div className="space-y-3">
          {sessions.map((session, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-gray-500 text-sm w-16">場次 {idx + 1}</span>
              <input
                type="datetime-local"
                value={session.startTime}
                onChange={(e) => {
                  const newSessions = [...sessions];
                  newSessions[idx].startTime = e.target.value;
                  setSessions(newSessions);
                }}
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSessions(sessions.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Auto Chat */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">自動聊天訊息</h2>
          <button
            type="button"
            onClick={() => setAutoChat([...autoChat, { timeSec: '', name: '', message: '' }])}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            + 新增訊息
          </button>
        </div>
        <div className="space-y-3">
          {autoChat.length === 0 && (
            <p className="text-gray-500 text-sm">尚未設定自動訊息</p>
          )}
          {autoChat.map((msg, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-gray-800/50 p-3 rounded">
              <input
                type="number"
                value={msg.timeSec}
                onChange={(e) => {
                  const newChat = [...autoChat];
                  newChat[idx].timeSec = e.target.value;
                  setAutoChat(newChat);
                }}
                placeholder="秒"
                className="w-20 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 text-sm"
              />
              <input
                type="text"
                value={msg.name}
                onChange={(e) => {
                  const newChat = [...autoChat];
                  newChat[idx].name = e.target.value;
                  setAutoChat(newChat);
                }}
                placeholder="暱稱"
                className="w-24 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 text-sm"
              />
              <input
                type="text"
                value={msg.message}
                onChange={(e) => {
                  const newChat = [...autoChat];
                  newChat[idx].message = e.target.value;
                  setAutoChat(newChat);
                }}
                placeholder="訊息內容"
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 text-sm"
              />
              <button
                type="button"
                onClick={() => setAutoChat(autoChat.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Events */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">CTA 設定</h2>
          <button
            type="button"
            onClick={() => setCtaEvents([...ctaEvents, {
              showAtSec: '',
              hideAtSec: '',
              buttonText: '',
              url: '',
              promoText: '',
              showCountdown: true
            }])}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            + 新增 CTA
          </button>
        </div>
        <div className="space-y-4">
          {ctaEvents.length === 0 && (
            <p className="text-gray-500 text-sm">尚未設定 CTA</p>
          )}
          {ctaEvents.map((cta, idx) => (
            <div key={idx} className="bg-gray-800/50 p-4 rounded space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">CTA #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => setCtaEvents(ctaEvents.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  刪除
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={cta.showAtSec}
                  onChange={(e) => {
                    const newCta = [...ctaEvents];
                    newCta[idx].showAtSec = e.target.value;
                    setCtaEvents(newCta);
                  }}
                  placeholder="顯示時間 (秒)"
                  className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 text-sm"
                />
                <input
                  type="number"
                  value={cta.hideAtSec}
                  onChange={(e) => {
                    const newCta = [...ctaEvents];
                    newCta[idx].hideAtSec = e.target.value;
                    setCtaEvents(newCta);
                  }}
                  placeholder="隱藏時間 (秒)"
                  className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 text-sm"
                />
              </div>
              <input
                type="text"
                value={cta.buttonText}
                onChange={(e) => {
                  const newCta = [...ctaEvents];
                  newCta[idx].buttonText = e.target.value;
                  setCtaEvents(newCta);
                }}
                placeholder="按鈕文字"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 text-sm"
              />
              <input
                type="url"
                value={cta.url}
                onChange={(e) => {
                  const newCta = [...ctaEvents];
                  newCta[idx].url = e.target.value;
                  setCtaEvents(newCta);
                }}
                placeholder="連結 URL"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 text-sm"
              />
              <input
                type="text"
                value={cta.promoText}
                onChange={(e) => {
                  const newCta = [...ctaEvents];
                  newCta[idx].promoText = e.target.value;
                  setCtaEvents(newCta);
                }}
                placeholder="優惠文案 (選填)"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={cta.showCountdown}
                  onChange={(e) => {
                    const newCta = [...ctaEvents];
                    newCta[idx].showCountdown = e.target.checked;
                    setCtaEvents(newCta);
                  }}
                  className="rounded"
                />
                顯示倒數計時
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Viewer Config */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold mb-4">觀看人數設定</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">基礎觀看人數</label>
            <input
              type="number"
              value={formData.viewerBaseCount}
              onChange={(e) => setFormData({ ...formData, viewerBaseCount: parseInt(e.target.value) || 100 })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">觀看人數倍率</label>
            <input
              type="number"
              step="0.1"
              value={formData.viewerMultiplier}
              onChange={(e) => setFormData({ ...formData, viewerMultiplier: parseFloat(e.target.value) || 1.5 })}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Webhook Integration */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold mb-4">Webhook 整合</h2>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Webhook URL</label>
          <input
            type="url"
            value={formData.webhookUrl}
            onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
            placeholder="https://hooks.zapier.com/... 或 CRM webhook URL"
            className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-gray-500 text-xs mt-2">報名時自動 POST 資料到此 URL（適用於 Zapier、CRM 等）</p>
        </div>
      </section>

      {/* Status */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <h2 className="text-lg font-semibold mb-4">發布狀態</h2>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'ended' })}
          className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="draft">草稿</option>
          <option value="published">已發布</option>
          <option value="ended">已結束</option>
        </select>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '儲存中...' : webinar ? '更新 Webinar' : '建立 Webinar'}
        </button>
      </div>
    </form>
  );
}
