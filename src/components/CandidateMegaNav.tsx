'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Search,
  Bookmark,
  FileCheck2,
  ThumbsUp,
  Building2,
  Sparkles,
  FileText,
  Upload,
  PenSquare,
  Feather,
  BriefcaseBusiness,
  Menu,
  X,
  Calculator,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import type { Role } from '@/lib/auth/shared';

interface CandidateMegaNavProps {
  role: Role;
  className?: string;
}

type MenuKey = 'jobs' | 'cv' | 'tools' | null;

const toolsLinks = [
  {
    title: 'Bộ câu hỏi phỏng vấn',
    description: 'Kho câu hỏi phỏng vấn và trắc nghiệm',
    href: '/tools/interview-questions',
    icon: FileText,
  },
  {
    title: 'Tính thuế thu nhập',
    description: 'Công cụ tính thuế thu nhập cá nhân',
    href: '/tools/personal-income-tax',
    icon: ReceiptText,
  },
  {
    title: 'Tính lương Gross - Net',
    description: 'Tính toán nhanh lương sẽ nhận',
    href: '/tools/salary-lookup',
    icon: WalletCards,
  },
] as const;

export default function CandidateMegaNav({
  role,
  className = '',
}: CandidateMegaNavProps) {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileDrawerOpen(false);
    setOpenMenu(null);
  }

  const isCandidate = role === 'CANDIDATE';

  const jobPositionLinks = useMemo(
    () => [
      'Việc làm Nhân viên kinh doanh',
      'Việc làm Kế toán',
      'Việc làm Marketing',
      'Việc làm Hành chính nhân sự',
      'Việc làm Chăm sóc khách hàng',
      'Việc làm Ngân hàng',
      'Việc làm IT',
      'Việc làm Lao động phổ thông',
      'Việc làm Senior',
      'Việc làm Kỹ sư xây dựng',
      'Việc làm Thiết kế đồ họa',
      'Việc làm Bất động sản',
      'Việc làm Giáo dục',
      'Việc làm telesales',
    ],
    [],
  );

  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileDrawerOpen]);

  return (
    <>
      <nav className={`hidden lg:flex items-center gap-8 font-semibold text-sm ${className}`}>
        <div
          className="relative py-2"
          onMouseEnter={() => isCandidate && setOpenMenu('jobs')}
          onMouseLeave={() => setOpenMenu(null)}
        >
          <button
            type="button"
            className={`flex items-center gap-1 transition-colors ${
              openMenu === 'jobs' ? 'text-emerald-600' : 'text-gray-700 hover:text-emerald-500'
            }`}
          >
            Việc làm
            {isCandidate && <ChevronDown size={16} className="mt-[1px]" />}
          </button>

          {isCandidate && openMenu === 'jobs' && (
            <div className="absolute left-[-180px] top-full z-50 pt-2">
              <div className="w-[980px] max-w-[90vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="grid grid-cols-12">
                  <div className="col-span-4 border-r border-gray-100 bg-gray-50/30 p-8">
                    <h4 className="mb-5 text-sm font-extrabold uppercase tracking-wide text-gray-400">
                      Việc làm
                    </h4>
                    <ul className="space-y-1">
                      <li>
                        <Link
                          href="/candidate?tab=jobs"
                          className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-3 font-bold text-emerald-600"
                        >
                          <Search size={20} />
                          Tìm việc làm
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=saved-jobs"
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-gray-700 hover:bg-gray-100"
                        >
                          <Bookmark size={20} />
                          Việc làm đã lưu
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=applied-jobs"
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-gray-700 hover:bg-gray-100"
                        >
                          <FileCheck2 size={20} />
                          Việc làm đã ứng tuyển
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=matched-jobs"
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-gray-700 hover:bg-gray-100"
                        >
                          <ThumbsUp size={20} />
                          Việc làm phù hợp
                        </Link>
                      </li>
                    </ul>

                    <div className="mt-8">
                      <h4 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-gray-400">
                        Công ty
                      </h4>
                      <ul className="space-y-1">
                        <li>
                          <Link
                            href="/candidate?tab=companies"
                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-gray-700 hover:bg-gray-100"
                          >
                            <Building2 size={20} />
                            Danh sách công ty
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/candidate?tab=companies-pro"
                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-gray-700 hover:bg-gray-100"
                          >
                            <Sparkles size={20} />
                            Công ty Pro
                            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                              Pro
                            </span>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="col-span-8 p-8">
                    <h4 className="mb-6 text-sm font-extrabold uppercase tracking-wide text-gray-400">
                      Việc làm theo vị trí
                    </h4>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                      {jobPositionLinks.map((text, i) => (
                        <Link
                          key={i}
                          href={`/candidate?tab=jobs&keyword=${encodeURIComponent(
                            text.replace('Việc làm ', ''),
                          )}`}
                          className="font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          {text}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="relative py-2"
          onMouseEnter={() => isCandidate && setOpenMenu('cv')}
          onMouseLeave={() => setOpenMenu(null)}
        >
          <button
            type="button"
            className={`flex items-center gap-1 transition-colors ${
              openMenu === 'cv' ? 'text-emerald-600' : 'text-gray-700 hover:text-emerald-500'
            }`}
          >
            Tạo CV
            {isCandidate && <ChevronDown size={16} className="mt-[1px]" />}
          </button>

          {isCandidate && openMenu === 'cv' && (
            <div className="absolute left-[-140px] top-full z-50 pt-2">
              <div className="w-[760px] max-w-[90vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-100 p-8">
                    <h4 className="mb-6 text-xl font-extrabold text-emerald-600">
                      Mẫu CV theo style →
                    </h4>
                    <ul className="space-y-4">
                      <li>
                        <Link
                          href="/candidate?tab=cv-manage"
                          className="flex items-center gap-3 font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          <FileText size={20} />
                          Mẫu CV Đơn giản
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=cv-manage"
                          className="flex items-center gap-3 font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          <Sparkles size={20} />
                          Mẫu CV Ấn tượng
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=cv-manage"
                          className="flex items-center gap-3 font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          <BriefcaseBusiness size={20} />
                          Mẫu CV Chuyên nghiệp
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=cv-manage"
                          className="flex items-center gap-3 font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          <Feather size={20} />
                          Mẫu CV Harvard
                        </Link>
                      </li>
                    </ul>

                    <h4 className="mb-4 mt-8 text-xl font-extrabold text-emerald-600">
                      Mẫu CV theo vị trí ứng tuyển →
                    </h4>
                    <ul className="space-y-3">
                      <li>
                        <Link
                          href="/candidate?tab=cv-manage"
                          className="font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          Nhân viên kinh doanh
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=cv-manage"
                          className="font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          Lập trình viên
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=cv-manage"
                          className="font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          Nhân viên kế toán
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=cv-manage"
                          className="font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          Chuyên viên marketing
                        </Link>
                      </li>
                    </ul>
                  </div>

                  <div className="p-8">
                    <ul className="space-y-6">
                      <li>
                        <Link
                          href="/candidate?tab=cv-manage"
                          className="flex items-center gap-3 text-lg font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          <FileText size={22} />
                          Quản lý CV
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=cv-upload"
                          className="flex items-center gap-3 text-lg font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          <Upload size={22} />
                          Tải CV lên
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=cv-guide"
                          className="flex items-center gap-3 text-lg font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          <PenSquare size={22} />
                          Hướng dẫn viết CV
                        </Link>
                      </li>
                      <li className="border-t border-gray-100 pt-4">
                        <Link
                          href="/candidate?tab=cover-letter"
                          className="flex items-center gap-3 text-lg font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          <Feather size={22} />
                          Quản lý Cover Letter
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/candidate?tab=cover-letter"
                          className="flex items-center gap-3 text-lg font-semibold text-gray-700 hover:text-emerald-600"
                        >
                          <FileText size={22} />
                          Mẫu Cover Letter
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="relative py-2"
          onMouseEnter={() => isCandidate && setOpenMenu('tools')}
          onMouseLeave={() => setOpenMenu(null)}
        >
          <button
            type="button"
            className={`flex items-center gap-1 transition-colors ${
              openMenu === 'tools' ? 'text-emerald-600' : 'text-gray-700 hover:text-emerald-500'
            }`}
          >
            Công cụ
            {isCandidate && <ChevronDown size={16} className="mt-[1px]" />}
          </button>

          {isCandidate && openMenu === 'tools' && (
            <div className="absolute left-[-220px] top-full z-50 pt-2">
              <div className="w-[760px] max-w-[90vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="p-8">
                  <h4 className="mb-6 text-sm font-extrabold uppercase tracking-wide text-gray-400">
                    Công cụ hỗ trợ ứng viên
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    {toolsLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="rounded-2xl border border-gray-100 bg-gray-50 p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
                        >
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                            <Icon size={24} />
                          </div>
                          <h5 className="text-base font-bold text-gray-900">{item.title}</h5>
                          <p className="mt-2 text-sm leading-6 text-gray-500">
                            {item.description}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </nav>

      <div className="flex items-center lg:hidden">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="rounded-full bg-gray-50 p-2 text-gray-600 transition-colors hover:bg-gray-100"
          aria-label="Mở Menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white lg:hidden animate-in fade-in slide-in-from-right-8 duration-200">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
            <span className="text-xl font-black text-gray-900">Menu</span>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <nav className="flex flex-col gap-6">
              <div>
                <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-gray-400">
                  Việc làm
                </h3>
                <ul className="flex flex-col gap-2">
                  <li>
                    <Link
                      onClick={() => setMobileDrawerOpen(false)}
                      href="/candidate?tab=jobs"
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                    >
                      <Search size={18} className="text-emerald-600" />
                      Tìm việc làm
                    </Link>
                  </li>
                  <li>
                    <Link
                      onClick={() => setMobileDrawerOpen(false)}
                      href="/candidate?tab=saved-jobs"
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                    >
                      <Bookmark size={18} className="text-emerald-600" />
                      Việc làm đã lưu
                    </Link>
                  </li>
                  <li>
                    <Link
                      onClick={() => setMobileDrawerOpen(false)}
                      href="/candidate?tab=applied-jobs"
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                    >
                      <FileCheck2 size={18} className="text-emerald-600" />
                      Việc làm đã ứng tuyển
                    </Link>
                  </li>
                  <li>
                    <Link
                      onClick={() => setMobileDrawerOpen(false)}
                      href="/candidate?tab=matched-jobs"
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                    >
                      <ThumbsUp size={18} className="text-emerald-600" />
                      Việc làm phù hợp
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-gray-400">
                  Công ty
                </h3>
                <ul className="flex flex-col gap-2">
                  <li>
                    <Link
                      onClick={() => setMobileDrawerOpen(false)}
                      href="/candidate?tab=companies"
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                    >
                      <Building2 size={18} className="text-emerald-600" />
                      Danh sách công ty
                    </Link>
                  </li>
                  <li>
                    <Link
                      onClick={() => setMobileDrawerOpen(false)}
                      href="/candidate?tab=companies-pro"
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                    >
                      <Sparkles size={18} className="text-amber-500" />
                      Công ty nổi bật
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-gray-400">
                  Quản lý CV & Hồ sơ
                </h3>
                <ul className="flex flex-col gap-2">
                  <li>
                    <Link
                      onClick={() => setMobileDrawerOpen(false)}
                      href="/candidate?tab=cv-manage"
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                    >
                      <FileText size={18} className="text-emerald-600" />
                      Quản lý CV / Tạo CV
                    </Link>
                  </li>
                  <li>
                    <Link
                      onClick={() => setMobileDrawerOpen(false)}
                      href="/candidate?tab=cv-upload"
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                    >
                      <Upload size={18} className="text-emerald-600" />
                      Tải CV từ máy tính
                    </Link>
                  </li>
                  <li>
                    <Link
                      onClick={() => setMobileDrawerOpen(false)}
                      href="/candidate?tab=cover-letter"
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                    >
                      <Feather size={18} className="text-emerald-600" />
                      Mẫu Cover Letter
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-gray-400">
                  Công cụ
                </h3>
                <ul className="flex flex-col gap-2">
                  {toolsLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          onClick={() => setMobileDrawerOpen(false)}
                          href={item.href}
                          className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 font-bold text-gray-800"
                        >
                          <Icon size={18} className="text-emerald-600" />
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              
            </nav>
          </div>
        </div>
      )}
    </>
  );
}