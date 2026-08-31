import React from 'react';
import clsx from 'clsx';

export function TouchButton({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  disabled = false,
  loading = false,
  className = '',
  type = 'button'
}) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 select-none touch-press disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const sizes = {
    sm: "px-3 py-2 text-sm min-h-[42px] gap-1.5",
    md: "px-4 py-3 text-base min-h-[50px] gap-2 font-semibold",
    lg: "px-6 py-4 text-lg min-h-[58px] gap-2.5 font-bold"
  };

  const variants = {
    primary: "bg-pilates-600 hover:bg-pilates-700 active:bg-pilates-800 text-white shadow-sm shadow-pilates-600/20 border border-pilates-600",
    secondary: "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-200",
    success: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-600/20 border border-emerald-600",
    danger: "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm shadow-rose-600/20 border border-rose-600",
    outline: "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm",
    ghost: "bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(baseStyles, sizes[size], variants[variant], className)}
    >
      {loading ? (
        <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-5 h-5 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
