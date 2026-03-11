'use client';

import { useState, useCallback } from 'react';
import { Webinar } from '@/lib/types';
import ArrayFieldEditor from './ArrayFieldEditor';
import VideoManager from './VideoManager';

function CTAPreview({ cta }: { cta: CTAField }) {
  const buttonColor = cta.color || '#B8953F';
  const isOnVideo = cta.position === 'on_video';

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: isOnVideo ? 'rgba(0,0,0,0.75)' : '#F5F3EE',
        padding: '16px 20px',
        maxWidth: 320,
      }}
    >
      {cta.promoText && (
        <p style={{
          color: isOnVideo ? '#FFFFFF' : '#1A1A1A',
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 4,
          lineHeight: 1.3,
        }}>
          {cta.promoText}
        </p>
      )}
      {cta.secondaryText && (
        <p style={{
          color: isOnVideo ? 'rgba(255,255,255,0.8)' : '#6B6B6B',
          fontSize: 12,
          marginBottom: 8,
        }}>
          {cta.secondaryText}
        </p>
      )}
      {cta.showCountdown && (
        <p style={{
          color: isOnVideo ? '#FFD700' : '#B8953F',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 8,
          fontVariantNumeric: 'tabular-nums',
        }}>
          限时优惠 02:00
        </p>
      )}
      <div
        style={{
          backgroundColor: buttonColor,
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: 14,
          padding: '8px 16px',
          borderRadius: 6,
          textAlign: 'center',
          cursor: 'default',
        }}
      >
        {cta.buttonText || '按钮文字'}
      </div>
    </div>
  );
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
  position: string;
  color: string;
  secondaryText: string;
}

interface WebinarFormProps {
  webinar?: Webinar;
  onSaved: () => void;
}

