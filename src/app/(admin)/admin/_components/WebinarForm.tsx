'use client';

import { useState, useCallback } from 'react';
import { Webinar } from '@/lib/types';
import ArrayFieldEditor from './ArrayFieldEditor';
import VideoManager from './VideoManager';
import EvergreenSection from './form/EvergreenSection';
import CTASection, { CTAField } from './form/CTASection';
import PromoSection from './form/PromoSection';

interface AutoChatField {
  timeSec: string;
  name: string;
  message: string;
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
      promoText: c.promoText || '',
      showCountdown: c.showCountdown,
      position: c.position || 'below_video',
      color: c.color || '',
      secondaryText: c.secondaryText || '',
      dismissible: c.dismissible || false,
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
        ctaEvents: ctaEvents.filter(c => c.buttonText).map(c => ({
          showAtSec: parseInt(c.showAtSec) || 0,
          hideAtSec: parseInt(c.hideAtSec) || 0,
          buttonText: c.buttonText,
          promoText: c.promoText || undefined,
          showCountdown: c.showCountdown,
          position: c.position || 'below_video',
          color: c.color || undefined,
          secondaryText: c.secondaryText || undefined,
          dismissible: c.dismissible || undefined,
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

      <EvergreenSection
        dailySchedule={dailySchedule}
        setDailySchedule={setDailySchedule}
        immediateSlotEnabled={immediateSlotEnabled}
        setImmediateSlotEnabled={setImmediateSlotEnabled}
        intervalMinutes={intervalMinutes}
        setIntervalMinutes={setIntervalMinutes}
        bufferMinutes={bufferMinutes}
        setBufferMinutes={setBufferMinutes}
        maxWaitMinutes={maxWaitMinutes}
        setMaxWaitMinutes={setMaxWaitMinutes}
        displaySlotCount={displaySlotCount}
        setDisplaySlotCount={setDisplaySlotCount}
        evergreenTimezone={evergreenTimezone}
        setEvergreenTimezone={setEvergreenTimezone}
      />

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

      <CTASection
        ctaEvents={ctaEvents}
        setCtaEvents={setCtaEvents}
        ctaPreviewOpen={ctaPreviewOpen}
        toggleCtaPreview={toggleCtaPreview}
      />

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

      <PromoSection
        formData={formData}
        onFieldChange={(field, value) => setFormData({ ...formData, [field]: value })}
      />

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
