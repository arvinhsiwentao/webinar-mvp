'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'live' | 'gold' | 'success' | 'warning';
  pulse?: boolean;
  className?: string;
}

export default function Badge({ children, variant = 'gold', pulse = false, className }: BadgeProps) {
  const variants = {
    live: 'bg-red-600 text-white',
    gold: 'bg-[#B8953F]/10 text-[#B8953F] border border-[#B8953F]/20',
    success: 'bg-green-50 text-green-700 border border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-2 px-4 py-1.5 rounded-[4px] text-sm font-medium',
      variants[variant],
      className
    )}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
