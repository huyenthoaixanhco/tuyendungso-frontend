'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LogOut, User, X } from 'lucide-react';
import CandidateMegaNav from '@/components/CandidateMegaNav';
import { logoutClient } from '@/lib/auth/client';

export default function CandidateToolsTopBar() {
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const handleLogout = () => {
    logoutClient();
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-5 md:px-6 lg:px-8">
          <Link href="/candidate" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <span className="text-2xl font-black">▣</span>
            </div>
            <span className="text-3xl font-black tracking-tight text-slate-900">Tuyendungso.vn</span>
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <CandidateMegaNav role="CANDIDATE" />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/candidate"
              className="hidden items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-slate-700 transition hover:bg-emerald-100 md:flex"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <User size={18} />
              </span>
              <span>Tài khoản của tôi</span>
            </Link>

            <button
              type="button"
              onClick={() => setConfirmLogoutOpen(true)}
              className="inline-flex items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3 font-bold text-slate-700 transition hover:bg-gray-200"
            >
              <LogOut size={18} />
              <span>Thoát</span>
            </button>
          </div>
        </div>
      </header>

      {confirmLogoutOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Xác nhận đăng xuất</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Bạn có chắc muốn đăng xuất khỏi tài khoản ứng viên không?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmLogoutOpen(false)}
                className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogoutOpen(false)}
                className="rounded-2xl border border-gray-200 px-5 py-3 font-bold text-slate-700 transition hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl bg-rose-500 px-5 py-3 font-bold text-white transition hover:bg-rose-600"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
