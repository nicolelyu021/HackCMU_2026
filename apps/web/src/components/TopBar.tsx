'use client';
import Link from 'next/link';
import React from 'react';
import { useHealth } from '@/lib/hooks';
import { isFixtureMode } from '@/lib/config';

/** Sticky header with the "Demo mode" badge (GET /health reports the effective adapters). */
export function TopBar({ title, right }: { title?: React.ReactNode; right?: React.ReactNode }) {
  const health = useHealth();
  const fixture = typeof window !== 'undefined' && isFixtureMode();
  const badge = fixture
    ? { text: 'Fixture mode · no API', cls: 'bg-purple-100 text-purple-800 border-purple-200' }
    : !health
      ? { text: 'API offline', cls: 'bg-red-100 text-red-800 border-red-200' }
      : health.mode === 'mock'
        ? {
            text: 'Demo mode · mock providers',
            cls: 'bg-amber-100 text-amber-900 border-amber-200',
          }
        : {
            text: `Live · ${health.providers.llm} · ${health.providers.places} · ${health.providers.tts}`,
            cls: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          };
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3">
      <div className="pointer-events-auto flex items-center gap-3">
        <Link
          href={fixture ? '/?fixture=1' : '/'}
          className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-slate-900 shadow border border-slate-200/70 backdrop-blur"
        >
          <span className="text-lg">📍</span>
          <span className="font-bold tracking-tight">Pinlog</span>
        </Link>
        {title && (
          <div className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-900 shadow border border-slate-200/70 backdrop-blur">
            {title}
          </div>
        )}
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        {right}
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badge.cls}`}
          title={health ? `v${health.version}` : ''}
        >
          {badge.text}
        </span>
      </div>
    </header>
  );
}
