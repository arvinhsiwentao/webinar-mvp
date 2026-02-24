'use client';

import { Webinar, Session } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface WebinarListProps {
  webinars: Webinar[];
  loading: boolean;
  onEdit: (w: Webinar) => void;
  onDelete: (id: string) => void;
}

export default function WebinarList({
  webinars,
  loading,
  onEdit,
  onDelete,
}: WebinarListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8953F]" />
      </div>
    );
  }

  if (webinars.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400 mb-4">尚未创建任何研讨会</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {webinars.map((webinar) => (
        <div
          key={webinar.id}
          className="bg-white rounded-lg p-6 border border-neutral-200 hover:border-neutral-300 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{webinar.title}</h3>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  webinar.status === 'published'
                    ? 'bg-green-500/20 text-green-400'
                    : webinar.status === 'ended'
                    ? 'bg-neutral-100 text-neutral-500'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {webinar.status === 'published' ? '已发布' : webinar.status === 'ended' ? '已结束' : '草稿'}
                </span>
              </div>
              <p className="text-neutral-500 text-sm mb-3">
                讲者: {webinar.speakerName} | 时长: {webinar.duration} 分钟
              </p>

              {/* Sessions */}
              <div className="flex flex-wrap gap-2 mb-3">
                {webinar.sessions.map((session: Session, idx: number) => (
                  <span
                    key={idx}
                    className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded"
                  >
                    {formatDateTime(session.startTime)}
                  </span>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4 text-xs text-neutral-400">
                <span>{webinar.autoChat.length} 条自动消息</span>
                <span>{webinar.ctaEvents.length} 个 CTA</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onEdit(webinar)}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-sm px-4 py-2 rounded transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(webinar.id)}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm px-4 py-2 rounded transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
