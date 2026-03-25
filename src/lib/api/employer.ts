const API_BASE = (() => {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (envBase) {
    return envBase.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, host } = window.location;

    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${host}`;
    }
  }

  return 'http://localhost:8080';
})();

export type JobStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

export type JobApplicationStatus =
  | 'APPLIED'
  | 'IN_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'OFFERED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type ApplicationAiRecommendation = 'INVITE_INTERVIEW' | 'CONSIDER' | 'REJECT';

export type CompanySize =
  | 'ONE_TO_TEN'
  | 'ELEVEN_TO_FIFTY'
  | 'FIFTY_ONE_TO_TWO_HUNDRED'
  | 'TWO_HUNDRED_PLUS';

export type JobPostResponse = {
  id: number;
  title: string;
  companyName: string;
  location: string;
  employmentType: string;
  workplaceType?: string | null;
  salaryLabel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  applicationDeadline?: string | null;
  status: JobStatus;
  aiRecommendation?: 'APPROVE' | 'REJECT' | 'REVIEW' | null;
  aiRiskScore?: number | null;
  aiConfidence?: number | null;
  aiReviewed?: boolean;
  autoApprovedByAi?: boolean;
  aiSummary?: string | null;
  reviewNote?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EmployerApplicationListItem = {
  id: number;
  candidateFullName: string;
  candidateEmail: string;
  jobTitle: string;
  status: JobApplicationStatus;
  aiReviewed?: boolean;
  aiRecommendation?: ApplicationAiRecommendation | null;
  aiMatchScore?: number | null;
  appliedAt?: string | null;
};

export type EmployerUpcomingInterviewItem = {
  interviewId: number;
  applicationId: number;
  candidateFullName: string;
  jobTitle: string;
  scheduledAt: string;
  location?: string | null;
  meetingLink?: string | null;
};

export type EmployerApplicationInterviewItem = {
  interviewId: number;
  scheduledAt: string;
  location?: string | null;
  meetingLink?: string | null;
  note?: string | null;
  status?: string | null;
};

export type EmployerApplicationDetailResponse = {
  id: number;
  candidateFullName: string;
  candidateEmail: string;
  phone?: string | null;
  jobTitle: string;
  status: JobApplicationStatus;
  yearsOfExperience?: number | null;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
  skills?: string | null;
  coverLetter?: string | null;
  employerNote?: string | null;
  aiReviewed?: boolean;
  aiRecommendation?: ApplicationAiRecommendation | null;
  aiMatchScore?: number | null;
  aiSummary?: string | null;
  aiStrengths?: string[] | null;
  aiConcerns?: string[] | null;
  aiInterviewQuestions?: string[] | null;
  interviews?: EmployerApplicationInterviewItem[] | null;
};

export type EmployerJobSummaryItem = {
  id: number;
  title: string;
  location: string;
  employmentType: string;
  totalApplications: number;
  shortlistedApplications: number;
};

export type EmployerDashboardResponse = {
  totalJobs: number;
  activeJobs: number;
  pendingJobs: number;
  closedJobs: number;
  totalApplications: number;
  newApplications: number;
  shortlistedApplications: number;
  interviewScheduled: number;
  companyProfileCompletion: number;
  latestApplications: EmployerApplicationListItem[];
  upcomingInterviews: EmployerUpcomingInterviewItem[];
  topJobs: EmployerJobSummaryItem[];
};

export type EmployerCompanyProfileResponse = {
  companyName?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  taxCode?: string | null;
  companySize?: CompanySize | null;
  industry?: string | null;
  address?: string | null;
  description?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type EmployerCompanyProfileRequest = {
  companyName: string;
  logoUrl?: string | null;
  website?: string | null;
  taxCode?: string | null;
  companySize?: CompanySize | null;
  industry?: string | null;
  address?: string | null;
  description?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type CreateJobRequest = {
  title: string;
  companyName: string;
  location: string;
  employmentType: string;
  workplaceType?: string | null;
  salaryLabel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  applicationDeadline?: string | null;
  draft: boolean;
};

export type UpdateJobRequest = CreateJobRequest;

export type PageResponse<T> = {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
};

export type UploadCompanyLogoResponse = {
  url: string;
  fileName?: string | null;
  path?: string | null;
  sha?: string | null;
};

export type DeleteCompanyLogoRequest = {
  url: string;
};

export type DeleteCompanyLogoResponse = {
  success: boolean;
  deletedUrl?: string | null;
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      cache: 'no-store',
    });

    const text = await response.text();
    let data: unknown = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      if (typeof data === 'object' && data !== null) {
        const errorData = data as { message?: string; error?: string };
        throw new Error(errorData.message || errorData.error || 'Có lỗi xảy ra');
      }

      if (typeof data === 'string' && data.trim()) {
        throw new Error(data);
      }

      throw new Error('Có lỗi xảy ra');
    }

    return data as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Không kết nối được tới máy chủ API (${API_BASE}). Hãy kiểm tra backend Spring Boot đã chạy chưa, đúng cổng chưa, và CORS đã mở chưa.`,
      );
    }
    throw error;
  }
}

