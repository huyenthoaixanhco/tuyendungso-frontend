const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export type JobApplicationStatus =
  | 'APPLIED'
  | 'IN_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'OFFERED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type PageResponse<T> = {
  content?: T[];
  items?: T[];
  page?: number;
  number?: number;
  size?: number;
  totalPages?: number;
  totalElements?: number;
};

export function getPageItems<T>(page?: PageResponse<T> | null): T[] {
  if (!page) return [];
  if (Array.isArray(page.content)) return page.content;
  if (Array.isArray(page.items)) return page.items;
  return [];
}

export type CandidateJob = {
  id: number;
  title: string;
  companyName: string;
  companyLogoUrl?: string | null;
  location: string;
  employmentType?: string | null;
  workplaceType?: string | null;
  workMode?: string | null;
  salaryLabel?: string | null;
  salaryDisplay?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  description?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  applicationDeadline?: string | null;
  deadline?: string | null;
  status?: string | null;
  aiRecommendation?: string | null;
  aiRiskScore?: number | null;
  aiConfidence?: number | null;
  aiReviewed?: boolean;
  autoApprovedByAi?: boolean;
  aiSummary?: string | null;
  reviewNote?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  skills?: string[] | string | null;
};

export type CandidateProfileResponse = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  headline?: string;
  currentTitle?: string;
  desiredJobTitle?: string;
  desiredLocation?: string;
  city?: string;
  yearsOfExperience?: number;
  resumeUrl?: string;
  portfolioUrl?: string;
  avatarUrl?: string;
  skills?: string;
  bio?: string;
  profileCompletionPercent?: number;
};

export type CandidateProfileRequest = {
  firstName: string;
  lastName: string;
  phone?: string;
  headline?: string;
  currentTitle?: string;
  desiredJobTitle?: string;
  desiredLocation?: string;
  city?: string;
  yearsOfExperience?: number;
  resumeUrl?: string;
  portfolioUrl?: string;
  avatarUrl?: string;
  skills?: string;
  bio?: string;
};

export type CandidateSavedJobResponse = {
  id: number;
  createdAt?: string | null;
  job: CandidateJob;
};

export type CandidateApplicationItem = {
  id: number;
  createdAt?: string | null;
  status: JobApplicationStatus;
  aiRecommendation?: string | null;
  aiMatchScore?: number | null;
  employerNote?: string | null;
  job: CandidateJob;
};

export type CandidateUploadedResume = {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  createdAt?: string | null;
};

