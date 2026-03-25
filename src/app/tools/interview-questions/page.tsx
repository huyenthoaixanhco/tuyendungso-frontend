import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

export default function InterviewQuestionsPage() {
  return (
    <main className="px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-slate-900 md:text-4xl">Bộ câu hỏi phỏng vấn</h1>
          <p className="mt-3 text-base text-gray-600 md:text-lg">
            Xem bộ câu hỏi phỏng vấn và trắc nghiệm. Bấm vào thẻ bên dưới để mở trang chi tiết.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <a
            href="https://www.topcv.vn/bo-cau-hoi-phong-van-xin-viec"
            target="_blank"
            rel="noreferrer"
            className="group overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="p-5 md:p-6">
              <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50">
                <img
                  src="/images/interview-questions-cover.png"
                  alt="Bộ câu hỏi phỏng vấn"
                  className="h-auto w-full object-cover"
                />
              </div>

              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Bộ câu hỏi phỏng vấn</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600 md:text-base">
                    Bộ câu hỏi kinh nghiệm, thành tựu và các tình huống thường gặp khi phỏng vấn.
                  </p>
                </div>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition group-hover:translate-x-0.5">
                  <ArrowRight size={20} />
                </span>
              </div>
            </div>
          </a>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-black text-slate-900">Cách dùng</h3>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-gray-600 md:text-base">
              <li>1. Xem thẻ câu hỏi minh họa bên trái.</li>
              <li>2. Bấm vào thẻ để mở trang TopCV.</li>
              <li>3. Làm bài hoặc tham khảo câu hỏi trực tiếp.</li>
            </ol>

            <div className="mt-6">
              <a
                href="https://www.topcv.vn/bo-cau-hoi-phong-van-xin-viec"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white transition hover:bg-emerald-600"
              >
                Mở bộ câu hỏi phỏng vấn
                <ExternalLink size={18} />
              </a>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-6">
              <Link href="/tools" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
                ← Quay lại trang công cụ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
