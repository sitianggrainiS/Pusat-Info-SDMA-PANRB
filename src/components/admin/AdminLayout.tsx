import React, { useState } from 'react';
import { usePolicy, AppRoute } from '../../context/PolicyContext';
import { KompakLogo } from '../common/KompakLogo';
import { ROLE_DEFINITIONS } from '../../data/adminUsers';
import {
  LayoutDashboard,
  FileText,
  Tags,
  FileCheck,
  Sparkles,
  LogOut,
  ExternalLink,
  RotateCcw,
  User,
  X,
  Menu,
  Images,
  Building2,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeNav:
    | 'dashboard'
    | 'content'
    | 'hero-slides'
    | 'about-page'
    | 'categories'
    | 'sources'
    | 'ai-assistant';
  title?: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeNav,
}) => {
  const {
    adminUser,
    logoutAdmin,
    navigateTo,
    resetToDemoData,
    isFirebaseVerifiedAdmin,
    firebaseUser,
    loginWithGoogle,
  } = usePolicy();
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isConnectingFirebase, setIsConnectingFirebase] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const perms = adminUser?.permissions;
  const isSuperAdmin = adminUser?.role === 'superadmin' || Boolean(perms?.canManageUsers);

  const navLinks = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      route: { name: 'admin-dashboard' } as AppRoute,
      visible: true,
    },
    {
      id: 'content',
      label: 'Manajemen Konten',
      icon: FileText,
      route: { name: 'admin-content', initialTab: 'instagram' } as AppRoute,
      visible: true,
    },
    {
      id: 'hero-slides',
      label: 'Slide Banner Beranda',
      icon: Images,
      route: { name: 'admin-content', initialTab: 'hero-slides' } as AppRoute,
      visible: isSuperAdmin || Boolean(perms?.canPublishPolicies) || adminUser?.role === 'editor',
    },
    {
      id: 'about-page',
      label: 'Kelola Halaman Tentang',
      icon: Building2,
      route: { name: 'admin-about' } as AppRoute,
      visible: isSuperAdmin || Boolean(perms?.canPublishPolicies),
    },
    {
      id: 'categories',
      label: 'Manajemen Topik',
      icon: Tags,
      route: { name: 'admin-categories' } as AppRoute,
      visible: isSuperAdmin || Boolean(perms?.canEditCategories),
    },
    {
      id: 'sources',
      label: 'Dasar Hukum & Dokumen',
      icon: FileCheck,
      route: { name: 'admin-sources' } as AppRoute,
      visible: isSuperAdmin || Boolean(perms?.canManageSources),
    },
    {
      id: 'ai-assistant',
      label: 'AI Dokumen Asisten',
      icon: Sparkles,
      route: { name: 'admin-ai-assistant' } as AppRoute,
      badge: 'Gemini 4',
      visible: isSuperAdmin || Boolean(perms?.canUseAI),
    },
  ].filter((item) => item.visible);

  const handleSelectNav = (route: AppRoute) => {
    navigateTo(route);
    setMobileSidebarOpen(false);
  };

  const renderSidebarContent = (showCloseButton = false) => (
    <>
      <div>
        {/* Logo brand */}
        <div className="p-5 border-b border-slate-800/90 flex items-start justify-between gap-2">
          <div>
            <KompakLogo variant="light" height={34} />
            <span className="text-[10px] text-slate-400 block mt-2 font-medium">
              Portal Admin Kebijakan SDM Aparatur
            </span>
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="p-3.5 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleSelectNav(item.route)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#07529A] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#FFD84D]' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FFD84D] border border-amber-500/30 shrink-0 ml-2">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800/90 space-y-3">
        {/* Public site link */}
        <button
          type="button"
          onClick={() => handleSelectNav({ name: 'home' })}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700/70 cursor-pointer"
        >
          <span>Lihat Website Publik</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Reset demo data (Super Admin only) */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              setShowResetModal(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-amber-300 text-[11px] transition-colors cursor-pointer rounded-lg hover:bg-slate-800/50"
          >
            <RotateCcw className="w-3 h-3 shrink-0" />
            <span>Reset ke Data Demo Default</span>
          </button>
        )}

        {/* User badge & Logout */}
        <div className="pt-2.5 border-t border-slate-800/90 space-y-2.5">
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0">
                <User className="w-4 h-4 text-[#FFD84D]" />
              </div>
              <div className="truncate min-w-0">
                <p className="font-semibold text-white truncate text-[11px]">
                  {adminUser?.name || 'Administrator'}
                </p>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {adminUser?.email || 'admin@sdm.menpan.go.id'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logoutAdmin}
              className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Keluar dari Portal Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Role indicator */}
          {adminUser?.role && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/60 text-[10px]">
              <span className="text-slate-400">Role Terverifikasi:</span>
              <span className="font-bold text-[#FFD84D] truncate max-w-[125px]">
                {ROLE_DEFINITIONS[adminUser.role]?.name || adminUser.role}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col md:flex-row text-slate-800">
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-68 md:sticky md:top-0 md:h-screen bg-[#0B1528] text-white flex-col justify-between shrink-0 border-r border-slate-800/90 overflow-y-auto custom-scrollbar">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-30 bg-[#0B1528] text-white px-4 h-14 flex items-center justify-between border-b border-slate-800 shadow-sm">
        <button
          type="button"
          onClick={() => navigateTo({ name: 'admin-dashboard' })}
          className="flex items-center gap-2 cursor-pointer"
        >
          <KompakLogo variant="light" height={28} />
        </button>

        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 rounded-xl bg-slate-800/90 text-slate-200 hover:text-white border border-slate-700/80 cursor-pointer"
          aria-label="Buka navigasi admin"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Slide-Over Sidebar Drawer */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0B1528] text-white flex flex-col justify-between border-r border-slate-800 shadow-2xl overflow-y-auto md:hidden"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {adminUser && !isFirebaseVerifiedAdmin && (
          <div className="px-4 sm:px-6 lg:px-8 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {firebaseUser
                  ? `UID (${firebaseUser.uid}) belum terverifikasi sebagai Admin aktif pada koleksi Firestore admins.`
                  : 'Sesi Firebase Authentication belum aktif — silakan masuk kembali agar operasi Tambah, Edit, dan Hapus tersimpan ke Cloud Firestore.'}
              </span>
            </div>
            <button
              type="button"
              disabled={isConnectingFirebase}
              onClick={async () => {
                setIsConnectingFirebase(true);
                const res = await loginWithGoogle();
                setIsConnectingFirebase(false);
                if (res.success) {
                  setSyncNotice({
                    ok: true,
                    text: 'Sesi Firebase Authentication terverifikasi untuk tulis-baca Cloud Firestore.',
                  });
                } else {
                  setSyncNotice({
                    ok: false,
                    text: res.error || 'Gagal memverifikasi akses Firebase Admin.',
                  });
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#07529A] hover:bg-[#053d73] disabled:opacity-60 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isConnectingFirebase ? 'Memverifikasi...' : 'Verifikasi Ulang Firebase Auth'}</span>
            </button>
          </div>
        )}

        {syncNotice && (
          <div
            className={`px-4 sm:px-6 lg:px-8 py-2.5 border-b flex items-center justify-between gap-3 text-xs ${
              syncNotice.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${
                  syncNotice.ok ? 'text-emerald-600' : 'text-rose-600'
                }`}
              />
              <span>{syncNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              className="text-slate-500 hover:text-slate-800 p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <motion.div
          key={activeNav}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="p-4 sm:p-6 lg:p-8 flex-1 min-w-0"
        >
          {children}
        </motion.div>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setShowResetModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl max-w-md w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <RotateCcw className="w-4 h-4 text-[#07529A]" />
                  <h3 className="font-bold text-sm text-slate-900">Reset ke Data Bawaan Demo</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                Tindakan ini akan mengembalikan seluruh data kebijakan, 8 klaster manajemen ASN, pilar konten, dan slide banner ke data bawaan standar proyek. Lanjutkan?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={async () => {
                    setIsResetting(true);
                    try {
                      await resetToDemoData();
                      setShowResetModal(false);
                      setSyncNotice({
                        ok: true,
                        text: 'Data referensi standar dan aset bawaan berhasil dipulihkan ke Cloud Firestore.',
                      });
                    } catch (err: any) {
                      setShowResetModal(false);
                      setSyncNotice({
                        ok: false,
                        text: err?.message || 'Gagal mereset data standar.',
                      });
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isResetting ? 'Menyimpan...' : 'Ya, Reset Data'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
