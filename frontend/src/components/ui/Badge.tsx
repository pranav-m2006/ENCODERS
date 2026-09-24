import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'mint' | 'sun' | 'orange' | 'coral' | 'ocean' | 'slate' | 'outline' | 'blue' | 'yellow' | 'emerald' | 'rose' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'ocean',
  size = 'md',
  className = '',
  dot = false
}) => {
  const variants = {
    mint: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sun: 'bg-amber-100 text-amber-800 border-amber-200',
    yellow: 'bg-amber-100 text-amber-800 border-amber-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    coral: 'bg-rose-100 text-rose-800 border-rose-200',
    rose: 'bg-rose-100 text-rose-800 border-rose-200',
    ocean: 'bg-sky-100 text-sky-800 border-sky-200',
    blue: 'bg-sky-100 text-sky-800 border-sky-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    outline: 'bg-transparent text-slate-600 border-slate-300'
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-semibold'
  };

  const dotColors: Record<string, string> = {
    mint: 'bg-emerald-500',
    emerald: 'bg-emerald-500',
    sun: 'bg-amber-500',
    yellow: 'bg-amber-500',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    coral: 'bg-rose-500',
    rose: 'bg-rose-500',
    ocean: 'bg-sky-500',
    blue: 'bg-sky-500',
    slate: 'bg-slate-400',
    outline: 'bg-slate-400'
  };

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full border shadow-sm transition-colors',
      variants[variant],
      sizes[size],
      className
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[variant])} />}
      {children}
    </span>
  );
};
