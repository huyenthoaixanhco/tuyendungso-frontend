'use client';

import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getStoredAuth } from '@/lib/auth/client';
import { resolveDashboardPath, type Role } from '@/lib/auth/shared';

type AuthGuardProps = {
  allowedRoles: Role[];
  children: React.ReactNode;
};

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const auth = useMemo(() => {
    if (!isClient) {
      return { token: null, role: null as Role };
    }
    return getStoredAuth();
  }, [isClient]);

  const isAuthorized = useMemo(() => {
    if (!isClient) return false;
    if (!auth.token || !auth.role) return false;
    return allowedRoles.includes(auth.role);
  }, [isClient, auth, allowedRoles]);

  useEffect(() => {
    if (!isClient) return;

    if (!auth.token || !auth.role) {
      const query = searchParams?.toString();
      const currentPath = query ? `${pathname}?${query}` : pathname;
      router.replace(`/?redirect=${encodeURIComponent(currentPath || '/')}`);
      return;
    }

    if (!allowedRoles.includes(auth.role)) {
      router.replace(resolveDashboardPath(auth.role));
    }
  }, [isClient, auth, allowedRoles, pathname, router, searchParams]);

  if (!isClient || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-8 py-6 text-center">
          <p className="text-lg font-bold text-gray-900 mb-2">Đang xác thực quyền truy cập...</p>
          <p className="text-sm text-gray-500">Vui lòng chờ một chút.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}