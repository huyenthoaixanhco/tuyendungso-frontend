'use client';

import React from 'react';
import type {
  EmployerApplicationDetailResponse,
  JobApplicationStatus,
} from '@/lib/api/employer';
import { CalendarClock, ExternalLink, Sparkles } from 'lucide-react';
import { SectionCard, StatusBadge, statusLabel } from '@/components/employer/EmployerUi';

function SafeLink({ href, label }: { href?: string | null; label: string }) {
  if (!href?.trim()) {
    return <span className="text-sm text-gray-500">-</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
    >
      {label}
      <ExternalLink size={14} />
    </a>
  );
}

function PreviewButton({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  if (!enabled) {
    return <span className="text-sm text-gray-500">-</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
    >
      Mở CV
      <ExternalLink size={14} />
    </button>
  );
}

export default function CandidateDetailPanel({
  selectedApplication,
  statusUpdate,
  employerNote,
  interviewAt,
  interviewLocation,
  interviewLink,
  interviewNote,
  applicationStatuses,
  formatDate,
  onStatusUpdateChange,
  onEmployerNoteChange,
  onInterviewAtChange,
  onInterviewLocationChange,
  onInterviewLinkChange,
  onInterviewNoteChange,
  onAiReview,
  onSaveStatus,
  onCreateInterview,
  onPreviewResume,
  onDeleteApplication,
}: {
  selectedApplication: EmployerApplicationDetailResponse | null;
  statusUpdate: JobApplicationStatus;
  employerNote: string;
  interviewAt: string;
  interviewLocation: string;
  interviewLink: string;
  interviewNote: string;
  applicationStatuses: JobApplicationStatus[];
  formatDate: (value?: string | null) => string;
  onStatusUpdateChange: (value: JobApplicationStatus) => void;
  onEmployerNoteChange: (value: string) => void;
  onInterviewAtChange: (value: string) => void;
  onInterviewLocationChange: (value: string) => void;
  onInterviewLinkChange: (value: string) => void;
  onInterviewNoteChange: (value: string) => void;
  onAiReview: () => void;
  onSaveStatus: () => void;
  onCreateInterview: () => void;
  onPreviewResume: (applicationId: number, candidateName?: string) => void;
  onDeleteApplication: (applicationId: number) => void;
}) {
  return (
    <SectionCard
      title="Chi tiết ứng viên"
      description="Thông tin hồ sơ, đánh giá AI, ghi chú nội bộ và lịch phỏng vấn"
    >
      {!selectedApplication ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center md:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600">
            <Sparkles size={24} />
          </div>
          <p className="mb-2 text-lg font-bold text-gray-900">Chọn một ứng viên để xem chi tiết</p>
          <p className="text-sm text-gray-500">
            Bạn có thể chạy AI review, cập nhật trạng thái hoặc tạo lịch phỏng vấn tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-2xl font-black text-gray-900">{selectedApplication.candidateFullName}</p>
                <p className="mt-1 text-sm text-gray-600">{selectedApplication.jobTitle}</p>
                <p className="mt-1 break-all text-sm text-gray-500">
                  {selectedApplication.candidateEmail} • {selectedApplication.phone || '-'}
                </p>
              </div>
              <StatusBadge status={selectedApplication.status} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-gray-500">Độ phù hợp AI</p>
                <p className="mt-2 text-lg font-black text-gray-900">
                  {selectedApplication.aiMatchScore ?? '-'}%
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-gray-500">Kinh nghiệm</p>
                <p className="mt-2 text-lg font-black text-gray-900">
                  {selectedApplication.yearsOfExperience ?? '-'} năm
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-gray-500">Khuyến nghị AI</p>
                <p className="mt-2 text-sm font-bold text-purple-700">
                  {selectedApplication.aiRecommendation || 'Chưa có'}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-gray-500">Mã hồ sơ</p>
                <p className="mt-2 text-lg font-black text-gray-900">#{selectedApplication.id}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 md:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-purple-600" />
              <p className="font-bold">Nhận xét từ AI</p>
            </div>
            <p className="text-sm leading-6 text-gray-700">
              {selectedApplication.aiSummary || 'Chưa có kết quả AI'}
            </p>

            {selectedApplication.aiStrengths?.length ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold text-gray-900">Điểm mạnh</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  {selectedApplication.aiStrengths.map((item, idx) => (
                    <li key={idx} className="rounded-xl bg-white/80 px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {selectedApplication.aiConcerns?.length ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold text-gray-900">Điểm cần lưu ý</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  {selectedApplication.aiConcerns.map((item, idx) => (
                    <li key={idx} className="rounded-xl bg-white/80 px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button
              onClick={onAiReview}
              className="mt-4 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700"
            >
              Chạy AI review
            </button>
          </div>

          <div className="rounded-2xl border p-4 md:p-5">
            <p className="mb-3 font-bold">CV / Hồ sơ</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">CV</p>
                <div className="mt-2">
                  <PreviewButton
                    enabled={!!selectedApplication.resumeUrl}
                    onClick={() =>
                      onPreviewResume(selectedApplication.id, selectedApplication.candidateFullName)
                    }
                  />
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Portfolio</p>
                <div className="mt-2">
                  <SafeLink href={selectedApplication.portfolioUrl} label="Mở Portfolio" />
                </div>
              </div>
            </div>
            {selectedApplication.skills ? (
              <div className="mt-3 rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Kỹ năng</p>
                <p className="mt-2 text-sm text-gray-700">{selectedApplication.skills}</p>
              </div>
            ) : null}
            {selectedApplication.coverLetter ? (
              <div className="mt-3 rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Thư ứng tuyển</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {selectedApplication.coverLetter}
                </p>
              </div>
            ) : null}
          </div>


          {selectedApplication.status === 'WITHDRAWN' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Ứng viên đã rút đơn. Bạn vẫn có thể xem lại hồ sơ, nhưng không nên tiếp tục lên lịch phỏng vấn cho đơn này.
            </div>
          ) : null}

          <div className="space-y-3 rounded-2xl border p-4 md:p-5">
            <p className="font-bold">Cập nhật trạng thái</p>
            <select
              value={statusUpdate}
              onChange={(e) => onStatusUpdateChange(e.target.value as JobApplicationStatus)}
              className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-emerald-500 md:px-4 md:text-base"
            >
              {applicationStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
            <textarea
              value={employerNote}
              onChange={(e) => onEmployerNoteChange(e.target.value)}
              placeholder="Ghi chú nội bộ"
              rows={4}
              className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-emerald-500 md:px-4 md:text-base"
            />
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onSaveStatus}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 md:w-auto"
              >
                Lưu trạng thái
              </button>

              {selectedApplication.status === 'REJECTED' ? (
                <button
                  type="button"
                  onClick={() => onDeleteApplication(selectedApplication.id)}
                  className="w-full rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 md:w-auto"
                >
                  Xóa ứng viên
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border p-4 md:p-5">
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-blue-600" />
              <p className="font-bold">Lịch phỏng vấn</p>
            </div>

            {selectedApplication.interviews?.length ? (
              <div className="space-y-2">
                {selectedApplication.interviews.map((it) => (
                  <div key={it.interviewId} className="rounded-xl border bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900">{formatDate(it.scheduledAt)}</p>
                    <p className="mt-1 text-xs text-gray-500">{it.location || it.meetingLink || '-'}</p>
                    {it.note ? <p className="mt-2 text-xs text-gray-600">{it.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Chưa có lịch.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={interviewAt}
                onChange={(e) => onInterviewAtChange(e.target.value)}
                className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-emerald-500 md:px-4"
              />
              <input
                value={interviewLocation}
                onChange={(e) => onInterviewLocationChange(e.target.value)}
                placeholder="Địa điểm"
                className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-emerald-500 md:px-4"
              />
            </div>

            <input
              value={interviewLink}
              onChange={(e) => onInterviewLinkChange(e.target.value)}
              placeholder="Meeting link"
              className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-emerald-500 md:px-4"
            />

            <textarea
              value={interviewNote}
              onChange={(e) => onInterviewNoteChange(e.target.value)}
              placeholder="Ghi chú phỏng vấn"
              rows={3}
              className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-emerald-500 md:px-4"
            />

            <button
              onClick={onCreateInterview}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 md:w-auto"
            >
              Tạo lịch phỏng vấn
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
