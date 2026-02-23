'use client';

import { Session } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface SessionSelectorProps {
  sessions: Session[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Tailwind classes for the outer container */
  className?: string;
  /** Tailwind padding class for each button (e.g. "p-5" vs "p-6") */
  buttonPadding?: string;
  /** Tailwind gap class for the radio+text layout (e.g. "gap-5" vs "gap-6") */
  innerGap?: string;
  /** Label shown on the first session badge */
  firstBadgeLabel?: string;
}

export default function SessionSelector({
  sessions,
  selectedId,
  onSelect,
  className = 'space-y-3',
  buttonPadding = 'p-5',
  innerGap = 'gap-5',
  firstBadgeLabel = '最近场次',
}: SessionSelectorProps) {
  return (
    <div className={className}>
      {sessions.map((session: Session, idx: number) => (
        <button
          key={session.id || `session-${idx}`}
          onClick={() => onSelect(session.id)}
          className={`
            w-full ${buttonPadding} text-left transition-all border
            ${selectedId === session.id
              ? 'border-[#B8953F] bg-[#B8953F]/8'
              : 'border-neutral-200 hover:border-neutral-400'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${innerGap}`}>
              <div className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${selectedId === session.id ? 'border-[#B8953F]' : 'border-neutral-400'}
              `}>
                {selectedId === session.id && (
                  <div className="w-2 h-2 rounded-full bg-[#B8953F]" />
                )}
              </div>
              <div>
                <p className="font-medium">场次 {idx + 1}</p>
                <p className="text-sm text-neutral-500">{formatDateTime(session.startTime)}</p>
              </div>
            </div>
            {idx === 0 && (
              <span className="text-xs text-[#B8953F]/70">{firstBadgeLabel}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
