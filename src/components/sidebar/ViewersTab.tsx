'use client';

import { useMemo } from 'react';

// Pool of common Chinese names for simulated viewers
const NAME_POOL = [
  '小美', '阿明', 'David', 'Emma', 'Kevin', '小芳', 'Jason', 'Linda',
  'Alex', '小雨', 'Tom', '阿华', 'Jenny', '小李', 'Michael', '小张',
  '王强', 'Amy', '陈伟', 'Sarah', '刘洋', 'Peter', '黄丽', 'Bob',
  '赵敏', '周杰', 'Lucy', '吴涛', '孙燕', 'Jack', '李明', '张伟',
  'Nicole', '陈静', 'Ryan', '王芳', 'Helen', '刘强', '杨磊', 'Grace',
  '赵鑫', '周芳', 'Brian', '郭靖', '许可', '钱伟', 'Chris', '蒋勇',
];

interface ViewersTabProps {
  viewerCount: number;
  hostName: string;
  hostAvatar?: string;
  userName?: string;
}

export default function ViewersTab({ viewerCount, hostName, hostAvatar, userName }: ViewersTabProps) {
  // Generate simulated viewer list based on count, excluding userName to avoid duplicates
  const viewers = useMemo(() => {
    const pool = userName ? NAME_POOL.filter(n => n !== userName) : NAME_POOL;
    const count = Math.min(viewerCount, pool.length);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [viewerCount, userName]);

  return (
    <div className="h-full overflow-y-auto p-4 text-[#1A1A1A]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-[#1A1A1A]">在线观众</span>
        <span className="text-xs text-[#6B6B6B] bg-[#FAFAF7] px-2 py-0.5 rounded-full">{viewerCount.toLocaleString()} 人</span>
      </div>

      {/* Host */}
      <div className="flex items-center gap-3 p-2.5 rounded-md bg-[#FAFAF7] border border-[#F0EDE6] mb-3">
        {hostAvatar ? (
          <img src={hostAvatar} alt={hostName} className="w-8 h-8 rounded-full object-cover border border-[#E8E5DE]" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#B8953F] flex items-center justify-center text-white text-sm font-bold">
            {hostName.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <span className="text-sm font-medium text-[#1A1A1A]">{hostName}</span>
        </div>
        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold uppercase">
          Host
        </span>
      </div>

      {/* Current user (pinned) */}
      {userName && (
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-[#FAFAF7] border border-[#F0EDE6] mb-3">
          <div className="w-6 h-6 rounded-full bg-[#B8953F]/20 flex items-center justify-center text-[10px] text-[#B8953F] font-medium">
            {userName.charAt(0)}
          </div>
          <span className="text-sm text-[#1A1A1A] font-medium flex-1">{userName}</span>
          <span className="text-[10px] bg-[#B8953F]/15 text-[#B8953F] px-1.5 py-0.5 rounded font-medium">
            你
          </span>
        </div>
      )}

      {/* Viewer list */}
      <div className="space-y-0.5">
        {viewers.map((name, idx) => (
          <div key={`${name}-${idx}`} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-[#FAFAF7] transition-colors">
            <div className="w-6 h-6 rounded-full bg-[#E8E5DE] flex items-center justify-center text-[10px] text-[#6B6B6B] font-medium">
              {name.charAt(0)}
            </div>
            <span className="text-sm text-[#6B6B6B]">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
