'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CandidateMegaNav from '@/components/CandidateMegaNav';
import BrandLogo from '@/components/BrandLogo';
import AuthGuard from '@/components/AuthGuard';
import CandidateCvWorkspaceCloud from '@/components/cv/CandidateCvWorkspaceCloud';
import CandidateCvGuide from '@/components/cv/CandidateCvGuide';
import CandidateCvQuickHub from '@/components/cv/CandidateCvQuickHub';
import { getStoredAuth, logoutClient } from '@/lib/auth/client';
import type { Role } from '@/lib/auth/shared';
import {
  candidateApi,
  getPageItems,
  type CandidateApplicationItem,
  type CandidateJob,
  type CandidateProfileRequest,
  type CandidateProfileResponse,
  type CandidateSavedJobResponse,
  type CandidateUploadedResume,
  type CreateJobApplicationRequest,
  type JobApplicationStatus,
  type PageResponse,
} from '@/lib/api/candidate';
import {
  BadgeInfo,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Gift,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  User,
  UserCog,
  XCircle,
} from 'lucide-react';
import { ThemePageStyles, ThemeToggleButton, usePageTheme } from '@/components/theme/PageThemeTools';

type AppTab =
  | 'jobs'
  | 'profile'
  | 'saved-jobs'
  | 'applied-jobs'
  | 'matched-jobs'
  | 'cv-manage'
  | 'cv-upload'
  | 'cv-guide'
  | 'companies'
  | 'companies-pro'
  | 'cover-letter';

type ApplyModalState = { open: boolean; job: CandidateJob | null };
type JobDetailModalState = { open: boolean; jobId: number | null };

const DEFAULT_PROFILE: CandidateProfileResponse = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  headline: '',
  currentTitle: '',
  desiredJobTitle: '',
  desiredLocation: '',
  city: '',
  yearsOfExperience: 0,
  resumeUrl: '',
  portfolioUrl: '',
  avatarUrl: '',
  skills: '',
  bio: '',
  profileCompletionPercent: 0,
};

const APPLICATION_STATUS_UI: Record<
  JobApplicationStatus,
  { label: string; className: string }
