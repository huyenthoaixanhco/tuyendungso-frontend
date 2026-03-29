'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ExternalLink, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

type ThemeMode = 'light' | 'dark';

export default function InterviewQuestionsPage() {
  const [theme, setTheme] = useState<ThemeMode>('light');

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <main
      className={`min-h-screen px-4 py-8 transition-colors duration-300 md:px-8 md:py-10 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="mx-auto max-w-5xl">
        <div
          className={`mb-8 rounded-3xl border p-8 shadow-sm transition-colors duration-300 ${
            isDark
              ? 'border-slate-800 bg-slate-900 shadow-black/20'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1
                className={`text-3xl font-black md:text-4xl ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Bộ câu hỏi phỏng vấn
              </h1>

              <p
                className={`mt-3 text-base md:text-lg ${
                  isDark ? 'text-slate-300' : 'text-gray-600'
                }`}
              >
                Xem bộ câu hỏi phỏng vấn và trắc nghiệm. Bấm vào thẻ bên dưới để mở
                trang chi tiết.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex items-center gap-2 self-start rounded-2xl border px-4 py-2.5 text-sm font-bold transition ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
                  : 'border-gray-200 bg-white text-slate-700 hover:bg-gray-50'
              }`}
              aria-label="Chuyển chế độ sáng tối"
              title="Chuyển chế độ sáng tối"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <a
            href="https://www.topcv.vn/bo-cau-hoi-phong-van-xin-viec"
            target="_blank"
            rel="noreferrer"
            className={`group overflow-hidden rounded-3xl border shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isDark
                ? 'border-emerald-900/50 bg-slate-900 hover:shadow-emerald-950/20'
                : 'border-emerald-100 bg-white'
            }`}
          >
            <div className="p-5 md:p-6">
              <div
                className={`overflow-hidden rounded-2xl border ${
                  isDark
                    ? 'border-emerald-900/40 bg-slate-800'
                    : 'border-emerald-100 bg-emerald-50'
                }`}
              >
                <Image
                  src="/images/interview-questions-cover.png"
                  alt="Bộ câu hỏi phỏng vấn"
                  width={1200}
                  height={675}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>

              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h2
                    className={`text-2xl font-black ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Bộ câu hỏi phỏng vấn
                  </h2>

                  <p
                    className={`mt-2 text-sm leading-6 md:text-base ${
                      isDark ? 'text-slate-300' : 'text-gray-600'
                    }`}
                  >
                    Bộ câu hỏi kinh nghiệm, thành tựu và các tình huống thường gặp khi
                    phỏng vấn.
                  </p>
                </div>

                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition group-hover:translate-x-0.5">
                  <ArrowRight size={20} />
                </span>
              </div>
            </div>
          </a>

          <div
            className={`rounded-3xl border p-6 shadow-sm transition-colors duration-300 ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'
            }`}
          >
            <h3
              className={`text-xl font-black ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Cách dùng
            </h3>

            <ol
              className={`mt-4 space-y-3 text-sm leading-6 md:text-base ${
                isDark ? 'text-slate-300' : 'text-gray-600'
              }`}
            >
              <li>1. Xem thẻ câu hỏi minh họa bên trái.</li>
              <li>2. Bấm vào thẻ để mở trang TopCV.</li>
              <li>3. Làm bài hoặc tham khảo câu hỏi trực tiếp.</li>
            </ol>

            <div className="mt-6">
              <a
                href="https://www.topcv.vn/bo-cau-hoi-phong-van-xin-viec"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white transition hover:bg-emerald-600"
              >
                Mở bộ câu hỏi phỏng vấn
                <ExternalLink size={18} />
              </a>
            </div>

            <div
              className={`mt-6 border-t pt-6 ${
                isDark ? 'border-slate-800' : 'border-gray-100'
              }`}
            >
              <Link
                href="/tools"
                className="text-sm font-bold text-emerald-500 transition hover:text-emerald-400"
              >
                ← Quay lại trang công cụ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}