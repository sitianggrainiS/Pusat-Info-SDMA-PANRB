import React, { useState } from 'react';
import { usePolicy } from '../context/PolicyContext';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Info,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion } from 'motion/react';

interface AdminLoginPageProps {
  notice?: string;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ notice }) => {
  const { loginAsAdmin, loginWithGoogle, navigateTo } = usePolicy();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    setAuthError(null);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setGoogleError(res.error || 'Autentikasi Google gagal.');
        return;
      }
      navigateTo({ name: 'admin-dashboard' });
    } catch (err: any) {
      setGoogleError(err?.message || 'Gagal masuk dengan Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setAuthError(null);

    if (!email.trim()) {
      setEmailError('Email wajib diisi.');
      return;
    }

    if (!password) {
      setPasswordError('Password wajib diisi.');
      return;
    }

    setIsEmailLoading(true);
    try {
      const result = await loginAsAdmin(email.trim(), password);
      if (!result.success) {
        if (result.errorType === 'email') {
          setEmailError(result.error || 'Email tidak valid.');
        } else if (result.errorType === 'password') {
          setPasswordError(result.error || 'Password salah.');
        } else {
          setAuthError(result.error || 'Akses administrator ditolak.');
        }
        return;
      }
      navigateTo({ name: 'admin-dashboard' });
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] overflow-hidden">
      {/* Subtle Institutional Grid & Soft Radial Ambient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-institutional-grid opacity-75"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[36rem] h-[24rem] rounded-full bg-[#07529A]/6 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-md w-full space-y-6 bg-white p-7 sm:p-9 rounded-3xl border border-slate-200/90 shadow-[0_20px_48px_-14px_rgba(15,23,42,0.1)] overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#07529A] via-[#5BA7E8] to-[#FFD84D]" />

        {/* Top brand */}
        <div className="text-center space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => navigateTo({ name: 'home' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-600 hover:text-[#07529A] transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Website Publik</span>
          </button>

          <div className="w-13 h-13 rounded-2xl bg-[#07529A] text-white flex items-center justify-center mx-auto shadow-[0_8px_20px_-6px_rgba(7,82,154,0.45)]">
            <Shield className="w-6 h-6 text-[#FFD84D]" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
            Portal Tim Konten SDM Aparatur
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed">
            Akses Terbatas: Hanya akun kedinasan resmi yang terotorisasi yang dapat masuk dan mengelola konten KOMPAK SDMA.
          </p>
        </div>

        {/* Route Guard Notice if redirected */}
        {notice && (
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/90 text-xs text-[#07529A] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#07529A] shrink-0 mt-0.5" />
            <p className="leading-relaxed">{notice}</p>
          </div>
        )}

        {/* Authorization / Firebase Auth Error Banner */}
        {authError && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{authError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                  emailError ? 'text-red-500' : 'text-slate-400'
                }`}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="Masukkan email kedinasan..."
                autoComplete="off"
                className={`w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 rounded-xl border focus:outline-none transition-all ${
                  emailError
                    ? 'border-red-500 bg-red-50/30 text-red-900 focus:border-red-600 focus:ring-4 focus:ring-red-500/10'
                    : 'border-slate-200/95 bg-slate-50/60 focus:bg-white focus:border-[#07529A] focus:ring-4 focus:ring-[#07529A]/10'
                }`}
              />
            </div>
            {emailError && (
              <p className="text-xs font-semibold text-red-600 mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                  passwordError ? 'text-red-500' : 'text-slate-400'
                }`}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Masukkan kata sandi..."
                autoComplete="new-password"
                className={`w-full text-xs sm:text-sm pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none transition-all ${
                  passwordError
                    ? 'border-red-500 bg-red-50/30 text-red-900 focus:border-red-600 focus:ring-4 focus:ring-red-500/10'
                    : 'border-slate-200/95 bg-slate-50/60 focus:bg-white focus:border-[#07529A] focus:ring-4 focus:ring-[#07529A]/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs font-semibold text-red-600 mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
          </div>

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.985 }}
            type="submit"
            disabled={isEmailLoading}
            className="w-full py-3 px-4 bg-[#07529A] hover:bg-[#053d73] text-white text-xs sm:text-sm font-bold rounded-xl shadow-[0_8px_20px_-6px_rgba(7,82,154,0.45)] transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            <KeyRound className="w-4 h-4 text-[#FFD84D]" />
            <span>{isEmailLoading ? 'Memverifikasi Akses...' : 'Masuk ke Portal Admin'}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </form>

        {/* Firebase Authentication Divider & Button */}
        <div className="space-y-3 pt-1">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/80" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                atau masuk dengan
              </span>
            </div>
          </div>

          {googleError && (
            <p className="text-xs font-semibold text-red-600 flex items-center justify-center gap-1.5 p-2 bg-red-50 rounded-xl border border-red-200">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>{googleError}</span>
            </p>
          )}

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-200/90 shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Menghubungkan...' : 'Akun Google (Firebase Auth)'}</span>
          </motion.button>
        </div>

        {/* Security Footer Note */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Sistem Keamanan Kedinasan (RBAC) aktif. Akses terbatas hanya untuk personil resmi Kementerian PANRB.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
