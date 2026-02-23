'use client';

interface BottomBarProps {
  title: string;
  sessionDate?: string;
  viewerCount: number;
  isLive?: boolean;
}

export default function BottomBar({ title, sessionDate, viewerCount, isLive = true }: BottomBarProps) {
  const formattedDate = sessionDate
    ? new Date(sessionDate).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      })
    : '';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-700">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h2 className="text-white text-sm font-medium truncate">{title}</h2>
          {formattedDate && (
            <span className="hidden md:inline text-neutral-400 text-xs flex-shrink-0">
              {formattedDate}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isLive && (
            <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            <span>{viewerCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
