import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  isLoading = false,
  ...props
}) => {
  const variants = {
    primary: 'bg-ocean hover:bg-ocean-hover text-white shadow-soft hover:shadow-soft-lg active:scale-[0.98]',
    secondary: 'bg-sky-100 hover:bg-sky-200 text-deep font-semibold active:scale-[0.98]',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 active:scale-[0.98]',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-soft active:scale-[0.98]',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-soft active:scale-[0.98]',
    ghost: 'hover:bg-slate-100 text-slate-700'
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-xl min-h-[36px]',
    md: 'text-sm px-4 py-2 rounded-2xl min-h-[44px]',
    lg: 'text-base px-6 py-3 rounded-2xl min-h-[48px]'
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ocean/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
