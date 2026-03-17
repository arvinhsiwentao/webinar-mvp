'use client';

import { useState, useEffect } from 'react';
import { formatDate, formatTime } from '@/lib/utils';
import CountryCodeSelect from './CountryCodeSelect';

interface RegistrationModalProps {
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
}

export default function RegistrationModal({
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
}: RegistrationModalProps) {
  const [showPhone, setShowPhone] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');

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
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#F5F5F0] rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="关闭"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="px-10 pt-10 pb-6">
          {/* Heading */}
          <h2 className="text-2xl font-bold text-center text-neutral-900 mb-2">
            现在预订你的免费席位
          </h2>
          <p className="text-sm text-neutral-500 text-center mb-8">
            注册完成后，即可观看讲座。
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Name field */}
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="姓名 *"
                className="w-full h-[50px] px-4 pr-10 text-base bg-white border border-[#E8E5DE] rounded focus:border-[#B8953F] focus:outline-none transition-colors"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
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
                className="w-full h-[50px] px-4 pr-10 text-base bg-white border border-[#E8E5DE] rounded focus:border-[#B8953F] focus:outline-none transition-colors"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </span>
            </div>

            {/* Slot selector */}
            {evergreenSlots && evergreenSlots.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  选择一个时间
                </label>
                <div className="relative">
                  <select
                    value={selectedSlotTime || ''}
                    onChange={(e) => onSlotTimeChange?.(e.target.value)}
                    className="w-full h-[50px] px-4 pr-10 text-base bg-white border border-[#E8E5DE] rounded focus:border-[#B8953F] focus:outline-none appearance-none transition-colors"
                  >
                    {evergreenSlots.map((slot) => (
                      <option key={slot.slotTime} value={slot.slotTime}>
                        {formatDate(slot.slotTime)} - {formatTime(slot.slotTime)}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                    ▼
                  </span>
                </div>
              </div>
            )}

            {/* SMS checkbox */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPhone}
                  onChange={(e) => setShowPhone(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-[#E8E5DE] accent-[#B8953F]"
                />
                <span className="text-sm text-neutral-600 leading-snug">
                  输入手机号码
                  <span className="text-neutral-400 ml-1">(可选，但强烈建议使用)</span>
                </span>
              </label>

              {/* Phone field (conditional) */}
              {showPhone && (
                <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex">
                    <CountryCodeSelect
                      value={countryCode}
                      onChange={setCountryCode}
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => onPhoneChange(e.target.value)}
                      placeholder="手机号码"
                      className="flex-1 h-[50px] px-4 text-base bg-white border border-[#E8E5DE] rounded-r focus:border-[#B8953F] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded">
                {formError}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[50px] bg-[#B8953F] text-white text-lg font-medium rounded hover:bg-[#A6842F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '处理中...' : '确认报名'}
            </button>
          </form>

          {/* Privacy notice */}
          <p className="text-xs text-neutral-400 text-center mt-4">
            🔒 我们不会发送垃圾信息，也不会销售你的个人信息，请放心。
          </p>
        </div>
      </div>

      {/* Motivational text below modal (visible on scroll) */}
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="text-xl font-bold text-white/80">
          未来的你，会感谢今天的决定
        </p>
      </div>
    </div>
  );
}
