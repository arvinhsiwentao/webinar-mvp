'use client';

import { useState, ReactNode } from 'react';

interface Tab {
  id: string;
  icon: ReactNode;
  label: string;
  content: ReactNode;
  badge?: number;
}

interface SidebarTabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function SidebarTabs({ tabs, defaultTab }: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-[#E8E5DE] shadow-sm">
      {/* Tab bar */}
      <div className="flex border-b border-[#E8E5DE] bg-[#FAFAF7]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm transition-all duration-200 relative ${
              activeTab === tab.id
                ? 'text-[#B8953F] bg-white font-medium'
                : 'text-[#9CA3AF] hover:text-[#6B6B6B]'
            }`}
            title={tab.label}
          >
            {tab.icon}
            <span className="hidden sm:inline text-xs tracking-wide">{tab.label}</span>
            {/* Active indicator — thin gold line */}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-3 right-3 h-[1.5px] bg-[#B8953F]" />
            )}
            {tab.badge && tab.badge > 0 && (
              <span className="absolute top-1.5 right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content — all tabs stay mounted to preserve state */}
      <div className="flex-1 overflow-hidden relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`h-full ${activeTab === tab.id ? '' : 'hidden'}`}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
