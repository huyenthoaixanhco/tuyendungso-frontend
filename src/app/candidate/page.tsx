import { Suspense } from 'react';
import CandidatePageClient from './CandidatePageClient';

export const dynamic = 'force-dynamic';

export default function CandidatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-sm font-semibold text-gray-500">Đang tải...</div>
        </div>
      }
    >
      <CandidatePageClient />
    </Suspense>
  );
}