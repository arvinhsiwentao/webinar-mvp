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
    prerollVideoUrl: webinar?.prerollVideoUrl || '',
    duration: webinar?.duration || 60,
    highlights: webinar?.highlights?.join('\n') || '',
    viewerBaseCount: webinar?.viewerBaseCount || 100,
    viewerMultiplier: webinar?.viewerMultiplier || 3,
    webhookUrl: webinar?.webhookUrl || '',
    heroImageUrl: webinar?.heroImageUrl || '',
    heroEyebrowText: webinar?.heroEyebrowText || '',
    promoImageUrl: webinar?.promoImageUrl || '',
    disclaimerText: webinar?.disclaimerText || '',
    sidebarDescription: webinar?.sidebarDescription || '',
    missedWebinarUrl: webinar?.missedWebinarUrl || '',
    endPageSalesCopy: webinar?.endPageSalesCopy || '',
    endPageCtaText: webinar?.endPageCtaText || '',
    endPageCtaUrl: webinar?.endPageCtaUrl || '',
    endPageCtaColor: webinar?.endPageCtaColor || '',
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

  const [evergreenEnabled, setEvergreenEnabled] = useState(webinar?.evergreen?.enabled || false);
  const [dailySchedule, setDailySchedule] = useState<string[]>(
    webinar?.evergreen?.dailySchedule.map(s => s.time) || ['08:00', '21:00']
  );
  const [immediateSlotEnabled, setImmediateSlotEnabled] = useState(
    webinar?.evergreen?.immediateSlot?.enabled ?? true
  );
  const [intervalMinutes, setIntervalMinutes] = useState(
    webinar?.evergreen?.immediateSlot?.intervalMinutes ?? 15
  );
  const [bufferMinutes, setBufferMinutes] = useState(
    webinar?.evergreen?.immediateSlot?.bufferMinutes ?? 3
  );
  const [maxWaitMinutes, setMaxWaitMinutes] = useState(
    webinar?.evergreen?.immediateSlot?.maxWaitMinutes ?? 30
  );
  const [evergreenTimezone, setEvergreenTimezone] = useState(
    webinar?.evergreen?.timezone || 'America/Chicago'
  );
  const [displaySlotCount, setDisplaySlotCount] = useState(
    webinar?.evergreen?.displaySlotCount ?? 4
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
        evergreen: evergreenEnabled ? {
          enabled: true,
          dailySchedule: dailySchedule.filter(t => t).map(t => ({ time: t })),
          immediateSlot: {
            enabled: immediateSlotEnabled,
            intervalMinutes,
            bufferMinutes,
            maxWaitMinutes,
          },
          videoDurationMinutes: formData.duration,
          timezone: evergreenTimezone,
          displaySlotCount,
        } : undefined,
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
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">副标题</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">视频 URL *</label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://example.com/video.mp4、.m3u8 或 YouTube 链接"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
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
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">缩略图 URL</label>
            <input
              type="text"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              placeholder="https://example.com/thumbnail.jpg"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">片头视频 URL</label>
            <input
              type="text"
              value={formData.prerollVideoUrl}
              onChange={(e) => setFormData({ ...formData, prerollVideoUrl: e.target.value })}
              placeholder="https://example.com/preroll.mp4"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
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
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">讲者头衔</label>
            <input
              type="text"
              value={formData.speakerTitle}
              onChange={(e) => setFormData({ ...formData, speakerTitle: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">讲者照片 URL</label>
            <input
              type="text"
              value={formData.speakerImage}
              onChange={(e) => setFormData({ ...formData, speakerImage: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">讲者头像 URL（圆形头像，建议正方形）</label>
            <input
              type="text"
              value={formData.speakerAvatar}
              onChange={(e) => setFormData({ ...formData, speakerAvatar: e.target.value })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
              placeholder="/images/mike-avatar.jpg"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">讲者简介</label>
            <textarea
              value={formData.speakerBio}
              onChange={(e) => setFormData({ ...formData, speakerBio: e.target.value })}
              rows={3}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
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
          className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
        />
      </section>

      {/* Landing Page Hero */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">落地页横幅</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">横幅图片 URL</label>
            <input
              type="text"
              value={formData.heroImageUrl}
              onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
              placeholder="https://example.com/hero.jpg"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">眉题文字</label>
            <input
              type="text"
              value={formData.heroEyebrowText}
              onChange={(e) => setFormData({ ...formData, heroEyebrowText: e.target.value })}
              placeholder="限时免费直播"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Sessions (hidden when evergreen is enabled) */}
      {!evergreenEnabled && (
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">场次设置</h2>
          <button
            type="button"
            onClick={() => setSessions([...sessions, { startTime: '' }])}
            className="text-[#B8953F] text-sm hover:text-[#A07A2F]"
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
                  className="flex-1 bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
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
      )}

      {/* Evergreen Schedule */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">自动循环排程 (Evergreen)</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={evergreenEnabled}
              onChange={(e) => setEvergreenEnabled(e.target.checked)}
              className="rounded accent-[#B8953F]"
            />
            启用
          </label>
        </div>

        {evergreenEnabled && (
          <div className="space-y-6">
            {/* Daily anchor times */}
            <div>
              <label className="block text-sm text-neutral-500 mb-2">每日固定场次时间</label>
              <div className="space-y-2">
                {dailySchedule.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const updated = [...dailySchedule];
                        updated[idx] = e.target.value;
                        setDailySchedule(updated);
                      }}
                      className="bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
                    />
                    {dailySchedule.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDailySchedule(dailySchedule.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDailySchedule([...dailySchedule, '12:00'])}
                  className="text-[#B8953F] text-sm hover:text-[#A07A2F]"
                >
                  + 添加时间
                </button>
              </div>
            </div>

            {/* Immediate slot config */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-3">
                <input
                  type="checkbox"
                  checked={immediateSlotEnabled}
                  onChange={(e) => setImmediateSlotEnabled(e.target.checked)}
                  className="rounded accent-[#B8953F]"
                />
                启用即时场次
              </label>
              {immediateSlotEnabled && (
                <div className="grid grid-cols-3 gap-4 ml-6">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">间隔 (分钟)</label>
                    <select
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                      className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                    >
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={60}>60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">缓冲 (分钟)</label>
                    <input
                      type="number"
                      value={bufferMinutes}
                      onChange={(e) => setBufferMinutes(Number(e.target.value))}
                      min={1}
                      max={15}
                      className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">触发阈值 (分钟)</label>
                    <input
                      type="number"
                      value={maxWaitMinutes}
                      onChange={(e) => setMaxWaitMinutes(Number(e.target.value))}
                      min={10}
                      max={120}
                      className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* General settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">显示场次数</label>
                <input
                  type="number"
                  value={displaySlotCount}
                  onChange={(e) => setDisplaySlotCount(Number(e.target.value))}
                  min={2}
                  max={8}
                  className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">时区</label>
                <select
                  value={evergreenTimezone}
                  onChange={(e) => setEvergreenTimezone(e.target.value)}
                  className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                >
                  <option value="America/Chicago">CST (北美中部)</option>
                  <option value="America/New_York">EST (北美东部)</option>
                  <option value="America/Los_Angeles">PST (北美西部)</option>
                  <option value="Asia/Taipei">TST (台北)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Auto Chat */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">自动聊天消息</h2>
          <button
            type="button"
            onClick={() => setAutoChat([...autoChat, { timeSec: '', name: '', message: '' }])}
            className="text-[#B8953F] text-sm hover:text-[#A07A2F]"
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
            className="text-[#B8953F] text-sm hover:text-[#A07A2F]"
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
                  type="text"
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
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">观看人数倍率</label>
            <input
              type="number"
              step="0.1"
              value={formData.viewerMultiplier}
              onChange={(e) => setFormData({ ...formData, viewerMultiplier: parseFloat(e.target.value) || 1.5 })}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
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
            type="text"
            value={formData.webhookUrl}
            onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
            placeholder="https://hooks.zapier.com/... 或 CRM webhook URL"
            className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
          />
          <p className="text-neutral-400 text-xs mt-2">报名时自动 POST 数据到此 URL（适用于 Zapier、CRM 等）</p>
        </div>
      </section>

      {/* Promotional Content */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">推广内容</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">推广图片 URL</label>
            <input
              type="text"
              value={formData.promoImageUrl}
              onChange={(e) => setFormData({ ...formData, promoImageUrl: e.target.value })}
              placeholder="https://example.com/promo.jpg"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">免责声明</label>
            <textarea
              value={formData.disclaimerText}
              onChange={(e) => setFormData({ ...formData, disclaimerText: e.target.value })}
              rows={3}
              placeholder="投资有风险，入市需谨慎..."
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">侧边栏描述</label>
            <textarea
              value={formData.sidebarDescription}
              onChange={(e) => setFormData({ ...formData, sidebarDescription: e.target.value })}
              rows={3}
              placeholder="关于此次直播的详细描述..."
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">错过直播跳转 URL</label>
            <input
              type="text"
              value={formData.missedWebinarUrl}
              onChange={(e) => setFormData({ ...formData, missedWebinarUrl: e.target.value })}
              placeholder="https://example.com/replay"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* End Page Settings */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">结束页设置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">销售文案</label>
            <textarea
              value={formData.endPageSalesCopy}
              onChange={(e) => setFormData({ ...formData, endPageSalesCopy: e.target.value })}
              rows={4}
              placeholder="限时优惠，立即行动..."
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-500 mb-2">CTA 按钮文字</label>
              <input
                type="text"
                value={formData.endPageCtaText}
                onChange={(e) => setFormData({ ...formData, endPageCtaText: e.target.value })}
                placeholder="立即报名"
                className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-500 mb-2">CTA 按钮链接</label>
              <input
                type="text"
                value={formData.endPageCtaUrl}
                onChange={(e) => setFormData({ ...formData, endPageCtaUrl: e.target.value })}
                placeholder="https://example.com/offer"
                className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">CTA 按钮颜色</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={formData.endPageCtaColor}
                onChange={(e) => setFormData({ ...formData, endPageCtaColor: e.target.value })}
                placeholder="#B8953F"
                className="flex-1 bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
              />
              {formData.endPageCtaColor && (
                <div
                  className="w-10 h-10 rounded border border-neutral-300 shrink-0"
                  style={{ backgroundColor: formData.endPageCtaColor }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Status */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">发布状态</h2>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'ended' })}
          className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
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
          className="bg-[#B8953F] hover:bg-[#A07A2F] text-white font-medium px-8 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '保存中...' : webinar ? '更新研讨会' : '创建研讨会'}
        </button>
      </div>
    </form>
  );
}
