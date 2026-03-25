'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { logoutClient } from '@/lib/auth/client';
import {
  adminApi,
  AdminAiInsightResponse,
  AdminDashboardResponse,
  AdminSettingItem,
  AdminUserListItem,
  AdminJobListItem,
  JobStatus,
} from '@/lib/api/admin';
import {
  Shield,
  Users,
  Briefcase,
  Sparkles,
  Bot,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Building2,
  Lock,
  Unlock,
  LayoutDashboard,
  FileText,
  Settings,
  ChevronRight,
  Activity,
  LogOut,
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'jobs' | 'reports' | 'settings' | 'ai';

const defaultDashboard: AdminDashboardResponse = {
  totalUsers: 0,
  totalCandidates: 0,
  totalEmployers: 0,
  pendingEmployers: 0,
  pendingJobs: 0,
  approvedJobs: 0,
  rejectedJobs: 0,
  activeJobs: 0,
  aiReviewedJobs: 0,
  autoApprovedJobs: 0,
  latestPendingJobs: [],
};

const defaultAiInsight: AdminAiInsightResponse = {
  summary: '',
  recommendedActions: [],
};

const tabConfig: Record<AdminTab, { title: string; icon: React.ElementType }> = {
  overview: { title: 'Tổng quan', icon: LayoutDashboard },
  users: { title: 'Người dùng', icon: Users },
  jobs: { title: 'Kiểm duyệt', icon: Briefcase },
  reports: { title: 'Báo cáo', icon: FileText },
  settings: { title: 'Cấu hình', icon: Settings },
  ai: { title: 'AI Vận hành', icon: Sparkles },
};

const jobStatusDisplay: Record<string, string> = {
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  PENDING_REVIEW: 'Chờ duyệt',
  DRAFT: 'Bản nháp',
  CLOSED: 'Đã đóng',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateOnly(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('vi-VN') + ' đ';
}

function formatSalaryDisplay(job: AdminJobListItem) {
  if (job.salaryLabel && job.salaryLabel.trim()) {
    return job.salaryLabel.trim();
  }
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${formatMoney(job.salaryMin)} - ${formatMoney(job.salaryMax)}`;
  }
  if (job.salaryMin != null) {
    return `Từ ${formatMoney(job.salaryMin)}`;
  }
  if (job.salaryMax != null) {
    return `Đến ${formatMoney(job.salaryMax)}`;
  }
  return 'Thoả thuận';
}

function statusBadge(status: JobStatus) {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
    case 'PENDING_REVIEW':
      return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20';
    case 'DRAFT':
      return 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20';
    case 'CLOSED':
      return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20';
    default:
      return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
  }
}

function AdminPageFallback() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:space-y-8 md:p-6">
        <div className="h-20 animate-pulse rounded-3xl bg-white shadow-sm" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
        <div className="h-[420px] animate-pulse rounded-3xl bg-white shadow-sm" />
      </div>
    </div>
  );
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTab = searchParams.get('tab');
  const activeTab: AdminTab =
    rawTab && rawTab in tabConfig ? (rawTab as AdminTab) : 'overview';

  const [dashboard, setDashboard] = useState<AdminDashboardResponse>(defaultDashboard);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [jobs, setJobs] = useState<AdminJobListItem[]>([]);
  const [settings, setSettings] = useState<AdminSettingItem[]>([]);
  const [aiInsight, setAiInsight] = useState<AdminAiInsightResponse>(defaultAiInsight);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [userKeyword, setUserKeyword] = useState('');
  const [userRole, setUserRole] = useState('');
  const [jobKeyword, setJobKeyword] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});

  const pageTitle = useMemo(() => tabConfig[activeTab].title, [activeTab]);

  const syncSettingDrafts = useCallback((items: AdminSettingItem[]) => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.key] = item.value;
    });
    setSettingDrafts(next);
  }, []);

  const loadDashboard = useCallback(async () => {
    const [dashboardData, aiData] = await Promise.all([
      adminApi.getDashboard(),
      adminApi.getAiInsights().catch(() => defaultAiInsight),
    ]);
    setDashboard(dashboardData);
    setAiInsight(aiData);
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await adminApi.getUsers({
      keyword: userKeyword || undefined,
      role: userRole || undefined,
      page: 0,
      size: 20,
    });
    setUsers(response.items);
  }, [userKeyword, userRole]);

  const loadJobs = useCallback(async () => {
    const response = await adminApi.getJobs({
      keyword: jobKeyword || undefined,
      status: jobStatus || undefined,
      page: 0,
      size: 20,
    });
    setJobs(response.items);
  }, [jobKeyword, jobStatus]);

  const loadSettings = useCallback(async () => {
    const response = await adminApi.getSettings();
    setSettings(response);
    syncSettingDrafts(response);
  }, [syncSettingDrafts]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadDashboard(), loadUsers(), loadJobs(), loadSettings()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu quản trị viên');
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, loadUsers, loadJobs, loadSettings]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleLogout = () => {
    logoutClient();
    window.location.href = '/';
  };

  const handleTabChange = (tab: AdminTab) => {
    router.push(`/admin?tab=${tab}`);
  };

  const handleUserStatus = async (userId: string, active: boolean) => {
    setActionLoading(`user-status-${userId}`);
    try {
      await adminApi.updateUserStatus(userId, active);
      await Promise.all([loadUsers(), loadDashboard()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không cập nhật được trạng thái người dùng');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmployerApproval = async (userId: string, approved: boolean) => {
    setActionLoading(`employer-approval-${userId}`);
    try {
      await adminApi.updateEmployerApproval(userId, approved);
      await Promise.all([loadUsers(), loadDashboard()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không cập nhật được trạng thái duyệt công ty');
    } finally {
      setActionLoading(null);
    }
  };

  const handleJobApprove = async (jobId: number) => {
    const note = window.prompt('Ghi chú duyệt tin', 'Tin đạt yêu cầu, cho phép hiển thị');
    setActionLoading(`job-approve-${jobId}`);
    try {
      await adminApi.approveJob(jobId, note || undefined);
      await Promise.all([loadJobs(), loadDashboard()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không duyệt được tin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleJobReject = async (jobId: number) => {
    const note = window.prompt('Lý do từ chối', 'Nội dung chưa đạt yêu cầu duyệt');
    if (!note) return;
    setActionLoading(`job-reject-${jobId}`);
    try {
      await adminApi.rejectJob(jobId, note);
      await Promise.all([loadJobs(), loadDashboard()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không từ chối được tin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAiReview = async (jobId: number) => {
    setActionLoading(`job-ai-${jobId}`);
    try {
      await adminApi.aiReviewJob(jobId);
      await Promise.all([loadJobs(), loadDashboard(), loadSettings()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể sử dụng AI để đánh giá tin này');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAiReview = async () => {
    const limitText = window.prompt('Số lượng tin cần AI kiểm duyệt hàng loạt', '10');
    if (!limitText) return;
    setActionLoading('bulk-ai-review');
    try {
      const result = await adminApi.bulkAiReviewPending(Number(limitText));
      alert(
        `Đã xử lý ${result.processed} tin\n` +
          `Tự động duyệt: ${result.autoApproved}\n` +
          `Tự động từ chối: ${result.autoRejected}\n` +
          `Chờ duyệt thủ công: ${result.leftForManualReview}`
      );
      await Promise.all([loadJobs(), loadDashboard()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không chạy được chức năng kiểm duyệt AI hàng loạt');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSetting = async (key: string) => {
    setActionLoading(`setting-${key}`);
    try {
      await adminApi.updateSetting(key, settingDrafts[key]);
      await Promise.all([loadSettings(), loadDashboard(), loadJobs()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không lưu được cấu hình');
    } finally {
      setActionLoading(null);
    }
  };

  const summaryCards = [
    { label: 'Người dùng', value: dashboard.totalUsers, icon: Users, color: 'from-emerald-400 to-emerald-600' },
    { label: 'Tin chờ duyệt', value: dashboard.pendingJobs, icon: Briefcase, color: 'from-blue-400 to-blue-600' },
    { label: 'AI đã đánh giá', value: dashboard.aiReviewedJobs, icon: Bot, color: 'from-orange-400 to-orange-600' },
    { label: 'Tự động duyệt', value: dashboard.autoApprovedJobs, icon: Sparkles, color: 'from-purple-400 to-purple-600' },
  ];

  return (
    <AuthGuard allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-slate-200/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 shadow-lg shadow-emerald-500/20 md:p-2">
                <Shield className="text-white" size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-lg font-extrabold leading-none tracking-tight text-slate-900 md:text-xl">
                  Tuyendungso.vn
                </h1>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 md:text-xs">
                  Cổng Quản Trị
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button onClick={loadAll} className="rounded-full p-2 text-slate-600">
                <RefreshCw size={16} className={loading ? 'animate-spin text-emerald-600' : ''} />
              </button>
              <button onClick={handleLogout} className="rounded-full p-2 text-rose-600">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <nav className="scrollbar-hide flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:gap-1 md:pb-0">
            {(Object.keys(tabConfig) as AdminTab[]).map((key) => {
              const TabIcon = tabConfig[key].icon;
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 md:gap-2 md:px-4 md:py-2.5 md:text-sm ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-inset ring-emerald-600/10'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <TabIcon size={14} strokeWidth={isActive ? 2.5 : 2} className="md:h-4 md:w-4" />
                  {tabConfig[key].title}
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={loadAll}
              className="rounded-full border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-600"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95"
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        <main className="animate-in mx-auto max-w-7xl space-y-6 fade-in slide-in-from-bottom-4 p-4 duration-500 md:space-y-8 md:p-6">
          <section className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-end md:gap-4">
            <div>
              <h2 className="mb-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 md:mb-2 md:gap-3 md:text-3xl">
                {pageTitle}
              </h2>
              <p className="text-xs font-medium text-slate-500 md:text-sm">
                Quản lý hệ thống, kiểm duyệt nội dung và theo dõi hiệu suất với sự hỗ trợ của AI.
              </p>
            </div>
            {error && (
              <div className="w-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 md:w-auto md:px-4 md:text-sm">
                {error}
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="group rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md md:p-6"
                >
                  <div className="mb-3 flex items-start justify-between md:mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-inner md:h-12 md:w-12`}>
                      <Icon size={20} className="text-white md:h-6 md:w-6" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-1 text-xs font-semibold text-slate-500 md:text-sm">{card.label}</h3>
                    <p className="text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
                      {loading ? <span className="animate-pulse text-slate-300">...</span> : card.value.toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              );
            })}
          </section>

          {(activeTab === 'overview' || activeTab === 'reports') && (
            <div className="animate-in grid gap-6 fade-in duration-500 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <div className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm md:p-8">
                  <div className="mb-4 flex items-center gap-2 md:mb-6">
                    <Activity className="text-emerald-500" size={20} />
                    <h3 className="text-lg font-bold text-slate-900 md:text-xl">Chỉ số vận hành chi tiết</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
                    <MetricBox title="Ứng viên" value={dashboard.totalCandidates} />
                    <MetricBox title="Nhà tuyển dụng" value={dashboard.totalEmployers} />
                    <MetricBox title="Công ty chờ duyệt" value={dashboard.pendingEmployers} highlight={dashboard.pendingEmployers > 0} />
                    <MetricBox title="Tin đã duyệt" value={dashboard.approvedJobs} />
                    <MetricBox title="Tin bị từ chối" value={dashboard.rejectedJobs} />
                    <MetricBox title="AI tự động duyệt" value={dashboard.autoApprovedJobs} />
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
                  <div className="flex flex-col items-start gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
                    <h3 className="text-lg font-bold text-slate-900">Tin tuyển dụng chờ duyệt</h3>
                    <button
                      onClick={handleBulkAiReview}
                      disabled={actionLoading === 'bulk-ai-review' || dashboard.latestPendingJobs.length === 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-purple-700 hover:to-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto md:px-5 md:py-2.5"
                    >
                      <Sparkles size={16} />
                      Duyệt hàng loạt AI
                    </button>
                  </div>

                  <div className="space-y-4 p-4 md:p-6">
                    {dashboard.latestPendingJobs.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center md:py-10">
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400 md:mb-3 md:h-10 md:w-10" />
                        <p className="text-sm font-medium text-slate-600 md:text-base">Tuyệt vời! Đã xử lý hết tin chờ duyệt.</p>
                      </div>
                    ) : (
                      dashboard.latestPendingJobs.map((job) => (
                        <div
                          key={job.id}
                          className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-md lg:flex-row lg:items-center md:gap-5 md:p-5"
                        >
                          <div>
                            <h4 className="text-base font-bold text-slate-900 transition-colors group-hover:text-emerald-700 md:text-lg">{job.title}</h4>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600 md:mt-1.5 md:gap-2 md:text-sm">
                              <Building2 size={12} className="text-slate-400 md:h-[14px] md:w-[14px]" />
                              <span className="font-medium">{job.companyName}</span>
                              <span className="text-slate-300">•</span>
                              <span>{job.location}</span>
                            </div>
                            <p className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-400 md:text-xs">
                              Tạo: {formatDate(job.createdAt)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                            <button
                              onClick={() => handleAiReview(job.id)}
                              disabled={!!actionLoading}
                              className="flex-1 rounded-xl border-2 border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 md:px-4 md:text-sm"
                            >
                              Đánh giá AI
                            </button>
                            <button
                              onClick={() => handleJobApprove(job.id)}
                              disabled={!!actionLoading}
                              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 disabled:opacity-50 md:px-4 md:text-sm"
                            >
                              Duyệt ngay
                            </button>
                            <button
                              onClick={() => handleJobReject(job.id)}
                              disabled={!!actionLoading}
                              className="flex-1 rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 transition-all hover:bg-rose-200 disabled:opacity-50 md:px-4 md:text-sm"
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky top-28 h-fit rounded-3xl bg-gradient-to-b from-slate-900 to-slate-800 p-6 text-white shadow-xl md:p-8">
                <div className="mb-5 flex items-center gap-2 md:mb-6 md:gap-3">
                  <div className="rounded-xl bg-emerald-500/20 p-2">
                    <Bot size={24} className="text-emerald-400 md:h-7 md:w-7" />
                  </div>
                  <h3 className="text-lg font-bold md:text-xl">Gợi ý từ Gemini</h3>
                </div>

                <div className="prose prose-invert mb-5 text-sm leading-relaxed md:prose-sm md:mb-6">
                  <p className="text-slate-300">{aiInsight.summary || 'Hệ thống đang thu thập dữ liệu để đưa ra đề xuất...'}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 md:mb-3 md:text-xs">
                    Đề xuất hành động
                  </h4>
                  {aiInsight.recommendedActions.length > 0 ? (
                    aiInsight.recommendedActions.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10 md:gap-3 md:p-4">
                        <ChevronRight size={16} className="mt-0.5 shrink-0 text-emerald-400 md:h-[18px] md:w-[18px]" />
                        <span className="text-xs font-medium leading-snug text-slate-200 md:text-sm">{item}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-slate-400 md:p-4 md:text-sm">
                      Chưa có đề xuất mới
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <section className="animate-in overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm fade-in duration-500">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:p-6">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400 md:top-3.5 md:h-[18px] md:w-[18px]" />
                  <input
                    value={userKeyword}
                    onChange={(e) => setUserKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                    placeholder="Tìm kiếm email, tên..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium shadow-sm outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:py-3 md:text-sm"
                  />
                </div>
                <div className="flex gap-2 md:gap-3">
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-1/2 cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium shadow-sm outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:w-auto md:px-5 md:py-3 md:text-sm"
                  >
                    <option value="">Tất cả vai trò</option>
                    <option value="CANDIDATE">Ứng viên</option>
                    <option value="EMPLOYER">Tuyển dụng</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                  <button
                    onClick={loadUsers}
                    className="w-1/2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md active:scale-95 sm:w-auto md:px-6 md:py-3 md:text-sm"
                  >
                    Lọc
                  </button>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 md:px-6 md:py-4">Thông tin</th>
                      <th className="px-4 py-3 md:px-6 md:py-4">Vai trò</th>
                      <th className="px-4 py-3 md:px-6 md:py-4">Trạng thái</th>
                      <th className="px-4 py-3 md:px-6 md:py-4">Xác thực</th>
                      <th className="px-4 py-3 md:px-6 md:py-4">Ngày tham gia</th>
                      <th className="px-4 py-3 text-right md:px-6 md:py-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="group transition-colors hover:bg-slate-50/80">
                        <td className="px-4 py-3 md:px-6 md:py-4">
                          <p className="font-bold text-slate-900 transition-colors group-hover:text-emerald-700">{user.fullName}</p>
                          <p className="mt-0.5 text-xs text-slate-500 md:text-sm">{user.email}</p>
                        </td>
                        <td className="px-4 py-3 md:px-6 md:py-4">
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 md:px-2.5 md:text-xs">
                            {user.role === 'CANDIDATE' ? 'Ứng viên' : user.role === 'EMPLOYER' ? 'Tuyển dụng' : 'Quản trị'}
                          </span>
                        </td>
                        <td className="px-4 py-3 md:px-6 md:py-4">
                          {user.active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 md:px-2.5 md:text-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-600/20 md:px-2.5 md:text-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                              Bị khóa
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 md:px-6 md:py-4">
                          {user.verified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 md:text-sm">
                              <CheckCircle2 size={14} className="md:h-4 md:w-4" /> Xác thực
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 md:text-sm">
                              <XCircle size={14} className="md:h-4 md:w-4" /> Chưa XT
                            </span>
                          )}

                          {user.role === 'EMPLOYER' && (
                            <div className="mt-1 md:mt-2">
                              {user.employerApproved ? (
                                <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-600/20 md:px-2 md:py-1 md:text-xs">
                                  <Building2 size={10} className="md:h-3 md:w-3" /> Đã duyệt CTy
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-600/20 md:px-2 md:py-1 md:text-xs">
                                  <Building2 size={10} className="md:h-3 md:w-3" /> Chờ duyệt CTy
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-500 md:px-6 md:py-4 md:text-sm">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-3 text-right md:px-6 md:py-4">
                          <div className="flex flex-col justify-end gap-2 sm:flex-row">
                            <button
                              onClick={() => handleUserStatus(user.id, !user.active)}
                              disabled={actionLoading === `user-status-${user.id}`}
                              className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-all md:gap-1.5 md:px-3 md:py-1.5 md:text-sm ${
                                user.active
                                  ? 'border-2 border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                                  : 'border-2 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                              } disabled:opacity-50`}
                            >
                              {user.active ? <Lock size={12} className="md:h-[14px] md:w-[14px]" /> : <Unlock size={12} className="md:h-[14px] md:w-[14px]" />}
                              {user.active ? 'Khóa' : 'Mở khóa'}
                            </button>

                            {user.role === 'EMPLOYER' && (
                              <button
                                onClick={() => handleEmployerApproval(user.id, !user.employerApproved)}
                                disabled={actionLoading === `employer-approval-${user.id}`}
                                className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-all md:gap-1.5 md:px-3 md:py-1.5 md:text-sm ${
                                  user.employerApproved
                                    ? 'border-2 border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700'
                                    : 'border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                                } disabled:opacity-50`}
                              >
                                <Building2 size={12} className="md:h-[14px] md:w-[14px]" />
                                {user.employerApproved ? 'Gỡ duyệt' : 'Duyệt'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {users.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center md:py-16">
                          <Users size={40} className="mx-auto mb-3 text-slate-200 md:mb-4 md:h-12 md:w-12" />
                          <p className="text-sm font-medium text-slate-500 md:text-lg">Không tìm thấy người dùng nào</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'jobs' && (
            <section className="animate-in overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm fade-in duration-500">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:p-6">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400 md:top-3.5 md:h-[18px] md:w-[18px]" />
                  <input
                    value={jobKeyword}
                    onChange={(e) => setJobKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadJobs()}
                    placeholder="Tìm tiêu đề, công ty..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium shadow-sm outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:py-3 md:text-sm"
                  />
                </div>
                <div className="flex gap-2 md:gap-3">
                  <select
                    value={jobStatus}
                    onChange={(e) => setJobStatus(e.target.value)}
                    className="w-1/2 cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium shadow-sm outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:w-auto md:px-5 md:py-3 md:text-sm"
                  >
                    <option value="">Tất cả</option>
                    <option value="PENDING_REVIEW">Chờ duyệt</option>
                    <option value="APPROVED">Đã duyệt</option>
                    <option value="REJECTED">Đã từ chối</option>
                    <option value="DRAFT">Nháp</option>
                    <option value="CLOSED">Đã đóng</option>
                  </select>
                  <button
                    onClick={loadJobs}
                    className="w-1/2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md active:scale-95 sm:w-auto md:px-6 md:py-3 md:text-sm"
                  >
                    Lọc
                  </button>
                </div>
              </div>

              <div className="space-y-4 bg-slate-50/30 p-4 md:p-6">
                {jobs.map((job) => (
                  <div key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:border-emerald-200 hover:shadow-lg md:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:gap-6">
                      <div className="flex-1 space-y-3 md:space-y-4">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2 md:gap-3">
                            <h3 className="text-lg font-extrabold text-slate-900 md:text-xl">{job.title}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide md:px-3 md:py-1 md:text-xs ${statusBadge(job.status)}`}>
                              {jobStatusDisplay[job.status] || job.status}
                            </span>
                            {job.aiReviewed && (
                              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 ring-1 ring-inset ring-purple-600/20 md:px-3 md:py-1 md:text-xs">
                                <Sparkles size={10} className="md:h-3 md:w-3" /> AI đánh giá
                              </span>
                            )}
                          </div>

                          <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-600 md:gap-2 md:text-sm">
                            <Building2 size={14} className="text-slate-400 md:h-4 md:w-4" />
                            {job.companyName}
                            <span className="text-slate-300">•</span>
                            {job.location || '—'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-4 md:gap-4 md:p-4">
                          <div>
                            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400 md:text-xs">Loại hình</span>
                            <span className="text-xs font-semibold text-slate-700 md:text-sm">{job.employmentType || '—'}</span>
                          </div>
                          <div>
                            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400 md:text-xs">Làm việc</span>
                            <span className="text-xs font-semibold text-slate-700 md:text-sm">{job.workplaceType || '—'}</span>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400 md:text-xs">Mức lương</span>
                            <span className="text-xs font-semibold text-slate-700 md:text-sm">{formatSalaryDisplay(job)}</span>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400 md:text-xs">Hạn nộp</span>
                            <span className="text-xs font-semibold text-slate-700 md:text-sm">{formatDateOnly(job.applicationDeadline)}</span>
                          </div>
                        </div>

                        {job.aiSummary && (
                          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs leading-relaxed text-slate-700 md:p-4 md:text-sm">
                            <span className="mb-1 flex items-center gap-1 font-bold text-purple-800">
                              <Bot size={14} className="md:h-4 md:w-4" /> Tóm tắt từ AI:
                            </span>
                            {job.aiSummary}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-row flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 md:gap-3 md:pt-4 xl:w-56 xl:flex-col xl:justify-start xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                        <button
                          onClick={() => handleAiReview(job.id)}
                          disabled={!!actionLoading}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-purple-200 px-3 py-2 text-xs font-bold text-purple-700 transition-all hover:border-purple-300 hover:bg-purple-50 disabled:opacity-50 sm:w-auto md:gap-2 md:px-4 md:py-2.5 md:text-sm xl:w-full"
                        >
                          <Sparkles size={14} className="md:h-4 md:w-4" /> Đánh giá AI
                        </button>

                        {job.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleJobApprove(job.id)}
                            disabled={!!actionLoading}
                            className="w-[48%] rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 disabled:opacity-50 sm:w-auto md:px-4 md:py-2.5 md:text-sm xl:w-full"
                          >
                            Duyệt tin
                          </button>
                        )}

                        {job.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleJobReject(job.id)}
                            disabled={!!actionLoading}
                            className="w-[48%] rounded-xl border-2 border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition-all hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50 sm:w-auto md:px-4 md:py-2.5 md:text-sm xl:w-full"
                          >
                            Từ chối
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {jobs.length === 0 && !loading && (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-12 text-center md:py-20">
                    <Briefcase size={40} className="mx-auto mb-3 text-slate-300 md:mb-4 md:h-12 md:w-12" />
                    <p className="text-sm font-medium text-slate-500 md:text-lg">Không có tin tuyển dụng nào.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="animate-in grid gap-4 fade-in duration-500 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {settings.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:p-6"
                >
                  <div className="mb-4 md:mb-5">
                    <div className="mb-2 flex items-center gap-1.5 md:gap-2">
                      <Settings size={16} className="text-emerald-500 md:h-[18px] md:w-[18px]" />
                      <p className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 md:text-xs">
                        {item.key}
                      </p>
                    </div>
                    <h3 className="text-base font-bold leading-tight text-slate-900 md:text-lg">{item.description}</h3>
                    <p className="mt-1 text-[10px] font-medium text-slate-400 md:mt-2 md:text-xs">Cập nhật: {formatDate(item.updatedAt)}</p>
                  </div>

                  <div className="mt-auto space-y-3 md:space-y-4">
                    <input
                      value={settingDrafts[item.key] ?? ''}
                      onChange={(e) =>
                        setSettingDrafts((prev) => ({ ...prev, [item.key]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 md:px-4 md:py-3 md:text-base"
                    />

                    <button
                      onClick={() => handleSaveSetting(item.key)}
                      disabled={actionLoading === `setting-${item.key}` || settingDrafts[item.key] === item.value}
                      className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 md:px-5 md:py-3 md:text-sm"
                    >
                      {settingDrafts[item.key] === item.value ? 'Đã lưu' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {activeTab === 'ai' && (
            <section className="animate-in space-y-6 fade-in duration-500 md:space-y-8">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-2xl sm:p-8 md:p-12">
                <div className="pointer-events-none absolute right-0 top-0 -mr-8 -mt-8 rotate-12 text-white/5 sm:-mr-16 sm:-mt-16">
                  <Bot size={200} strokeWidth={1} className="md:h-[300px] md:w-[300px]" />
                </div>

                <div className="relative z-10 max-w-2xl">
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-200 md:mb-6 md:gap-2 md:px-3 md:text-xs">
                    <Sparkles size={12} className="md:h-3.5 md:w-3.5" /> Hệ thống tự động hóa
                  </div>
                  <h2 className="mb-3 text-2xl font-black leading-tight sm:text-3xl md:mb-4 md:text-4xl">Hệ Thống Kiểm Duyệt Gemini</h2>
                  <p className="mb-6 text-sm leading-relaxed text-slate-300 sm:text-base md:mb-8 md:text-lg">
                    AI tự động đọc hiểu, phân tích rủi ro, tóm tắt tin và đề xuất duyệt hoặc từ chối. Giúp tiết kiệm thời gian cho admin.
                  </p>

                  <button
                    onClick={handleBulkAiReview}
                    disabled={actionLoading === 'bulk-ai-review'}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-xl shadow-indigo-900/50 transition-all hover:scale-105 hover:bg-indigo-50 disabled:opacity-50 sm:w-auto md:px-8 md:py-4 md:text-base"
                  >
                    <Sparkles size={18} className="text-indigo-600 md:h-5 md:w-5" />
                    Chạy đánh giá AI hàng loạt
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6">
                <MetricBox title="Đã được AI đánh giá" value={dashboard.aiReviewedJobs} highlight />
                <MetricBox title="AI tự động duyệt" value={dashboard.autoApprovedJobs} />
                <MetricBox title="Đang chờ xử lý" value={dashboard.pendingJobs} />
              </div>

              <div className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm md:p-8">
                <div className="mb-5 flex items-center gap-2 md:mb-6 md:gap-3">
                  <div className="rounded-xl bg-purple-100 p-2 md:p-2.5">
                    <Bot size={20} className="text-purple-600 md:h-6 md:w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 md:text-2xl">Chiến lược đề xuất từ AI</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
                  {aiInsight.recommendedActions.map((item, idx) => (
                    <div
                      key={idx}
                      className="group relative overflow-hidden rounded-2xl border border-purple-100 bg-purple-50/50 p-4 transition-colors hover:border-purple-200 hover:bg-purple-50 md:p-6"
                    >
                      <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-purple-400"></div>
                      <p className="pl-2 text-sm font-semibold leading-relaxed text-purple-900 md:text-base">{item}</p>
                    </div>
                  ))}
                  {aiInsight.recommendedActions.length === 0 && (
                    <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center md:py-12">
                      <p className="text-sm font-medium text-slate-500 md:text-base">Hệ thống đang hoạt động trơn tru. Chưa có đề xuất.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <AdminPageContent />
    </Suspense>
  );
}

function MetricBox({ title, value, highlight = false }: { title: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 transition-all md:p-5 ${
        highlight
          ? 'border-transparent bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md'
          : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300'
      }`}
    >
      <p className={`mb-1 text-[10px] font-semibold md:mb-2 md:text-sm ${highlight ? 'text-emerald-50' : 'text-slate-500'}`}>{title}</p>
      <p className="text-2xl font-black tracking-tight md:text-3xl">{value.toLocaleString('vi-VN')}</p>
      {highlight && (
        <div className="absolute -bottom-2 -right-2 rotate-12 opacity-10 md:-bottom-4 md:-right-4">
          <Activity size={60} strokeWidth={3} className="md:h-[80px] md:w-[80px]" />
        </div>
      )}
    </div>
  );
}