> = {
  APPLIED: {
    label: 'Đã nộp',
    className: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  IN_REVIEW: {
    label: 'Đang xem xét',
    className: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  SHORTLISTED: {
    label: 'Đã shortlist',
    className: 'border-violet-100 bg-violet-50 text-violet-700',
  },
  INTERVIEW_SCHEDULED: {
    label: 'Đã lên lịch PV',
    className: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  },
  OFFERED: {
    label: 'Đã nhận offer',
    className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  REJECTED: {
    label: 'Từ chối',
    className: 'border-rose-100 bg-rose-50 text-rose-700',
  },
  WITHDRAWN: {
    label: 'Đã rút đơn',
    className: 'border-gray-100 bg-gray-50 text-gray-700',
  },
};

function formatDate(date?: string | null) {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function safeText(value?: string | null, fallback = 'Chưa cập nhật') {
  return value && value.trim() ? value : fallback;
}


function normalizeImageSrc(value?: string | null): string | undefined {
  if (!value) return undefined;
  const src = value.trim();
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('blob:') ||
    src.startsWith('data:image/')
  ) {
    return src;
  }
  return undefined;
}

function normalizeSearchText(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function expandSearchVariants(keyword?: string | null) {
  const q = normalizeSearchText(keyword);
  if (!q) return [];
  const variants = new Set([q]);

  const synonymGroups: Array<[RegExp, string[]]> = [
    [/(nhan vien kinh doanh|kinh doanh|sale|sales|ban hang)/, ['sale', 'sales', 'kinh doanh', 'ban hang', 'business development']],
    [/(lap trinh website|lap trinh|developer|it|frontend|backend|fullstack|software)/, ['it', 'developer', 'lap trinh', 'website', 'frontend', 'backend', 'fullstack', 'software']],
    [/(ke toan|accounting|accountant)/, ['ke toan', 'accounting', 'accountant']],
    [/(marketing|digital marketing|seo|content)/, ['marketing', 'digital marketing', 'seo', 'content']],
    [/(hanh chinh nhan su|nhan su|hr|human resources)/, ['hanh chinh nhan su', 'nhan su', 'hr', 'human resources']],
    [/(cham soc khach hang|customer service|support|cskh)/, ['cham soc khach hang', 'customer service', 'support', 'cskh']],
    [/(ngan hang|bank|banking)/, ['ngan hang', 'bank', 'banking']],
    [/(bat dong san|real estate)/, ['bat dong san', 'real estate']],
    [/(telesales|tele sales)/, ['telesales', 'tele sales', 'sale']],
  ];

  for (const [pattern, items] of synonymGroups) {
    if (pattern.test(q)) {
      items.forEach((item) => variants.add(item));
    }
  }

  return Array.from(variants);
}

function matchesJobSearch(job: CandidateJob, keyword?: string | null, location?: string | null) {
  const haystack = normalizeSearchText(
    [
      job.title,
      job.companyName,
      job.location,
      job.employmentType,
      job.workMode,
      job.salaryDisplay,
      job.description,
      job.requirements,
      job.benefits,
    ].join(' '),
  );

  const locationNeedle = normalizeSearchText(location);
  const locationOk = !locationNeedle || haystack.includes(locationNeedle);

  const variants = expandSearchVariants(keyword);
  const keywordOk =
    variants.length === 0 ||
    variants.some((variant) => haystack.includes(variant)) ||
    normalizeSearchText(keyword)
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => haystack.includes(token));

  return keywordOk && locationOk;
}

function slugTab(params: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(params.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
  });
  return next.toString();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function splitTextToList(value?: string | null) {
  if (!value?.trim()) return [];
  return value
    .split(/\r?\n|•|-/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreJob(job: CandidateJob, profile: CandidateProfileResponse) {
  const haystack = [
    job.title,
    job.companyName,
    job.location,
    job.description,
    job.requirements,
    Array.isArray(job.skills) ? job.skills.join(' ') : String(job.skills ?? ''),
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  const desiredTitle = profile.desiredJobTitle?.trim().toLowerCase();
  const currentTitle = profile.currentTitle?.trim().toLowerCase();
  const desiredLocation = profile.desiredLocation?.trim().toLowerCase();
  const skillTokens = (profile.skills || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (desiredTitle && haystack.includes(desiredTitle)) score += 40;
  if (currentTitle && haystack.includes(currentTitle)) score += 25;
  if (desiredLocation && haystack.includes(desiredLocation)) score += 15;

  for (const token of skillTokens) {
    if (haystack.includes(token)) score += 8;
  }

  if ((job.location || '').toLowerCase().includes((profile.city || '').toLowerCase()) && profile.city) {
    score += 8;
  }

  return Math.min(score, 100);
}

function normalizeTab(tab: string | null): AppTab {
  switch (tab) {
    case 'jobs':
    case 'profile':
    case 'saved-jobs':
    case 'applied-jobs':
    case 'matched-jobs':
    case 'cv-manage':
    case 'cv-upload':
    case 'cv-guide':
    case 'companies':
    case 'companies-pro':
    case 'cover-letter':
      return tab;
    case 'cv':
      return 'cv-manage';
    case 'cover-letter-templates':
      return 'cover-letter';
    default:
      return 'jobs';
  }
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/70 p-8 text-center md:p-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
        <Lock size={28} className="text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
      <p className="mx-auto max-w-md text-sm text-gray-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:justify-end">
      <button
        onClick={() => onPageChange(Math.max(page - 1, 0))}
        disabled={page <= 0}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Trước
      </button>
      <span className="px-2 text-sm font-semibold text-gray-500">
        Trang {page + 1} / {Math.max(totalPages, 1)}
      </span>
      <button
        onClick={() => onPageChange(Math.min(page + 1, totalPages - 1))}
        disabled={page >= totalPages - 1}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sau
      </button>
    </div>
  );
}

function JobCard({
  job,
  saved,
  matchedScore,
  onSave,
  onApply,
  onOpen,
}: {
  job: CandidateJob;
  saved: boolean;
  matchedScore?: number;
  onSave: () => void;
  onApply: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md md:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <button onClick={onOpen} className="flex items-start gap-3 text-left">
          {normalizeImageSrc(job.companyLogoUrl) ? (
            <img
              src={normalizeImageSrc(job.companyLogoUrl)}
              alt={job.companyName || 'Logo công ty'}
              className="h-10 w-10 shrink-0 rounded-xl border border-gray-100 bg-white object-contain md:h-12 md:w-12"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-base font-bold text-gray-500 md:h-12 md:w-12 md:text-lg">
              {(job.companyName || 'C').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="line-clamp-2 text-base font-bold leading-tight text-gray-900 md:text-lg">
              {job.title}
            </h4>
            <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-500 md:text-sm">
              {safeText(job.companyName, 'Doanh nghiệp')}
            </p>
          </div>
        </button>

        <button
          onClick={onSave}
          className={`shrink-0 rounded-full p-2 transition-colors ${
            saved
              ? 'bg-emerald-50 text-emerald-600'
              : 'text-gray-300 hover:bg-gray-100 hover:text-emerald-500'
          }`}
          aria-label={saved ? 'Bỏ lưu việc làm' : 'Lưu việc làm'}
        >
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-gray-600">
          <MapPin size={12} className="mr-1 inline" /> {safeText(job.location)}
        </span>
        {job.employmentType ? (
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
            {job.employmentType}
          </span>
        ) : null}
        {job.workMode ? (
          <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
            {job.workMode}
          </span>
        ) : null}
        <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-gray-600">
          {safeText(job.salaryDisplay, 'Thỏa thuận')}
        </span>
        {typeof matchedScore === 'number' ? (
          <span className="rounded-md bg-violet-50 px-2 py-1 text-violet-700">
            Match {matchedScore}%
          </span>
        ) : null}
      </div>

      <p className="mb-6 line-clamp-3 text-sm leading-6 text-gray-600">
        {safeText(job.description, 'Nhấn xem chi tiết để đọc mô tả đầy đủ.')}
      </p>

      <div className="mt-auto flex items-center gap-2 md:gap-3">
        <button
          onClick={onOpen}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 md:text-sm"
        >
          Chi tiết
        </button>
        <button
          onClick={onApply}
          className="flex-1 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-600 md:text-sm"
        >
          Ứng tuyển
        </button>
      </div>
    </div>
  );
}

export default function CandidatePage() {
  const { isDark, toggleTheme } = usePageTheme();
  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<CandidateProfileResponse>(DEFAULT_PROFILE);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [jobsPage, setJobsPage] = useState<PageResponse<CandidateJob>>({
    content: [],
    totalPages: 0,
    page: 0,
  });
  const [jobsLoading, setJobsLoading] = useState(false);

  const [savedPage, setSavedPage] = useState<PageResponse<CandidateSavedJobResponse>>({
    content: [],
    totalPages: 0,
    page: 0,
  });
  const [savedLoading, setSavedLoading] = useState(false);

  const [applicationsPage, setApplicationsPage] = useState<PageResponse<CandidateApplicationItem>>({
    content: [],
    totalPages: 0,
    page: 0,
  });
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [withdrawingApplicationId, setWithdrawingApplicationId] = useState<number | null>(null);

  const [globalError, setGlobalError] = useState('');
  const [globalMessage, setGlobalMessage] = useState('');
  const [mobileActionsMenuOpen, setMobileActionsMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const [applyModal, setApplyModal] = useState<ApplyModalState>({
    open: false,
    job: null,
  });
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [saveBusyIds, setSaveBusyIds] = useState<number[]>([]);

  const [detailModal, setDetailModal] = useState<JobDetailModalState>({
    open: false,
    jobId: null,
  });
  const [detailJob, setDetailJob] = useState<CandidateJob | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTab = searchParams.get('tab');
  const activeTab = normalizeTab(rawTab);
  const keyword = searchParams.get('keyword') || '';
  const location = searchParams.get('location') || '';
  const page = Math.max(Number(searchParams.get('page') || '0'), 0);
  const isCvManage = activeTab === 'cv-manage';
  const JOBS_PAGE_SIZE = 12;

  const [searchForm, setSearchForm] = useState({ keyword, location });

  useEffect(() => {
    const raw = searchParams.get('tab');
    const normalized = normalizeTab(raw);

    if (raw && raw !== normalized) {
      const query = slugTab(searchParams, { tab: normalized });
      router.replace(`/candidate?${query}`);
    }
  }, [router, searchParams]);

  useEffect(() => {
    setSearchForm({ keyword, location });
  }, [keyword, location]);

  useEffect(() => {
    setMobileActionsMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const syncRole = () => setRole(getStoredAuth().role);
    syncRole();
    window.addEventListener('auth-changed', syncRole);
    window.addEventListener('storage', syncRole);

    return () => {
      window.removeEventListener('auth-changed', syncRole);
      window.removeEventListener('storage', syncRole);
    };
  }, []);

  const pageTitle = useMemo(() => {
    switch (activeTab) {
      case 'profile':
        return 'Hồ sơ cá nhân';
      case 'saved-jobs':
        return 'Việc làm đã lưu';
      case 'applied-jobs':
        return 'Việc làm đã ứng tuyển';
      case 'matched-jobs':
        return 'Việc làm phù hợp';
      case 'cv-manage':
        return 'CV & Hồ sơ nghề nghiệp';
      case 'cv-upload':
        return 'Tải CV';
      case 'cv-guide':
        return 'Hướng dẫn viết CV';
      case 'companies':
        return 'Khám phá công ty';
      case 'companies-pro':
        return 'Công ty nổi bật';
      case 'cover-letter':
        return 'Cover Letter';
      default:
        return 'Tìm việc làm';
    }
  }, [activeTab]);

  const sidebarMenus = useMemo(
    () => [
      { id: 'profile', label: 'Hồ sơ cá nhân', icon: UserCog },
      { id: 'cv-manage', label: 'Hồ sơ CV', icon: FileText },
      { id: 'saved-jobs', label: 'Việc làm đã lưu', icon: Bookmark },
      { id: 'applied-jobs', label: 'Đã ứng tuyển', icon: Briefcase },
      { id: 'matched-jobs', label: 'Việc làm phù hợp', icon: Sparkles },
    ],
    [],
  );

  const savedIds = useMemo(
    () =>
      new Set(
        getPageItems(savedPage)
          .map((item) => item.job?.id)
          .filter(Boolean) as number[],
      ),
    [savedPage],
  );

  const visibleJobs = useMemo(() => {
    return getPageItems(jobsPage).filter((job) => matchesJobSearch(job, keyword, location));
  }, [jobsPage, keyword, location]);

  const paginatedVisibleJobs = useMemo(() => {
    const start = page * JOBS_PAGE_SIZE;
    return visibleJobs.slice(start, start + JOBS_PAGE_SIZE);
  }, [visibleJobs, page]);

  const visibleJobsTotalPages = Math.max(1, Math.ceil(visibleJobs.length / JOBS_PAGE_SIZE));

  const matchedJobs = useMemo(() => {
    return getPageItems(jobsPage)
      .map((job) => ({ job, score: scoreJob(job, profile) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [jobsPage, profile]);

  const loadProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const data = await candidateApi.getProfile();
      setProfile({ ...DEFAULT_PROFILE, ...data });
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error, 'Không thể tải hồ sơ ứng viên'));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const data = await candidateApi.getPublicJobs({ page: 0, size: 100 });
      setJobsPage(data);
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error, 'Không thể tải danh sách việc làm'));
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const loadSavedJobs = useCallback(async () => {
    try {
      setSavedLoading(true);
      const data = await candidateApi.getSavedJobs({ page, size: 12 });
      setSavedPage(data);
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error, 'Không thể tải việc làm đã lưu'));
    } finally {
      setSavedLoading(false);
    }
  }, [page]);

  const loadApplications = useCallback(async () => {
    try {
      setApplicationsLoading(true);
      const data = await candidateApi.getMyApplications({ page, size: 10 });
      setApplicationsPage(data);
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error, 'Không thể tải danh sách ứng tuyển'));
    } finally {
      setApplicationsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (activeTab === 'jobs' || activeTab === 'matched-jobs') loadJobs();
    if (activeTab === 'saved-jobs') loadSavedJobs();
    if (activeTab === 'applied-jobs') loadApplications();
  }, [activeTab, loadApplications, loadJobs, loadSavedJobs]);

  const executeLogout = () => {
    logoutClient();
    window.location.href = '/';
  };

  const handleLogout = () => {
    setMobileActionsMenuOpen(false);
    setLogoutConfirmOpen(true);
  };

  const navigateTab = (tab: AppTab, extra?: Record<string, string | null>) => {
    const query = slugTab(searchParams, { tab, page: '0', ...(extra || {}) });
    router.push(`/candidate?${query}`);
    setMobileActionsMenuOpen(false);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = slugTab(searchParams, {
      tab: 'jobs',
      keyword: searchForm.keyword.trim() || null,
      location: searchForm.location.trim() || null,
      page: '0',
    });
    router.push(`/candidate?${query}`);
  };

  const handlePageChange = (nextPage: number) => {
    const query = slugTab(searchParams, { page: String(nextPage) });
    router.push(`/candidate?${query}`);
  };

  const handleProfileField = (
    field: keyof CandidateProfileResponse,
    value: string | number,
  ) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileSave = async (event?: React.FormEvent) => {
    event?.preventDefault();

    try {
      setProfileSaving(true);
      setGlobalError('');
      setGlobalMessage('');

      const payload: CandidateProfileRequest = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        headline: profile.headline,
        currentTitle: profile.currentTitle,
        desiredJobTitle: profile.desiredJobTitle,
        desiredLocation: profile.desiredLocation,
        city: profile.city,
        yearsOfExperience: Number(profile.yearsOfExperience || 0),
        resumeUrl: profile.resumeUrl,
        portfolioUrl: profile.portfolioUrl,
        avatarUrl: profile.avatarUrl,
        skills: profile.skills,
        bio: profile.bio,
      };

      const saved = await candidateApi.saveProfile(payload);
      setProfile({ ...DEFAULT_PROFILE, ...saved });
      setGlobalMessage('Đã lưu hồ sơ ứng viên thành công.');
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error, 'Không thể lưu hồ sơ'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleToggleSave = async (job: CandidateJob) => {
    try {
      setSaveBusyIds((prev) => [...prev, job.id]);
      setGlobalError('');

      if (savedIds.has(job.id)) {
        await candidateApi.unsaveJob(job.id);
        setSavedPage((prev) => ({
          ...prev,
          content: getPageItems(prev).filter((item) => item.job.id !== job.id),
        }));
        setGlobalMessage('Đã bỏ lưu việc làm.');
      } else {
        const saved = await candidateApi.saveJob(job.id);
        setSavedPage((prev) => ({
          ...prev,
          content: [saved, ...getPageItems(prev)],
        }));
        setGlobalMessage('Đã lưu việc làm.');
      }
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error, 'Không thể cập nhật việc làm đã lưu'));
    } finally {
      setSaveBusyIds((prev) => prev.filter((id) => id !== job.id));
    }
  };

  const openApplyModal = (job: CandidateJob) => {
    setApplyModal({ open: true, job });
    setGlobalError('');
    setGlobalMessage('');
  };

  const closeApplyModal = () => setApplyModal({ open: false, job: null });

  const openDetailModal = async (jobId: number) => {
    try {
      setDetailModal({ open: true, jobId });
      setDetailLoading(true);
      setDetailJob(null);
      const data = await candidateApi.getPublicJobDetail(jobId);
      setDetailJob(data);
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error, 'Không thể tải chi tiết việc làm'));
      setDetailModal({ open: false, jobId: null });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModal({ open: false, jobId: null });
    setDetailJob(null);
    setDetailLoading(false);
  };

  const handleApply = async (payload: CreateJobApplicationRequest) => {
    try {
      setApplySubmitting(true);
      setGlobalError('');
      const res = await candidateApi.apply(payload);
      setGlobalMessage(res.message || 'Ứng tuyển thành công.');
      closeApplyModal();
      if (activeTab === 'applied-jobs') await loadApplications();
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error, 'Không thể gửi đơn ứng tuyển'));
    } finally {
      setApplySubmitting(false);
    }
  };

  const withdrawApplication = async (applicationId: number) => {
    if (!window.confirm('Bạn có chắc muốn rút đơn ứng tuyển này không?')) return;

    try {
      setWithdrawingApplicationId(applicationId);
      setGlobalError('');
      setGlobalMessage('');
      const response = await candidateApi.withdrawApplication(applicationId);
      setGlobalMessage(response.message || 'Đã rút đơn ứng tuyển. Bạn có thể nộp lại CV ngay.');
      await loadApplications();
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error, 'Không thể rút đơn ứng tuyển.'));
    } finally {
      setWithdrawingApplicationId(null);
    }
  };

  const completion = profile.profileCompletionPercent ?? 0;

  const renderSidebarCard = (
    <aside className="space-y-6 lg:col-span-1">
      <div className="hidden lg:block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-6 flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600">
            {profile.firstName?.charAt(0) || 'U'}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={16} className="text-white" />
            </div>
          </div>
          <div>
            <h3 className="line-clamp-1 font-extrabold text-gray-900">
              {safeText(`${profile.firstName} ${profile.lastName}`.trim(), 'Người dùng')}
            </h3>
            <p className="text-sm font-semibold text-emerald-600">Tài khoản Ứng viên</p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>Độ hoàn thiện hồ sơ</span>
            <span>{completion}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        <nav className="space-y-1">
          {sidebarMenus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => navigateTab(menu.id as AppTab)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ${
                activeTab === menu.id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <menu.icon size={18} />
                {menu.label}
              </div>
              {activeTab === menu.id ? <ChevronRight size={16} /> : null}
            </button>
          ))}
        </nav>
      </div>

      <div className="hidden lg:block rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
        <Bell className="mx-auto mb-2 text-blue-500" size={24} />
        <h4 className="mb-2 font-bold text-blue-900">Cập nhật cơ hội phù hợp</h4>
        <p className="mb-4 text-xs text-blue-700">
          Hoàn thiện hồ sơ để xem gợi ý dựa trên kỹ năng.
        </p>
        <button
          onClick={() => navigateTab('matched-jobs')}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
        >
          Xem gợi ý ngay
        </button>
      </div>
    </aside>
  );

  return (
    <AuthGuard allowedRoles={['CANDIDATE']}>
      <div className={`${isDark ? 'tds-theme-dark' : 'tds-theme-light'} min-h-screen bg-gray-50 font-sans text-gray-900 transition-colors duration-300`}>
        <ThemePageStyles />
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 shadow-sm md:px-6 md:py-4 lg:px-12">
          <BrandLogo
            className="cursor-pointer gap-2"
            logoClassName="h-8 w-8 rounded-md object-contain md:h-9 md:w-9"
            textClassName="text-xl font-black tracking-tight text-gray-900 md:text-2xl"
          />

          <CandidateMegaNav role={role} className="text-gray-600" />

          <div className="hidden items-center gap-4 lg:flex">
            <ThemeToggleButton isDark={isDark} onToggle={toggleTheme} />
            <a
              href="/candidate?tab=profile"
              className="flex items-center gap-2 text-sm font-bold text-gray-700 transition-colors hover:text-emerald-600"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <User size={16} />
              </div>
              Tài khoản của tôi
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
            >
              <LogOut size={16} /> Thoát
            </button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggleButton isDark={isDark} onToggle={toggleTheme} />
            <button
              onClick={() => setMobileActionsMenuOpen(!mobileActionsMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700"
            >
              <User size={18} />
            </button>
          </div>
        </header>

        {mobileActionsMenuOpen ? (
          <div className="absolute right-4 top-[60px] z-40 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl md:top-[70px] lg:hidden">
            <button
              onClick={() => navigateTab('profile')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <UserCog size={16} /> Hồ sơ cá nhân
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={16} /> Thoát tài khoản
            </button>
          </div>
        ) : null}

        {logoutConfirmOpen ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <LogOut size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">Xác nhận đăng xuất</h3>
                  <p className="mt-1 text-sm text-gray-500">Bạn có chắc chắn muốn thoát khỏi tài khoản ứng viên này không?</p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Ở lại
                </button>
                <button
                  type="button"
                  onClick={executeLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 font-bold text-white transition-colors hover:bg-rose-700"
                >
                  <LogOut size={18} /> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'jobs' ? (
          <section className="bg-slate-900 px-4 py-8 md:px-6 md:py-10">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-6 text-center text-xl font-extrabold text-white md:text-left md:text-2xl lg:text-3xl">
                Khám phá cơ hội tiếp theo của bạn
              </h2>
              <form
                onSubmit={handleSearchSubmit}
                className="flex max-w-4xl flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg md:flex-row md:rounded-full md:p-1.5"
              >
                <div className="flex flex-1 items-center border-b border-gray-100 px-4 py-2 md:border-b-0 md:border-r">
                  <Search className="mr-3 shrink-0 text-gray-400" size={20} />
                  <input
                    value={searchForm.keyword}
                    onChange={(e) =>
                      setSearchForm((prev) => ({ ...prev, keyword: e.target.value }))
                    }
                    type="text"
                    placeholder="Chức danh, từ khóa hoặc công ty..."
                    className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none md:text-base"
                  />
                </div>

                <div className="flex flex-1 items-center px-4 py-2">
                  <MapPin className="mr-3 shrink-0 text-gray-400" size={20} />
                  <input
                    value={searchForm.location}
                    onChange={(e) =>
                      setSearchForm((prev) => ({ ...prev, location: e.target.value }))
                    }
                    type="text"
                    placeholder="Địa điểm làm việc..."
                    className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none md:text-base"
                  />
                </div>

                <button className="mt-2 w-full rounded-xl bg-emerald-500 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600 md:mt-0 md:w-auto md:rounded-full md:py-2.5 md:text-base">
                  Tìm kiếm
                </button>
              </form>
            </div>
          </section>
        ) : null}

        {!isCvManage ? (
          <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:gap-8 md:px-6 lg:grid-cols-4 lg:py-8">
            {renderSidebarCard}

            <section className="lg:col-span-3">
              <div className="h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-8">
                <div className="mb-6 border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-extrabold text-gray-900 md:text-2xl">
                    {pageTitle}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 md:text-base">
                    {keyword || location
                      ? `Hiển thị kết quả cho: ${[keyword, location].filter(Boolean).join(' • ')}`
                      : 'Quản lý thông tin và cơ hội nghề nghiệp của bạn.'}
                  </p>
                </div>

                {globalError ? (
                  <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {globalError}
                  </div>
                ) : null}

                {globalMessage ? (
                  <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {globalMessage}
                  </div>
                ) : null}

                {activeTab === 'jobs' ? (
                  <div>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-500">
                        {visibleJobs.length} việc làm phù hợp
                      </p>
                      <button
                        onClick={loadJobs}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <RefreshCcw size={15} />
                        <span className="hidden md:inline">Làm mới</span>
                      </button>
                    </div>

                    {jobsLoading ? (
                      <div className="flex min-h-[240px] items-center justify-center">
                        <Loader2 className="animate-spin text-emerald-500" size={32} />
                      </div>
                    ) : visibleJobs.length ? (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-2">
                          {paginatedVisibleJobs.map((job) => (
                            <div
                              key={job.id}
                              className={saveBusyIds.includes(job.id) ? 'pointer-events-none opacity-80' : ''}
                            >
                              <JobCard
                                job={job}
                                saved={savedIds.has(job.id)}
                                onSave={() => handleToggleSave(job)}
                                onApply={() => openApplyModal(job)}
                                onOpen={() => openDetailModal(job.id)}
                              />
                            </div>
                          ))}
                        </div>
                        <Pagination
                          page={page}
                          totalPages={visibleJobsTotalPages}
                          onPageChange={handlePageChange}
                        />
                      </>
                    ) : (
                      <EmptyState
                        title="Chưa có việc làm phù hợp bộ lọc hiện tại"
                        description="Hãy thử thay đổi từ khóa hoặc bỏ bớt bộ lọc địa điểm để xem thêm kết quả."
                      />
                    )}
                  </div>
                ) : null}

                {activeTab === 'profile' ? (
                  <form onSubmit={handleProfileSave} className="max-w-4xl space-y-5 md:space-y-6">
                    {profileLoading ? (
                      <div className="flex min-h-[240px] items-center justify-center">
                        <Loader2 className="animate-spin text-emerald-500" size={32} />
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">
                              Họ và tên lót
                            </label>
                            <input
                              value={profile.firstName}
                              onChange={(e) => handleProfileField('firstName', e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Tên</label>
                            <input
                              value={profile.lastName}
                              onChange={(e) => handleProfileField('lastName', e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                            />
                          </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Email</label>
                            <input
                              disabled
                              value={profile.email}
                              className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500 outline-none md:text-base"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">
                              Số điện thoại
                            </label>
                            <input
                              value={profile.phone || ''}
                              onChange={(e) => handleProfileField('phone', e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                            />
                          </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">
                              Chức danh hiện tại
                            </label>
                            <input
                              value={profile.currentTitle || ''}
                              onChange={(e) => handleProfileField('currentTitle', e.target.value)}
                              placeholder="VD: Backend Developer"
                              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Headline</label>
                            <input
                              value={profile.headline || ''}
                              onChange={(e) => handleProfileField('headline', e.target.value)}
                              placeholder="VD: Java Dev | 4 năm KN"
                              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                            />
                          </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                          <div className="space-y-2 md:col-span-1">
                            <label className="text-sm font-bold text-gray-700">
                              Năm kinh nghiệm
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={profile.yearsOfExperience ?? 0}
                              onChange={(e) =>
                                handleProfileField(
                                  'yearsOfExperience',
                                  Number(e.target.value || 0),
                                )
                              }
                              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-5 md:col-span-2">
                            <div className="col-span-1 space-y-2">
                              <label className="text-sm font-bold text-gray-700">
                                Vị trí mong muốn
                              </label>
                              <input
                                value={profile.desiredJobTitle || ''}
                                onChange={(e) =>
                                  handleProfileField('desiredJobTitle', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                              />
                            </div>
                            <div className="col-span-1 space-y-2">
                              <label className="text-sm font-bold text-gray-700">
                                Khu vực mong muốn
                              </label>
                              <input
                                value={profile.desiredLocation || ''}
                                onChange={(e) =>
                                  handleProfileField('desiredLocation', e.target.value)
                                }
                                placeholder="HCM / Remote"
                                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">
                              Link CV / Resume
                            </label>
                            <input
                              value={profile.resumeUrl || ''}
                              onChange={(e) => handleProfileField('resumeUrl', e.target.value)}
                              placeholder="https://..."
                              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">
                              Portfolio / LinkedIn
                            </label>
                            <input
                              value={profile.portfolioUrl || ''}
                              onChange={(e) =>
                                handleProfileField('portfolioUrl', e.target.value)
                              }
                              placeholder="https://..."
                              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">
                            Kỹ năng (ngăn cách bởi dấu phẩy)
                          </label>
                          <input
                            value={profile.skills || ''}
                            onChange={(e) => handleProfileField('skills', e.target.value)}
                            placeholder="Java, Spring Boot, React..."
                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">
                            Giới thiệu bản thân
                          </label>
                          <textarea
                            rows={4}
                            value={profile.bio || ''}
                            onChange={(e) => handleProfileField('bio', e.target.value)}
                            placeholder="Viết ngắn gọn về kinh nghiệm, thành tựu..."
                            className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:text-base"
                          />
                        </div>

                        <div className="flex flex-col-reverse justify-end gap-3 pt-4 md:flex-row">
                          <button
                            type="button"
                            onClick={loadProfile}
                            className="w-full rounded-xl bg-gray-100 px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-200 md:w-auto md:py-2.5"
                          >
                            Tải lại
                          </button>
                          <button
                            type="submit"
                            disabled={profileSaving}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white shadow-md transition-colors hover:bg-emerald-600 disabled:opacity-70 md:w-auto md:py-2.5"
                          >
                            {profileSaving ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={18} />
                            )}{' '}
                            Lưu thay đổi
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                ) : null}

                {activeTab === 'saved-jobs' ? (
                  <div>
                    {savedLoading ? (
                      <div className="flex min-h-[240px] items-center justify-center">
                        <Loader2 className="animate-spin text-emerald-500" size={32} />
                      </div>
                    ) : getPageItems(savedPage).length ? (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                          {getPageItems(savedPage).map((savedItem) => (
                            <JobCard
                              key={savedItem.id}
                              job={savedItem.job}
                              saved
                              onSave={() => handleToggleSave(savedItem.job)}
                              onApply={() => openApplyModal(savedItem.job)}
                              onOpen={() => openDetailModal(savedItem.job.id)}
                            />
                          ))}
                        </div>
                        <Pagination
                          page={page}
                          totalPages={savedPage.totalPages || 0}
                          onPageChange={handlePageChange}
                        />
                      </>
                    ) : (
                      <EmptyState
                        title="Bạn chưa lưu việc làm nào"
                        description="Nhấn biểu tượng bookmark tại tab Tìm việc làm để lưu."
                        action={
                          <button
                            onClick={() => navigateTab('jobs')}
                            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                          >
                            Tìm việc làm ngay
                          </button>
                        }
                      />
                    )}
                  </div>
                ) : null}

                {activeTab === 'applied-jobs' ? (
                  <div>
                    {applicationsLoading ? (
                      <div className="flex min-h-[240px] items-center justify-center">
                        <Loader2 className="animate-spin text-emerald-500" size={32} />
                      </div>
                    ) : getPageItems(applicationsPage).length ? (
                      <>
                        <div className="space-y-4">
                          {getPageItems(applicationsPage).map((item) => {
                            const statusUi = APPLICATION_STATUS_UI[item.status];

                            return (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-gray-200 p-4 shadow-sm md:p-5"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <h3 className="text-base font-bold text-gray-900 md:text-lg">
                                      {item.job.title}
                                    </h3>
                                    <div className="mt-2 flex flex-col gap-2 text-xs text-gray-500 md:flex-row md:flex-wrap md:text-sm">
                                      <span className="inline-flex items-center gap-1">
                                        <Building2 size={14} />{' '}
                                        {safeText(item.job.companyName, 'Doanh nghiệp')}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin size={14} /> {safeText(item.job.location)}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <CalendarDays size={14} /> Nộp lúc:{' '}
                                        {formatDate(item.createdAt)}
                                      </span>
                                    </div>
                                  </div>

                                  <span
                                    className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold ${statusUi.className}`}
                                  >
                                    {statusUi.label}
                                  </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                                  <div className="rounded-xl bg-gray-50 p-3">
                                    <p className="text-xs font-bold uppercase text-gray-400">
                                      Lương
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-gray-800">
                                      {safeText(item.job.salaryDisplay, 'Thỏa thuận')}
                                    </p>
                                  </div>

                                  <div className="rounded-xl bg-gray-50 p-3">
                                    <p className="text-xs font-bold uppercase text-gray-400">
                                      Loại hình
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-gray-800">
                                      {safeText(item.job.employmentType)}
                                    </p>
                                  </div>

                                  <div className="col-span-2 rounded-xl bg-gray-50 p-3 md:col-span-1">
                                    <p className="text-xs font-bold uppercase text-gray-400">
                                      AI đánh giá
                                    </p>
                                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-gray-800">
                                      {item.aiRecommendation
                                        ? `${item.aiRecommendation} ${
                                            item.aiMatchScore != null
                                              ? `• ${item.aiMatchScore}%`
                                              : ''
                                          }`
                                        : 'Chưa có'}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-col gap-2 md:flex-row">
                                  <button
                                    onClick={() => openDetailModal(item.job.id)}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 md:w-auto"
                                  >
                                    Xem lại tin tuyển dụng
                                  </button>

                                  {item.status === 'REJECTED' ? (
                                    <button
                                      onClick={() => openApplyModal(item.job)}
                                      className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 md:w-auto"
                                    >
                                      <RefreshCcw size={16} className="mr-2" />
                                      Nộp lại CV
                                    </button>
                                  ) : null}

                                  {item.status !== 'WITHDRAWN' ? (
                                    <button
                                      onClick={() => void withdrawApplication(item.id)}
                                      disabled={withdrawingApplicationId === item.id}
                                      className="inline-flex w-full items-center justify-center rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                                    >
                                      {withdrawingApplicationId === item.id ? (
                                        <Loader2 size={16} className="mr-2 animate-spin" />
                                      ) : (
                                        <XCircle size={16} className="mr-2" />
                                      )}
                                      Rút đơn
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <Pagination
                          page={page}
                          totalPages={applicationsPage.totalPages || 0}
                          onPageChange={handlePageChange}
                        />
                      </>
                    ) : (
                      <EmptyState
                        title="Bạn chưa ứng tuyển công việc nào"
                        description="Hãy ứng tuyển công việc đầu tiên để bắt đầu theo dõi tiến trình tuyển dụng."
                        action={
                          <button
                            onClick={() => navigateTab('jobs')}
                            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                          >
                            Tìm việc để ứng tuyển
                          </button>
                        }
                      />
                    )}
                  </div>
                ) : null}

                {activeTab === 'matched-jobs' ? (
                  <div>
                    {jobsLoading || profileLoading ? (
                      <div className="flex min-h-[240px] items-center justify-center">
                        <Loader2 className="animate-spin text-emerald-500" size={32} />
                      </div>
                    ) : matchedJobs.length ? (
                      <div className="space-y-6">
                        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 md:p-5">
                          <div className="mb-2 flex items-center gap-2 text-violet-800">
                            <Sparkles size={18} />
                            <h3 className="text-sm font-bold md:text-base">
                              Gợi ý cá nhân hóa
                            </h3>
                          </div>
                          <p className="text-xs text-violet-700 md:text-sm">
                            Kết quả được phân tích dựa trên <b>vị trí mong muốn</b>,{' '}
                            <b>kỹ năng</b>, <b>kinh nghiệm</b> và <b>địa điểm</b> trong
                            hồ sơ của bạn.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                          {matchedJobs.map((item) => (
                            <JobCard
                              key={`${item.job.id}-${item.score}`}
                              job={item.job}
                              saved={savedIds.has(item.job.id)}
                              matchedScore={item.score}
                              onSave={() => handleToggleSave(item.job)}
                              onApply={() => openApplyModal(item.job)}
                              onOpen={() => openDetailModal(item.job.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <EmptyState
                        title="Chưa đủ dữ liệu để gợi ý"
                        description="Hãy cập nhật vị trí mong muốn, kỹ năng và kinh nghiệm trong hồ sơ để hệ thống đề xuất."
                        action={
                          <button
                            onClick={() => navigateTab('profile')}
                            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
                          >
                            Cập nhật hồ sơ
                          </button>
                        }
                      />
                    )}
                  </div>
                ) : null}

                {activeTab === 'cv-upload' ? (
                  <CandidateCvQuickHub
                    profile={profile}
                    onOpenBuilder={() => navigateTab('cv-manage')}
                    onOpenProfile={() => navigateTab('profile')}
                  />
                ) : null}

                {activeTab === 'cv-guide' ? <CandidateCvGuide /> : null}

                {['companies', 'companies-pro', 'cover-letter'].includes(activeTab) ? (
                  <EmptyState
                    title="Tính năng đang được cập nhật"
                    description="Các khu vực này đang được hoàn thiện. Vui lòng quay lại sau nhé!"
                  />
                ) : null}
              </div>
            </section>
          </main>
        ) : (
          <main className="mx-auto max-w-[1800px] px-4 py-4 md:px-6 lg:px-8 lg:py-6">
            <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sidebarMenus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => navigateTab(menu.id as AppTab)}
                  className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
                    activeTab === menu.id
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <menu.icon size={16} className="mr-2 inline" />
                  {menu.label}
                </button>
              ))}
            </div>

            {globalError ? (
              <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {globalError}
              </div>
            ) : null}

            {globalMessage ? (
              <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {globalMessage}
              </div>
            ) : null}

            <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">{pageTitle}</h2>
                  <p className="mt-1 text-sm text-gray-500 md:text-base">
                    Không gian chỉnh CV riêng, mở rộng toàn chiều ngang để tránh chèn đè giữa editor và preview.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                    {profile.firstName?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-gray-900">
                      {safeText(`${profile.firstName} ${profile.lastName}`.trim(), 'Người dùng')}
                    </div>
                    <div className="text-xs font-semibold text-emerald-700">
                      Hồ sơ hoàn thiện {completion}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 2xl:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="hidden space-y-4 2xl:block">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-base font-extrabold text-gray-900">
                    Điều hướng nhanh
                  </h3>
                  <div className="space-y-2">
                    {sidebarMenus.map((menu) => (
                      <button
                        key={menu.id}
                        onClick={() => navigateTab(menu.id as AppTab)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ${
                          activeTab === menu.id
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <menu.icon size={18} />
                          {menu.label}
                        </div>
                        {activeTab === menu.id ? <ChevronRight size={16} /> : null}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
                  <Bell className="mx-auto mb-2 text-blue-500" size={24} />
                  <h4 className="mb-2 font-bold text-blue-900">Cập nhật cơ hội phù hợp</h4>
                  <p className="mb-4 text-xs text-blue-700">
                    Hoàn thiện hồ sơ để xem gợi ý dựa trên kỹ năng.
                  </p>
                  <button
                    onClick={() => navigateTab('matched-jobs')}
                    className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                  >
                    Xem gợi ý ngay
                  </button>
                </div>
              </aside>

              <section className="min-w-0">
                <CandidateCvWorkspaceCloud profile={profile} />
              </section>
            </div>
          </main>
        )}

        {detailModal.open ? (
          <JobDetailModal
            loading={detailLoading}
            job={detailJob}
            onClose={closeDetailModal}
            onApply={(job) => {
              closeDetailModal();
              openApplyModal(job);
            }}
          />
        ) : null}

        {applyModal.open && applyModal.job ? (
          <ApplyJobModal
            job={applyModal.job}
            profile={profile}
            submitting={applySubmitting}
            onClose={closeApplyModal}
            onSubmit={handleApply}
          />
        ) : null}

        <footer className="mt-auto border-t border-gray-100 bg-white px-6 py-10 md:py-12">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <BrandLogo
                className="mb-4 gap-2"
                logoClassName="h-7 w-7 rounded-sm object-contain md:h-8 md:w-8"
                textClassName="text-xl font-black text-gray-900"
              />
              <p className="pr-4 text-sm text-gray-500">
                Nâng tầm sự nghiệp, kết nối mọi cơ hội. Nền tảng tuyển dụng thông minh hàng đầu.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
}

function JobDetailModal({
  loading,
  job,
  onClose,
  onApply,
}: {
  loading: boolean;
  job: CandidateJob | null;
  onClose: () => void;
  onApply: (job: CandidateJob) => void;
}) {
  const requirementItems = splitTextToList(job?.requirements);
  const benefitItems = splitTextToList(job?.benefits);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 transition-opacity lg:items-center lg:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-transform lg:max-h-[94vh] lg:rounded-3xl">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-lg font-extrabold text-gray-900 md:text-2xl">
                Chi tiết tin tuyển dụng
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
            >
              <XCircle size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 pb-20 md:px-6 lg:pb-6">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="animate-spin text-emerald-500" size={36} />
            </div>
          ) : !job ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
              Không thể tải chi tiết việc làm.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-6">
                  <div className="flex flex-col items-start gap-4 md:flex-row">
                    {normalizeImageSrc(job.companyLogoUrl) ? (
                      <img
                        src={normalizeImageSrc(job.companyLogoUrl)}
                        alt={job.companyName || 'Logo công ty'}
                        className="h-14 w-14 shrink-0 rounded-2xl border border-gray-100 bg-white object-contain"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 text-xl font-bold text-gray-500">
                        {(job.companyName || 'C').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl font-extrabold leading-tight text-gray-900 md:text-2xl">
                        {job.title}
                      </h1>
                      <p className="mt-1 text-sm font-semibold text-gray-600 md:text-base">
                        {safeText(job.companyName, 'Doanh nghiệp')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                          <MapPin size={12} className="mr-1 inline" />
                          {safeText(job.location)}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {safeText(job.employmentType)}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {safeText(job.workMode)}
                        </span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                          {safeText(job.salaryDisplay, 'Thỏa thuận')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <ClipboardList size={18} className="text-emerald-600" />
                    <h2 className="text-base font-bold text-gray-900 md:text-lg">
                      Mô tả công việc
                    </h2>
                  </div>
                  <div className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {safeText(job.description)}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <BadgeInfo size={18} className="text-emerald-600" />
                    <h2 className="text-base font-bold text-gray-900 md:text-lg">Yêu cầu</h2>
                  </div>
                  {requirementItems.length ? (
                    <ul className="space-y-2 text-sm leading-relaxed text-gray-700">
                      {requirementItems.map((item, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                      {safeText(job.requirements)}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Gift size={18} className="text-emerald-600" />
                    <h2 className="text-base font-bold text-gray-900 md:text-lg">
                      Phúc lợi
                    </h2>
                  </div>
                  {benefitItems.length ? (
                    <ul className="space-y-2 text-sm leading-relaxed text-gray-700">
                      {benefitItems.map((item, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                      {safeText(job.benefits)}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <h3 className="mb-4 text-base font-bold text-gray-900 md:text-lg">
                    Thông tin chung
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <Building2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Công ty</p>
                        <p className="text-gray-600">{safeText(job.companyName)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Địa điểm</p>
                        <p className="text-gray-600">{safeText(job.location)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Briefcase size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Loại hình</p>
                        <p className="text-gray-600">{safeText(job.employmentType)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <BadgeInfo size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Mức lương</p>
                        <p className="text-gray-600">
                          {safeText(job.salaryDisplay, 'Thỏa thuận')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CalendarDays size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Hạn nộp</p>
                        <p className="font-bold text-rose-600 text-gray-600">
                          {formatDate(job.deadline)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 mt-6 space-y-3 bg-gray-50 pt-2 lg:static lg:bg-transparent lg:pt-0">
                    <button
                      onClick={() => onApply(job)}
                      className="w-full rounded-xl bg-emerald-500 px-4 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-emerald-600 md:py-3"
                    >
                      Ứng tuyển ngay
                    </button>
                    <button
                      onClick={onClose}
                      className="hidden w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 font-bold text-gray-700 transition-colors hover:bg-gray-100 md:py-3 lg:block"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplyJobModal({
  job,
  profile,
  submitting,
  onClose,
  onSubmit,
}: {
  job: CandidateJob;
  profile: CandidateProfileResponse;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateJobApplicationRequest) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateJobApplicationRequest>({
    jobPostId: job.id,
    candidateFullName: `${profile.firstName} ${profile.lastName}`.trim(),
    candidateEmail: profile.email,
    phone: profile.phone || '',
    currentTitle: profile.currentTitle || '',
    yearsOfExperience: profile.yearsOfExperience || 0,
    resumeUrl: profile.resumeUrl || '',
    uploadedResumeId: null,
    portfolioUrl: profile.portfolioUrl || '',
    skills: profile.skills || '',
    coverLetter:
      profile.bio ||
      `Xin chào, tôi quan tâm đến vị trí ${job.title} tại ${safeText(
        job.companyName,
        'công ty',
      )}. Tôi tin rằng kinh nghiệm và kỹ năng của mình phù hợp với vị trí này.`,
  });
  const [error, setError] = useState('');
  const [resumeItems, setResumeItems] = useState<CandidateUploadedResume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadResumes = async () => {
      try {
        setLoadingResumes(true);
        const items = await candidateApi.getMyUploadedResumes();
        if (ignore) return;
        setResumeItems(items);
        if (!form.uploadedResumeId && items.length) {
          setForm((prev) => ({
            ...prev,
            uploadedResumeId: prev.uploadedResumeId ?? items[0].id,
          }));
        }
      } catch (err) {
        if (!ignore) {
          setError(getErrorMessage(err, 'Không thể tải danh sách CV PDF đã lưu'));
        }
      } finally {
        if (!ignore) setLoadingResumes(false);
      }
    };

    void loadResumes();
    return () => {
      ignore = true;
    };
  }, []);

  const updateField = (
    field: keyof CreateJobApplicationRequest,
    value: string | number | null,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleResumeFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Chỉ hỗ trợ file PDF.');
      return;
    }

    try {
      setUploadingResume(true);
      setError('');
      const uploaded = await candidateApi.uploadCandidateResumePdf(file);
      setResumeItems((prev) => [uploaded, ...prev]);
      setForm((prev) => ({ ...prev, uploadedResumeId: uploaded.id }));
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải file PDF CV'));
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.candidateFullName.trim()) return setError('Vui lòng nhập họ tên.');
    if (!form.candidateEmail.trim()) return setError('Vui lòng nhập email.');
    if (!form.resumeUrl?.trim() && !form.uploadedResumeId) {
      return setError('Vui lòng nhập Resume URL hoặc chọn / tải lên CV PDF.');
    }
    setError('');
    await onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 lg:items-center lg:p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl lg:rounded-3xl">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 md:text-xl">
                Nộp đơn ứng tuyển
              </h3>
              <p className="mt-1 line-clamp-1 text-xs text-gray-500 md:text-sm">
                {job.title} • {safeText(job.companyName)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
            >
              <XCircle size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <h4 className="mb-2 text-sm font-bold text-gray-900 md:text-base">
              Tóm tắt công việc
            </h4>
            <div className="grid gap-2 text-xs text-gray-600 md:grid-cols-2 md:text-sm">
              <div>
                <Building2 size={14} className="mr-1 inline" />{' '}
                {safeText(job.companyName)}
              </div>
              <div>
                <MapPin size={14} className="mr-1 inline" /> {safeText(job.location)}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4 pb-6 md:space-y-5">
            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Họ và tên</label>
                <input
                  value={form.candidateFullName}
                  onChange={(e) => updateField('candidateFullName', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none focus:ring-1 focus:ring-emerald-500 md:py-2"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Email liên hệ</label>
                <input
                  type="email"
                  value={form.candidateEmail}
                  onChange={(e) => updateField('candidateEmail', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none focus:ring-1 focus:ring-emerald-500 md:py-2"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Số điện thoại</label>
                <input
                  value={form.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none focus:ring-1 focus:ring-emerald-500 md:py-2"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">
                  Chức danh / Vị trí hiện tại
                </label>
                <input
                  value={form.currentTitle || ''}
                  onChange={(e) => updateField('currentTitle', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none focus:ring-1 focus:ring-emerald-500 md:py-2"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">
                  Số năm kinh nghiệm
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.yearsOfExperience ?? 0}
                  onChange={(e) =>
                    updateField('yearsOfExperience', Number(e.target.value || 0))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none focus:ring-1 focus:ring-emerald-500 md:py-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">
                  Link CV / Hồ sơ năng lực
                </label>
                <input
                  value={form.resumeUrl || ''}
                  onChange={(e) => updateField('resumeUrl', e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none focus:ring-1 focus:ring-emerald-500 md:py-2"
                />
                <p className="text-xs text-gray-500">
                  Bạn có thể giữ Resume URL như cũ hoặc dùng thêm file PDF ở dưới.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-gray-900">
                    CV PDF đã lưu / tải lên
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    File PDF này sẽ được nhà tuyển dụng xem và Gemini dùng để đánh giá hồ sơ.
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50">
                  {uploadingResume ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <FileText size={16} className="mr-2" />
                  )}
                  Tải PDF từ máy
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleResumeFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {loadingResumes ? (
                <div className="text-sm text-gray-500">Đang tải danh sách CV PDF...</div>
              ) : resumeItems.length ? (
                <div className="space-y-2">
                  {resumeItems.map((item) => (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        form.uploadedResumeId === item.id
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={form.uploadedResumeId === item.id}
                        onChange={() => updateField('uploadedResumeId', item.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-900">
                          {item.fileName}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString('vi-VN')
                            : 'Vừa tải lên'}
                        </div>
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-bold text-emerald-600"
                        >
                          Xem file PDF
                        </a>
                      </div>
                    </label>
                  ))}

                  <button
                    type="button"
                    onClick={() => updateField('uploadedResumeId', null)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-700"
                  >
                    Bỏ chọn PDF và chỉ dùng Resume URL
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-500">
                  Chưa có CV PDF nào. Bạn có thể tải file từ máy hoặc vào phần tạo CV bấm
                  “Lưu PDF ứng tuyển”.
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">
                Thư xin việc (Cover Letter)
              </label>
              <textarea
                rows={5}
                value={form.coverLetter || ''}
                onChange={(e) => updateField('coverLetter', e.target.value)}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-col-reverse justify-end gap-3 border-t border-gray-100 pt-4 md:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-gray-100 px-6 py-3.5 font-bold text-gray-700 hover:bg-gray-200 md:w-auto md:py-2.5"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-bold text-white hover:bg-emerald-600 disabled:opacity-70 md:w-auto md:py-2.5"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}{' '}
                Gửi đơn ứng tuyển
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
