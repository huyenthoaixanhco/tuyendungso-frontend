'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LoginModal from '@/components/LoginModal';
import CandidateMegaNav from '@/components/CandidateMegaNav';
import BrandLogo from '@/components/BrandLogo';
import { getStoredAuth, logoutClient } from '@/lib/auth/client';
import { resolveDashboardPath, type Role } from '@/lib/auth/shared';
import type { LucideIcon } from 'lucide-react';
import { ThemePageStyles, ThemeToggleButton, usePageTheme } from '@/components/theme/PageThemeTools';
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
    typeof value === 'number' ? value : Number(String(value).replaceAll(',', '').trim());

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

function DesktopMenu({
  menu,
  title,
  children,
  widthClass,
  openMenu,
  setOpenMenu,
}: {
  menu: Exclude<MenuKey, null>;
  title: string;
  children: React.ReactNode;
  widthClass: string;
  openMenu: MenuKey;
  setOpenMenu: React.Dispatch<React.SetStateAction<MenuKey>>;
}) {
  return (
    <div
      className="relative py-2"
      onMouseEnter={() => setOpenMenu(menu)}
      onMouseLeave={() => setOpenMenu(null)}
    >
      <button
        type="button"
        className={`flex items-center gap-1 text-sm font-semibold transition-colors ${
          openMenu === menu ? 'text-emerald-600' : 'text-gray-700 hover:text-emerald-500'
        }`}
      >
        {title}
        <ChevronDown size={16} />
      </button>

      {openMenu === menu ? (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          <div
            className={`max-w-[92vw] overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-2xl ${widthClass}`}
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
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
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  const handlePreviewClick = () => {
    closeAll();
    onRequireAuth();
  };

  const handleOpenPublicJobs = () => {
    closeAll();
    onOpenPublicJobs();
  };

  const handleOpenPublicKeyword = (keyword: string) => {
    closeAll();
    onSelectPublicJobKeyword(keyword);
  };

  return (
    <>
      <nav className="relative hidden items-center gap-8 lg:flex">
        <DesktopMenu
          menu="jobs"
          title="Việc làm"
          widthClass="w-[980px]"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        >
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
                        {!isPublicSearch ? <Lock size={14} className="ml-auto text-gray-300" /> : null}
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
        </DesktopMenu>

        <DesktopMenu
          menu="cv"
          title="Tạo CV"
          widthClass="w-[860px]"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        >
          <div className="grid grid-cols-2">
            <div className="border-r border-gray-100 p-8">
              <div className="mb-6 flex items-center justify-between">
                <h4 className="text-[22px] font-extrabold text-emerald-600">Mẫu CV theo style →</h4>
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
                    <li key={item.title} className={index === 3 ? 'border-t border-gray-100 pt-4' : ''}>
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
        </DesktopMenu>

        <DesktopMenu
          menu="tools"
          title="Công cụ"
          widthClass="w-[860px]"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        >
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
        </DesktopMenu>

      
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
              
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function JobCard({
  job,
  onAction,
}: {
  job: PublicJobItem;
  onAction: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
              {job.employmentType || 'Toàn thời gian'}
            </span>
            {job.workplaceType ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                {job.workplaceType}
              </span>
            ) : null}
          </div>
          <h4 className="line-clamp-2 text-lg font-extrabold text-gray-900">{job.title}</h4>
          <p className="mt-1 text-sm font-semibold text-gray-500">{job.companyName}</p>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 text-emerald-600">
          <Briefcase size={20} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-gray-600">
        <span className="inline-flex items-center gap-1 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1.5">
          <MapPin size={12} />
          {job.location || 'Linh hoạt'}
        </span>
        <span className="rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1.5">
          {displaySalary(job)}
        </span>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">{excerpt(job.description)}</p>

      {job.aiSummary ? (
        <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs leading-5 text-purple-700">
          <span className="font-bold">AI tóm tắt:</span> {excerpt(job.aiSummary, 110)}
        </div>
      ) : null}

      <div className="mt-auto pt-5">
        <button
          onClick={onAction}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
        >
          Ứng tuyển ngay
        </button>
      </div>
    </article>
  );
}

function LoadingJobs() {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 text-sm font-semibold text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        Đang tải danh sách việc làm...
      </div>
    </div>
  );
}

function JobsError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-bold">Không thể tải danh sách việc làm</div>
          <p className="mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isDark, toggleTheme } = usePageTheme();
  const [redirectParam, setRedirectParam] = useState<string | null>(null);

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
    const syncRole = () => setCurrentRole(getStoredAuth().role);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    setRedirectParam(redirect);
  }, []);

  const handleLogout = () => {
    logoutClient();
    window.location.href = '/';
  };

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
    <div className={`${isDark ? 'tds-theme-dark' : 'tds-theme-light'} min-h-screen bg-white font-sans text-gray-900 transition-colors duration-300`}>
      <ThemePageStyles />
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-white px-4 py-3 md:px-12 md:py-4">
        <BrandLogo
          className="gap-2"
          logoClassName="h-9 w-9 rounded-md object-contain md:h-10 md:w-10"
          textClassName="text-xl font-black tracking-tight text-gray-900 md:text-2xl"
        />

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
          <ThemeToggleButton isDark={isDark} onToggle={toggleTheme} />
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

        {jobsLoading ? <LoadingJobs /> : null}
        {!jobsLoading && jobsError ? <JobsError message={jobsError} /> : null}

        {!jobsLoading && !jobsError ? (
          jobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} onAction={handleJobAction} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
              Hiện chưa có việc làm phù hợp với bộ lọc của bạn.
            </div>
          )
        ) : null}
      </section>

      <section className="bg-gradient-to-b from-white to-slate-50 px-4 py-12 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              <LineChart size={16} />
              Phân tích thị trường việc làm
            </div>
            <h3 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
              Theo dõi xu hướng tuyển dụng, mức lương và nhu cầu kỹ năng
            </h3>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
              Khám phá dữ liệu trực quan về số lượng việc làm, kỹ năng nổi bật và xu hướng lương theo
              ngành nghề. Đăng nhập để mở khóa toàn bộ báo cáo chi tiết.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl md:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'IT / Software', val: '92%', w: 'w-[92%]' },
                { label: 'Sales', val: '84%', w: 'w-[84%]' },
                { label: 'Marketing', val: '78%', w: 'w-[78%]' },
                { label: 'Kế toán', val: '69%', w: 'w-[69%]' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700">
                    <span>{item.label}</span>
                    <span>{item.val}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className={`h-full rounded-full bg-blue-400 ${item.w}`}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-white/40 p-4 backdrop-blur-[2px]">
              <div className="w-full max-w-[420px] rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-xl md:p-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 md:h-14 md:w-14">
                  <LineChart size={24} className="md:h-7 md:w-7" />
                </div>
                <h4 className="mb-2 text-lg font-extrabold text-gray-900 md:text-xl">
                  Mở khóa Phân tích Chi tiết
                </h4>
                <p className="mb-6 text-xs leading-relaxed text-gray-500 md:text-sm">
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
              {[
                ['1', 'Tạo tài khoản', 'Đăng ký miễn phí và thiết lập hồ sơ nghề nghiệp của bạn.'],
                ['2', 'Tìm việc phù hợp', 'Lọc theo vị trí, kỹ năng, mức lương và địa điểm.'],
                ['3', 'Ứng tuyển nhanh', 'Nộp CV và theo dõi trạng thái ứng tuyển trên một nơi.'],
              ].map(([step, title, desc]) => (
                <div key={step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 md:text-base">
                    {step}
                  </div>
                  <div>
                    <h5 className="mb-1 text-sm font-bold text-gray-900 md:text-base">{title}</h5>
                    <p className="text-xs text-gray-500 md:text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-10">
            <div className="mb-6 flex items-center gap-3 md:mb-8">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                <Building size={20} className="md:h-6 md:w-6" />
              </div>
              <h4 className="text-xl font-bold md:text-2xl">Dành cho Nhà tuyển dụng</h4>
            </div>

            <div className="space-y-6 md:space-y-8">
              {[
                ['1', 'Tạo hồ sơ công ty', 'Xây dựng thương hiệu tuyển dụng và xác thực thông tin.'],
                ['2', 'Đăng tin tuyển dụng', 'Quản lý JD, mức lương và hạn nộp hồ sơ linh hoạt.'],
                ['3', 'Sàng lọc ứng viên', 'Theo dõi ứng viên và phối hợp tuyển dụng hiệu quả.'],
              ].map(([step, title, desc]) => (
                <div key={step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 md:text-base">
                    {step}
                  </div>
                  <div>
                    <h5 className="mb-1 text-sm font-bold text-gray-900 md:text-base">{title}</h5>
                    <p className="text-xs text-gray-500 md:text-sm">{desc}</p>
                  </div>
                </div>
              ))}
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
            <BrandLogo
              className="mb-4 gap-2"
              logoClassName="h-7 w-7 rounded-sm object-contain md:h-8 md:w-8"
              textClassName="text-lg font-black text-gray-900 md:text-xl"
            />
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
                <a href="#job-search-section" className="hover:text-emerald-500">
                  Tìm việc làm
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500">
                  Tính lương Gross/Net
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
            <h5 className="mb-3 text-sm font-bold text-gray-900 md:mb-4 md:text-base">Về chúng tôi</h5>
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
