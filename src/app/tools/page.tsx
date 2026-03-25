import Link from 'next/link';
import { FileText, ReceiptText, WalletCards, ArrowRight } from 'lucide-react';

const tools = [
  {
    title: 'Bộ câu hỏi phỏng vấn',
    description: 'Trang chứa hình minh họa và nút mở bộ câu hỏi TopCV.',
    href: '/tools/interview-questions',
    icon: FileText,
  },
  {
    title: 'Tính thuế thu nhập',
    description: 'Công cụ tính thuế thu nhập cá nhân đơn giản và dễ dùng.',
    href: '/tools/personal-income-tax',
    icon: ReceiptText,
  },
  {
    title: 'Tra cứu lương',
    description: 'Xem nhanh mặt bằng lương theo vị trí và địa điểm.',
    href: '/tools/salary-lookup',
    icon: WalletCards,
  },
] as const;

export default function ToolsPage() {
  return (
    <main className="px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-slate-900 md:text-4xl">Công cụ</h1>
          <p className="mt-3 text-base text-gray-600 md:text-lg">
            Chọn một trong ba công cụ bên dưới để hỗ trợ quá trình tìm việc và phát triển nghề nghiệp.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Icon size={28} />
                </div>
                <h2 className="mt-5 text-xl font-black text-slate-900">{tool.title}</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">{tool.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-600">
                  Mở công cụ
                  <ArrowRight size={18} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
