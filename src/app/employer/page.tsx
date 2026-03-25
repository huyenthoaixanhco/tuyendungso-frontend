import { Suspense } from 'react';
import EmployerPageClient from './EmployerPageClient';

export const dynamic = 'force-dynamic';

export default function EmployerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-sm font-semibold text-gray-500">Đang tải...</div>
        </div>
      }
    >
      <EmployerPageClient />
    </Suspense>
  );
}