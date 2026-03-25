'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  UserSearch,
  Briefcase,
  Mail,
  ShieldCheck,
  Loader2,
  LockKeyhole,
} from 'lucide-react';
import { resolvePostLoginPath, type Role } from '@/lib/auth/shared';
import { setStoredAuth } from '@/lib/auth/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: 'login' | 'register';
}

type ModalView =
  | 'login'
  | 'register'
  | 'forgot-password-request'
  | 'forgot-password-reset';

type ApiData = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: string;
  token?: string;
  role?: 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';
  fieldErrors?: Record<string, string>;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8080';

export default function LoginModal({
  isOpen,
  onClose,
  defaultView = 'register',
}: LoginModalProps) {
  const router = useRouter();

  const [view, setView] = useState<ModalView>(defaultView);
  const [role, setRole] = useState<Exclude<Role, null>>('CANDIDATE');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    otpCode: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  useEffect(() => {
    if (isOpen) {
      setView(defaultView);
    }
  }, [defaultView, isOpen]);

  if (!isOpen) return null;

  const normalizedEmail = () => formData.email.trim().toLowerCase();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const safeJson = async (response: Response): Promise<ApiData | null> => {
    try {
      return (await response.json()) as ApiData;
    } catch {
      return null;
    }
  };

  const showApiError = (data: ApiData | null, fallback: string) => {
    const fieldError =
      data?.fieldErrors && Object.values(data.fieldErrors).length > 0
        ? Object.values(data.fieldErrors)[0]
        : null;

    const msg = fieldError || data?.error || data?.message || data?.details || fallback;
    alert(msg);
  };

  const switchToRegister = () => {
    if (role === 'ADMIN') {
      setRole('CANDIDATE');
    }
    setView('register');
  };

  const handleSendOtp = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !normalizedEmail() || !formData.password) {
      return alert('Vui lòng nhập đầy đủ Họ, Tên, Email và Mật khẩu trước khi gửi OTP!');
    }

    if (formData.password !== formData.confirmPassword) {
      return alert('Mật khẩu nhập lại không khớp!');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: normalizedEmail(),
          password: formData.password,
          role,
        }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        alert('Mã OTP đã được gửi đến email của bạn!, Nếu không thấy trong hộp thư hãy kiểm tra trong mục thư rác xin cảm ơn!');
      } else {
        showApiError(data, 'Không thể gửi OTP');
      }
    } catch {
      alert('Lỗi kết nối!');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.otpCode.trim()) {
      return alert('Vui lòng nhập mã OTP!');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail(),
          otpCode: formData.otpCode.trim(),
        }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        alert('Xác thực thành công! Mời bạn đăng nhập.');
        setView('login');
        setFormData((prev) => ({ ...prev, otpCode: '' }));
      } else {
        showApiError(data, 'Xác thực OTP thất bại');
      }
    } catch {
      alert('Lỗi kết nối!');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      return alert('Vui lòng nhập email và mật khẩu!');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail(),
          password: formData.password,
          role,
        }),
      });

      const data = await safeJson(response);

      if (response.ok && data?.token && data?.role) {
        setStoredAuth(data.token, data.role);

        const redirectParam =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('redirect')
            : null;

        const targetPath = resolvePostLoginPath(data.role, redirectParam);

        onClose();
        router.replace(targetPath);
        router.refresh();
      } else {
        showApiError(data, 'Đăng nhập thất bại');
      }
    } catch {
      alert('Lỗi kết nối!');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!normalizedEmail()) {
      return alert('Vui lòng nhập email!');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail() }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        alert(data?.message || 'Nếu email tồn tại, mã OTP đặt lại mật khẩu đã được gửi.');
        setView('forgot-password-reset');
      } else {
        showApiError(data, 'Không thể gửi OTP đặt lại mật khẩu');
      }
    } catch {
      alert('Lỗi kết nối!');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.otpCode.trim()) {
      return alert('Vui lòng nhập OTP!');
    }

    if (!formData.newPassword.trim()) {
      return alert('Vui lòng nhập mật khẩu mới!');
    }

    if (formData.newPassword !== formData.confirmNewPassword) {
      return alert('Mật khẩu mới nhập lại không khớp!');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail(),
          otpCode: formData.otpCode.trim(),
          newPassword: formData.newPassword,
        }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        alert('Đặt lại mật khẩu thành công! Mời bạn đăng nhập.');
        setView('login');
        setFormData((prev) => ({
          ...prev,
          otpCode: '',
          newPassword: '',
          confirmNewPassword: '',
          password: '',
          confirmPassword: '',
        }));
      } else {
        showApiError(data, 'Đặt lại mật khẩu thất bại');
      }
    } catch {
      alert('Lỗi kết nối!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-[550px] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors"
          aria-label="Đóng"
          type="button"
        >
          <X size={22} />
        </button>

        {view === 'register' && (
          <>
            <div className="text-center mb-4 mt-1">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Tham gia Cộng đồng</h2>
              <p className="text-gray-500 text-sm">Tạo tài khoản để kết nối với cơ hội tốt nhất.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setRole('CANDIDATE')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  role === 'CANDIDATE'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-100 text-gray-500 hover:border-emerald-200'
                }`}
              >
                <UserSearch size={18} /> <span className="font-bold text-sm">Ứng viên</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('EMPLOYER')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  role === 'EMPLOYER'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-100 text-gray-500 hover:border-emerald-200'
                }`}
              >
                <Briefcase size={18} /> <span className="font-bold text-sm">Nhà tuyển dụng</span>
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Họ"
                  className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Tên"
                  className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Mật khẩu"
                  className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Nhập lại"
                  className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ShieldCheck className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="text"
                    name="otpCode"
                    value={formData.otpCode}
                    onChange={handleInputChange}
                    placeholder="Nhập OTP"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    maxLength={6}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="bg-emerald-50 text-emerald-600 text-sm font-bold px-4 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-100 flex items-center gap-2 disabled:opacity-60"
                >
                  {loading && <Loader2 className="animate-spin" size={14} />} Gửi mã
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-sm flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="animate-spin" size={18} />} Tạo tài khoản
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-4">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-emerald-600 font-bold hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          </>
        )}

        {view === 'login' && (
          <>
            <div className="text-center mb-6 mt-2">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Chào mừng trở lại</h2>
              <p className="text-gray-500 text-sm">Vui lòng đăng nhập để tiếp tục</p>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg mb-5">
              <button
                type="button"
                onClick={() => setRole('CANDIDATE')}
                className={`py-2 text-sm font-bold rounded-md transition-all ${
                  role === 'CANDIDATE' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'
                }`}
              >
                Ứng viên
              </button>
              <button
                type="button"
                onClick={() => setRole('EMPLOYER')}
                className={`py-2 text-sm font-bold rounded-md transition-all ${
                  role === 'EMPLOYER' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'
                }`}
              >
                Nhà tuyển dụng
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`py-2 text-sm font-bold rounded-md transition-all ${
                  role === 'ADMIN' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'
                }`}
              >
                Admin
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mật khẩu"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView('forgot-password-request')}
                  className="text-sm text-emerald-600 font-semibold hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-sm flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="animate-spin" size={18} />} Đăng nhập
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-5">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={switchToRegister}
                className="text-emerald-600 font-bold hover:underline"
              >
                Tạo ngay
              </button>
            </p>
          </>
        )}

        {view === 'forgot-password-request' && (
          <>
            <div className="text-center mb-6 mt-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <LockKeyhole size={22} />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Quên mật khẩu</h2>
              <p className="text-gray-500 text-sm">
                Nhập email để nhận OTP đặt lại mật khẩu.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-sm flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="animate-spin" size={18} />} Gửi OTP
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-5">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-emerald-600 font-bold hover:underline"
              >
                Quay lại đăng nhập
              </button>
            </p>
          </>
        )}

        {view === 'forgot-password-reset' && (
          <>
            <div className="text-center mb-6 mt-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={22} />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Đặt lại mật khẩu</h2>
              <p className="text-gray-500 text-sm">
                Nhập OTP và mật khẩu mới cho tài khoản của bạn.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              <input
                type="text"
                name="otpCode"
                required
                value={formData.otpCode}
                onChange={handleInputChange}
                placeholder="OTP"
                maxLength={6}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              <input
                type="password"
                name="newPassword"
                required
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Mật khẩu mới"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              <input
                type="password"
                name="confirmNewPassword"
                required
                value={formData.confirmNewPassword}
                onChange={handleInputChange}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-sm flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="animate-spin" size={18} />} Đặt lại mật khẩu
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-5">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-emerald-600 font-bold hover:underline"
              >
                Quay lại đăng nhập
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}