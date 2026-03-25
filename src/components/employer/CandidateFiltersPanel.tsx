'use client';

import React, { useMemo } from 'react';
import type {
  EmployerApplicationListItem,
  JobApplicationStatus,
  JobPostResponse,
} from '@/lib/api/employer';
import { Search, Sparkles } from 'lucide-react';
import { SectionCard, StatusBadge, statusLabel } from '@/components/employer/EmployerUi';

export default function CandidateFiltersPanel({
  applications,
  jobs,
  selectedApplicationId,
  candidateKeyword,
  candidateStatus,
  candidateJobId,
  applicationStatuses,
  onCandidateKeywordChange,
  onCandidateStatusChange,
  onCandidateJobIdChange,
  onFilter,
  onBulkAiReview,
  onOpenDetail,
}: {
  applications: EmployerApplicationListItem[];
  jobs: JobPostResponse[];
  selectedApplicationId?: number | null;
  candidateKeyword: string;
  candidateStatus: JobApplicationStatus | '';
  candidateJobId: number | '';
  applicationStatuses: JobApplicationStatus[];
  onCandidateKeywordChange: (value: string) => void;
  onCandidateStatusChange: (value: JobApplicationStatus | '') => void;
  onCandidateJobIdChange: (value: number | '') => void;
  onFilter: () => void;
  onBulkAiReview: () => void;
  onOpenDetail: (applicationId: number) => void;
}) {
  const stats = useMemo(() => {
    const total = applications.length;
    const aiReviewed = applications.filter((item) => item.aiReviewed).length;
    const shortlisted = applications.filter((item) => item.status === 'SHORTLISTED').length;
    const interviews = applications.filter((item) => item.status === 'INTERVIEW_SCHEDULED').length;
    return { total, aiReviewed, shortlisted, interviews };
  }, [applications]);

  return (
    <SectionCard title="Ứng viên & Bộ lọc" description="Lọc theo công việc, trạng thái và mở nhanh hồ sơ phù hợp">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Tổng hồ sơ</p>
            <p className="mt-1 text-lg font-black text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3">
            <p className="text-xs text-purple-600">Đã AI review</p>
            <p className="mt-1 text-lg font-black text-purple-700">{stats.aiReviewed}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs text-emerald-600">Đã shortlist</p>
            <p className="mt-1 text-lg font-black text-emerald-700">{stats.shortlisted}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs text-blue-600">Đã hẹn phỏng vấn</p>
            <p className="mt-1 text-lg font-black text-blue-700">{stats.interviews}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="font-bold text-gray-900">Danh sách ứng viên phù hợp bộ lọc</h4>
          <button
            onClick={onBulkAiReview}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 md:text-sm"
          >
            <Sparkles size={16} />
            AI hàng loạt
          </button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 md:p-4">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={candidateKeyword}
              onChange={(e) => onCandidateKeywordChange(e.target.value)}
              placeholder="Tìm theo tên ứng viên, email..."
              className="w-full rounded-xl border border-white bg-white px-11 py-3 text-sm outline-none ring-0 placeholder:text-gray-400 focus:border-emerald-500 md:text-base"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select
              value={candidateStatus}
              onChange={(e) => onCandidateStatusChange(e.target.value as JobApplicationStatus | '')}
              className="w-full rounded-xl border bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 md:px-4 md:text-base"
            >
              <option value="">Tất cả trạng thái</option>
              {applicationStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>

            <select
              value={candidateJobId}
              onChange={(e) => onCandidateJobIdChange(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-xl border bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 md:px-4 md:text-base"
            >
              <option value="">Tất cả công việc</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onFilter}
            className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50 md:text-base"
          >
            Lọc danh sách
          </button>
        </div>

        <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
              Chưa có ứng viên phù hợp.
            </div>
          ) : (
            applications.map((item) => (
              <button
                key={item.id}
                onClick={() => onOpenDetail(item.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  selectedApplicationId === item.id
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900 md:text-base">
                      {item.candidateFullName}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500 md:text-sm">{item.candidateEmail}</p>
                    <p className="mt-1 truncate text-xs text-gray-500 md:text-sm">{item.jobTitle}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-600">
                    {item.aiReviewed
                      ? `${item.aiRecommendation || 'AI đã đánh giá'}${
                          item.aiMatchScore != null ? ` • ${item.aiMatchScore}%` : ''
                        }`
                      : 'Chưa kiểm duyệt AI'}
                  </p>
                  <span className="shrink-0 text-[11px] font-semibold text-emerald-600">Xem chi tiết</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );
}