export type CandidateCvDocumentListItem = {
  id: number;
  name: string;
  templateKey?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export type CandidateCvDocumentResponse = {
  id: number;
  name: string;
  templateKey?: string | null;
  contentJson: string;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export type CreateJobApplicationRequest = {
  jobPostId: number;
  candidateFullName: string;
  candidateEmail: string;
  phone?: string;
  currentTitle?: string;
  yearsOfExperience?: number;
  resumeUrl?: string;
  uploadedResumeId?: number | null;
  portfolioUrl?: string;
  skills?: string;
  coverLetter?: string;
};

export type JobApplicationSubmitResponse = {
  id: number;
  jobPostId: number;
  jobTitle: string;
  companyName: string;
  status: JobApplicationStatus;
  createdAt?: string | null;
  message?: string;
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function normalizeJob(job: CandidateJob): CandidateJob {
  return {
    ...job,
    companyLogoUrl: job.companyLogoUrl ?? null,
    workMode: job.workMode ?? job.workplaceType ?? null,
    workplaceType: job.workplaceType ?? job.workMode ?? null,
    salaryDisplay: job.salaryDisplay ?? job.salaryLabel ?? null,
    salaryLabel: job.salaryLabel ?? job.salaryDisplay ?? null,
    deadline: job.deadline ?? job.applicationDeadline ?? null,
    applicationDeadline: job.applicationDeadline ?? job.deadline ?? null,
  };
}

function normalizePage<T>(data: PageResponse<T>): PageResponse<T> {
  return {
    ...data,
    content: Array.isArray(data.content)
      ? data.content
      : Array.isArray(data.items)
        ? data.items
        : [],
    page: typeof data.page === 'number' ? data.page : (data.number ?? 0),
    totalPages: data.totalPages ?? 0,
    totalElements: data.totalElements ?? getPageItems(data).length,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const errorPayload = (data ?? {}) as Record<string, unknown>;
    const message =
      (typeof errorPayload.message === 'string' && errorPayload.message) ||
      (typeof errorPayload.error === 'string' && errorPayload.error) ||
      text ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const candidateApi = {
  async getPublicJobs(params?: { keyword?: string; page?: number; size?: number }) {
    const query = new URLSearchParams();

    if (params?.keyword) query.set('keyword', params.keyword);
    query.set('page', String(params?.page ?? 0));
    query.set('size', String(params?.size ?? 12));

    const data = await apiFetch<PageResponse<CandidateJob>>(`/api/jobs?${query.toString()}`);
    const page = normalizePage(data);

    return {
      ...page,
      content: getPageItems(page).map((job) => normalizeJob(job)),
    };
  },

  async getPublicJobDetail(jobId: number) {
    const data = await apiFetch<CandidateJob>(`/api/jobs/${jobId}`);
    return normalizeJob(data);
  },

  async getProfile() {
    return apiFetch<CandidateProfileResponse>('/api/candidate/profile');
  },

  async saveProfile(payload: CandidateProfileRequest) {
    return apiFetch<CandidateProfileResponse>('/api/candidate/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getSavedJobs(params?: { page?: number; size?: number }) {
    const query = new URLSearchParams();
    query.set('page', String(params?.page ?? 0));
    query.set('size', String(params?.size ?? 12));

    const data = await apiFetch<PageResponse<CandidateSavedJobResponse>>(
      `/api/candidate/saved-jobs?${query.toString()}`,
    );
    const page = normalizePage(data);

    return {
      ...page,
      content: getPageItems(page).map((item) => ({
        ...item,
        job: normalizeJob(item.job),
      })),
    };
  },

  async saveJob(jobId: number) {
    const data = await apiFetch<CandidateSavedJobResponse>(`/api/candidate/saved-jobs/${jobId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    return {
      ...data,
      job: normalizeJob(data.job),
    };
  },

  async unsaveJob(jobId: number) {
    return apiFetch<void>(`/api/candidate/saved-jobs/${jobId}`, {
      method: 'DELETE',
    });
  },

  async getMyApplications(params?: { page?: number; size?: number }) {
    const query = new URLSearchParams();
    query.set('page', String(params?.page ?? 0));
    query.set('size', String(params?.size ?? 10));

    const data = await apiFetch<PageResponse<CandidateApplicationItem>>(
      `/api/candidate/applications/me?${query.toString()}`,
    );
    const page = normalizePage(data);

    return {
      ...page,
      content: getPageItems(page).map((item) => ({
        ...item,
        job: normalizeJob(item.job),
      })),
    };
  },

  async apply(payload: CreateJobApplicationRequest) {
    return apiFetch<JobApplicationSubmitResponse>('/api/candidate/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMyUploadedResumes() {
    return apiFetch<CandidateUploadedResume[]>('/api/candidate/uploaded-resumes');
  },

  async uploadCandidateResumePdf(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<CandidateUploadedResume>('/api/candidate/uploaded-resumes', {
      method: 'POST',
      body: formData,
    });
  },

  async getMyCvDocuments() {
    return apiFetch<CandidateCvDocumentListItem[]>('/api/candidate/cv-documents');
  },

  async getCvDocument(id: number) {
    return apiFetch<CandidateCvDocumentResponse>(`/api/candidate/cv-documents/${id}`);
  },

  async createCvDocument(payload: {
    name: string;
    templateKey?: string | null;
    contentJson: string;
  }) {
    return apiFetch<CandidateCvDocumentResponse>('/api/candidate/cv-documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCvDocument(
    id: number,
    payload: {
      name: string;
      templateKey?: string | null;
      contentJson: string;
    },
  ) {
    return apiFetch<CandidateCvDocumentResponse>(`/api/candidate/cv-documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteCvDocument(id: number) {
    return apiFetch<void>(`/api/candidate/cv-documents/${id}`, {
      method: 'DELETE',
    });
  },

  async duplicateCvDocument(id: number) {
    return apiFetch<CandidateCvDocumentResponse>(`/api/candidate/cv-documents/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
  async deleteUploadedResume(id: number) {
  return apiFetch<{ message: string }>(`/api/candidate/uploaded-resumes/${id}`, {
    method: 'DELETE',
  });
},

async attachUploadedResumeToCvDocument(cvDocumentId: number, uploadedResumeId: number) {
  return apiFetch<CandidateCvDocumentResponse>(
    `/api/candidate/cv-documents/${cvDocumentId}/attach-uploaded-resume/${uploadedResumeId}`,
    {
      method: 'POST',
    },
  );
},

async withdrawApplication(applicationId: number) {
  return apiFetch<JobApplicationSubmitResponse>(
    `/api/candidate/applications/${applicationId}/withdraw`,
    {
      method: 'POST',
    },
  );
},
};
//lip/api/candidate