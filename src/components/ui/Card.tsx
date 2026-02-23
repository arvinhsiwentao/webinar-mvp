'use client';

import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export default function Card({ children, className, hover = false, glow = false }: CardProps) {
  return (
    <div className={cn(
      'bg-white border border-[#E8E5DE] rounded-[8px] p-6',
      hover && 'transition-all duration-300 hover:border-[#B8953F]/30 hover:-translate-y-1',
      glow && 'shadow-lg shadow-[#B8953F]/5',
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-xl font-bold text-neutral-900', className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-neutral-500', className)}>{children}</div>;
}
