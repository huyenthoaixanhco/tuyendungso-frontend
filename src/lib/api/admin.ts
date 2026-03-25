const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8080';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('accessToken') ||
    null
  );
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Yêu cầu thất bại');
  }

  return data as T;
}

export type Role = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';
export type JobStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';

export interface PageResponse<T> {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface AdminJobListItem {
  id: number;
  title: string;
  companyName: string;
  employerName: string;
  employerEmail: string;
  location: string;
  employmentType: string;
  workplaceType?: string | null;
  salaryLabel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  description?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  applicationDeadline?: string | null;
  status: JobStatus;
  aiRecommendation?: 'APPROVE' | 'REVIEW' | 'REJECT' | null;
  aiRiskScore?: number | null;
  aiConfidence?: number | null;
  aiReviewed: boolean;
  autoApprovedByAi: boolean;
  aiSummary?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  closedAt?: string | null;
}

export interface AdminDashboardResponse {
  totalUsers: number;
  totalCandidates: number;
  totalEmployers: number;
  pendingEmployers: number;
  pendingJobs: number;
  approvedJobs: number;
  rejectedJobs: number;
  activeJobs: number;
  aiReviewedJobs: number;
  autoApprovedJobs: number;
  latestPendingJobs: AdminJobListItem[];
}

export interface AdminUserListItem {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  verified: boolean;
  active: boolean;
  employerApproved: boolean;
  createdAt: string;
}

export interface AdminSettingItem {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface AdminAiInsightResponse {
  summary: string;
  recommendedActions: string[];
}

export interface AdminBulkAiReviewResponse {
  requested: number;
  processed: number;
  autoApproved: number;
  autoRejected: number;
  leftForManualReview: number;
}

export const adminApi = {
  getDashboard: () => request<AdminDashboardResponse>('/api/admin/dashboard'),
  getUsers: (params: { keyword?: string; role?: string; page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.role) query.set('role', params.role);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 10));
    return request<PageResponse<AdminUserListItem>>(`/api/admin/users?${query.toString()}`);
  },
  updateUserStatus: (userId: string, active: boolean) =>
    request<AdminUserListItem>(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
  updateEmployerApproval: (userId: string, approved: boolean) =>
    request<AdminUserListItem>(`/api/admin/users/${userId}/employer-approval`, {
      method: 'PATCH',
      body: JSON.stringify({ approved }),
    }),
  getJobs: (params: { keyword?: string; status?: string; page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.status) query.set('status', params.status);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 10));
    return request<PageResponse<AdminJobListItem>>(`/api/admin/jobs?${query.toString()}`);
  },
  approveJob: (jobId: number, note?: string) =>
    request<AdminJobListItem>(`/api/admin/jobs/${jobId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note: note || 'Admin duyệt thủ công' }),
    }),
  rejectJob: (jobId: number, note?: string) =>
    request<AdminJobListItem>(`/api/admin/jobs/${jobId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note: note || 'Admin từ chối thủ công' }),
    }),
  aiReviewJob: (jobId: number) =>
    request<AdminJobListItem>(`/api/admin/jobs/${jobId}/ai-review`, {
      method: 'POST',
    }),
  bulkAiReviewPending: (limit = 20) =>
    request<AdminBulkAiReviewResponse>(`/api/admin/jobs/ai-review-pending?limit=${limit}`, {
      method: 'POST',
    }),
  getSettings: () => request<AdminSettingItem[]>('/api/admin/settings'),
  updateSetting: (key: string, value: string) =>
    request<AdminSettingItem>(`/api/admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
  getAiInsights: () => request<AdminAiInsightResponse>('/api/admin/ai/insights'),
};