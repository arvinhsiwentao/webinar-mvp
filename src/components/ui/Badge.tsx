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
    gold: 'bg-gradient-to-r from-amber-500/20 to-yellow-600/20 text-amber-400 border border-amber-500/30',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium',
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