export const employerApi = {
  getDashboard() {
    return apiFetch<EmployerDashboardResponse>('/api/employer/dashboard');
  },

  getMyJobs() {
    return apiFetch<JobPostResponse[]>('/api/employer/jobs');
  },

  createJob(payload: CreateJobRequest) {
    return apiFetch<JobPostResponse>('/api/employer/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateJob(jobId: number, payload: UpdateJobRequest) {
    return apiFetch<JobPostResponse>(`/api/employer/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  submitJob(jobId: number) {
    return apiFetch<JobPostResponse>(`/api/employer/jobs/${jobId}/submit`, {
      method: 'POST',
    });
  },

  closeJob(jobId: number) {
    return apiFetch<JobPostResponse>(`/api/employer/jobs/${jobId}/close`, {
      method: 'PATCH',
    });
  },

  deleteJob(jobId: number) {
    return apiFetch<void>(`/api/employer/jobs/${jobId}`, {
      method: 'DELETE',
    });
  },

  getApplications(params?: {
    page?: number;
    size?: number;
    keyword?: string;
    status?: JobApplicationStatus;
    jobId?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.page !== undefined) search.set('page', String(params.page));
    if (params?.size !== undefined) search.set('size', String(params.size));
    if (params?.keyword) search.set('keyword', params.keyword);
    if (params?.status) search.set('status', params.status);
    if (params?.jobId) search.set('jobId', String(params.jobId));

    return apiFetch<PageResponse<EmployerApplicationListItem>>(
      `/api/employer/applications${search.toString() ? `?${search.toString()}` : ''}`,
    );
  },

  getApplicationDetail(applicationId: number) {
    return apiFetch<EmployerApplicationDetailResponse>(`/api/employer/applications/${applicationId}`);
  },

  async getResumePreviewBlob(applicationId: number) {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/employer/applications/${applicationId}/resume/preview`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      let data: unknown = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (typeof data === 'object' && data !== null) {
        const errorData = data as { message?: string; error?: string };
        throw new Error(errorData.message || errorData.error || 'Không mở được CV');
      }

      if (typeof data === 'string' && data.trim()) {
        throw new Error(data);
      }

      throw new Error('Không mở được CV');
    }

    return response.blob();
  },

  updateApplicationStatus(
    applicationId: number,
    payload: { status: JobApplicationStatus; employerNote?: string | null },
  ) {
    return apiFetch<EmployerApplicationDetailResponse>(
      `/api/employer/applications/${applicationId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  aiReviewApplication(applicationId: number) {
    return apiFetch<EmployerApplicationDetailResponse>(
      `/api/employer/applications/${applicationId}/ai-review`,
      {
        method: 'POST',
      },
    );
  },

  bulkAiReviewApplications(payload?: { jobId?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (payload?.jobId) search.set('jobId', String(payload.jobId));
    if (payload?.limit) search.set('limit', String(payload.limit));

    return apiFetch<{
      processed: number;
      inviteInterview: number;
      consider: number;
      reject: number;
    }>(`/api/employer/applications/ai-review-bulk${search.toString() ? `?${search.toString()}` : ''}`, {
      method: 'POST',
    });
  },

  scheduleInterview(
    applicationId: number,
    payload: {
      scheduledAt: string;
      location?: string;
      meetingLink?: string;
      note?: string;
    },
  ) {
    return apiFetch<EmployerApplicationDetailResponse>(
      `/api/employer/applications/${applicationId}/schedule-interview`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  deleteApplication(applicationId: number) {
    return apiFetch<void>(`/api/employer/applications/${applicationId}`, {
      method: 'DELETE',
    });
  },

  getCompanyProfile() {
    return apiFetch<EmployerCompanyProfileResponse>('/api/employer/company-profile');
  },

  saveCompanyProfile(payload: EmployerCompanyProfileRequest) {
    return apiFetch<EmployerCompanyProfileResponse>('/api/employer/company-profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  uploadCompanyLogo(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<UploadCompanyLogoResponse>('/api/employer/company-profile/logo', {
      method: 'POST',
      body: formData,
    });
  },

  deleteCompanyLogo(payload: DeleteCompanyLogoRequest) {
    return apiFetch<DeleteCompanyLogoResponse>('/api/employer/company-profile/logo', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },
};
