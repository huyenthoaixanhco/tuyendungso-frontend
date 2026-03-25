'use client';

import React from 'react';
import {
  BadgeCheck,
  CircleOff,
  FileText,
  GraduationCap,
  Briefcase,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';

const DOS = [
  'Đặt tên file CV rõ ràng: CV_HoTen_ViTri.pdf.',
  'Ưu tiên 1 trang với fresher, 1-2 trang với ứng viên có kinh nghiệm.',
  'Dùng số liệu để chứng minh kết quả: %, doanh thu, số user, số chiến dịch.',
  'Điều chỉnh kỹ năng và tóm tắt theo từng JD ứng tuyển.',
  'Đảm bảo link CV/portfolio có quyền truy cập công khai trước khi nộp hồ sơ.',
];

const DONTS = [
  'Không ghi mục tiêu quá chung chung kiểu “mong muốn học hỏi”.',
  'Không chèn quá nhiều icon, màu sắc hoặc ảnh nền làm giảm khả năng đọc.',
  'Không liệt kê toàn bộ kỹ năng từng biết nếu không đủ mạnh.',
  'Không để sai chính tả, format lệch, hoặc email/số điện thoại thiếu chính xác.',
  'Không dùng cùng một CV cho mọi vị trí nếu JD rất khác nhau.',
];

const CHECKLIST = [
  {
    title: 'Thông tin cá nhân',
    icon: FileText,
    items: ['Họ tên', 'Email chuyên nghiệp', 'SĐT', 'Vị trí ứng tuyển', 'Link portfolio/GitHub/LinkedIn nếu có'],
  },
  {
    title: 'Mục tiêu nghề nghiệp',
    icon: Sparkles,
    items: ['2-4 câu', 'Nêu kinh nghiệm chính', 'Nêu thế mạnh', 'Nêu định hướng gần hạn'],
  },
  {
    title: 'Kinh nghiệm làm việc',
    icon: Briefcase,
    items: ['Viết từ mới đến cũ', 'Bullet ngắn gọn', 'Động từ mạnh', 'Có số liệu minh họa'],
  },
  {
    title: 'Học vấn',
    icon: GraduationCap,
    items: ['Trường / ngành', 'Mốc thời gian', 'GPA hoặc thành tích nếu nổi bật'],
  },
  {
    title: 'Checklist trước khi gửi',
    icon: ClipboardCheck,
    items: ['Xuất PDF', 'Soát chính tả', 'Kiểm tra link', 'Đặt tên file chuẩn', 'Đọc lại với JD'],
  },
];

export default function CandidateCvGuide() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-extrabold text-gray-900">Hướng dẫn viết CV hiệu quả</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Dùng phần tạo CV để chỉnh trực tiếp nội dung, sau đó rà lại theo checklist dưới đây trước khi xuất PDF.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
          <div className="mb-4 flex items-center gap-3 text-emerald-800">
            <BadgeCheck size={22} />
            <h4 className="text-xl font-extrabold">Nên làm</h4>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-emerald-900">
            {DOS.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6">
          <div className="mb-4 flex items-center gap-3 text-rose-800">
            <CircleOff size={22} />
            <h4 className="text-xl font-extrabold">Tránh làm</h4>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-rose-900">
            {DONTS.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {CHECKLIST.map((block) => (
          <div key={block.title} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <block.icon size={20} />
              </div>
              <h5 className="text-lg font-extrabold text-gray-900">{block.title}</h5>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {block.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
