'use client';

import React from 'react';

export function statusLabel(status?: string | null) {
  if (!status) return '-';

  const applicationStatusMap: Record<string, string> = {
    APPLIED: 'Đã ứng tuyển',
    IN_REVIEW: 'Đang xem xét',
    SHORTLISTED: 'Đã chọn lọc',
    INTERVIEW_SCHEDULED: 'Đã lên lịch phỏng vấn',
    OFFERED: 'Đã đề nghị nhận việc',
    REJECTED: 'Đã từ chối',
    WITHDRAWN: 'Đã rút hồ sơ',
  };

  return applicationStatusMap[status] || status.replaceAll('_', ' ');
}

export function applicationStatusBadgeClass(status?: string | null) {
  switch (status) {
    case 'APPLIED':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    case 'IN_REVIEW':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'SHORTLISTED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'INTERVIEW_SCHEDULED':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    case 'OFFERED':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'REJECTED':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'WITHDRAWN':
      return 'border-gray-200 bg-gray-100 text-gray-600';
    default:
      return 'border-gray-200 bg-gray-100 text-gray-700';
  }
}

export function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold md:px-3 md:text-xs ${applicationStatusBadgeClass(
        status,
      )}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`relative shrink-0 rounded-full px-1 py-2 md:px-0 md:py-0 ${
        active
          ? 'font-bold text-emerald-600'
          : 'font-semibold text-gray-600 transition-colors hover:text-emerald-600'
      }`}
    >
      <span className="relative">{children}</span>
      {active ? (
        <span className="absolute inset-x-0 -bottom-3 hidden h-0.5 rounded-full bg-emerald-500 md:block" />
      ) : null}
    </a>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 md:mb-5">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-6 text-gray-500 md:text-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function PaginationButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
