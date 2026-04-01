'use client';

import { useState } from 'react';
import { validateEmail } from '@/lib/utils';
import { trackGA4 } from '@/lib/analytics';

const getCookieValue = (name: string): string | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const getAttr = (key: string): string | undefined => {
  try {
    return sessionStorage.getItem(key) || getCookieValue(key) || undefined;
  } catch { return undefined; }
};

interface UseRegistrationFormOptions {
  webinarId: string;
  onSuccess: (name: string) => void;
  onFormSubmit?: () => void;
  emailErrorMessage?: string;
  assignedSlot?: string;  // evergreen slot time
  source?: string;
}

export function useRegistrationForm({ webinarId, onSuccess, onFormSubmit, emailErrorMessage = '请输入有效的邮箱地址', assignedSlot, source }: UseRegistrationFormOptions) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateEmail(email)) {
      setFormError(emailErrorMessage);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinarId,
          name: name.trim() || '学员',
          email: email.trim(),
          phone: phone.trim() || undefined,
          assignedSlot: assignedSlot || undefined,
          utmSource: getAttr('utm_source'),
          utmMedium: getAttr('utm_medium'),
          utmCampaign: getAttr('utm_campaign'),
          utmContent: getAttr('utm_content'),
          gclid: getAttr('gclid'),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      onFormSubmit?.();
      trackGA4('sign_up', {
        method: source ? `webinar_registration_${source}` : 'webinar_registration',
        webinar_id: String(webinarId),
      });
      onSuccess(name.trim() || '学员');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '报名失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    name, setName,
    email, setEmail,
    phone, setPhone,
    submitting,
    formError,
    handleSubmit,
  };
}
