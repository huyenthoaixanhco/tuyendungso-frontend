'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginModal from '@/components/LoginModal';
import CandidateMegaNav from '@/components/CandidateMegaNav';
import { getStoredAuth, logoutClient } from '@/lib/auth/client';
import { resolveDashboardPath, type Role } from '@/lib/auth/shared';
import type { LucideIcon } from 'lucide-react';
import {
  Search,
  MapPin,
  Briefcase,
  User,
  Building,
  Building2,
  Lock,
  CheckCircle2,
  LineChart,
  Loader2,
  AlertCircle,
  ChevronDown,
  Bookmark,
  FileCheck2,
  ThumbsUp,
  FileText,
  Upload,
  PenSquare,
  Feather,
  ReceiptText,
  WalletCards,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8080';

type PublicJobItem = {
  id: number;
  title: string;
  companyName: string;
  location: string;
  employmentType: string;
  workplaceType?: string | null;
  salaryLabel?: string | null;
  salaryMin?: number | string | null;
  salaryMax?: number | string | null;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  applicationDeadline?: string | null;
  status: string;
  aiSummary?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PageResponse<T> = {
  items: T[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
};

type PreviewNavItem = {
  title: string;
  icon?: LucideIcon;
  badge?: string;
};

type MenuKey = 'jobs' | 'cv' | 'tools' | null;

const previewJobQuickLinks: PreviewNavItem[] = [
  { title: 'Tìm việc làm', icon: Search },
  { title: 'Việc làm đã lưu', icon: Bookmark },
  { title: 'Việc làm đã ứng tuyển', icon: FileCheck2 },
  { title: 'Việc làm phù hợp', icon: ThumbsUp },
];

const previewCompanyLinks: PreviewNavItem[] = [
  { title: 'Danh sách công ty', icon: Building2 },
  { title: 'Công ty Pro', icon: Sparkles, badge: 'Pro' },
];

const previewCvStyleLinks: PreviewNavItem[] = [
  { title: 'Mẫu CV Đơn giản', icon: FileText },
  { title: 'Mẫu CV Ấn tượng', icon: Sparkles },
  { title: 'Mẫu CV Chuyên nghiệp', icon: Briefcase },
  { title: 'Mẫu CV Harvard', icon: Feather },
];

const previewCvRoleLinks = [
  'Nhân viên kinh doanh',
  'Lập trình viên',
  'Nhân viên kế toán',
  'Chuyên viên marketing',
];

const previewCvManagerLinks: PreviewNavItem[] = [
  { title: 'Quản lý CV', icon: FileText },
  { title: 'Tải CV lên', icon: Upload },
  { title: 'Hướng dẫn viết CV', icon: PenSquare },
  { title: 'Quản lý Cover Letter', icon: Feather },
  { title: 'Mẫu Cover Letter', icon: FileText },
];

const previewToolLinks = [
  {
    title: 'Bộ câu hỏi phỏng vấn',
    description: 'Kho câu hỏi phỏng vấn và trắc nghiệm',
    icon: FileText,
  },
  {
    title: 'Tính thuế thu nhập',
    description: 'Công cụ tính thuế thu nhập cá nhân',
    icon: ReceiptText,
  },
  {
    title: 'Tính lương Gross - Net',
    description: 'Tính toán nhanh lương sẽ nhận',
    icon: WalletCards,
  },
];

const previewJobPositionLinks = [
  'Nhân viên kinh doanh',
  'Kế toán',
  'Marketing',
  'Hành chính nhân sự',
  'Chăm sóc khách hàng',
  'Ngân hàng',
  'IT',
  'Lao động phổ thông',
  'Senior',
  'Kỹ sư xây dựng',
  'Thiết kế đồ họa',
  'Bất động sản',
  'Giáo dục',
  'Telesales',
];

function formatMoney(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return null;

  const numericValue =
    typeof value === 'number'
      ? value
      : Number(String(value).replaceAll(',', '').trim());

  if (Number.isNaN(numericValue)) return null;
  return `${numericValue.toLocaleString('vi-VN')} đ`;
}

function formatSalaryRange(min?: number | string | null, max?: number | string | null) {
  const minText = formatMoney(min);
  const maxText = formatMoney(max);

  if (minText && maxText) return `${minText} - ${maxText}`;
  if (minText) return `Từ ${minText}`;
  if (maxText) return `Đến ${maxText}`;
  return 'Thoả thuận';
}

function displaySalary(job: PublicJobItem) {
  if (job.salaryLabel && job.salaryLabel.trim()) return job.salaryLabel.trim();
  return formatSalaryRange(job.salaryMin, job.salaryMax);
}

function excerpt(text?: string | null, maxLength = 130) {
  if (!text) return 'Nhà tuyển dụng chưa bổ sung mô tả chi tiết.';
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function PreviewTag() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
      Xem trước
    </span>
  );
}

function HomePreviewNav({
  onRequireAuth,
  onOpenPublicJobs,
  onSelectPublicJobKeyword,
}: {
  onRequireAuth: () => void;
  onOpenPublicJobs: () => void;
  onSelectPublicJobKeyword: (keyword: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMenu = () => setOpenMenu(null);

  const handlePreviewClick = () => {
    closeMenu();
    setMobileOpen(false);
    onRequireAuth();
  };

  const handleOpenPublicJobs = () => {
    closeMenu();
    setMobileOpen(false);
    onOpenPublicJobs();
  };

  const handleOpenPublicKeyword = (keyword: string) => {
    closeMenu();
    setMobileOpen(false);
    onSelectPublicJobKeyword(keyword);
  };

  return (
    <>
      <nav className="relative hidden items-center gap-8 lg:flex">
        <div
          className="relative py-2"
          onMouseEnter={() => setOpenMenu('jobs')}
          onMouseLeave={closeMenu}
        >
          <button
            type="button"
            className={`flex items-center gap-1 text-sm font-semibold transition-colors ${
              openMenu === 'jobs' ? 'text-emerald-600' : 'text-gray-700 hover:text-emerald-500'
            }`}
          >
            Việc làm
            <ChevronDown size={16} />
          </button>

          {openMenu === 'jobs' ? (
            <div className="absolute left-[-180px] top-full z-50 pt-2">
              <div className="w-[980px] max-w-[90vw] overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-2xl">
                <div className="grid grid-cols-12">
                  <div className="col-span-4 border-r border-gray-100 bg-gray-50/40 p-8">
                    <div className="mb-5 flex items-center justify-between">
                      <h4 className="text-sm font-extrabold uppercase tracking-wide text-gray-400">
                        Việc làm
                      </h4>
                      <PreviewTag />
                    </div>

                    <ul className="space-y-1">
                      {previewJobQuickLinks.map((item, index) => {
                        const Icon = item.icon!;
                        const isPublicSearch = index === 0;

                        return (
                          <li key={item.title}>
                            <button
                              type="button"
                              onClick={isPublicSearch ? handleOpenPublicJobs : handlePreviewClick}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-bold transition-colors ${
                                isPublicSearch
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <Icon size={20} />
                              <span>{item.title}</span>
                              {!isPublicSearch ? (
                                <Lock size={14} className="ml-auto text-gray-300" />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-8">
                      <h4 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-gray-400">
                        Công ty
                      </h4>

                      <ul className="space-y-1">
                        {previewCompanyLinks.map((item) => {
                          const Icon = item.icon!;
                          return (
                            <li key={item.title}>
                              <button
                                type="button"
                                onClick={handlePreviewClick}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-gray-700 transition-colors hover:bg-gray-100"
                              >
                                <Icon size={20} />
                                <span>{item.title}</span>
                                {item.badge ? (
                                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                                    {item.badge}
                                  </span>
                                ) : (
                                  <Lock size={14} className="ml-auto text-gray-300" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  <div className="col-span-8 p-8">
                    <div className="mb-6 flex items-center justify-between">
                      <h4 className="text-sm font-extrabold uppercase tracking-wide text-gray-400">
                        Việc làm theo vị trí
                      </h4>
                      <span className="text-xs font-semibold text-emerald-600">
                        Có thể dùng để lọc việc công khai
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                      {previewJobPositionLinks.map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => handleOpenPublicKeyword(text)}
                          className="text-left font-semibold text-gray-700 transition-colors hover:text-emerald-600"
                        >
                          Việc làm {text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="relative py-2"
          onMouseEnter={() => setOpenMenu('cv')}
          onMouseLeave={closeMenu}
        >
          <button
            type="button"
            className={`flex items-center gap-1 text-sm font-semibold transition-colors ${
              openMenu === 'cv' ? 'text-emerald-600' : 'text-gray-700 hover:text-emerald-500'
            }`}
          >
            Tạo CV
            <ChevronDown size={16} />
          </button>

          {openMenu === 'cv' ? (
            <div className="absolute left-[-140px] top-full z-50 pt-2">
              <div className="w-[860px] max-w-[92vw] overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-2xl">
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-100 p-8">
                    <div className="mb-6 flex items-center justify-between">
                      <h4 className="text-[22px] font-extrabold text-emerald-600">
                        Mẫu CV theo style →
                      </h4>
                      <PreviewTag />
                    </div>

                    <ul className="space-y-4">
                      {previewCvStyleLinks.map((item) => {
                        const Icon = item.icon!;
                        return (
                          <li key={item.title}>
                            <button
                              type="button"
                              onClick={handlePreviewClick}
                              className="flex w-full items-center gap-3 text-left font-semibold text-gray-700 transition-colors hover:text-emerald-600"
                            >
                              <Icon size={20} />
                              <span>{item.title}</span>
                              <Lock size={14} className="ml-auto text-gray-300" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    <h4 className="mb-4 mt-8 text-[22px] font-extrabold text-emerald-600">
                      Mẫu CV theo vị trí ứng tuyển →
                    </h4>

                    <ul className="space-y-3">
                      {previewCvRoleLinks.map((item) => (
                        <li key={item}>
                          <button
                            type="button"
                            onClick={handlePreviewClick}
                            className="flex w-full items-center gap-3 text-left font-semibold text-gray-700 transition-colors hover:text-emerald-600"
                          >
                            <span>{item}</span>
                            <Lock size={14} className="ml-auto text-gray-300" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-8">
                    <ul className="space-y-6">
                      {previewCvManagerLinks.map((item, index) => {
                        const Icon = item.icon!;
                        return (
                          <li
                            key={item.title}
                            className={index === 3 ? 'border-t border-gray-100 pt-4' : ''}
                          >
                            <button
                              type="button"
                              onClick={handlePreviewClick}
                              className="flex w-full items-center gap-3 text-left text-lg font-semibold text-gray-700 transition-colors hover:text-emerald-600"
                            >
                              <Icon size={22} />
                              <span>{item.title}</span>
                              <Lock size={14} className="ml-auto text-gray-300" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="relative py-2"
          onMouseEnter={() => setOpenMenu('tools')}
          onMouseLeave={closeMenu}
        >
          <button
            type="button"
            className={`flex items-center gap-1 text-sm font-semibold transition-colors ${
              openMenu === 'tools' ? 'text-emerald-600' : 'text-gray-700 hover:text-emerald-500'
            }`}
          >
            Công cụ
            <ChevronDown size={16} />
          </button>

          {openMenu === 'tools' ? (
            <div className="absolute left-[-220px] top-full z-50 pt-2">
              <div className="w-[860px] max-w-[92vw] overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-2xl">
                <div className="p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <h4 className="text-sm font-extrabold uppercase tracking-wide text-gray-400">
                      Công cụ hỗ trợ ứng viên
                    </h4>
                    <PreviewTag />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {previewToolLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={handlePreviewClick}
                          className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white"
                        >
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                            <Icon size={24} />
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <h5 className="text-base font-bold text-gray-900">{item.title}</h5>
                            <Lock size={14} className="mt-1 shrink-0 text-gray-300" />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-500">{item.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() =>
            document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
          }
          className="py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-emerald-500"
        >
          Cẩm nang nghề nghiệp
        </button>
      </nav>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-full bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200"
          aria-label="Mở menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] bg-black/40 lg:hidden">
          <div className="ml-auto flex h-full w-full max-w-[360px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <div>
                <div className="text-lg font-black text-gray-900">Khám phá nhanh</div>
                <div className="mt-1 text-xs font-medium text-amber-700">
                  Xem trước, đăng nhập để dùng đầy đủ
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full bg-gray-100 p-2 text-gray-700"
                aria-label="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-6">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-extrabold uppercase tracking-wide text-gray-400">
                      Việc làm
                    </h4>
                    <PreviewTag />
                  </div>

                  <div className="space-y-2">
                    {previewJobQuickLinks.map((item, index) => {
                      const Icon = item.icon!;
                      const isPublicSearch = index === 0;

                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={isPublicSearch ? handleOpenPublicJobs : handlePreviewClick}
                          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold ${
                            isPublicSearch
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-gray-50 text-gray-800'
                          }`}
                        >
                          <Icon size={18} />
                          <span>{item.title}</span>
                          {!isPublicSearch ? <Lock size={14} className="ml-auto text-gray-300" /> : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-gray-400">
                      Việc làm theo vị trí
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {previewJobPositionLinks.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleOpenPublicKeyword(item)}
                          className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700"
                        >
                          Việc làm {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-gray-400">
                      Công ty
                    </div>
                    <div className="space-y-2">
                      {previewCompanyLinks.map((item) => {
                        const Icon = item.icon!;
                        return (
                          <button
                            key={item.title}
                            type="button"
                            onClick={handlePreviewClick}
                            className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-left font-semibold text-gray-800"
                          >
                            <Icon size={18} />
                            <span>{item.title}</span>
                            {item.badge ? (
                              <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                                {item.badge}
                              </span>
                            ) : (
                              <Lock size={14} className="ml-auto text-gray-300" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-extrabold uppercase tracking-wide text-gray-400">
                      Tạo CV
                    </h4>
                    <PreviewTag />
                  </div>

                  <div className="space-y-2">
                    {previewCvStyleLinks.map((item) => {
                      const Icon = item.icon!;
                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={handlePreviewClick}
                          className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-left font-semibold text-gray-800"
                        >
                          <Icon size={18} />
                          <span>{item.title}</span>
                          <Lock size={14} className="ml-auto text-gray-300" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 space-y-2">
                    {previewCvRoleLinks.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={handlePreviewClick}
                        className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-left font-semibold text-gray-800"
                      >
                        <span>{item}</span>
                        <Lock size={14} className="ml-auto text-gray-300" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2">
                    {previewCvManagerLinks.map((item) => {
                      const Icon = item.icon!;
                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={handlePreviewClick}
                          className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-left font-semibold text-gray-800"
                        >
                          <Icon size={18} />
                          <span>{item.title}</span>
                          <Lock size={14} className="ml-auto text-gray-300" />
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-extrabold uppercase tracking-wide text-gray-400">
                      Công cụ
                    </h4>
                    <PreviewTag />
                  </div>

                  <div className="space-y-2">
                    {previewToolLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={handlePreviewClick}
                          className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                                <Icon size={20} />
                              </div>
                              <div className="font-bold text-gray-900">{item.title}</div>
                            </div>
                            <Lock size={14} className="shrink-0 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      document
                        .getElementById('how-it-works')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left font-bold text-gray-800"
                  >
                    Cẩm nang nghề nghiệp
                  </button>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function Home() {
  const searchParams = useSearchParams();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [dismissedRedirectLogin, setDismissedRedirectLogin] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>(null);

  const [keywordInput, setKeywordInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [jobs, setJobs] = useState<PublicJobItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');
  const [totalJobs, setTotalJobs] = useState(0);

  const requireAuth = () => setIsLoginModalOpen(true);

  useEffect(() => {
    const syncRole = () => {
      setCurrentRole(getStoredAuth().role);
    };

    syncRole();
    window.addEventListener('auth-changed', syncRole);
    window.addEventListener('storage', syncRole);

    return () => {
      window.removeEventListener('auth-changed', syncRole);
      window.removeEventListener('storage', syncRole);
    };
  }, []);

  const loadJobs = useCallback(async (keyword?: string, location?: string) => {
    setJobsLoading(true);
    setJobsError('');

    try {
      const combinedKeyword = [keyword?.trim(), location?.trim()].filter(Boolean).join(' ').trim();

      const params = new URLSearchParams();
      params.set('page', '0');
      params.set('size', '6');
      if (combinedKeyword) params.set('keyword', combinedKeyword);

      const response = await fetch(`${API_BASE_URL}/api/jobs?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách việc làm.');
      }

      const data: PageResponse<PublicJobItem> = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      setJobs(items);
      setTotalJobs(typeof data?.totalElements === 'number' ? data.totalElements : items.length);
    } catch (error) {
      setJobs([]);
      setTotalJobs(0);
      setJobsError(error instanceof Error ? error.message : 'Không thể tải danh sách việc làm.');
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const handleLogout = () => {
    logoutClient();
    window.location.href = '/';
  };

  const redirectParam = searchParams.get('redirect');
  const shouldAutoOpenLogin = !!redirectParam && !currentRole && !dismissedRedirectLogin;
  const isLoginModalVisible = isLoginModalOpen || shouldAutoOpenLogin;

  const handleSearch = () => {
    void loadJobs(keywordInput, locationInput);
    setTimeout(() => {
      document.getElementById('featured-jobs')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleJobAction = () => {
    if (!currentRole) {
      requireAuth();
      return;
    }
    window.location.href = resolveDashboardPath(currentRole);
  };

  const handleOpenPublicJobs = () => {
    setTimeout(() => {
      document.getElementById('job-search-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleSelectPublicJobKeyword = (keyword: string) => {
    setKeywordInput(keyword);
    setLocationInput('');
    void loadJobs(keyword, '');
    setTimeout(() => {
      document.getElementById('featured-jobs')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const statsText = useMemo(() => {
    if (jobsLoading) return 'Đang tải việc làm mới';
    if (jobsError) return 'Dữ liệu tạm thời chưa sẵn sàng';
    return `${totalJobs.toLocaleString('vi-VN')}+ việc làm đã được duyệt`;
  }, [jobsLoading, jobsError, totalJobs]);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-white px-4 py-3 md:px-12 md:py-4">
        <div className="flex cursor-pointer items-center gap-2">
          <div className="rounded-md bg-emerald-500 p-1.5">
            <Briefcase className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 md:text-2xl">
            Tuyendungso.vn
          </h1>
        </div>

        {currentRole ? (
          <CandidateMegaNav role={currentRole} className="hidden text-gray-600 md:block" />
        ) : (
          <HomePreviewNav
            onRequireAuth={requireAuth}
            onOpenPublicJobs={handleOpenPublicJobs}
            onSelectPublicJobKeyword={handleSelectPublicJobKeyword}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          {currentRole ? (
            <>
              <a
                href={resolveDashboardPath(currentRole)}
                className="text-xs font-bold text-gray-700 hover:text-emerald-600 md:text-sm"
              >
                Vào trang của bạn
              </a>
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200 md:px-5 md:py-2.5 md:text-sm"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <button
                onClick={requireAuth}
                className="hidden text-xs font-bold text-gray-700 hover:text-emerald-600 md:inline-block md:text-sm"
              >
                Đăng nhập
              </button>
              <button
                onClick={requireAuth}
                className="hidden rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600 md:inline-block md:px-5 md:py-2.5 md:text-sm"
              >
                Đăng ký
              </button>
            </>
          )}
        </div>
      </header>

      <section
        id="job-search-section"
        className="relative flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center px-4 py-16 md:py-24"
      >
        <div className="absolute inset-0 bg-slate-900/80"></div>

        <div className="relative z-10 w-full max-w-4xl text-center">
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-white md:mb-6 md:text-5xl lg:text-6xl">
            Tìm kiếm công việc mơ ước ngay hôm nay
          </h2>
          <p className="mb-8 text-base font-medium text-slate-300 md:mb-10 md:text-lg">
            Trang chủ chỉ hiển thị những tin tuyển dụng thật đã được duyệt từ nhà tuyển dụng.
          </p>

          <div className="mx-auto flex max-w-4xl flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-2xl md:flex-row md:rounded-full">
            <div className="flex flex-1 items-center border-b border-gray-200 px-4 py-3 md:border-b-0 md:border-r">
              <Search className="mr-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Chức danh, từ khóa hoặc công ty..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-transparent font-medium text-gray-700 outline-none"
              />
            </div>

            <div className="flex flex-1 items-center px-4 py-3">
              <MapPin className="mr-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Thành phố, quận huyện..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-transparent font-medium text-gray-700 outline-none"
              />
            </div>

            <button
              onClick={handleSearch}
              className="mt-2 w-full rounded-md bg-emerald-500 px-8 py-3 font-bold text-white transition-colors hover:bg-emerald-600 md:mt-0 md:w-auto md:rounded-full md:py-0"
            >
              Tìm kiếm
            </button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-300 md:gap-6 md:text-sm">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Công ty đã xác thực
            </span>
            <span className="flex items-center gap-2">
              <Briefcase size={16} className="text-emerald-400" />
              {statsText}
            </span>
          </div>
        </div>
      </section>

      <section id="featured-jobs" className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-20">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:mb-10 md:flex-row md:items-end">
          <div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">Việc làm nổi bật</h3>
            <p className="text-sm text-gray-500 md:text-base">
              Chỉ hiển thị tin tuyển dụng thật đã được duyệt và đang công khai trên hệ thống
            </p>
          </div>
          <button
            onClick={handleSearch}
            className="flex items-center gap-1 text-sm font-bold text-emerald-500 hover:underline md:text-base"
          >
            Làm mới danh sách →
          </button>
        </div>

        {jobsLoading ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 animate-spin text-emerald-500" size={34} />
              <p className="font-medium text-gray-500">Đang tải việc làm từ hệ thống...</p>
            </div>
          </div>
        ) : jobsError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center shadow-sm md:p-8">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={40} />
            <h4 className="mb-2 text-lg font-bold text-red-700">Không tải được danh sách việc làm</h4>
            <p className="mb-5 text-sm text-red-600">{jobsError}</p>
            <button
              onClick={() => void loadJobs(keywordInput, locationInput)}
              className="rounded-lg bg-red-600 px-5 py-3 font-bold text-white transition-colors hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
            <Briefcase className="mx-auto mb-4 text-gray-300" size={48} />
            <h4 className="mb-2 text-xl font-bold text-gray-900">Chưa có tin phù hợp</h4>
            <p className="text-sm text-gray-500 md:text-base">
              Không tìm thấy tin tuyển dụng nào khớp với từ khóa hoặc khu vực bạn vừa nhập.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:p-6"
              >
                <div className="mb-4 flex items-start justify-between md:mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-lg font-bold text-gray-400 md:h-12 md:w-12 md:text-xl">
                    {job.companyName?.charAt(0)?.toUpperCase() || 'C'}
                  </div>

                  <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-600 md:px-3 md:text-xs">
                    {job.employmentType || 'Toàn thời gian'}
                  </span>
                </div>

                <h4 className="mb-1 text-lg font-bold text-gray-900 md:text-xl">{job.title}</h4>

                <p className="mb-4 text-xs font-medium text-gray-500 md:mb-6 md:text-sm">
                  {job.companyName} • {job.location}
                </p>

                <div className="mb-4 flex flex-wrap gap-2 md:mb-6">
                  <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-600 md:px-3 md:text-xs">
                    {job.workplaceType?.trim() || 'Môi trường linh hoạt'}
                  </span>
                  <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-600 md:px-3 md:text-xs">
                    {displaySalary(job)}
                  </span>
                </div>

                <p className="mb-6 min-h-[48px] text-xs leading-5 text-gray-600 md:text-sm md:leading-6">
                  {excerpt(job.description)}
                </p>

                <button
                  onClick={handleJobAction}
                  className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-gray-50 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100 md:py-3 md:text-base"
                >
                  <Lock size={16} className="text-gray-400" />
                  {currentRole ? 'Vào xem chi tiết' : 'Đăng nhập ứng tuyển'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6 md:pb-20">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:mb-8 md:flex-row md:items-end">
          <div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">Thông tin thị trường</h3>
            <p className="text-sm text-gray-500 md:text-base">
              Dữ liệu thời gian thực về xu hướng tuyển dụng hiện nay.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 md:px-4 md:py-2 md:text-sm">
            <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500 md:h-2.5 md:w-2.5"></span>
            </span>
            Dữ liệu trực tiếp
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="pointer-events-none grid select-none gap-10 opacity-60 blur-[3px] transition-all duration-500 hover:blur-[2px] md:grid-cols-2 md:gap-16">
            <div>
              <h5 className="mb-6 text-xs font-bold text-gray-500 md:mb-8 md:text-sm">
                Xu hướng đăng tin (2020-2024)
              </h5>
              <div className="relative h-32 w-full border-b border-l border-gray-300 md:h-48">
                <svg
                  viewBox="0 0 100 50"
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,45 Q20,40 40,25 T70,15 T100,5"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                  <circle cx="0" cy="45" r="2" fill="#3b82f6" />
                  <circle cx="40" cy="25" r="2" fill="#3b82f6" />
                  <circle cx="70" cy="15" r="2" fill="#3b82f6" />
                  <circle cx="100" cy="5" r="2" fill="#3b82f6" />
                </svg>
              </div>
            </div>

            <div>
              <h5 className="mb-4 text-xs font-bold text-gray-500 md:mb-6 md:text-sm">
                Các ngành nghề tăng trưởng mạnh
              </h5>
              <div className="space-y-4 md:space-y-6">
                {[
                  { name: 'Công nghệ thông tin', w: 'w-[85%]', val: '+24%' },
                  { name: 'Y tế & Chăm sóc sức khỏe', w: 'w-[60%]', val: '+18%' },
                  { name: 'Tài chính - Ngân hàng', w: 'w-[45%]', val: '+12%' },
                  { name: 'Giáo dục & Đào tạo', w: 'w-[25%]', val: '+8%' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="mb-1.5 flex justify-between text-[10px] font-bold text-gray-600 md:text-xs">
                      <span>{item.name}</span>
                      <span className="text-emerald-500">{item.val}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 md:h-2.5">
                      <div className={`h-full rounded-full bg-blue-400 ${item.w}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-white/40 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-[420px] animate-in rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-xl duration-500 fade-in zoom-in md:p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 md:mb-5 md:h-14 md:w-14">
                <LineChart size={24} className="md:h-7 md:w-7" />
              </div>
              <h4 className="mb-2 text-lg font-extrabold text-gray-900 md:mb-3 md:text-xl">
                Mở khóa Phân tích Chi tiết
              </h4>
              <p className="mb-6 text-xs leading-relaxed text-gray-500 md:mb-8 md:text-sm">
                Truy cập báo cáo toàn diện về xu hướng thị trường, mức lương tiêu chuẩn và tốc độ
                tăng trưởng của các ngành nghề bằng cách đăng nhập.
              </p>
              <button
                onClick={currentRole ? undefined : requireAuth}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 md:py-3.5 md:text-base"
              >
                <Lock size={16} className="md:h-[18px] md:w-[18px]" />
                {currentRole ? 'Xem toàn bộ dữ liệu' : 'Đăng nhập để xem'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-gray-50 px-4 py-12 md:px-6 md:py-20">
        <div className="mx-auto mb-10 max-w-4xl text-center md:mb-16">
          <h3 className="mb-3 text-3xl font-extrabold text-gray-900 md:mb-4 md:text-4xl">
            Tuyendungso.vn hoạt động như thế nào?
          </h3>
          <p className="text-base text-gray-500 md:text-lg">
            Kết nối nhân tài với cơ hội chưa bao giờ dễ dàng hơn.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 md:gap-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-10">
            <div className="mb-6 flex items-center gap-3 md:mb-8">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                <User size={20} className="md:h-6 md:w-6" />
              </div>
              <h4 className="text-xl font-bold md:text-2xl">Dành cho Ứng viên</h4>
            </div>

            <div className="space-y-6 md:space-y-8">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 md:text-base">
                  1
                </div>
                <div>
                  <h5 className="mb-1 text-sm font-bold text-gray-900 md:text-base">Tạo Tài khoản</h5>
                  <p className="text-xs text-gray-500 md:text-sm">
                    Đăng ký hoàn toàn miễn phí và thiết lập hồ sơ chuyên nghiệp của bạn.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 md:text-base">
                  2
                </div>
                <div>
                  <h5 className="mb-1 text-sm font-bold text-gray-900 md:text-base">
                    Tải lên CV của bạn
                  </h5>
                  <p className="text-xs text-gray-500 md:text-sm">
                    Hệ thống AI phân tích CV để đề xuất công việc phù hợp nhất.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 md:text-base">
                  3
                </div>
                <div>
                  <h5 className="mb-1 text-sm font-bold text-gray-900 md:text-base">
                    Ứng tuyển & Nhận việc
                  </h5>
                  <p className="text-xs text-gray-500 md:text-sm">
                    Gửi hồ sơ chỉ với một cú chạm và theo dõi trạng thái theo thời gian thực.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-10">
            <div className="mb-6 flex items-center gap-3 md:mb-8">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                <Building size={20} className="md:h-6 md:w-6" />
              </div>
              <h4 className="text-xl font-bold md:text-2xl">Dành cho Nhà tuyển dụng</h4>
            </div>

            <div className="space-y-6 md:space-y-8">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 md:text-base">
                  1
                </div>
                <div>
                  <h5 className="mb-1 text-sm font-bold text-gray-900 md:text-base">
                    Đăng tin tuyển dụng
                  </h5>
                  <p className="text-xs text-gray-500 md:text-sm">
                    Tạo tin đăng nhanh chóng trong vài phút với đầy đủ thông tin hiển thị.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 md:text-base">
                  2
                </div>
                <div>
                  <h5 className="mb-1 text-sm font-bold text-gray-900 md:text-base">
                    Sàng lọc Ứng viên
                  </h5>
                  <p className="text-xs text-gray-500 md:text-sm">
                    Dễ dàng lọc ứng viên thông qua kỹ năng, kinh nghiệm và điểm đánh giá AI.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 md:text-base">
                  3
                </div>
                <div>
                  <h5 className="mb-1 text-sm font-bold text-gray-900 md:text-base">
                    Tuyển dụng Nhân tài
                  </h5>
                  <p className="text-xs text-gray-500 md:text-sm">
                    Lên lịch phỏng vấn và gửi thư mời làm việc trực tiếp thông qua nền tảng.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 px-4 py-10 md:px-6 md:py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <h3 className="mb-2 text-xl font-bold text-white md:mb-1 md:text-2xl">
              Khai phá tiềm năng của bạn
            </h3>
            <p className="text-xs text-slate-400 md:text-sm">
              Tham gia cùng các ứng viên và nhà tuyển dụng đang sử dụng Tuyendungso.vn mỗi ngày.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:gap-4">
            {currentRole ? (
              <>
                <a
                  href={resolveDashboardPath(currentRole)}
                  className="w-full rounded-lg border border-slate-700 px-6 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-slate-800 md:w-auto md:text-base"
                >
                  Vào trang của bạn
                </a>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-lg bg-gray-200 px-6 py-3 text-sm font-bold text-gray-900 transition-colors hover:bg-white md:w-auto md:text-base"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={requireAuth}
                  className="w-full rounded-lg border border-slate-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 md:w-auto md:text-base"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={requireAuth}
                  className="w-full rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 md:w-auto md:text-base"
                >
                  Tạo tài khoản miễn phí
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white px-4 py-10 md:px-6 md:py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-5">
          <div className="sm:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-sm bg-emerald-500 p-1">
                <Briefcase className="text-white" size={20} />
              </div>
              <span className="text-lg font-black text-gray-900 md:text-xl">Tuyendungso.vn</span>
            </div>
            <p className="pr-4 text-xs text-gray-500 md:text-sm">
              Nâng tầm sự nghiệp, kết nối mọi cơ hội bằng các tin tuyển dụng thật trên nền tảng.
            </p>
          </div>

          <div>
            <h5 className="mb-3 text-sm font-bold text-gray-900 md:mb-4 md:text-base">
              Dành cho Ứng viên
            </h5>
            <ul className="space-y-2 text-xs font-medium text-gray-500 md:space-y-3 md:text-sm">
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Tìm việc làm
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Tính lương Gross/Net
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Cẩm nang nghề nghiệp
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="mb-3 text-sm font-bold text-gray-900 md:mb-4 md:text-base">
              Dành cho Nhà tuyển dụng
            </h5>
            <ul className="space-y-2 text-xs font-medium text-gray-500 md:space-y-3 md:text-sm">
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Đăng tin tuyển dụng
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Bảng giá dịch vụ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Giải pháp tuyển dụng
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="mb-3 text-sm font-bold text-gray-900 md:mb-4 md:text-base">
              Về chúng tôi
            </h5>
            <ul className="space-y-2 text-xs font-medium text-gray-500 md:space-y-3 md:text-sm">
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Giới thiệu
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Liên hệ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Chính sách bảo mật
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={isLoginModalVisible}
        onClose={() => {
          setIsLoginModalOpen(false);
          setDismissedRedirectLogin(true);
        }}
        defaultView={redirectParam ? 'login' : 'register'}
      />
    </div>
  );
}