'use client';
import React from 'react';
import type { Toast } from '@/lib/hooks';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}) {
  const v = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm',
    dark: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
    ghost: 'bg-white/80 text-slate-800 hover:bg-white border border-slate-200',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
  }[variant];
  const s = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-3 text-base' }[
    size
  ];
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
        v,
        s,
        className,
      )}
    />
  );
}

/** Pill toggle. `dark` = the vlog studio theme (never override the background via className: Tailwind order wins). */
export function Chip({
  active,
  dark,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; dark?: boolean }) {
  return (
    <button
      {...props}
      className={cx(
        'rounded-full border px-3 py-1 text-xs font-medium transition',
        active
          ? dark
            ? 'bg-orange-500 text-white border-orange-500'
            : 'bg-slate-900 text-white border-slate-900'
          : dark
            ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-white',
        className,
      )}
    />
  );
}

/** Floating card. `dark` = the vlog studio theme. */
export function Panel({
  className,
  dark,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { dark?: boolean }) {
  return (
    <div
      {...props}
      className={cx(
        'rounded-2xl backdrop-blur shadow-lg border',
        dark
          ? 'bg-slate-900/85 border-slate-800 text-slate-100'
          : 'bg-white/90 border-slate-200/70 text-slate-900',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto rounded-xl border px-3.5 py-2.5 text-sm shadow-lg backdrop-blur',
            t.kind === 'error'
              ? 'border-red-200 bg-red-50/95 text-red-900'
              : t.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
                : 'border-slate-200 bg-white/95 text-slate-800',
          )}
        >
          <div className="font-semibold">{t.title}</div>
          {t.detail && <div className="mt-0.5 text-xs opacity-80 break-words">{t.detail}</div>}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent',
        className,
      )}
    />
  );
}
