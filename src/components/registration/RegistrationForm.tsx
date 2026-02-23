'use client';

import React from 'react';

interface RegistrationFormProps {
  name: string;
  onNameChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  formError: string;
  submitLabel?: string;
  emailLabel?: string;
  phoneLabel?: React.ReactNode;
  phonePlaceholder?: string;
  submitClassName?: string;
  onNameFocus?: () => void;
}

export default function RegistrationForm({
  name,
  onNameChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  onSubmit,
  submitting,
  formError,
  submitLabel = '确认报名',
  emailLabel = '邮箱',
  phoneLabel,
  phonePlaceholder = '(555) 123-4567',
  submitClassName = 'mt-8',
  onNameFocus,
}: RegistrationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="block text-sm text-neutral-500 mb-2">姓名</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={onNameFocus}
          className="w-full bg-transparent border-b border-[#E8E5DE] py-3 text-neutral-900 placeholder-neutral-400 focus:border-[#B8953F] focus:outline-none transition-colors"
          placeholder="你的名字"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-500 mb-2">{emailLabel}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full bg-transparent border-b border-[#E8E5DE] py-3 text-neutral-900 placeholder-neutral-400 focus:border-[#B8953F] focus:outline-none transition-colors"
          placeholder="your@email.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-500 mb-2">{phoneLabel}</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="w-full bg-transparent border-b border-[#E8E5DE] py-3 text-neutral-900 placeholder-neutral-400 focus:border-[#B8953F] focus:outline-none transition-colors"
          placeholder={phonePlaceholder}
        />
      </div>

      {formError && (
        <p className="text-red-400 text-sm">{formError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={`w-full bg-[#B8953F] text-white py-4 font-semibold tracking-wide hover:bg-[#A6842F] hover:shadow-[0_0_30px_rgba(184,149,63,0.3)] transition-all disabled:opacity-50 ${submitClassName}`}
      >
        {submitting ? '处理中...' : submitLabel}
      </button>
    </form>
  );
}
