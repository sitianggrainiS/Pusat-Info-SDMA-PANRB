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
  const { loginAsAdmin, loginWithGoogleFirebase, navigateTo } = usePolicy();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setEmailError(null);
    setPasswordError(null);
    setGoogleAuthError(null);
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogleFirebase();
      if (!res.success) {
        setGoogleAuthError(res.error || 'Autentikasi Google gagal.');
        return;
      }
      navigateTo({ name: 'admin-dashboard' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setGoogleAuthError(null);

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
          setEmailError(result.error || 'Email tidak terotorisasi.');
        } else {
          setPasswordError(result.error || 'Autentikasi gagal.');
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
            Akses Terbatas: Hanya akun resmi yang terotorisasi yang dapat masuk dan mengelola database Cloud Firestore.
          </p>
        </div>

        {/* Route Guard Notice if redirected */}
        {notice && (
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/90 text-xs text-[#07529A] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#07529A] shrink-0 mt-0.5" />
            <p className="leading-relaxed">{notice}</p>
          </div>
        )}

        {/* Primary Firebase Google Authentication */}
        <div className="space-y-2.5">
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            disabled={isGoogleLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
            <span>
              {isGoogleLoading
                ? 'Menghubungkan ke Firebase Auth...'
                : 'Masuk dengan Google (Firebase Auth)'}
            </span>
          </motion.button>

          {googleAuthError && (
            <p className="text-xs font-semibold text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
              <span>{googleAuthError}</span>
            </p>
          )}

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200/80" />
            <span className="shrink-0 mx-3 text-[11px] font-medium text-slate-400">
              atau akun kedinasan
            </span>
            <div className="flex-grow border-t border-slate-200/80" />
          </div>
        </div>

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
            disabled={isEmailLoading || isGoogleLoading}
            className="w-full py-3 px-4 bg-[#07529A] hover:bg-[#053d73] text-white text-xs sm:text-sm font-bold rounded-xl shadow-[0_8px_20px_-6px_rgba(7,82,154,0.45)] transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            <KeyRound className="w-4 h-4 text-[#FFD84D]" />
            <span>{isEmailLoading ? 'Memverifikasi di Firebase Auth...' : 'Masuk ke Portal Admin'}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </form>

        {/* Security Footer Note */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Sistem Keamanan Kedinasan (RBAC & Firebase Security Rules) aktif. Akses terbatas hanya untuk personil resmi Kementerian PANRB.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
