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
    primary: 'bg-[#cab9d9] text-[#484050] hover:bg-[#bda8ce] border border-line-strong',
    dark: 'bg-ink text-paper hover:bg-ink/90 border border-ink',
    ghost: 'bg-card text-ink hover:bg-white border border-line',
    danger: 'bg-card text-red-800 hover:bg-red-50 border border-red-200',
  }[variant];
  const s = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-3 text-base' }[
    size
  ];
  return (
    <button
      {...props}
      className={cx(
        'pencil-button inline-flex items-center gap-1.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        v,
        s,
        className,
      )}
    />
  );
}

/** Pill toggle. `dark` keeps the vlog Player chrome readable. */
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
        'pencil-chip border px-3 py-1 text-xs font-medium transition',
        active
          ? dark
            ? 'border-accent bg-accent text-white'
            : 'border-accent bg-accent-soft text-accent'
          : dark
            ? 'border-white/20 bg-black/40 text-white/80 hover:bg-black/55'
            : 'border-line bg-card text-ink hover:border-line-strong',
        className,
      )}
    />
  );
}

/** Paper card. `dark` = leftover Player chrome. */
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
        'paper-panel border',
        dark ? 'border-white/10 bg-black/70 text-white' : 'border-line bg-card text-ink',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-50 flex flex-col gap-2 md:inset-x-auto md:right-4 md:top-4 md:w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto rounded-xl border px-3.5 py-2.5 text-sm',
            t.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-900'
              : t.kind === 'success'
                ? 'border-accent bg-accent-soft text-ink'
                : 'border-line bg-card text-ink',
          )}
        >
          <div className="font-semibold">{t.title}</div>
          {t.detail && <div className="mt-0.5 text-xs text-muted break-words">{t.detail}</div>}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent',
        className,
      )}
    />
  );
}

/**
 * Paper panel that lives inside the desk (not a floating overlay).
 * Grab handle on phones; no side-column split on desktop.
 */
export function Sheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'notebook-sheet flex min-h-0 flex-1 flex-col overflow-hidden text-ink',
        className,
      )}
    >
      {children}
    </div>
  );
}
