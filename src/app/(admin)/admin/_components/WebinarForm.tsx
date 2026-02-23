'use client';

import { useState } from 'react';
import { Webinar } from '@/lib/types';
import ArrayFieldEditor from './ArrayFieldEditor';

interface SessionField {
  startTime: string;
}

interface AutoChatField {
  timeSec: string;
  name: string;
  message: string;
}

interface CTAField {
  showAtSec: string;
  hideAtSec: string;
  buttonText: string;
  url: string;
  promoText: string;
  showCountdown: boolean;
}

interface WebinarFormProps {
  webinar?: Webinar;
  onSaved: () => void;
}

export default function WebinarForm({ webinar, onSaved }: WebinarFormProps) {
  const [formData, setFormData] = useState({
    title: webinar?.title || '',
    subtitle: webinar?.subtitle || '',
    speakerName: webinar?.speakerName || '',
    speakerTitle: webinar?.speakerTitle || '',
    speakerBio: webinar?.speakerBio || '',
    speakerImage: webinar?.speakerImage || '',
    speakerAvatar: webinar?.speakerAvatar || '',
    videoUrl: webinar?.videoUrl || '',
    thumbnailUrl: webinar?.thumbnailUrl || '',
    duration: webinar?.duration || 60,
    highlights: webinar?.highlights?.join('\n') || '',
    viewerBaseCount: webinar?.viewerBaseCount || 100,
    viewerMultiplier: webinar?.viewerMultiplier || 3,
    webhookUrl: webinar?.webhookUrl || '',
    status: webinar?.status || 'draft',
  });

  const [sessions, setSessions] = useState<SessionField[]>(
    webinar?.sessions.map(s => ({ startTime: s.startTime.slice(0, 16) })) || [{ startTime: '' }]
  );

  const [autoChat, setAutoChat] = useState<AutoChatField[]>(
    webinar?.autoChat.map(m => ({
      timeSec: String(m.timeSec),
      name: m.name,
      message: m.message
    })) || []
  );

  const [ctaEvents, setCtaEvents] = useState<CTAField[]>(
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
            <label className="block text-sm text-neutral-500 mb-2">讲者头像 URL（圆形头像，建议正方形）</label>
            <input
              type="url"
              value={formData.speakerAvatar}
              onChange={(e) => setFormData({ ...formData, speakerAvatar: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
              placeholder="/images/mike-avatar.jpg"
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
          <ArrayFieldEditor<SessionField>
            items={sessions}
            onChange={setSessions}
            renderItem={(session, idx, update, remove) => (
              <div className="flex items-center gap-3">
                <span className="text-neutral-400 text-sm w-16">场次 {idx + 1}</span>
                <input
                  type="datetime-local"
                  value={session.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                  className="flex-1 bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-blue-500 focus:outline-none"
                />
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={remove}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          />
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
          <ArrayFieldEditor<AutoChatField>
            items={autoChat}
            onChange={setAutoChat}
            emptyLabel="尚未设置自动消息"
            renderItem={(msg, _idx, update, remove) => (
              <div className="flex items-center gap-3 bg-[#F5F5F0] p-3 rounded">
                <input
                  type="number"
                  value={msg.timeSec}
                  onChange={(e) => update('timeSec', e.target.value)}
                  placeholder="秒"
                  className="w-20 bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                />
                <input
                  type="text"
                  value={msg.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="昵称"
                  className="w-24 bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                />
                <input
                  type="text"
                  value={msg.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="消息内容"
                  className="flex-1 bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                />
                <button
                  type="button"
                  onClick={remove}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            )}
          />
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
          <ArrayFieldEditor<CTAField>
            items={ctaEvents}
            onChange={setCtaEvents}
            emptyLabel="尚未设置 CTA"
            renderItem={(cta, idx, update, remove) => (
              <div className="bg-[#F5F5F0] p-4 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">CTA #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={remove}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    删除
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={cta.showAtSec}
                    onChange={(e) => update('showAtSec', e.target.value)}
                    placeholder="显示时间 (秒)"
                    className="bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                  />
                  <input
                    type="number"
                    value={cta.hideAtSec}
                    onChange={(e) => update('hideAtSec', e.target.value)}
                    placeholder="隐藏时间 (秒)"
                    className="bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={cta.buttonText}
                  onChange={(e) => update('buttonText', e.target.value)}
                  placeholder="按钮文字"
                  className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                />
                <input
                  type="url"
                  value={cta.url}
                  onChange={(e) => update('url', e.target.value)}
                  placeholder="链接 URL"
                  className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                />
                <input
                  type="text"
                  value={cta.promoText}
                  onChange={(e) => update('promoText', e.target.value)}
                  placeholder="优惠文案 (选填)"
                  className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-neutral-500">
                  <input
                    type="checkbox"
                    checked={cta.showCountdown}
                    onChange={(e) => update('showCountdown', e.target.checked as CTAField[keyof CTAField])}
                    className="rounded"
                  />
                  显示倒计时
                </label>
              </div>
            )}
          />
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
