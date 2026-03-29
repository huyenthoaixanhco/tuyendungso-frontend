'use client';

import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export type ThemeMode = 'light' | 'dark';

export function usePageTheme(defaultTheme: ThemeMode = 'light') {
  const [theme, setTheme] = useState<ThemeMode>(defaultTheme);
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return {
    theme,
    isDark,
    toggleTheme,
  };
}

export function ThemeToggleButton({
  isDark,
  onToggle,
  className = '',
}: {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Chuyển sang Light mode' : 'Chuyển sang Dark mode'}
      title={isDark ? 'Chuyển sang Light mode' : 'Chuyển sang Dark mode'}
      className={[
        'group relative inline-flex h-11 w-[92px] items-center rounded-full border-2 px-1.5 transition-all duration-300',
        isDark
          ? 'border-sky-900 bg-sky-950 shadow-[0_6px_18px_rgba(2,6,23,0.38)]'
          : 'border-slate-300 bg-white shadow-sm hover:border-slate-400',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full transition-all duration-300',
          isDark
            ? 'left-[50px] bg-amber-100 shadow-[0_4px_12px_rgba(251,191,36,0.35)]'
            : 'left-1.5 bg-slate-100 shadow-sm',
        ].join(' ')}
      />

      <span className="relative z-10 flex w-full items-center justify-between px-1">
        <span
          className={[
            'flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300',
            isDark ? 'text-amber-300' : 'text-slate-400',
          ].join(' ')}
        >
          <Sun size={16} />
        </span>
        <span
          className={[
            'flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300',
            isDark ? 'text-yellow-300' : 'text-slate-500',
          ].join(' ')}
        >
          <Moon size={16} />
        </span>
      </span>
    </button>
  );
}

