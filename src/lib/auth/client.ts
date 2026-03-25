import {
  AUTH_ROLE_COOKIE_KEY,
  AUTH_ROLE_KEY,
  AUTH_TOKEN_COOKIE_KEY,
  AUTH_TOKEN_KEY,
  parseRole,
  type Role,
} from './shared';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const setCookie = (name: string, value: string, maxAge = COOKIE_MAX_AGE_SECONDS) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const found = cookies.find((item) => item.startsWith(`${name}=`));
  if (!found) return null;

  return decodeURIComponent(found.split('=').slice(1).join('='));
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};

export const setStoredAuth = (token: string, role: Exclude<Role, null>) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_ROLE_KEY, role);

  setCookie(AUTH_TOKEN_COOKIE_KEY, token);
  setCookie(AUTH_ROLE_COOKIE_KEY, role);

  window.dispatchEvent(new Event('auth-changed'));
};

export const getStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { token: null as string | null, role: null as Role };
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY) || getCookie(AUTH_TOKEN_COOKIE_KEY);
  const rawRole = localStorage.getItem(AUTH_ROLE_KEY) || getCookie(AUTH_ROLE_COOKIE_KEY);
  const role = parseRole(rawRole);

  return { token, role };
};

export const getAuthHeader = () => {
  const { token } = getStoredAuth();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const logoutClient = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);

  deleteCookie(AUTH_TOKEN_COOKIE_KEY);
  deleteCookie(AUTH_ROLE_COOKIE_KEY);

  window.dispatchEvent(new Event('auth-changed'));
};