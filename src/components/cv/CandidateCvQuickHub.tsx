'use client';

import React from 'react';
import type { CandidateProfileResponse } from '@/lib/api/candidate';
import { ExternalLink, FileCheck2, Link2, Sparkles, UserCircle2 } from 'lucide-react';

export default function CandidateCvQuickHub({
  profile,
  onOpenBuilder,
  onOpenProfile,
}: {
  profile: CandidateProfileResponse;
  onOpenBuilder: () => void;
  onOpenProfile: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-extrabold text-gray-900">CV & liên kết nghề nghiệp</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Phần này dùng để kiểm tra nhanh link CV chính, link portfolio và chuyển sang builder để tạo CV PDF trực tiếp.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-emerald-700">
            <FileCheck2 size={22} />
            <h4 className="text-lg font-extrabold text-gray-900">CV builder</h4>
          </div>
          <p className="mb-4 text-sm leading-6 text-gray-500">
            Tạo CV mới từ hồ sơ hiện tại, đổi template, chỉnh font, màu, bố cục và xuất PDF.
          </p>
          <button
            onClick={onOpenBuilder}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Sparkles size={16} className="mr-2 inline" /> Mở trình tạo CV
          </button>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-blue-700">
            <Link2 size={22} />
            <h4 className="text-lg font-extrabold text-gray-900">Link CV / portfolio</h4>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <div className="font-bold text-gray-900">Resume URL</div>
              <div className="break-all">{profile.resumeUrl || 'Chưa cập nhật'}</div>
            </div>
            <div>
              <div className="font-bold text-gray-900">Portfolio / LinkedIn / GitHub</div>
              <div className="break-all">{profile.portfolioUrl || 'Chưa cập nhật'}</div>
            </div>
          </div>
          <button
            onClick={onOpenProfile}
            className="mt-4 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700"
          >
            <UserCircle2 size={16} className="mr-2 inline" /> Cập nhật trong hồ sơ
          </button>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-amber-700">
            <ExternalLink size={22} />
            <h4 className="text-lg font-extrabold text-amber-900">Lưu ý trước khi ứng tuyển</h4>
          </div>
          <ul className="space-y-2 text-sm leading-6 text-amber-900">
            <li>- Link CV cần mở công khai hoặc tải được không cần đăng nhập.</li>
            <li>- Đặt tên file CV theo vị trí ứng tuyển để chuyên nghiệp hơn.</li>
            <li>- Kiểm tra số điện thoại, email, link portfolio trước khi nộp.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
