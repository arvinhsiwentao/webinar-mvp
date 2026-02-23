'use client';

import { Session } from '@/lib/types';

interface DateCardsProps {
  sessions: Session[];
}

export default function DateCards({ sessions }: DateCardsProps) {
  const displaySessions = sessions.slice(0, 4); // Max 4 cards like reference

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {displaySessions.map((session) => {
        const date = new Date(session.startTime);
        const month = date.toLocaleDateString('zh-CN', { month: 'numeric' });
        const day = date.getDate();
        const time = date.toLocaleTimeString('zh-CN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: false,
        });
        const dayOfWeek = date.toLocaleDateString('zh-CN', { weekday: 'short' });

        return (
          <div
            key={session.id}
            className="w-[80px] bg-white rounded-lg overflow-hidden border border-[#E8E5DE] shadow-sm"
          >
            {/* Month header */}
            <div className="bg-[#B8953F] text-white text-center py-1 text-sm font-medium">
              {month}月
            </div>
            {/* Day number */}
            <div className="text-center py-3">
              <div className="text-2xl font-bold text-neutral-900">{day}</div>
              <div className="text-xs text-neutral-500">{dayOfWeek}</div>
            </div>
            {/* Time */}
            <div className="text-center pb-2 px-1">
              <div className="text-xs text-neutral-600 font-medium">{time}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
