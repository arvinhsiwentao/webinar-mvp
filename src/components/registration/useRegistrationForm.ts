'use client';

import { useState } from 'react';
import { validateEmail } from '@/lib/utils';

interface UseRegistrationFormOptions {
  webinarId: string;
  onSuccess: (name: string) => void;
  onFormSubmit?: () => void;
  emailErrorMessage?: string;
  assignedSlot?: string;  // evergreen slot time
}

export function useRegistrationForm({ webinarId, onSuccess, onFormSubmit, emailErrorMessage = '请输入有效的邮箱地址', assignedSlot }: UseRegistrationFormOptions) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('请输入姓名');
      return;
    }
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
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          assignedSlot: assignedSlot || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      onFormSubmit?.();
      onSuccess(name);
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