export default function WebinarForm({ webinar, onSaved }: WebinarFormProps) {
  const [formData, setFormData] = useState({
    title: webinar?.title || '',
    speakerName: webinar?.speakerName || '',
    speakerTitle: webinar?.speakerTitle || '',
    speakerImage: webinar?.speakerImage || '',
    speakerAvatar: webinar?.speakerAvatar || '',
    videoUrl: webinar?.videoUrl || '',
    duration: webinar?.duration || 60,
    highlights: webinar?.highlights?.join('\n') || '',
    viewerPeakTarget: webinar?.viewerPeakTarget ?? 60,
    viewerRampMinutes: webinar?.viewerRampMinutes ?? 15,
    webhookUrl: webinar?.webhookUrl || '',
    heroImageUrl: webinar?.heroImageUrl || '',
    promoImageUrl: webinar?.promoImageUrl || '',
    disclaimerText: webinar?.disclaimerText || '',
    sidebarDescription: webinar?.sidebarDescription || '',
    endPageSalesCopy: webinar?.endPageSalesCopy || '',
    endPageCtaText: webinar?.endPageCtaText || '',
    status: webinar?.status || 'draft',
  });

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
      position: c.position || 'below_video',
      color: c.color || '',
      secondaryText: c.secondaryText || '',
    })) || []
  );

  const [evergreenEnabled] = useState(true);
  const [dailySchedule, setDailySchedule] = useState<string[]>(
    webinar?.evergreen?.dailySchedule.map(s => s.time) || ['08:00', '21:00']
  );
  const [immediateSlotEnabled, setImmediateSlotEnabled] = useState(
    webinar?.evergreen?.immediateSlot?.enabled ?? true
  );
  const [intervalMinutes, setIntervalMinutes] = useState(
    webinar?.evergreen?.immediateSlot?.intervalMinutes ?? 5
  );
  const [bufferMinutes, setBufferMinutes] = useState(
    webinar?.evergreen?.immediateSlot?.bufferMinutes ?? 0
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
  const [ctaPreviewOpen, setCtaPreviewOpen] = useState<Record<number, boolean>>({});
  const toggleCtaPreview = useCallback((idx: number) => {
    setCtaPreviewOpen(prev => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        ...formData,
        highlights: formData.highlights.split('\n').filter(h => h.trim()),
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
          position: c.position || 'below_video',
          color: c.color || undefined,
          secondaryText: c.secondaryText || undefined,
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
          <div className="md:col-span-2">
            <VideoManager
              value={formData.videoUrl}
              onChange={(url) => setFormData({ ...formData, videoUrl: url })}
            />
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
      </section>

      {/* Evergreen Schedule */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">自动循环排程 (Evergreen)</h2>

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
                      <option value={5}>5</option>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={60}>60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">缓冲 (分钟)</label>
                    <select
                      value={bufferMinutes}
                      onChange={(e) => setBufferMinutes(Number(e.target.value))}
                      className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
                    >
                      <option value={0}>0 (无缓冲)</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                    </select>
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
              showCountdown: true,
              position: 'below_video',
              color: '',
              secondaryText: '',
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
              <div className="bg-[#F5F5F0] p-4 rounded space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1A1A1A]">CTA #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={remove}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    删除
                  </button>
                </div>

                {/* 时间设置 */}
                <div>
                  <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-2">时间设置</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A]">显示时间</label>
                      <p className="text-xs text-[#999] mt-0.5 mb-1">CTA 出现的视频播放秒数</p>
                      <input
                        type="number"
                        value={cta.showAtSec}
                        onChange={(e) => update('showAtSec', e.target.value)}
                        placeholder="例: 300"
                        className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-[#E8E5DE] text-sm focus:border-[#B8953F] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A]">隐藏时间</label>
                      <p className="text-xs text-[#999] mt-0.5 mb-1">CTA 消失的视频播放秒数</p>
                      <input
                        type="number"
                        value={cta.hideAtSec}
                        onChange={(e) => update('hideAtSec', e.target.value)}
                        placeholder="例: 600"
                        className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-[#E8E5DE] text-sm focus:border-[#B8953F] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-[#E8E5DE]" />

                {/* 内容设置 */}
                <div>
                  <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-2">内容设置</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A]">促销文案</label>
                      <p className="text-xs text-[#999] mt-0.5 mb-1">按钮上方的大字促销信息，如「限时优惠 原价 &rarr; 特价」</p>
                      <input
                        type="text"
                        value={cta.promoText}
                        onChange={(e) => update('promoText', e.target.value)}
                        placeholder="限时优惠 $199 → $99"
                        className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-[#E8E5DE] text-sm focus:border-[#B8953F] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A]">副标题</label>
                      <p className="text-xs text-[#999] mt-0.5 mb-1">按钮上方的小字补充说明</p>
                      <input
                        type="text"
                        value={cta.secondaryText}
                        onChange={(e) => update('secondaryText', e.target.value as CTAField[keyof CTAField])}
                        placeholder="仅限本次直播观众"
                        className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-[#E8E5DE] text-sm focus:border-[#B8953F] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A]">按钮文字</label>
                      <p className="text-xs text-[#999] mt-0.5 mb-1">CTA 按钮上显示的文字</p>
                      <input
                        type="text"
                        value={cta.buttonText}
                        onChange={(e) => update('buttonText', e.target.value)}
                        placeholder="立即抢购"
                        className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-[#E8E5DE] text-sm focus:border-[#B8953F] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A]">链接地址</label>
                      <p className="text-xs text-[#999] mt-0.5 mb-1">点击按钮后跳转的网址</p>
                      <input
                        type="text"
                        value={cta.url}
                        onChange={(e) => update('url', e.target.value)}
                        placeholder="https://example.com/checkout"
                        className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-[#E8E5DE] text-sm focus:border-[#B8953F] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-[#E8E5DE]" />

                {/* 样式设置 */}
                <div>
                  <h4 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-2">样式设置</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A]">显示位置</label>
                      <p className="text-xs text-[#999] mt-0.5 mb-1">选择 CTA 出现在视频上方浮层还是视频下方独立区域</p>
                      <select
                        value={cta.position}
                        onChange={(e) => update('position', e.target.value as CTAField[keyof CTAField])}
                        className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-[#E8E5DE] text-sm focus:border-[#B8953F] focus:outline-none"
                      >
                        <option value="below_video">视频下方</option>
                        <option value="on_video">视频上方 (浮层)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A]">按钮颜色</label>
                      <p className="text-xs text-[#999] mt-0.5 mb-1">CTA 按钮的背景颜色，默认为金色 #B8953F</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={cta.color}
                          onChange={(e) => update('color', e.target.value as CTAField[keyof CTAField])}
                          placeholder="#B8953F"
                          className="flex-1 bg-white text-neutral-900 px-3 py-2 rounded border border-[#E8E5DE] text-sm focus:border-[#B8953F] focus:outline-none"
                        />
                        {cta.color && (
                          <div
                            className="w-8 h-8 rounded border border-[#E8E5DE] shrink-0"
                            style={{ backgroundColor: cta.color }}
                          />
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-neutral-500">
                      <input
                        type="checkbox"
                        checked={cta.showCountdown}
                        onChange={(e) => update('showCountdown', e.target.checked as CTAField[keyof CTAField])}
                        className="rounded accent-[#B8953F]"
                      />
                      显示倒计时
                    </label>
                  </div>
                </div>

                <hr className="border-[#E8E5DE]" />

                {/* 预览效果 */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleCtaPreview(idx)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide hover:text-[#1A1A1A] transition-colors"
                  >
                    <span style={{
                      display: 'inline-block',
                      transform: ctaPreviewOpen[idx] ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s',
                    }}>&#9654;</span>
                    预览效果
                  </button>
                  {ctaPreviewOpen[idx] && (
                    <div className="mt-3 p-4 bg-[#E8E5DE] rounded-lg flex justify-center">
                      <CTAPreview cta={cta} />
                    </div>
                  )}
                </div>
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
            <label className="block text-sm text-neutral-500 mb-2">高峰观看人数</label>
            <input
              type="number"
              value={formData.viewerPeakTarget}
              onChange={(e) => setFormData({ ...formData, viewerPeakTarget: parseInt(e.target.value) || 60 })}
              min={5}
              max={500}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
            <p className="text-neutral-400 text-xs mt-1">观众列表中显示的最大人数 (建议 30-100)</p>
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">升温时间 (分钟)</label>
            <input
              type="number"
              value={formData.viewerRampMinutes}
              onChange={(e) => setFormData({ ...formData, viewerRampMinutes: parseInt(e.target.value) || 15 })}
              min={1}
              max={60}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
            <p className="text-neutral-400 text-xs mt-1">从开播到高峰人数的过渡时间</p>
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
