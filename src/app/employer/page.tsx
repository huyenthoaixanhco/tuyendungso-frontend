'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { logoutClient } from '@/lib/auth/client';
import {
  employerApi,
  type CreateJobRequest,
  type EmployerApplicationDetailResponse,
  type EmployerApplicationListItem,
  type EmployerCompanyProfileRequest,
  type EmployerDashboardResponse,
  type JobApplicationStatus,
  type JobPostResponse,
} from '@/lib/api/employer';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import CandidateFiltersPanel from '@/components/employer/CandidateFiltersPanel';
import CandidateDetailPanel from '@/components/employer/CandidateDetailPanel';
import AllApplicationsTable from '@/components/employer/AllApplicationsTable';
import { SectionCard, StatusBadge, TabLink, statusLabel } from '@/components/employer/EmployerUi';

type EmployerTab = 'overview' | 'jobs' | 'candidates' | 'company' | 'reports';

const emptyJobForm: CreateJobRequest = {
  title: '',
  companyName: '',
  location: '',
  employmentType: '',
  workplaceType: '',
  salaryLabel: '',
  salaryMin: null,
  salaryMax: null,
  description: '',
  requirements: '',
  benefits: '',
  applicationDeadline: '',
  draft: true,
};

const emptyCompanyForm: EmployerCompanyProfileRequest = {
  companyName: '',
  logoUrl: '',
  website: '',
  taxCode: '',
  companySize: null,
  industry: '',
  address: '',
  description: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

const applicationStatuses: JobApplicationStatus[] = [
  'APPLIED',
  'IN_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'OFFERED',
  'REJECTED',
  'WITHDRAWN',
];

const employerJobStatusMap: Record<string, string> = {
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  PENDING_REVIEW: 'Chờ duyệt',
  DRAFT: 'Bản nháp',
  CLOSED: 'Đã đóng',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function displaySalary(job?: {
  salaryLabel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
}) {
  if (job?.salaryLabel?.trim()) return job.salaryLabel.trim();

  const min = job?.salaryMin;
  const max = job?.salaryMax;

  if (min != null && max != null) {
    return `${Number(min).toLocaleString('vi-VN')} đ - ${Number(max).toLocaleString('vi-VN')} đ`;
  }
  if (min != null) {
    return `Từ ${Number(min).toLocaleString('vi-VN')} đ`;
  }
  if (max != null) {
    return `Đến ${Number(max).toLocaleString('vi-VN')} đ`;
  }
  return 'Thoả thuận';
}

function normalizeDashboard(
  data: Partial<EmployerDashboardResponse> | null | undefined,
): EmployerDashboardResponse {
  return {
    totalJobs: data?.totalJobs ?? 0,
    activeJobs: data?.activeJobs ?? 0,
    pendingJobs: data?.pendingJobs ?? 0,
    closedJobs: data?.closedJobs ?? 0,
    totalApplications: data?.totalApplications ?? 0,
    newApplications: data?.newApplications ?? 0,
    shortlistedApplications: data?.shortlistedApplications ?? 0,
    interviewScheduled: data?.interviewScheduled ?? 0,
    companyProfileCompletion: data?.companyProfileCompletion ?? 0,
    latestApplications: Array.isArray(data?.latestApplications) ? data.latestApplications : [],
    upcomingInterviews: Array.isArray(data?.upcomingInterviews) ? data.upcomingInterviews : [],
    topJobs: Array.isArray(data?.topJobs) ? data.topJobs : [],
  };
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Có lỗi xảy ra';
}

function isGithubHostedLogo(url?: string | null) {
  if (!url) return false;
  return (
    url.includes('raw.githubusercontent.com') ||
    url.includes('github.io') ||
    url.includes('githubusercontent.com')
  );
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


function toApiLocalDateTime(value: string) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function todayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


function completionTone(percent: number) {
  if (percent >= 80) return 'Xuất sắc';
  if (percent >= 60) return 'Khá tốt';
  if (percent >= 40) return 'Cần bổ sung';
  return 'Rất thiếu thông tin';
}

function safePercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function averageAiScore(items: EmployerApplicationListItem[]) {
  const scored = items.filter((item) => typeof item.aiMatchScore === 'number');
  if (!scored.length) return 0;
  const total = scored.reduce((sum, item) => sum + (item.aiMatchScore || 0), 0);
  return Math.round(total / scored.length);
}

export default function EmployerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab: EmployerTab =
    tabParam === 'jobs' ||
    tabParam === 'candidates' ||
    tabParam === 'company' ||
    tabParam === 'reports' ||
    tabParam === 'overview'
      ? tabParam
      : 'overview';

  const selectedApplicationIdFromQuery = searchParams.get('applicationId');
  const sectionParam = searchParams.get('section');
  const todayDate = useMemo(() => todayLocalDate(), []);

  const [dashboard, setDashboard] = useState<EmployerDashboardResponse>(
    normalizeDashboard(undefined),
  );
  const [jobs, setJobs] = useState<JobPostResponse[]>([]);
  const [applications, setApplications] = useState<EmployerApplicationListItem[]>([]);
  const [allApplications, setAllApplications] = useState<EmployerApplicationListItem[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<EmployerApplicationDetailResponse | null>(null);
  const [jobForm, setJobForm] = useState<CreateJobRequest>(emptyJobForm);
  const [companyForm, setCompanyForm] = useState<EmployerCompanyProfileRequest>(emptyCompanyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoDeleteRequested, setLogoDeleteRequested] = useState(false);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [savingCompanyProfile, setSavingCompanyProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [candidateStatus, setCandidateStatus] = useState<JobApplicationStatus | ''>('');
  const [candidateJobId, setCandidateJobId] = useState<number | ''>('');
  const [allApplicationsPage, setAllApplicationsPage] = useState(1);
  const [candidateActionId, setCandidateActionId] = useState<number | null>(null);

  const [statusUpdate, setStatusUpdate] = useState<JobApplicationStatus>('IN_REVIEW');
  const [employerNote, setEmployerNote] = useState('');
  const [interviewAt, setInterviewAt] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [interviewNote, setInterviewNote] = useState('');
  const [cvPreviewOpen, setCvPreviewOpen] = useState(false);
  const [cvPreviewLoading, setCvPreviewLoading] = useState(false);
  const [cvPreviewUrl, setCvPreviewUrl] = useState('');
  const [cvPreviewTitle, setCvPreviewTitle] = useState('CV ứng viên');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allApplicationsPageSize = 8;

  const pageTitle = useMemo(() => {
    switch (activeTab) {
      case 'jobs':
        return 'Quản lý tin tuyển dụng';
      case 'candidates':
        return 'Đơn ứng tuyển & Sàng lọc AI';
      case 'company':
        return 'Hồ sơ công ty';
      case 'reports':
        return 'Báo cáo tuyển dụng';
      default:
        return 'Tổng quan nhà tuyển dụng';
    }
  }, [activeTab]);

  const navigateToTabSection = (tab: EmployerTab, section: string) => {
    router.push(`/employer?tab=${tab}&section=${section}`);
  };

  const totalAllApplicationsPages = useMemo(
    () => Math.max(1, Math.ceil(allApplications.length / allApplicationsPageSize)),
    [allApplications.length],
  );

  const companyLogoSrc = useMemo(() => normalizeImageSrc(companyForm.logoUrl), [companyForm.logoUrl]);

  const companyReport = useMemo(() => {
    const missingItems = [
      !companyForm.companyName.trim() ? 'Thiếu tên công ty' : null,
      !companyForm.website?.trim() ? 'Thiếu website chính thức' : null,
      !companyForm.description?.trim() ? 'Thiếu mô tả công ty' : null,
      !companyForm.address?.trim() ? 'Thiếu địa chỉ công ty' : null,
      !companyForm.contactName?.trim() ? 'Thiếu người liên hệ' : null,
      !companyForm.contactEmail?.trim() ? 'Thiếu email liên hệ' : null,
      !companyForm.contactPhone?.trim() ? 'Thiếu số điện thoại liên hệ' : null,
      !companyForm.logoUrl?.trim() ? 'Thiếu logo thương hiệu' : null,
      !companyForm.industry?.trim() ? 'Thiếu ngành nghề' : null,
      !companyForm.companySize ? 'Thiếu quy mô công ty' : null,
    ].filter(Boolean) as string[];

    const aiReviewedCount = allApplications.filter((item) => item.aiReviewed).length;
    const shortlistedCount = allApplications.filter((item) => item.status === 'SHORTLISTED').length;
    const interviewedCount = allApplications.filter((item) => item.status === 'INTERVIEW_SCHEDULED').length;
    const offeredCount = allApplications.filter((item) => item.status === 'OFFERED').length;
    const rejectedCount = allApplications.filter((item) => item.status === 'REJECTED').length;
    const averageScore = averageAiScore(allApplications);
    const completion = dashboard.companyProfileCompletion;

    const strengths = [
      completion >= 80 ? 'Hồ sơ công ty đã khá đầy đủ và tạo được độ tin cậy tốt.' : null,
      dashboard.activeJobs > 0 ? `Hiện có ${dashboard.activeJobs} tin đang hiển thị.` : null,
      aiReviewedCount > 0 ? `${aiReviewedCount} hồ sơ đã được AI review.` : null,
      dashboard.interviewScheduled > 0 ? `${dashboard.interviewScheduled} cuộc phỏng vấn đã được lên lịch.` : null,
      dashboard.totalApplications > 0 ? `Đã thu hút ${dashboard.totalApplications} đơn ứng tuyển.` : null,
    ].filter(Boolean) as string[];

    const priorities = [
      completion < 80 ? 'Bổ sung thông tin hồ sơ công ty để tăng tỷ lệ ứng tuyển.' : null,
      dashboard.activeJobs === 0 ? 'Hiện chưa có tin nào đang hiển thị, cần đăng hoặc mở lại tin phù hợp.' : null,
      dashboard.totalApplications === 0 ? 'Chưa có ứng viên, nên rà soát JD, mức lương và mô tả để tăng sức hút.' : null,
      dashboard.totalApplications > 0 && aiReviewedCount === 0 ? 'Nên chạy AI review cho hồ sơ để sàng lọc nhanh hơn.' : null,
      dashboard.totalApplications > 0 && dashboard.interviewScheduled === 0 ? 'Chưa có lịch phỏng vấn, nên shortlist và mời phỏng vấn ứng viên phù hợp.' : null,
    ].filter(Boolean) as string[];

    return {
      completion,
      completionTone: completionTone(completion),
      missingItems,
      strengths,
      priorities,
      aiReviewedCount,
      shortlistedCount,
      interviewedCount,
      offeredCount,
      rejectedCount,
      averageScore,
      reviewCoverage: safePercent(aiReviewedCount, allApplications.length),
      shortlistRate: safePercent(shortlistedCount, allApplications.length),
      interviewRate: safePercent(interviewedCount, allApplications.length),
      offerRate: safePercent(offeredCount, allApplications.length),
    };
  }, [allApplications, companyForm, dashboard]);

  useEffect(() => {
    setAllApplicationsPage((prev) => Math.min(prev, totalAllApplicationsPages));
  }, [totalAllApplicationsPages]);

  useEffect(() => {
    return () => {
      if (cvPreviewUrl) {
        URL.revokeObjectURL(cvPreviewUrl);
      }
    };
  }, [cvPreviewUrl]);

  const runAction = async (action: () => Promise<void>) => {
    setError('');
    setMessage('');
    try {
      await action();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const validateJobForm = () => {
    if (!jobForm.title.trim()) return 'Vui lòng nhập tiêu đề tin tuyển dụng';
    if (!jobForm.companyName.trim()) return 'Vui lòng nhập tên công ty';
    if (!jobForm.location.trim()) return 'Vui lòng nhập địa điểm';
    if (!jobForm.employmentType.trim()) return 'Vui lòng nhập loại hình công việc';
    if (!jobForm.workplaceType?.trim()) return 'Vui lòng nhập kiểu làm việc';
    if (!jobForm.description.trim()) return 'Vui lòng nhập mô tả công việc';

    if (jobForm.applicationDeadline && jobForm.applicationDeadline < todayDate) {
      return 'Ngày kết thúc nhận hồ sơ không được nhỏ hơn ngày hôm nay';
    }

    return null;
  };

  const validateCompanyForm = () => {
    if (!companyForm.companyName.trim()) {
      return 'Vui lòng nhập tên công ty';
    }
    return null;
  };

  const clearSelectedLogoFile = () => {
    setLogoFile(null);
    setLogoInputKey((prev) => prev + 1);
  };

  const handleLogoFileChange = (file: File | null) => {
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Chỉ hỗ trợ file PNG, JPG, JPEG, WEBP, SVG');
    }

    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Logo không được vượt quá 200MB');
    }

    setLogoFile(file);
    setLogoDeleteRequested(false);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveSelectedLogo = () => {
    setLogoFile(null);
    setLogoDeleteRequested(true);
    setLogoPreview('');
    setLogoInputKey((prev) => prev + 1);
  };

  const saveCompanyProfileWithGithubLogo = async () => {
    const validationError = validateCompanyForm();
    if (validationError) {
      throw new Error(validationError);
    }

    setSavingCompanyProfile(true);

    const previousLogoUrl = companyForm.logoUrl?.trim() || '';
    let nextLogoUrl = previousLogoUrl;
    let uploadedNewLogoUrl = '';

    try {
      if (logoFile) {
        const uploaded = await employerApi.uploadCompanyLogo(logoFile);
        uploadedNewLogoUrl = uploaded.url;
        nextLogoUrl = uploaded.url;
      } else if (logoDeleteRequested) {
        nextLogoUrl = '';
      }

      await employerApi.saveCompanyProfile({
        ...companyForm,
        logoUrl: nextLogoUrl,
      });

      const shouldDeletePreviousLogo =
        !!previousLogoUrl &&
        isGithubHostedLogo(previousLogoUrl) &&
        ((logoDeleteRequested && !logoFile) || (!!uploadedNewLogoUrl && uploadedNewLogoUrl !== previousLogoUrl));

      if (shouldDeletePreviousLogo) {
        await employerApi.deleteCompanyLogo({
          url: previousLogoUrl,
        });
      }

      setMessage(
        logoDeleteRequested && !logoFile
          ? 'Đã xóa logo cũ và lưu hồ sơ công ty'
          : uploadedNewLogoUrl
            ? 'Đã upload logo lên GitHub Release Assets và lưu hồ sơ công ty'
            : 'Đã lưu hồ sơ công ty',
      );

      clearSelectedLogoFile();
      setLogoDeleteRequested(false);
      await loadCompanyProfile();
      await loadOverview();
    } catch (e) {
      if (uploadedNewLogoUrl && isGithubHostedLogo(uploadedNewLogoUrl)) {
        try {
          await employerApi.deleteCompanyLogo({
            url: uploadedNewLogoUrl,
          });
        } catch {
          // ignore rollback failure
        }
      }
      throw e;
    } finally {
      setSavingCompanyProfile(false);
    }
  };

  async function loadOverview() {
    const data = await employerApi.getDashboard();
    setDashboard(normalizeDashboard(data));
  }

  async function loadJobs() {
    const data = await employerApi.getMyJobs();
    setJobs(safeArray(data));
  }

  async function handleDeleteJob(jobId: number) {
    const confirmed = window.confirm(
      'Bạn có chắc muốn xóa vĩnh viễn tin tuyển dụng này không? Hành động này không thể hoàn tác.',
    );
    if (!confirmed) return;

    await runAction(async () => {
      await employerApi.deleteJob(jobId);
      setMessage('Đã xóa tin tuyển dụng');
      await Promise.all([loadJobs(), loadOverview()]);
    });
  }

  async function handlePreviewResume(applicationId: number, candidateName?: string) {
    setCvPreviewOpen(true);
    setCvPreviewLoading(true);
    setCvPreviewTitle(candidateName ? `CV - ${candidateName}` : 'CV ứng viên');

    try {
      const blob = await employerApi.getResumePreviewBlob(applicationId);
      const objectUrl = URL.createObjectURL(blob);
      setCvPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return objectUrl;
      });
    } catch (e) {
      setCvPreviewOpen(false);
      throw e;
    } finally {
      setCvPreviewLoading(false);
    }
  }

  function closeCvPreview() {
    setCvPreviewOpen(false);
    setCvPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return '';
    });
  }

  async function loadApplications() {
    const data = await employerApi.getApplications({
      page: 0,
      size: 20,
      keyword: candidateKeyword || undefined,
      status: candidateStatus || undefined,
      jobId: candidateJobId || undefined,
    });
    setApplications(safeArray(data?.content));
  }

  async function loadAllApplications() {
    const pageSize = 100;
    let pageIndex = 0;
    let totalPages = 1;
    const merged: EmployerApplicationListItem[] = [];
    const seen = new Set<number>();

    while (pageIndex < totalPages) {
      const data = await employerApi.getApplications({
        page: pageIndex,
        size: pageSize,
      });

      const items = safeArray(data?.content);
      items.forEach((item) => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      });

      totalPages =
        typeof data?.totalPages === 'number' && data.totalPages > 0 ? data.totalPages : 1;
      pageIndex += 1;
    }

    setAllApplications(merged);
  }

  async function loadCompanyProfile() {
    const companyData = await employerApi.getCompanyProfile();
    const nextForm = {
      companyName: companyData?.companyName || '',
      logoUrl: companyData?.logoUrl || '',
      website: companyData?.website || '',
      taxCode: companyData?.taxCode || '',
      companySize: companyData?.companySize || null,
      industry: companyData?.industry || '',
      address: companyData?.address || '',
      description: companyData?.description || '',
      contactName: companyData?.contactName || '',
      contactEmail: companyData?.contactEmail || '',
      contactPhone: companyData?.contactPhone || '',
    };

    setCompanyForm(nextForm);
    setLogoPreview(nextForm.logoUrl || '');
    setLogoDeleteRequested(false);
    clearSelectedLogoFile();
    setJobForm((prev) => ({
      ...prev,
      companyName: prev.companyName || nextForm.companyName || '',
    }));
  }

  async function loadAll() {
    setLoading(true);
    setError('');

    const results = await Promise.allSettled([
      loadOverview(),
      loadJobs(),
      loadApplications(),
      loadAllApplications(),
      loadCompanyProfile(),
    ]);

    const labels = [
      'tổng quan',
      'tin tuyển dụng',
      'đơn ứng tuyển',
      'toàn bộ ứng viên',
      'hồ sơ công ty',
    ];

    const errors = results.flatMap((result, index) =>
      result.status === 'rejected' ? [`${labels[index]}: ${getErrorMessage(result.reason)}`] : [],
    );

    if (errors.length > 0) {
      setError(errors.join(' | '));
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'candidates') {
      void runAction(async () => {
        await Promise.all([loadApplications(), loadAllApplications(), loadOverview()]);
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!sectionParam) return;

    const scrollToTarget = () => {
      const element = document.getElementById(sectionParam);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const timeoutId = window.setTimeout(scrollToTarget, 120);
    return () => window.clearTimeout(timeoutId);
  }, [activeTab, sectionParam, dashboard, jobs.length, applications.length, allApplications.length]);

  useEffect(() => {
    async function loadSelectedFromQuery() {
      if (!selectedApplicationIdFromQuery) return;
      const applicationId = Number(selectedApplicationIdFromQuery);
      if (!applicationId || Number.isNaN(applicationId)) return;

      try {
        const detail = await employerApi.getApplicationDetail(applicationId);
        setSelectedApplication(detail);
        setStatusUpdate(detail.status);
        setEmployerNote(detail.employerNote || '');
      } catch {
        // ignore invalid query
      }
    }

    void loadSelectedFromQuery();
  }, [selectedApplicationIdFromQuery]);

  async function refreshApplicationsKeepSelection(applicationId?: number) {
    await Promise.all([loadApplications(), loadAllApplications(), loadOverview()]);

    if (applicationId) {
      const detail = await employerApi.getApplicationDetail(applicationId);
      setSelectedApplication(detail);
      setStatusUpdate(detail.status);
      setEmployerNote(detail.employerNote || '');
    }
  }

  const handleLogoutRequest = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logoutClient();
    window.location.href = '/';
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const openApplicationDetail = async (applicationId: number) => {
    await runAction(async () => {
      const detail = await employerApi.getApplicationDetail(applicationId);
      setSelectedApplication(detail);
      setStatusUpdate(detail.status);
      setEmployerNote(detail.employerNote || '');
      router.push(`/employer?tab=candidates&applicationId=${applicationId}`);
    });
  };

  const quickUpdateApplicationStatus = async (
    applicationId: number,
    nextStatus: JobApplicationStatus,
  ) => {
    setCandidateActionId(applicationId);
    try {
      await runAction(async () => {
        await employerApi.updateApplicationStatus(applicationId, {
          status: nextStatus,
        });

        setMessage(`Đã cập nhật trạng thái: ${statusLabel(nextStatus)}`);

        const keepSelectedId =
          selectedApplication?.id === applicationId ? applicationId : selectedApplication?.id;

        await refreshApplicationsKeepSelection(keepSelectedId);
      });
    } finally {
      setCandidateActionId(null);
    }
  };

  const quickAiReviewApplication = async (applicationId: number) => {
    setCandidateActionId(applicationId);
    try {
      await runAction(async () => {
        await employerApi.aiReviewApplication(applicationId);
        setMessage('Đã chạy AI review cho ứng viên');

        const keepSelectedId =
          selectedApplication?.id === applicationId ? applicationId : selectedApplication?.id;

        await refreshApplicationsKeepSelection(keepSelectedId);
      });
    } finally {
      setCandidateActionId(null);
    }
  };

  const deleteRejectedApplication = async (applicationId: number) => {
    const confirmed = window.confirm(
      'Bạn có chắc muốn xóa hồ sơ ứng viên này không? Chỉ hồ sơ đã bị từ chối mới được xóa.',
    );
    if (!confirmed) return;

    setCandidateActionId(applicationId);
    try {
      await runAction(async () => {
        await employerApi.deleteApplication(applicationId);

        if (selectedApplication?.id === applicationId) {
          setSelectedApplication(null);
          setEmployerNote('');
          setStatusUpdate('IN_REVIEW');
        }

        setMessage('Đã xóa hồ sơ ứng viên bị từ chối');
        await Promise.all([loadApplications(), loadAllApplications(), loadOverview()]);
      });
    } finally {
      setCandidateActionId(null);
    }
  };

  const latestApplicationSubtext = (item: EmployerApplicationListItem) => {
    if (item.status === 'WITHDRAWN') {
      return 'Ứng viên đã rút đơn';
    }

    if (item.aiReviewed) {
      return `${item.aiRecommendation} • Độ phù hợp: ${item.aiMatchScore}%`;
    }

    return 'Chưa kiểm duyệt AI';
  };

  return (
    <AuthGuard allowedRoles={['EMPLOYER']}>
      <div className="min-h-screen bg-white text-gray-900">
        <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-gray-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-12 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-500 p-1.5">
                <Briefcase className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-black tracking-tight md:text-2xl">Tuyendungso.vn</h1>
            </div>
            <button
              onClick={handleLogoutRequest}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200 md:hidden"
            >
              Đăng xuất
            </button>
          </div>

          <nav className="scrollbar-hide flex items-center gap-4 overflow-x-auto whitespace-nowrap text-sm md:gap-6">
            <TabLink href="/employer?tab=overview" active={activeTab === 'overview'}>
              Tổng quan
            </TabLink>
            <TabLink href="/employer?tab=jobs" active={activeTab === 'jobs'}>
              Tin tuyển dụng
            </TabLink>
            <TabLink href="/employer?tab=candidates" active={activeTab === 'candidates'}>
              Ứng viên
            </TabLink>
            <TabLink href="/employer?tab=company" active={activeTab === 'company'}>
              Công ty
            </TabLink>
            <TabLink href="/employer?tab=reports" active={activeTab === 'reports'}>
              Báo cáo
            </TabLink>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              {companyLogoSrc ? (
                <img
                  src={companyLogoSrc}
                  alt={companyForm.companyName || 'Logo công ty'}
                  className="h-10 w-10 rounded-lg border border-gray-200 bg-white object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-500">
                  {companyForm.companyName?.charAt(0)?.toUpperCase() || 'C'}
                </div>
              )}

              <div className="max-w-[180px]">
                <p className="truncate text-sm font-bold text-gray-900">
                  {companyForm.companyName || 'Công ty của bạn'}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {companyForm.website || 'Chưa có website'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogoutRequest}
              className="rounded-md bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <section className="relative bg-[url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center px-4 py-12 md:py-20">
          <div className="absolute inset-0 bg-slate-900/80" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 md:mb-6 md:px-4 md:py-2 md:text-sm">
                <CheckCircle2 size={16} /> Không gian dành riêng cho nhà tuyển dụng
              </div>

              <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-white md:mb-5 md:text-4xl lg:text-5xl">
                Quản lý tuyển dụng chuyên nghiệp trên một bảng điều khiển thống nhất
              </h2>

              <p className="mb-6 text-sm font-medium leading-relaxed text-slate-300 md:mb-8 md:text-lg">
                Đăng tin với đầy đủ thông tin hiển thị như loại hình công việc, kiểu làm việc,
                lương dạng chữ như 100k/giờ, 12 - 15 triệu, thoả thuận và hạn kết thúc nhận hồ sơ.
              </p>

              <div className="flex max-w-3xl flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-2xl md:flex-row md:rounded-full">
                <div className="flex flex-1 items-center border-b border-gray-200 px-3 py-2 md:border-b-0 md:border-r md:px-4 md:py-3">
                  <Search className="mr-2 text-gray-400 md:mr-3" size={20} />
                  <input
                    type="text"
                    placeholder="Tìm ứng viên, vị trí tuyển dụng..."
                    value={candidateKeyword}
                    onChange={(e) => setCandidateKeyword(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none md:text-base"
                  />
                </div>

                <div className="flex flex-1 items-center px-3 py-2 md:px-4 md:py-3">
                  <MapPin className="mr-2 text-gray-400 md:mr-3" size={20} />
                  <input
                    type="text"
                    value={companyForm.companyName || ''}
                    readOnly
                    placeholder="Tên công ty của bạn"
                    className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none md:text-base"
                  />
                </div>

                <button
                  onClick={() =>
                    void runAction(async () => {
                      await loadApplications();
                      router.push('/employer?tab=candidates');
                    })
                  }
                  className="w-full rounded-md bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600 md:w-auto md:rounded-full md:px-8 md:py-0 md:text-base"
                >
                  Xem ứng viên
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium text-slate-300 md:mt-6 md:gap-6 md:text-sm">
                <span className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400" />
                  Sàng lọc tự động bằng AI
                </span>
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-emerald-400" />
                  Quản lý tập trung
                </span>
                <span className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-emerald-400" />
                  Lên lịch phỏng vấn
                </span>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:space-y-8 md:px-6 md:py-10">
          <section className="grid gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => navigateToTabSection('jobs', 'jobs-list-section')}
              className="rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-200 md:p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 md:mb-5 md:h-12 md:w-12">
                <FileText className="text-emerald-600" size={22} />
              </div>
              <p className="mb-1 text-xs text-gray-500 md:text-sm">Tổng số tin tuyển dụng</p>
              <p className="text-2xl font-black text-gray-900 md:text-3xl">{dashboard.totalJobs}</p>
              <p className="mt-2 text-xs text-gray-500">Đang hiển thị: {dashboard.activeJobs}</p>
            </button>

            <button
              type="button"
              onClick={() => navigateToTabSection('candidates', 'all-applications-section')}
              className="rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 md:p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 md:mb-5 md:h-12 md:w-12">
                <Users className="text-blue-600" size={22} />
              </div>
              <p className="mb-1 text-xs text-gray-500 md:text-sm">Tổng đơn ứng tuyển</p>
              <p className="text-2xl font-black text-gray-900 md:text-3xl">
                {dashboard.totalApplications}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Mới / Đang xem xét: {dashboard.newApplications}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigateToTabSection('company', 'company-profile-section')}
              className="rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-200 md:p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-orange-100 bg-orange-50 md:mb-5 md:h-12 md:w-12">
                <Building2 className="text-orange-600" size={22} />
              </div>
              <p className="mb-1 text-xs text-gray-500 md:text-sm">Hồ sơ công ty</p>
              <p className="text-2xl font-black text-gray-900 md:text-3xl">
                {dashboard.companyProfileCompletion}%
              </p>
              <p className="mt-2 text-xs text-gray-500">Tăng độ tin cậy với ứng viên</p>
            </button>

            <button
              type="button"
              onClick={() => navigateToTabSection('overview', 'upcoming-interviews-section')}
              className="rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-200 md:p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 md:mb-5 md:h-12 md:w-12">
                <BarChart3 className="text-purple-600" size={22} />
              </div>
              <p className="mb-1 text-xs text-gray-500 md:text-sm">Phỏng vấn đã lên lịch</p>
              <p className="text-2xl font-black text-gray-900 md:text-3xl">
                {dashboard.interviewScheduled}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Đã chọn lọc: {dashboard.shortlistedApplications}
              </p>
            </button>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-2 text-xl font-bold text-gray-900 md:text-2xl">{pageTitle}</h2>
            <p className="text-sm text-gray-500 md:text-base">
              Khu vực tác nghiệp dành cho nhà tuyển dụng: đăng tin, hiển thị đủ thông tin như loại
              hình, kiểu làm việc, lương dạng chữ, ngày đăng tin hiện tại và hạn kết thúc nhận hồ sơ.
            </p>
            {loading ? <div className="mt-4 text-sm text-gray-500">Đang tải dữ liệu...</div> : null}
            {message ? <div className="mt-4 text-sm text-emerald-700">{message}</div> : null}
            {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
            <a
              href="/employer?tab=overview"
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:p-6"
            >
              <ClipboardList className="mb-3 text-emerald-600 md:mb-4" size={22} />
              <h4 className="mb-1 text-sm font-bold md:text-base">Tổng quan</h4>
              <p className="text-xs text-gray-500 md:text-sm">Theo dõi nhanh trạng thái tin, ứng viên.</p>
            </a>

            <a
              href="/employer?tab=jobs"
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:p-6"
            >
              <Briefcase className="mb-3 text-blue-600 md:mb-4" size={22} />
              <h4 className="mb-1 text-sm font-bold md:text-base">Tin tuyển dụng</h4>
              <p className="text-xs text-gray-500 md:text-sm">Tạo tin mới với đủ thông tin hiển thị.</p>
            </a>

            <a
              href="/employer?tab=candidates"
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:p-6"
            >
              <Sparkles className="mb-3 text-purple-600 md:mb-4" size={22} />
              <h4 className="mb-1 text-sm font-bold md:text-base">Ứng viên & AI</h4>
              <p className="text-xs text-gray-500 md:text-sm">Review hồ sơ, lên lịch phỏng vấn.</p>
            </a>

            <a
              href="/employer?tab=company"
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:p-6"
            >
              <Building2 className="mb-3 text-orange-600 md:mb-4" size={22} />
              <h4 className="mb-1 text-sm font-bold md:text-base">Hồ sơ công ty</h4>
              <p className="text-xs text-gray-500 md:text-sm">Hoàn thiện thương hiệu tuyển dụng.</p>
            </a>
          </section>

          {activeTab === 'overview' && (
            <>
              <section className="grid gap-6 xl:grid-cols-2">
                <div id="latest-applications-section">
                <SectionCard
                  title="Ứng viên mới nhất"
                  description="Những hồ sơ mới đổ về từ các tin tuyển dụng gần đây"
                >
                  <div className="space-y-3">
                    {safeArray(dashboard.latestApplications).length === 0 ? (
                      <p className="text-sm text-gray-500">Chưa có ứng viên.</p>
                    ) : (
                      safeArray(dashboard.latestApplications).map((item) => (
                        <button
                          key={item.id}
                          className="w-full rounded-xl border p-4 text-left transition-colors hover:bg-gray-50"
                          onClick={() => void openApplicationDetail(item.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold">{item.candidateFullName}</p>
                              <p className="text-xs text-gray-500 md:text-sm">{item.jobTitle}</p>
                            </div>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-2 text-xs text-gray-600">
                            {latestApplicationSubtext(item)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </SectionCard>
              </div>

                <div id="upcoming-interviews-section">
                <SectionCard
                  title="Phỏng vấn sắp tới"
                  description="Danh sách các buổi phỏng vấn đã được lên lịch"
                >
                  <div className="space-y-3">
                    {safeArray(dashboard.upcomingInterviews).length === 0 ? (
                      <p className="text-sm text-gray-500">Chưa có lịch phỏng vấn.</p>
                    ) : (
                      safeArray(dashboard.upcomingInterviews).map((item) => (
                        <div key={item.interviewId} className="rounded-xl border p-4">
                          <p className="font-bold">{item.candidateFullName}</p>
                          <p className="text-xs text-gray-500 md:text-sm">{item.jobTitle}</p>
                          <p className="mt-2 text-xs md:text-sm">{formatDate(item.scheduledAt)}</p>
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {item.location || item.meetingLink || '-'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </SectionCard>
              </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                  <p className="text-xs text-gray-500 md:text-sm">Tin chờ duyệt</p>
                  <p className="mt-2 text-2xl font-black md:text-3xl">{dashboard.pendingJobs}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                  <p className="text-xs text-gray-500 md:text-sm">Tin đã đóng</p>
                  <p className="mt-2 text-2xl font-black md:text-3xl">{dashboard.closedJobs}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                  <p className="text-xs text-gray-500 md:text-sm">Đã chọn lọc (Shortlist)</p>
                  <p className="mt-2 text-2xl font-black md:text-3xl">
                    {dashboard.shortlistedApplications}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                  <p className="text-xs text-gray-500 md:text-sm">Hiệu suất hồ sơ công ty</p>
                  <p className="mt-2 text-2xl font-black md:text-3xl">
                    {dashboard.companyProfileCompletion}%
                  </p>
                </div>
              </section>
            </>
          )}

          {activeTab === 'jobs' && (
            <section id="jobs-list-section" className="grid gap-6 xl:grid-cols-2">
              <SectionCard title="Danh sách tin tuyển dụng" description="Các tin bạn đã tạo trên hệ thống">
                <div className="space-y-4">
                  {safeArray(jobs).length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có tin tuyển dụng.</p>
                  ) : (
                    safeArray(jobs).map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:p-5"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3 md:mb-4">
                          {!!normalizeImageSrc(companyForm.logoUrl) ? (
                            <img
                              src={normalizeImageSrc(companyForm.logoUrl)}
                              alt={job.companyName || 'Logo công ty'}
                              className="h-10 w-10 shrink-0 rounded-lg border border-gray-100 bg-white object-contain md:h-12 md:w-12"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-lg font-bold text-gray-400 md:h-12 md:w-12 md:text-xl">
                              {job.companyName?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                          )}
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 md:px-3 md:text-xs">
                            {employerJobStatusMap[job.status] || job.status}
                          </span>
                        </div>

                        <p className="text-lg font-bold text-gray-900 md:text-xl">{job.title}</p>
                        <p className="mt-1 text-xs text-gray-500 md:text-sm">
                          {job.companyName} • {job.location}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 md:mt-4">
                          <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-600 md:px-3 md:text-xs">
                            {job.employmentType || 'Toàn thời gian'}
                          </span>
                          <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-600 md:px-3 md:text-xs">
                            {job.workplaceType || 'Môi trường linh hoạt'}
                          </span>
                          <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-600 md:px-3 md:text-xs">
                            {displaySalary(job)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row">
                          <span className="rounded-md bg-slate-50 px-2 py-1 md:px-3">
                            Đăng tin: {job.createdAt ? formatDate(job.createdAt) : todayDate}
                          </span>
                          <span className="rounded-md bg-slate-50 px-2 py-1 md:px-3">
                            Kết thúc:{' '}
                            {job.applicationDeadline
                              ? new Date(job.applicationDeadline).toLocaleDateString('vi-VN')
                              : 'Chưa đặt'}
                          </span>
                        </div>

                        {job.aiSummary ? (
                          <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs text-purple-700 md:p-4 md:text-sm">
                            <span className="font-bold">AI kiểm duyệt:</span> {job.aiSummary}
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2 md:mt-5">
                          {job.status === 'DRAFT' ? (
                            <button
                              onClick={() =>
                                void runAction(async () => {
                                  await employerApi.submitJob(job.id);
                                  setMessage('Đã gửi tin đi duyệt');
                                  await loadJobs();
                                  await loadOverview();
                                })
                              }
                              className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 sm:w-auto"
                            >
                              Gửi duyệt
                            </button>
                          ) : null}

                          {job.status === 'APPROVED' ? (
                            <button
                              onClick={() =>
                                void runAction(async () => {
                                  await employerApi.closeJob(job.id);
                                  setMessage('Đã đóng tin tuyển dụng');
                                  await loadJobs();
                                  await loadOverview();
                                })
                              }
                              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold hover:bg-gray-50 sm:w-auto"
                            >
                              Đóng tin
                            </button>
                          ) : null}

                          {job.status === 'CLOSED' ? (
                            <button
                              onClick={() => void handleDeleteJob(job.id)}
                              className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 sm:w-auto"
                            >
                              Xóa tin
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Tạo tin tuyển dụng mới"
                description="Mẫu tạo tin có thêm loại hình, kiểu làm việc, lương dạng chữ..."
              >
                <div className="space-y-3">
                  <input
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="Tiêu đề, ví dụ: Nhân viên Kinh doanh"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />

                  <input
                    value={jobForm.companyName}
                    onChange={(e) => setJobForm({ ...jobForm, companyName: e.target.value })}
                    placeholder="Tên công ty"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />

                  <input
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="Địa điểm hiển thị, ví dụ: Từ xa / Hà Nội / Hồ Chí Minh"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <input
                        list="employment-type-options"
                        value={jobForm.employmentType}
                        onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                        placeholder="Loại hình công việc"
                        className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                      />
                      <datalist id="employment-type-options">
                        <option value="Toàn thời gian" />
                        <option value="Bán thời gian" />
                        <option value="Hợp đồng" />
                        <option value="Thực tập" />
                        <option value="Freelance" />
                        <option value="Thời vụ" />
                      </datalist>
                    </div>

                    <div>
                      <input
                        list="workplace-type-options"
                        value={jobForm.workplaceType || ''}
                        onChange={(e) => setJobForm({ ...jobForm, workplaceType: e.target.value })}
                        placeholder="Kiểu làm việc"
                        className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                      />
                      <datalist id="workplace-type-options">
                        <option value="Làm việc tại văn phòng" />
                        <option value="Làm việc từ xa" />
                        <option value="Hybrid" />
                        <option value="Linh hoạt" />
                        <option value="Remote" />
                        <option value="Onsite" />
                      </datalist>
                    </div>
                  </div>

                  <input
                    value={jobForm.salaryLabel || ''}
                    onChange={(e) => setJobForm({ ...jobForm, salaryLabel: e.target.value })}
                    placeholder="Lương hiển thị, ví dụ: 12 - 15 triệu, Thoả thuận"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />

                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Mô tả công việc"
                    rows={4}
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />

                  <textarea
                    value={jobForm.requirements || ''}
                    onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                    placeholder="Yêu cầu"
                    rows={3}
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />

                  <textarea
                    value={jobForm.benefits || ''}
                    onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                    placeholder="Phúc lợi"
                    rows={3}
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 md:mb-2 md:text-sm">
                        Ngày đăng tin
                      </label>
                      <input
                        type="date"
                        value={todayDate}
                        readOnly
                        className="w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none md:px-4 md:py-3 md:text-base"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 md:mb-2 md:text-sm">
                        Kết thúc nhận hồ sơ
                      </label>
                      <input
                        type="date"
                        value={jobForm.applicationDeadline || ''}
                        min={todayDate}
                        onChange={(e) =>
                          setJobForm({ ...jobForm, applicationDeadline: e.target.value })
                        }
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-500 md:px-4 md:py-3 md:text-base"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700 md:p-4">
                    <p className="font-bold">Xem trước hiển thị:</p>
                    <p className="mt-2 text-base font-bold text-gray-900 md:text-lg">
                      {jobForm.title || 'Tiêu đề công việc'}
                    </p>
                    <p className="text-xs text-gray-600 md:text-sm">
                      {(jobForm.companyName || 'Tên công ty')} • {jobForm.location || 'Địa điểm'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-3">
                    <button
                      onClick={() =>
                        void runAction(async () => {
                          const validationError = validateJobForm();
                          if (validationError) throw new Error(validationError);

                          await employerApi.createJob({
                            ...jobForm,
                            salaryMin: null,
                            salaryMax: null,
                            draft: true,
                          });

                          setMessage('Đã lưu nháp');
                          setJobForm({
                            ...emptyJobForm,
                            companyName: companyForm.companyName || '',
                          });
                          await loadJobs();
                          await loadOverview();
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 px-5 py-2.5 font-bold hover:bg-gray-50 md:w-auto md:py-3"
                    >
                      Lưu nháp
                    </button>

                    <button
                      onClick={() =>
                        void runAction(async () => {
                          const validationError = validateJobForm();
                          if (validationError) throw new Error(validationError);

                          await employerApi.createJob({
                            ...jobForm,
                            salaryMin: null,
                            salaryMax: null,
                            draft: false,
                          });

                          setMessage('Đã tạo tin và gửi duyệt');
                          setJobForm({
                            ...emptyJobForm,
                            companyName: companyForm.companyName || '',
                          });
                          await loadJobs();
                          await loadOverview();
                        })
                      }
                      className="w-full rounded-lg bg-emerald-500 px-5 py-2.5 font-bold text-white hover:bg-emerald-600 md:w-auto md:py-3"
                    >
                      Tạo & Gửi duyệt
                    </button>
                  </div>
                </div>
              </SectionCard>
            </section>
          )}

          {activeTab === 'candidates' && (
            <div id="all-applications-section" className="space-y-6">
              <section className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <CandidateFiltersPanel
                    applications={applications}
                    jobs={safeArray(jobs)}
                    selectedApplicationId={selectedApplication?.id}
                    candidateKeyword={candidateKeyword}
                    candidateStatus={candidateStatus}
                    candidateJobId={candidateJobId}
                    applicationStatuses={applicationStatuses}
                    onCandidateKeywordChange={setCandidateKeyword}
                    onCandidateStatusChange={setCandidateStatus}
                    onCandidateJobIdChange={setCandidateJobId}
                    onFilter={() => {
                      void runAction(async () => {
                        await loadApplications();
                      });
                    }}
                    onBulkAiReview={() => {
                      void runAction(async () => {
                        const result = await employerApi.bulkAiReviewApplications({
                          limit: 10,
                        });
                        setMessage(
                          `AI xử lý: Phỏng vấn=${result.inviteInterview}, Xem xét=${result.consider}, Từ chối=${result.reject}`,
                        );
                        await refreshApplicationsKeepSelection(selectedApplication?.id);
                      });
                    }}
                    onOpenDetail={(applicationId) => {
                      void openApplicationDetail(applicationId);
                    }}
                  />
                </div>

                <div className="lg:col-span-7">
                  <CandidateDetailPanel
                    selectedApplication={selectedApplication}
                    statusUpdate={statusUpdate}
                    employerNote={employerNote}
                    interviewAt={interviewAt}
                    interviewLocation={interviewLocation}
                    interviewLink={interviewLink}
                    interviewNote={interviewNote}
                    applicationStatuses={applicationStatuses}
                    formatDate={formatDate}
                    onStatusUpdateChange={setStatusUpdate}
                    onEmployerNoteChange={setEmployerNote}
                    onInterviewAtChange={setInterviewAt}
                    onInterviewLocationChange={setInterviewLocation}
                    onInterviewLinkChange={setInterviewLink}
                    onInterviewNoteChange={setInterviewNote}
                    onAiReview={() => {
                      if (!selectedApplication) return;
                      void runAction(async () => {
                        const detail = await employerApi.aiReviewApplication(selectedApplication.id);
                        setSelectedApplication(detail);
                        setStatusUpdate(detail.status);
                        setEmployerNote(detail.employerNote || '');
                        setMessage('Đã chạy AI review cho ứng viên');
                        await refreshApplicationsKeepSelection(selectedApplication.id);
                      });
                    }}
                    onSaveStatus={() => {
                      if (!selectedApplication) return;
                      void runAction(async () => {
                        const detail = await employerApi.updateApplicationStatus(
                          selectedApplication.id,
                          {
                            status: statusUpdate,
                            employerNote,
                          },
                        );
                        setSelectedApplication(detail);
                        setMessage('Đã cập nhật trạng thái ứng viên');
                        await refreshApplicationsKeepSelection(selectedApplication.id);
                      });
                    }}
                    onPreviewResume={(applicationId, candidateName) => {
                      void runAction(async () => {
                        await handlePreviewResume(applicationId, candidateName);
                      });
                    }}
                    onDeleteApplication={(applicationId) => {
                      void deleteRejectedApplication(applicationId);
                    }}
                    onCreateInterview={() => {
                      if (!selectedApplication) return;
                      void runAction(async () => {
                        if (!interviewAt) throw new Error('Vui lòng chọn thời gian');
                        await employerApi.scheduleInterview(selectedApplication.id, {
                          scheduledAt: toApiLocalDateTime(interviewAt),
                          location: interviewLocation || undefined,
                          meetingLink: interviewLink || undefined,
                          note: interviewNote || undefined,
                        });
                        setInterviewAt('');
                        setInterviewLocation('');
                        setInterviewLink('');
                        setInterviewNote('');
                        setMessage('Đã tạo lịch phỏng vấn');
                        await refreshApplicationsKeepSelection(selectedApplication.id);
                      });
                    }}
                  />
                </div>
              </section>

              <AllApplicationsTable
                applications={allApplications}
                selectedApplicationId={selectedApplication?.id}
                page={allApplicationsPage}
                pageSize={allApplicationsPageSize}
                candidateActionId={candidateActionId}
                onPageChange={setAllApplicationsPage}
                onOpenDetail={(applicationId) => {
                  void openApplicationDetail(applicationId);
                }}
                onQuickAiReview={(applicationId) => {
                  void quickAiReviewApplication(applicationId);
                }}
                onQuickStatusUpdate={(applicationId, nextStatus) => {
                  void quickUpdateApplicationStatus(applicationId, nextStatus);
                }}
                onDeleteApplication={(applicationId) => {
                  void deleteRejectedApplication(applicationId);
                }}
              />
            </div>
          )}

          {activeTab === 'company' && (
            <section id="company-profile-section" className="grid gap-6 lg:grid-cols-2">
              <SectionCard
                title="Hồ sơ công ty"
                description="Hoàn thiện thông tin để tăng uy tín thương hiệu tuyển dụng"
              >
                <div className="space-y-3">
                  <input
                    value={companyForm.companyName || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                    placeholder="Tên công ty"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />
                  <input
                    value={companyForm.website || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    placeholder="Website"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />
                  <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900 md:text-base">Logo công ty</p>
                    
                    </div>

                    <input
                      key={logoInputKey}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        try {
                          handleLogoFileChange(file);
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                    />

                   
                    <p className="text-xs text-gray-500 md:text-sm">Hỗ trợ PNG, JPG, JPEG, WEBP, SVG. Kích thước tối đa 200MB.</p>


                    {logoFile ? (
                      <p className="text-xs text-emerald-700 md:text-sm">
                        Ảnh mới đã được chọn: <span className="font-bold">{logoFile.name}</span>.
                      </p>
                    ) : null}

                    {logoDeleteRequested && !logoFile ? (
                      <p className="text-xs text-red-600 md:text-sm">
                        Logo hiện tại sẽ bị xóa hẳn khỏi GitHub Release Assets khi bạn bấm lưu.
                      </p>
                    ) : null}

                    {!!normalizeImageSrc(logoPreview) ? (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <p className="mb-3 text-sm font-semibold text-gray-700">Xem trước logo</p>
                        <img
                          src={normalizeImageSrc(logoPreview)}
                          alt={companyForm.companyName || 'Logo công ty'}
                          className="h-24 w-24 rounded-xl border border-gray-200 bg-white object-contain"
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                        Chưa có logo công ty
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          clearSelectedLogoFile();
                          setLogoDeleteRequested(false);
                          setLogoPreview(companyForm.logoUrl || '');
                        }}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold hover:bg-gray-50 sm:w-auto"
                      >
                        Bỏ chọn ảnh mới
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveSelectedLogo}
                        className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 sm:w-auto"
                      >
                        Xóa logo hiện tại
                      </button>
                    </div>
                  </div>
                  <input
                    value={companyForm.taxCode || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, taxCode: e.target.value })}
                    placeholder="Mã số thuế"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />
                  <select
                    value={companyForm.companySize || ''}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        companySize: (e.target.value || null) as EmployerCompanyProfileRequest['companySize'],
                      })
                    }
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  >
                    <option value="">Quy mô công ty</option>
                    <option value="ONE_TO_TEN">1 - 10</option>
                    <option value="ELEVEN_TO_FIFTY">11 - 50</option>
                    <option value="FIFTY_ONE_TO_TWO_HUNDRED">51 - 200</option>
                    <option value="TWO_HUNDRED_PLUS">200+</option>
                  </select>
                  <input
                    value={companyForm.industry || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                    placeholder="Ngành nghề"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />
                  <input
                    value={companyForm.address || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    placeholder="Địa chỉ"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />
                  <textarea
                    value={companyForm.description || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                    placeholder="Mô tả công ty"
                    rows={4}
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />
                  <input
                    value={companyForm.contactName || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, contactName: e.target.value })}
                    placeholder="Tên người liên hệ"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />
                  <input
                    value={companyForm.contactEmail || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                    placeholder="Email liên hệ"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />
                  <input
                    value={companyForm.contactPhone || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
                    placeholder="Số điện thoại liên hệ"
                    className="w-full rounded-xl border px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                  />
                  <button
                    onClick={() =>
                      void runAction(async () => {
                        await saveCompanyProfileWithGithubLogo();
                      })
                    }
                    disabled={savingCompanyProfile}
                    className="w-full rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:py-3 md:text-base"
                  >
                    {savingCompanyProfile ? 'Đang lưu...' : 'Lưu hồ sơ công ty'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Tóm tắt thương hiệu" description="Tổng quan mức độ hoàn thiện">
                <div className="mb-5 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:mb-6">
                  {!!normalizeImageSrc(logoPreview) ? (
                    <img
                      src={normalizeImageSrc(logoPreview)}
                      alt={companyForm.companyName || 'Logo công ty'}
                      className="h-20 w-20 rounded-xl border border-gray-200 bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-2xl font-bold text-gray-400">
                      {companyForm.companyName?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                  )}

                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {companyForm.companyName || 'Tên công ty'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {companyForm.website || 'Chưa có website'}
                    </p>
                    {normalizeImageSrc(companyForm.logoUrl) ? (
                      <p className="mt-2 break-all text-xs text-gray-400">{companyForm.logoUrl}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mb-5 rounded-2xl bg-slate-900 p-5 text-white md:mb-6 md:p-6">
                  <p className="text-xs text-slate-300 md:text-sm">Mức độ hoàn thiện hồ sơ</p>
                  <p className="mt-1 text-3xl font-extrabold md:mt-2 md:text-4xl">
                    {dashboard.companyProfileCompletion}%
                  </p>
                  <p className="mt-2 text-xs text-slate-400 md:mt-3 md:text-sm">
                    Hồ sơ công ty càng đầy đủ, ứng viên càng tin tưởng và tỷ lệ ứng tuyển càng tốt hơn.
                  </p>
                </div>
                <div className="space-y-3">
                  {safeArray(dashboard.topJobs).length > 0 ? (
                    safeArray(dashboard.topJobs).map((job) => (
                      <div key={job.id} className="rounded-xl border p-3 md:p-4">
                        <p className="font-bold text-sm md:text-base">{job.title}</p>
                        <p className="text-xs text-gray-500 md:text-sm">
                          {job.location} • {job.employmentType}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Chưa có dữ liệu.</p>
                  )}
                </div>
              </SectionCard>
            </section>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck size={22} />
                  </div>
                  <p className="text-sm text-gray-500">Mức độ hoàn thiện hồ sơ</p>
                  <p className="mt-2 text-3xl font-black text-gray-900">{companyReport.completion}%</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-700">{companyReport.completionTone}</p>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                    <Sparkles size={22} />
                  </div>
                  <p className="text-sm text-gray-500">Tỷ lệ AI review</p>
                  <p className="mt-2 text-3xl font-black text-gray-900">{companyReport.reviewCoverage}%</p>
                  <p className="mt-2 text-sm text-gray-500">{companyReport.aiReviewedCount} / {allApplications.length} hồ sơ</p>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <TrendingUp size={22} />
                  </div>
                  <p className="text-sm text-gray-500">Tỷ lệ phỏng vấn</p>
                  <p className="mt-2 text-3xl font-black text-gray-900">{companyReport.interviewRate}%</p>
                  <p className="mt-2 text-sm text-gray-500">{companyReport.interviewedCount} hồ sơ đã hẹn</p>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <BarChart3 size={22} />
                  </div>
                  <p className="text-sm text-gray-500">Điểm AI trung bình</p>
                  <p className="mt-2 text-3xl font-black text-gray-900">{companyReport.averageScore}%</p>
                  <p className="mt-2 text-sm text-gray-500">Từ các hồ sơ đã được chấm điểm</p>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-3">
                <SectionCard title="Báo cáo công ty" description="Đánh giá tổng quan thương hiệu tuyển dụng dựa trên hồ sơ công ty và hiệu quả tuyển dụng">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm font-bold text-gray-900">{companyForm.companyName || 'Công ty của bạn'}</p>
                      <p className="mt-1 text-sm text-gray-500">{companyForm.website || 'Chưa có website'}</p>
                      <p className="mt-3 text-sm leading-6 text-gray-700">
                        {companyReport.completion >= 80
                          ? 'Hồ sơ công ty đang ở trạng thái tốt. Bạn có thể tập trung tối ưu nội dung tin tuyển dụng và tăng tốc sàng lọc ứng viên.'
                          : companyReport.completion >= 60
                            ? 'Hồ sơ công ty đã tương đối ổn nhưng vẫn còn một vài mục nên bổ sung để tăng độ tin cậy.'
                            : 'Hồ sơ công ty còn thiếu khá nhiều thông tin. Đây là nguyên nhân phổ biến làm giảm mức độ tin tưởng của ứng viên.'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-500">Tin đang hiển thị</p>
                        <p className="mt-2 text-2xl font-black text-gray-900">{dashboard.activeJobs}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-500">Đơn ứng tuyển</p>
                        <p className="mt-2 text-2xl font-black text-gray-900">{dashboard.totalApplications}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-500">Tỷ lệ shortlist</p>
                        <p className="mt-2 text-2xl font-black text-gray-900">{companyReport.shortlistRate}%</p>
                      </div>
                      <div className="rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-500">Tỷ lệ offer</p>
                        <p className="mt-2 text-2xl font-black text-gray-900">{companyReport.offerRate}%</p>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Điểm mạnh hiện tại" description="Những tín hiệu tích cực trong hồ sơ công ty và quy trình tuyển dụng">
                  {companyReport.strengths.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có dữ liệu nổi bật.</p>
                  ) : (
                    <div className="space-y-3">
                      {companyReport.strengths.map((item) => (
                        <div key={item} className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                          <p className="text-sm leading-6 text-emerald-800">{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Việc cần ưu tiên" description="Các hạng mục nên xử lý trước để tăng hiệu quả tuyển dụng">
                  {companyReport.priorities.length === 0 ? (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                      Hiện chưa có cảnh báo lớn. Bạn có thể tiếp tục tối ưu tin tuyển dụng và quy trình phỏng vấn.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {companyReport.priorities.map((item) => (
                        <div key={item} className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                          <p className="text-sm leading-6 text-amber-800">{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <SectionCard title="Thông tin còn thiếu" description="Những trường còn trống trong hồ sơ công ty">
                  {companyReport.missingItems.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                      Hồ sơ công ty đã đủ các trường thông tin chính.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {companyReport.missingItems.map((item) => (
                        <div key={item} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Top tin tuyển dụng" description="Các tin gần đây và số lượng hồ sơ liên quan">
                  {safeArray(dashboard.topJobs).length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có dữ liệu tin tuyển dụng.</p>
                  ) : (
                    <div className="space-y-3">
                      {safeArray(dashboard.topJobs).map((job) => (
                        <div key={job.id} className="rounded-2xl border border-gray-100 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-gray-900">{job.title}</p>
                              <p className="mt-1 text-sm text-gray-500">{job.location} • {job.employmentType}</p>
                            </div>
                            <StatusBadge status={job.shortlistedApplications > 0 ? 'SHORTLISTED' : 'APPLIED'} />
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              Tổng hồ sơ: <span className="font-bold">{job.totalApplications}</span>
                            </div>
                            <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              Đã shortlist: <span className="font-bold">{job.shortlistedApplications}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </section>
            </div>
          )}
        </main>
        {cvPreviewOpen ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4">
            <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{cvPreviewTitle}</h3>
                  <p className="text-sm text-gray-500">Xem trực tiếp CV PDF ngay trên hệ thống</p>
                </div>
                <div className="flex items-center gap-2">
                  {cvPreviewUrl ? (
                    <a
                      href={cvPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Mở tab mới
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={closeCvPreview}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <X size={16} />
                    Đóng
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 bg-gray-100">
                {cvPreviewLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">Đang tải CV PDF...</div>
                ) : cvPreviewUrl ? (
                  <iframe src={cvPreviewUrl} title={cvPreviewTitle} className="h-full w-full bg-white" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-red-600">Không thể hiển thị CV.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
        {showLogoutConfirm ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Briefcase size={22} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Xác nhận đăng xuất</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Bạn có chắc muốn đăng xuất khỏi khu vực nhà tuyển dụng không?
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={handleLogoutCancel}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Ở lại
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
