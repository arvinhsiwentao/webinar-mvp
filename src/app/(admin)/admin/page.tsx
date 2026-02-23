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
    if (!confirm('确定要删除此研讨会吗？')) return;

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
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">研讨会管理后台</h1>
          <Link href="/" className="text-neutral-500 hover:text-neutral-900 text-sm">
            ← 返回首页
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white/80 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-4">
            <button
              onClick={() => { setActiveTab('list'); setEditingWebinar(null); }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              场次管理
            </button>
            <button
              onClick={() => { setActiveTab('create'); setEditingWebinar(null); }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              创建研讨会
            </button>
            <button
              onClick={() => { setActiveTab('registrations'); setEditingWebinar(null); }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'registrations'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              报名名单
            </button>
            {activeTab === 'edit' && (
              <span className="py-3 px-4 text-sm font-medium border-b-2 border-blue-500 text-blue-400">
                编辑研讨会
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
        <p className="text-neutral-400 mb-4">尚未创建任何研讨会</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {webinars.map((webinar) => (
        <div
          key={webinar.id}
          className="bg-white rounded-lg p-6 border border-neutral-200 hover:border-neutral-300 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{webinar.title}</h3>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  webinar.status === 'published'
                    ? 'bg-green-500/20 text-green-400'
                    : webinar.status === 'ended'
                    ? 'bg-neutral-100 text-neutral-500'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {webinar.status === 'published' ? '已发布' : webinar.status === 'ended' ? '已结束' : '草稿'}
                </span>
              </div>
              <p className="text-neutral-500 text-sm mb-3">
                讲者: {webinar.speakerName} | 时长: {webinar.duration} 分钟
              </p>

              {/* Sessions */}
              <div className="flex flex-wrap gap-2 mb-3">
                {webinar.sessions.map((session: Session, idx: number) => (
                  <span
                    key={idx}
                    className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded"
                  >
                    {formatDateTime(session.startTime)}
                  </span>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4 text-xs text-neutral-400">
                <span>{webinar.autoChat.length} 条自动消息</span>
                <span>{webinar.ctaEvents.length} 个 CTA</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Link
                href={`/webinar/${webinar.id}`}
                target="_blank"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded transition-colors text-center"
              >
                预览
              </Link>
              <button
                onClick={() => onEdit(webinar)}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-sm px-4 py-2 rounded transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(webinar.id)}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm px-4 py-2 rounded transition-colors"
              >
                删除
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
  const headers = ['姓名', 'Email', '电话', '场次', '报名时间'];
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
        <p className="text-neutral-400 mb-4">暂无报名数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {webinars.map((webinar) => {
        const regs = registrationMap[webinar.id] || [];
        if (regs.length === 0) return null;
        return (
          <div key={webinar.id} className="bg-white rounded-lg p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {webinar.title}
                <span className="ml-2 text-sm text-neutral-500">({regs.length} 条报名)</span>
              </h3>
              <button
                onClick={() => exportCSV(regs, webinar.title)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                导出 CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500">
                    <th className="text-left py-2 pr-4">姓名</th>
                    <th className="text-left py-2 pr-4">Email</th>
                    <th className="text-left py-2 pr-4">电话</th>
                    <th className="text-left py-2 pr-4">场次</th>
                    <th className="text-left py-2">报名时间</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-200/80 text-neutral-600">
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
        throw new Error(data.error || '保存失败');
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">基本信息</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">副标题</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">视频 URL *</label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://example.com/video.mp4、.m3u8 或 YouTube 链接"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-xs text-neutral-400 mt-1">
              支持格式：MP4 直链、M3U8 (HLS) 流媒体、YouTube 视频链接
            </p>
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">时长 (分钟)</label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Speaker Info */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">讲者信息</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">讲者姓名 *</label>
            <input
              type="text"
              value={formData.speakerName}
              onChange={(e) => setFormData({ ...formData, speakerName: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">讲者头衔</label>
            <input
              type="text"
              value={formData.speakerTitle}
              onChange={(e) => setFormData({ ...formData, speakerTitle: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">讲者照片 URL</label>
            <input
              type="url"
              value={formData.speakerImage}
              onChange={(e) => setFormData({ ...formData, speakerImage: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">讲者简介</label>
            <textarea
              value={formData.speakerBio}
              onChange={(e) => setFormData({ ...formData, speakerBio: e.target.value })}
              rows={3}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">学习要点</h2>
        <p className="text-neutral-400 text-sm mb-2">每行一个要点</p>
        <textarea
          value={formData.highlights}
          onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
          rows={4}
          placeholder="了解 2026 年最具潜力的投资趋势&#10;学习 AI 产业的核心投资逻辑&#10;掌握数字资产配置的黄金比例"
          className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
        />
      </section>

      {/* Sessions */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">场次设置</h2>
          <button
            type="button"
            onClick={() => setSessions([...sessions, { startTime: '' }])}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            + 添加场次
          </button>
        </div>
        <div className="space-y-3">
          {sessions.map((session, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-neutral-400 text-sm w-16">场次 {idx + 1}</span>
              <input
                type="datetime-local"
                value={session.startTime}
                onChange={(e) => {
                  const newSessions = [...sessions];
                  newSessions[idx].startTime = e.target.value;
                  setSessions(newSessions);
                }}
                className="flex-1 bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
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
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">自动聊天消息</h2>
          <button
            type="button"
            onClick={() => setAutoChat([...autoChat, { timeSec: '', name: '', message: '' }])}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            + 添加消息
          </button>
        </div>
        <div className="space-y-3">
          {autoChat.length === 0 && (
            <p className="text-neutral-400 text-sm">尚未设置自动消息</p>
          )}
          {autoChat.map((msg, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-[#F5F5F0] p-3 rounded">
              <input
                type="number"
                value={msg.timeSec}
                onChange={(e) => {
                  const newChat = [...autoChat];
                  newChat[idx].timeSec = e.target.value;
                  setAutoChat(newChat);
                }}
                placeholder="秒"
                className="w-20 bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
              />
              <input
                type="text"
                value={msg.name}
                onChange={(e) => {
                  const newChat = [...autoChat];
                  newChat[idx].name = e.target.value;
                  setAutoChat(newChat);
                }}
                placeholder="昵称"
                className="w-24 bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
              />
              <input
                type="text"
                value={msg.message}
                onChange={(e) => {
                  const newChat = [...autoChat];
                  newChat[idx].message = e.target.value;
                  setAutoChat(newChat);
                }}
                placeholder="消息内容"
                className="flex-1 bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
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
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">CTA 设置</h2>
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
            + 添加 CTA
          </button>
        </div>
        <div className="space-y-4">
          {ctaEvents.length === 0 && (
            <p className="text-neutral-400 text-sm">尚未设置 CTA</p>
          )}
          {ctaEvents.map((cta, idx) => (
            <div key={idx} className="bg-[#F5F5F0] p-4 rounded space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">CTA #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => setCtaEvents(ctaEvents.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  删除
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
                  placeholder="显示时间 (秒)"
                  className="bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                />
                <input
                  type="number"
                  value={cta.hideAtSec}
                  onChange={(e) => {
                    const newCta = [...ctaEvents];
                    newCta[idx].hideAtSec = e.target.value;
                    setCtaEvents(newCta);
                  }}
                  placeholder="隐藏时间 (秒)"
                  className="bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
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
                placeholder="按钮文字"
                className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
              />
              <input
                type="url"
                value={cta.url}
                onChange={(e) => {
                  const newCta = [...ctaEvents];
                  newCta[idx].url = e.target.value;
                  setCtaEvents(newCta);
                }}
                placeholder="链接 URL"
                className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
              />
              <input
                type="text"
                value={cta.promoText}
                onChange={(e) => {
                  const newCta = [...ctaEvents];
                  newCta[idx].promoText = e.target.value;
                  setCtaEvents(newCta);
                }}
                placeholder="优惠文案 (选填)"
                className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-neutral-500">
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
                显示倒计时
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Viewer Config */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">观看人数设置</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">基础观看人数</label>
            <input
              type="number"
              value={formData.viewerBaseCount}
              onChange={(e) => setFormData({ ...formData, viewerBaseCount: parseInt(e.target.value) || 100 })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">观看人数倍率</label>
            <input
              type="number"
              step="0.1"
              value={formData.viewerMultiplier}
              onChange={(e) => setFormData({ ...formData, viewerMultiplier: parseFloat(e.target.value) || 1.5 })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Webhook Integration */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">Webhook 集成</h2>
        <div>
          <label className="block text-sm text-neutral-500 mb-2">Webhook URL</label>
          <input
            type="url"
            value={formData.webhookUrl}
            onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
            placeholder="https://hooks.zapier.com/... 或 CRM webhook URL"
            className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-neutral-400 text-xs mt-2">报名时自动 POST 数据到此 URL（适用于 Zapier、CRM 等）</p>
        </div>
      </section>

      {/* Status */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">发布状态</h2>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'ended' })}
          className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="ended">已结束</option>
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
          {saving ? '保存中...' : webinar ? '更新研讨会' : '创建研讨会'}
        </button>
      </div>
    </form>
  );
}
