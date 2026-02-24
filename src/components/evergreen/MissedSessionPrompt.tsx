'use client';

import { useState } from 'react';
import CountdownTimer from '@/components/countdown/CountdownTimer';

interface MissedSessionPromptProps {
  missedSlotTime: string;
  nextSlotTime: string;
  webinarId: string;
  registrationId: string;
  onReassigned: (newSlot: string, expiresAt: string) => void;
}

export default function MissedSessionPrompt({
  missedSlotTime,
  nextSlotTime,
  webinarId,
  registrationId,
  onReassigned,
}: MissedSessionPromptProps) {
  const [reassigning, setReassigning] = useState(false);

  const missedTimeLabel = new Date(missedSlotTime).toLocaleTimeString('zh-CN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const handleReassign = async () => {
    setReassigning(true);
    try {
      const res = await fetch(`/api/webinar/${webinarId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          previousSlot: missedSlotTime,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onReassigned(data.newSlot, data.expiresAt);
      }
    } catch {
      // silent fail, user can retry
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">&#x23F0;</div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">
          您预约的 {missedTimeLabel} 直播已经结束
        </h1>
        <p className="text-neutral-500 mb-8">
          别担心！下一场直播即将开始
        </p>

        <div className="bg-white border border-[#E8E5DE] rounded-lg p-8 mb-8">
          <p className="text-neutral-500 mb-4">下一场直播倒计时</p>
          <CountdownTimer
            targetTime={nextSlotTime}
            size="md"
            showDays={false}
            showLabels={true}
          />
        </div>

        <button
          onClick={handleReassign}
          disabled={reassigning}
          className="w-full max-w-sm mx-auto block bg-[#B8953F] text-white px-8 py-4 text-lg font-semibold hover:bg-[#A6842F] transition-colors disabled:opacity-50 rounded"
        >
          {reassigning ? '处理中...' : '预约下一场'}
        </button>
        <p className="text-xs text-neutral-400 mt-3">
          无需重新注册，直接保留您的名额
        </p>
      </div>
    </div>
  );
}
