'use client';

import { useEffect, useCallback } from 'react';
import { formatDate, formatTime } from '@/lib/utils';
import { getTimezoneLabel } from '@/lib/timezone';
import { trackGA4 } from '@/lib/analytics';

interface RegistrationModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  onNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  formError: string;
  evergreenSlots?: Array<{ slotTime: string; type: string }>;
  selectedSlotTime?: string;
  onSlotTimeChange?: (slotTime: string) => void;
  timezone?: string;
  /** 如果从场次卡片点进来，已有预选场次，隐藏选择器 */
  hideSlotSelector?: boolean;
  /** 追踪来源 */
  source?: string;
  /** 剩余名额（从场次卡片传入，增强 FOMO） */
  remainingSeats?: number;
  /** 已报名人数 */
  registeredCount?: number;
}

export default function RegistrationModalV2({
  isOpen,
  onClose,
  name,
  onNameChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  onSubmit,
  submitting,
  formError,
  evergreenSlots,
  selectedSlotTime,
  onSlotTimeChange,
  timezone,
  hideSlotSelector = false,
  source = '',
  remainingSeats,
  registeredCount,
}: RegistrationModalV2Props) {
  const handleClose = useCallback(() => {
    trackGA4('c_modal_close', {
      had_input: name.length > 0 || email.length > 0,
      source,
    });
    onClose();
  }, [name, email, source, onClose]);
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // 显示已选场次的时间
  const selectedSlotDisplay = selectedSlotTime && timezone
    ? `${formatDate(selectedSlotTime, timezone)} ${formatTime(selectedSlotTime, timezone)} ${getTimezoneLabel(timezone)}`
    : null;

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal — 手機: bottom sheet；桌機: 居中 */}
      <div className="relative w-full md:max-w-lg md:mx-4 bg-[#111318] border border-[#C9A962]/20 rounded-t-2xl md:rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom md:zoom-in-95 duration-300">
        {/* 關閉按鈕 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
          aria-label="关闭"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="px-6 md:px-10 pt-4 md:pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* Heading */}
          <h2 className="text-lg md:text-2xl font-bold text-center text-white mb-5 pr-6 md:pr-0" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            免费领取价值 <span className="text-[#B8953F]">$219 USD</span> 的直播席位
          </h2>

          {/* 已选场次提示 */}
          {hideSlotSelector && selectedSlotDisplay && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-lg bg-[#C9A962]/10 border border-[#C9A962]/20">
              <svg className="w-4 h-4 text-[#C9A962] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-[#E8D5A3]">{selectedSlotDisplay}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Name field */}
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="你的昵称（选填）"
                className="w-full h-[50px] px-4 pr-10 text-base bg-white/[0.06] border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:border-[#C9A962] focus:outline-none transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
            </div>

            {/* Email field */}
            <div className="relative">
              <input
                type="text"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="电子邮箱 *"
                className="w-full h-[50px] px-4 pr-10 text-base bg-white/[0.06] border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:border-[#C9A962] focus:outline-none transition-colors"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </span>
            </div>

            {/* Slot selector — 只在非预选模式显示 */}
            {!hideSlotSelector && evergreenSlots && evergreenSlots.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">
                  选择一个时间
                </label>
                <div className="relative">
                  <select
                    value={selectedSlotTime || ''}
                    onChange={(e) => onSlotTimeChange?.(e.target.value)}
                    className="w-full h-[50px] px-4 pr-10 text-base bg-white/[0.06] border border-white/10 rounded-lg text-white focus:border-[#C9A962] focus:outline-none appearance-none transition-colors"
                  >
                    {evergreenSlots.map((slot) => (
                      <option key={slot.slotTime} value={slot.slotTime} className="bg-[#111318] text-white">
                        {formatDate(slot.slotTime, timezone)} - {formatTime(slot.slotTime, timezone)}{timezone ? ` ${getTimezoneLabel(timezone)}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                    ▼
                  </span>
                </div>
              </div>
            )}


            {/* Error message */}
            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
                {formError}
              </div>
            )}

            {/* FOMO indicators */}
            {(remainingSeats !== undefined || (registeredCount !== undefined && registeredCount > 0)) && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <p className="text-sm text-red-300">
                  {registeredCount !== undefined && registeredCount > 0 && (
                    <><span className="font-bold text-red-200">{registeredCount}</span> 人已报名 · </>
                  )}
                  {remainingSeats !== undefined && (
                    <>仅剩 <span className="font-bold text-red-200">{remainingSeats}</span> 个名额</>
                  )}
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full py-3 overflow-hidden bg-[#B8953F] text-white font-semibold rounded-lg hover:bg-[#A6842F] hover:shadow-[0_0_20px_rgba(184,149,63,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[ctaShimmer_2s_ease-in-out_infinite]" />
              </span>
              <span className="relative z-10 flex flex-col items-center leading-snug">
                <span className="text-lg">{submitting ? '处理中...' : '马上抢免费席位 →'}</span>
              </span>
            </button>
          </form>

          {/* Privacy notice */}
          <p className="text-xs text-neutral-500 text-center mt-4">
            仅用于发送直播提醒，不会发送垃圾信息或出售个人信息。
          </p>
        </div>
      </div>
    </div>
  );
}
