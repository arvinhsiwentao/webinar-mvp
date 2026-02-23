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
}

export default function ViewersTab({ viewerCount, hostName, hostAvatar }: ViewersTabProps) {
  // Generate simulated viewer list based on count
  const viewers = useMemo(() => {
    const count = Math.min(viewerCount, NAME_POOL.length);
    const shuffled = [...NAME_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [viewerCount]);

  return (
    <div className="h-full overflow-y-auto p-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold">在线观众</span>
        <span className="text-xs text-neutral-400">{viewerCount.toLocaleString()} 人</span>
      </div>

      {/* Host */}
      <div className="flex items-center gap-3 p-2 rounded bg-neutral-700/50 mb-3">
        {hostAvatar ? (
          <img src={hostAvatar} alt={hostName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#B8953F] flex items-center justify-center text-white text-sm font-bold">
            {hostName.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <span className="text-sm font-medium">{hostName}</span>
        </div>
        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold uppercase">
          Host
        </span>
      </div>

      {/* Viewer list */}
      <div className="space-y-1">
        {viewers.map((name, idx) => (
          <div key={`${name}-${idx}`} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-neutral-700/30">
            <div className="w-6 h-6 rounded-full bg-neutral-600 flex items-center justify-center text-[10px] text-neutral-300">
              {name.charAt(0)}
            </div>
            <span className="text-sm text-neutral-300">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
