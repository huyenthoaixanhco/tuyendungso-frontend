'use client';

import React, { useMemo } from 'react';
import type { EmployerApplicationListItem, JobApplicationStatus } from '@/lib/api/employer';
import { ChevronLeft, ChevronRight, Mail, Sparkles } from 'lucide-react';
import {
  PaginationButton,
  SectionCard,
  StatusBadge,
} from '@/components/employer/EmployerUi';

function formatAppliedAt(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

interface AllApplicationsTableProps {
  applications: EmployerApplicationListItem[];
  selectedApplicationId?: number | null;
  page: number;
  pageSize: number;
  candidateActionId: number | null;
  onPageChange: (page: number) => void;
  onOpenDetail: (applicationId: number) => void;
  onQuickAiReview: (applicationId: number) => void;
  onQuickStatusUpdate: (applicationId: number, status: JobApplicationStatus) => void;
  onDeleteApplication: (applicationId: number) => void;
}

export default function AllApplicationsTable({
  applications,
  selectedApplicationId,
  page,
  pageSize,
  candidateActionId,
  onPageChange,
  onOpenDetail,
  onQuickAiReview,
  onQuickStatusUpdate,
  onDeleteApplication,
}: AllApplicationsTableProps) {
  const totalPages = Math.max(1, Math.ceil(applications.length / pageSize));

  const pagedApplications = useMemo(() => {
    const start = (page - 1) * pageSize;
    return applications.slice(start, start + pageSize);
  }, [applications, page, pageSize]);

  const from = applications.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, applications.length);

  return (
    <SectionCard
      title="Tất cả ứng viên đã nộp đơn"
      description="Bảng tổng hợp toàn bộ hồ sơ ứng tuyển, có AI review và thao tác nhanh ngay trên từng dòng"
    >
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Tổng cộng {applications.length} ứng viên</p>
          <p className="text-xs text-gray-500 md:text-sm">
            Hiển thị {from} - {to} / {applications.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PaginationButton disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            <ChevronLeft size={16} />
          </PaginationButton>

          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700">
            {page} / {totalPages}
          </div>

          <PaginationButton
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            <ChevronRight size={16} />
          </PaginationButton>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
          Chưa có ứng viên nộp đơn.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2">Ứng viên</th>
                  <th className="px-4 py-2">Công việc</th>
                  <th className="px-4 py-2">Trạng thái</th>
                  <th className="px-4 py-2">AI</th>
                  <th className="px-4 py-2">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedApplications.map((item) => {
                  const isSelected = selectedApplicationId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`rounded-2xl ${isSelected ? 'ring-2 ring-emerald-200' : ''}`}
                    >
                      <td className="rounded-l-2xl border-y border-l border-gray-100 bg-white px-4 py-4 align-top">
                        <div className="min-w-[220px]">
                          <p className="font-bold text-gray-900">{item.candidateFullName}</p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                            <Mail size={14} />
                            <span className="truncate">{item.candidateEmail}</span>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">ID hồ sơ: #{item.id}</p>
                          <p className="mt-1 text-xs text-gray-500">Nộp lúc: {formatAppliedAt(item.appliedAt)}</p>
                        </div>
                      </td>

                      <td className="border-y border-gray-100 bg-white px-4 py-4 align-top">
                        <div className="min-w-[220px]">
                          <p className="font-semibold text-gray-900">{item.jobTitle}</p>
                        </div>
                      </td>

                      <td className="border-y border-gray-100 bg-white px-4 py-4 align-top">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="border-y border-gray-100 bg-white px-4 py-4 align-top">
                        <div className="min-w-[180px] text-sm text-gray-600">
                          {item.aiReviewed ? (
                            <div className="space-y-1">
                              <p className="font-semibold text-purple-700">
                                {item.aiRecommendation || 'Đã đánh giá'}
                              </p>
                              <p>
                                {item.aiMatchScore != null
                                  ? `Độ phù hợp: ${item.aiMatchScore}%`
                                  : 'Có kết quả AI'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">Chưa AI review</span>
                          )}
                        </div>
                      </td>

                      <td className="rounded-r-2xl border-y border-r border-gray-100 bg-white px-4 py-4 align-top">
                        <div className="flex min-w-[300px] flex-wrap gap-2">
                          <button
                            onClick={() => onOpenDetail(item.id)}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                          >
                            Xem chi tiết
                          </button>

                          {item.status === 'WITHDRAWN' ? (
                            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                              Ứng viên đã rút đơn
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => onQuickAiReview(item.id)}
                                disabled={candidateActionId === item.id || item.status === 'REJECTED'}
                                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Sparkles size={14} />
                                {candidateActionId === item.id ? 'Đang xử lý...' : 'AI review'}
                              </button>

                              <button
                                onClick={() => onQuickStatusUpdate(item.id, 'IN_REVIEW')}
                                disabled={candidateActionId === item.id || item.status === 'REJECTED'}
                                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Đang xem xét
                              </button>

                              <button
                                onClick={() => onQuickStatusUpdate(item.id, 'SHORTLISTED')}
                                disabled={candidateActionId === item.id || item.status === 'REJECTED'}
                                className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Chọn lọc
                              </button>

                              <button
                                onClick={() => onQuickStatusUpdate(item.id, 'REJECTED')}
                                disabled={candidateActionId === item.id}
                                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Từ chối
                              </button>
                            </>
                          )}

                          {item.status === 'REJECTED' ? (
                            <button
                              onClick={() => onDeleteApplication(item.id)}
                              disabled={candidateActionId === item.id}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Xóa ứng viên
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {pagedApplications.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                  selectedApplicationId === item.id
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-gray-900">
                      {item.candidateFullName}
                    </p>
                    <p className="mt-1 break-words text-sm text-gray-500">{item.candidateEmail}</p>
                    <p className="mt-1 break-words text-sm text-gray-500">{item.jobTitle}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-700">AI</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {item.aiReviewed
                      ? `${item.aiRecommendation || 'Đã đánh giá'}${
                          item.aiMatchScore != null ? ` • ${item.aiMatchScore}%` : ''
                        }`
                      : 'Chưa AI review'}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">Nộp lúc: {formatAppliedAt(item.appliedAt)}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenDetail(item.id)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Xem chi tiết
                  </button>

                  {item.status === 'WITHDRAWN' ? (
                    <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                      Ứng viên đã rút đơn
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onQuickAiReview(item.id)}
                        disabled={candidateActionId === item.id || item.status === 'REJECTED'}
                        className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {candidateActionId === item.id ? 'Đang xử lý...' : 'AI review'}
                      </button>

                      <button
                        onClick={() => onQuickStatusUpdate(item.id, 'IN_REVIEW')}
                        disabled={candidateActionId === item.id || item.status === 'REJECTED'}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Đang xem xét
                      </button>

                      <button
                        onClick={() => onQuickStatusUpdate(item.id, 'SHORTLISTED')}
                        disabled={candidateActionId === item.id || item.status === 'REJECTED'}
                        className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Chọn lọc
                      </button>

                      <button
                        onClick={() => onQuickStatusUpdate(item.id, 'REJECTED')}
                        disabled={candidateActionId === item.id}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Từ chối
                      </button>
                    </>
                  )}

                  {item.status === 'REJECTED' ? (
                    <button
                      onClick={() => onDeleteApplication(item.id)}
                      disabled={candidateActionId === item.id}
                      className="col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Xóa ứng viên
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}
