import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_ROLE_COOKIE_KEY,
  canAccessPath,
  parseRole,
  resolveDashboardPath,
} from '@/lib/auth/shared';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const role = parseRole(request.cookies.get(AUTH_ROLE_COOKIE_KEY)?.value ?? null);

  const isProtectedPath =
    pathname.startsWith('/candidate') ||
    pathname.startsWith('/employer') ||
    pathname.startsWith('/admin');

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  if (!role) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/';
    loginUrl.search = '';
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPath(role, pathname)) {
    const fallbackUrl = request.nextUrl.clone();
    fallbackUrl.pathname = resolveDashboardPath(role);
    fallbackUrl.search = '';
    return NextResponse.redirect(fallbackUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/candidate/:path*', '/employer/:path*', '/admin/:path*'],
};