export function ThemePageStyles() {
  return (
    <style jsx global>{`
      .tds-theme-dark {
        background: #020617 !important;
        color: #e2e8f0 !important;
      }

      .tds-theme-dark [class*='bg-white'],
      .tds-theme-dark .bg-white,
      .tds-theme-dark [class*='bg-white/80'],
      .tds-theme-dark [class*='bg-white/70'] {
        background-color: #0f172a !important;
      }

      .tds-theme-dark [class*='bg-gray-50'],
      .tds-theme-dark .bg-gray-50,
      .tds-theme-dark [class*='bg-slate-50'],
      .tds-theme-dark .bg-slate-50 {
        background-color: #111827 !important;
      }

      .tds-theme-dark [class*='bg-gray-100'],
      .tds-theme-dark .bg-gray-100,
      .tds-theme-dark [class*='bg-slate-100'],
      .tds-theme-dark .bg-slate-100 {
        background-color: #1f2937 !important;
      }

      .tds-theme-dark [class*='text-gray-900'],
      .tds-theme-dark .text-gray-900,
      .tds-theme-dark [class*='text-slate-900'],
      .tds-theme-dark .text-slate-900,
      .tds-theme-dark [class*='text-black'] {
        color: #f8fafc !important;
      }

      .tds-theme-dark [class*='text-gray-800'],
      .tds-theme-dark .text-gray-800,
      .tds-theme-dark [class*='text-slate-800'],
      .tds-theme-dark .text-slate-800 {
        color: #e2e8f0 !important;
      }

      .tds-theme-dark [class*='text-gray-700'],
      .tds-theme-dark .text-gray-700,
      .tds-theme-dark [class*='text-slate-700'],
      .tds-theme-dark .text-slate-700,
      .tds-theme-dark [class*='text-gray-600'],
      .tds-theme-dark .text-gray-600,
      .tds-theme-dark [class*='text-slate-600'],
      .tds-theme-dark .text-slate-600 {
        color: #cbd5e1 !important;
      }

      .tds-theme-dark [class*='text-gray-500'],
      .tds-theme-dark .text-gray-500,
      .tds-theme-dark [class*='text-slate-500'],
      .tds-theme-dark .text-slate-500,
      .tds-theme-dark [class*='text-gray-400'],
      .tds-theme-dark .text-gray-400,
      .tds-theme-dark [class*='text-slate-400'] {
        color: #94a3b8 !important;
      }

      .tds-theme-dark [class*='border-gray-100'],
      .tds-theme-dark .border-gray-100,
      .tds-theme-dark [class*='border-gray-200'],
      .tds-theme-dark .border-gray-200,
      .tds-theme-dark [class*='border-slate-100'],
      .tds-theme-dark .border-slate-100,
      .tds-theme-dark [class*='border-slate-200'],
      .tds-theme-dark .border-slate-200,
      .tds-theme-dark [class*='border-slate-200/60'] {
        border-color: #334155 !important;
      }

      .tds-theme-dark [class*='shadow-sm'],
      .tds-theme-dark [class*='shadow-md'],
      .tds-theme-dark [class*='shadow-lg'],
      .tds-theme-dark [class*='shadow-xl'],
      .tds-theme-dark [class*='shadow-2xl'] {
        box-shadow: 0 12px 32px rgba(2, 6, 23, 0.34) !important;
      }

      .tds-theme-dark input,
      .tds-theme-dark select,
      .tds-theme-dark textarea {
        background-color: #0b1220 !important;
        color: #f8fafc !important;
        border-color: #334155 !important;
      }

      .tds-theme-dark input::placeholder,
      .tds-theme-dark textarea::placeholder {
        color: #64748b !important;
      }

      .tds-theme-dark [class*='bg-emerald-50'] {
        background-color: rgba(16, 185, 129, 0.14) !important;
      }

      .tds-theme-dark [class*='bg-blue-50'] {
        background-color: rgba(59, 130, 246, 0.14) !important;
      }

      .tds-theme-dark [class*='bg-violet-50'],
      .tds-theme-dark [class*='bg-purple-50'] {
        background-color: rgba(139, 92, 246, 0.14) !important;
      }

      .tds-theme-dark [class*='bg-rose-50'],
      .tds-theme-dark [class*='bg-red-50'] {
        background-color: rgba(244, 63, 94, 0.14) !important;
      }

      .tds-theme-dark [class*='bg-amber-50'],
      .tds-theme-dark [class*='bg-orange-50'] {
        background-color: rgba(245, 158, 11, 0.14) !important;
      }

      .tds-theme-dark [class*='bg-purple-100'],
      .tds-theme-dark [class*='bg-blue-100'],
      .tds-theme-dark [class*='bg-orange-100'],
      .tds-theme-dark [class*='bg-emerald-100'],
      .tds-theme-dark [class*='bg-amber-100'],
      .tds-theme-dark [class*='bg-rose-100'] {
        filter: brightness(0.9);
      }

      .tds-theme-dark .hover\:bg-gray-50:hover,
      .tds-theme-dark .hover\:bg-slate-50:hover,
      .tds-theme-dark .hover\:bg-gray-100:hover,
      .tds-theme-dark .hover\:bg-slate-100:hover,
      .tds-theme-dark .hover\:bg-white:hover {
        background-color: #182234 !important;
      }

      .tds-theme-dark .hover\:text-emerald-600:hover,
      .tds-theme-dark .hover\:text-emerald-500:hover,
      .tds-theme-dark .hover\:text-emerald-700:hover {
        color: #34d399 !important;
      }

      .tds-theme-dark .bg-gradient-to-b.from-white.to-slate-50,
      .tds-theme-dark .bg-gradient-to-b.from-emerald-50.via-white.to-slate-50,
      .tds-theme-dark .bg-gradient-to-b.from-white.to-slate-50 {
        background-image: linear-gradient(to bottom, #0b1220, #020617) !important;
      }

      .tds-theme-dark .backdrop-blur-md,
      .tds-theme-dark .backdrop-blur-[2px] {
        backdrop-filter: blur(10px);
      }
    `}</style>
  );
}
