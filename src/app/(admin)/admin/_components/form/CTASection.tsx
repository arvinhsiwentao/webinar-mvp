'use client';

import ArrayFieldEditor from '../ArrayFieldEditor';

export interface CTAField {
  showAtSec: string;
  hideAtSec: string;
  buttonText: string;
  promoText: string;
  showCountdown: boolean;
  position: string;
  color: string;
  secondaryText: string;
  dismissible: boolean;
}

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

interface CTASectionProps {
  ctaEvents: CTAField[];
  setCtaEvents: (v: CTAField[]) => void;
  ctaPreviewOpen: Record<number, boolean>;
  toggleCtaPreview: (idx: number) => void;
}

export default function CTASection({
  ctaEvents,
  setCtaEvents,
  ctaPreviewOpen,
  toggleCtaPreview,
}: CTASectionProps) {
  return (
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">CTA 设置</h2>
          <button
            type="button"
            onClick={() => setCtaEvents([...ctaEvents, {
              showAtSec: '',
              hideAtSec: '',
              buttonText: '',
              promoText: '',
              showCountdown: true,
              position: 'below_video',
              color: '',
              secondaryText: '',
              dismissible: false,
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
                    <label className="flex items-center gap-2 text-sm text-neutral-500">
                      <input
                        type="checkbox"
                        checked={cta.dismissible}
                        onChange={(e) => update('dismissible', e.target.checked as CTAField[keyof CTAField])}
                        className="rounded accent-[#B8953F]"
                      />
                      允许用户关闭
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
  );
}
