export type Role = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN' | null;

export const AUTH_TOKEN_KEY = 'token';
export const AUTH_ROLE_KEY = 'role';

export const AUTH_TOKEN_COOKIE_KEY = 'tds_token';
export const AUTH_ROLE_COOKIE_KEY = 'tds_role';

export const parseRole = (value: string | null): Role => {
  if (value === 'CANDIDATE' || value === 'EMPLOYER' || value === 'ADMIN') {
    return value;
  }
  return null;
};

export const resolveDashboardPath = (role: Role): string => {
  if (role === 'EMPLOYER') return '/employer';
  if (role === 'ADMIN') return '/admin';
  return '/candidate';
};

export const canAccessPath = (role: Role, pathname: string): boolean => {
  if (!role) return false;

  if (pathname.startsWith('/candidate')) {
    return role === 'CANDIDATE';
  }

  if (pathname.startsWith('/employer')) {
    return role === 'EMPLOYER';
  }

  if (pathname.startsWith('/admin')) {
    return role === 'ADMIN';
  }

  return true;
};

export const resolvePostLoginPath = (role: Role, redirect: string | null): string => {
  if (redirect && redirect.startsWith('/') && canAccessPath(role, redirect)) {
    return redirect;
  }
  return resolveDashboardPath(role);
};