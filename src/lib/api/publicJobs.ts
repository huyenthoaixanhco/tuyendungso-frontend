const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8080';

export interface PublicJobItem {
  id: number;
  title: string;
  companyName: string;
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
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  aiRecommendation?: 'APPROVE' | 'REVIEW' | 'REJECT' | null;
  aiRiskScore?: number | null;
  aiConfidence?: number | null;
  aiReviewed: boolean;
  autoApprovedByAi: boolean;
  aiSummary?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  first: boolean;
  last: boolean;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Không tải được dữ liệu việc làm');
  }

  return data as T;
}

export const publicJobsApi = {
  list: (params?: { keyword?: string; page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.set('keyword', params.keyword);
    query.set('page', String(params?.page ?? 0));
    query.set('size', String(params?.size ?? 6));
    return request<PageResponse<PublicJobItem>>(`/api/jobs?${query.toString()}`);
  },
};