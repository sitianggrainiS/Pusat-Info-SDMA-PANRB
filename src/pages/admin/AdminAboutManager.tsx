import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save,
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertCircle,
  Landmark,
  RotateCcw,
  Plus,
  X,
  ChevronDown,
  Image as ImageIcon,
  FileText,
  Briefcase,
  Link as LinkIcon,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { usePolicy } from '../../context/PolicyContext';
import { STORAGE_DISABLED_NOTICE } from '../../lib/storageService';
import { AboutPageContent, AboutUnitWork } from '../../types';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTimeId(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AdminAboutManager: React.FC = () => {
  const {
    aboutPage,
    isAboutPageLoading,
    aboutPageError,
    isStorageEnabled,
    refreshAboutPage,
    uploadAboutProfileImage,
    saveAboutPage,
    deleteAboutProfileImage,
    resetAboutPageContent,
    navigateTo,
  } = usePolicy();

  // Form state synchronized with backend content
  const [formState, setFormState] = useState<AboutPageContent>(aboutPage);
  const [hasUnsavedTextChanges, setHasUnsavedTextChanges] = useState(false);

  // Staged file upload state (previewed locally via ObjectURL, persisted to disk on Save)
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // UI & Async states
  const [activeUnitIndex, setActiveUnitIndex] = useState<number | null>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Confirmation Modals
  const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [keepImageOnReset, setKeepImageOnReset] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync formState when backend data loads (only if admin doesn't have unsaved edits)
  useEffect(() => {
    if (!hasUnsavedTextChanges) {
      setFormState(aboutPage);
    }
  }, [aboutPage, hasUnsavedTextChanges]);

  // Manage local ObjectURL lifecycle cleanly
  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pendingFile]);

  // Auto-hide toast notification
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const validateAndStageFile = (file: File) => {
    setErrorMessage(null);
    if (!isStorageEnabled) {
      setErrorMessage(STORAGE_DISABLED_NOTICE);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());

    if (!hasValidExt || !hasValidMime) {
      setErrorMessage(
        'Format file tidak valid. Harap pilih file gambar berformat JPG, JPEG, PNG, atau WebP.'
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `Ukuran file (${formatBytes(file.size)}) melebihi batas maksimal 5 MB. Silakan gunakan gambar dengan ukuran lebih kecil.`
      );
      return;
    }

    setPendingFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndStageFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndStageFile(file);
    }
  };

  const updateTopField = <K extends keyof AboutPageContent>(
    key: K,
    value: AboutPageContent[K]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedTextChanges(true);
  };

  const updateUnitField = (
    unitIdx: number,
    updates: Partial<AboutUnitWork>
  ) => {
    setFormState((prev) => {
      const nextUnits = prev.units.map((u, idx) =>
        idx === unitIdx ? { ...u, ...updates } : u
      );
      return { ...prev, units: nextUnits };
    });
    setHasUnsavedTextChanges(true);
  };

  const updateUnitDetailedTask = (unitIdx: number, taskIdx: number, value: string) => {
    setFormState((prev) => {
      const nextUnits = prev.units.map((u, idx) => {
        if (idx !== unitIdx) return u;
        const nextTasks = u.detailedTasks.map((t, i) => (i === taskIdx ? value : t));
        return { ...u, detailedTasks: nextTasks };
      });
      return { ...prev, units: nextUnits };
    });
    setHasUnsavedTextChanges(true);
  };

  const addUnitDetailedTask = (unitIdx: number) => {
    setFormState((prev) => {
      const nextUnits = prev.units.map((u, idx) => {
        if (idx !== unitIdx) return u;
        return { ...u, detailedTasks: [...u.detailedTasks, ''] };
      });
      return { ...prev, units: nextUnits };
    });
    setHasUnsavedTextChanges(true);
  };

  const removeUnitDetailedTask = (unitIdx: number, taskIdx: number) => {
    setFormState((prev) => {
      const nextUnits = prev.units.map((u, idx) => {
        if (idx !== unitIdx) return u;
        if (u.detailedTasks.length <= 1) return u;
        return {
          ...u,
          detailedTasks: u.detailedTasks.filter((_, i) => i !== taskIdx),
        };
      });
      return { ...prev, units: nextUnits };
    });
    setHasUnsavedTextChanges(true);
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!formState.heading.trim()) {
      setErrorMessage('Judul utama (Heading) Halaman Tentang tidak boleh kosong.');
      return;
    }
    if (!formState.subheading.trim()) {
      setErrorMessage('Subheading Halaman Tentang tidak boleh kosong.');
      return;
    }
    if (formState.description.trim().length < 20) {
      setErrorMessage('Deskripsi profil Kedeputian SDMA minimal harus terdiri dari 20 karakter.');
      return;
    }

    try {
      setIsSaving(true);
      let finalImageUrl = formState.profileImageUrl.trim();

      if (finalImageUrl.startsWith('data:') || finalImageUrl.startsWith('blob:')) {
        throw new Error(STORAGE_DISABLED_NOTICE);
      }

      // 1. If admin staged a new image file (only when Firebase Storage is enabled), upload first
      if (pendingFile) {
        finalImageUrl = await uploadAboutProfileImage(pendingFile);
      }

      // 2. Persist full Halaman Tentang content + URL metadata to Cloud Firestore
      const payload: AboutPageContent = {
        ...formState,
        profileImageUrl: finalImageUrl,
        units: formState.units.map((u) => ({
          ...u,
          detailedTasks: u.detailedTasks.map((t) => t.trim()).filter(Boolean),
        })),
      };

      const saved = await saveAboutPage(payload);
      setFormState(saved);
      setPendingFile(null);
      setHasUnsavedTextChanges(false);
      showToast('Perubahan Halaman Tentang berhasil disimpan dan dipublikasikan.');
    } catch (err: any) {
      console.error('Failed saving About page:', err);
      setErrorMessage(err?.message || 'Gagal menyimpan perubahan ke server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteImage = async () => {
    setErrorMessage(null);
    try {
      setIsDeletingImage(true);
      const updated = await deleteAboutProfileImage();
      setPendingFile(null);
      setFormState((prev) => ({
        ...prev,
        profileImageUrl: updated.profileImageUrl,
        profileImageUpdatedAt: updated.profileImageUpdatedAt,
      }));
      setShowDeleteImageModal(false);
      showToast('Gambar profil berhasil dihapus. Halaman Tentang kini menampilkan placeholder resmi.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menghapus gambar profil.');
      setShowDeleteImageModal(false);
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleConfirmResetContent = async () => {
    setErrorMessage(null);
    try {
      setIsResetting(true);
      const resetData = await resetAboutPageContent(keepImageOnReset);
      setFormState(resetData);
      if (!keepImageOnReset) {
        setPendingFile(null);
      }
      setHasUnsavedTextChanges(false);
      setShowResetModal(false);
      showToast('Konten Halaman Tentang dikembalikan ke teks resmi standar.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mereset konten Halaman Tentang.');
      setShowResetModal(false);
    } finally {
      setIsResetting(false);
    }
  };

  const hasUnsavedAnything = hasUnsavedTextChanges || Boolean(pendingFile);
  const activeDisplayImageUrl = pendingPreviewUrl || formState.profileImageUrl || aboutPage.profileImageUrl;
  const isPublishedImageActive = Boolean(aboutPage.profileImageUrl) && !pendingPreviewUrl;

  return (
    <AdminLayout activeNav="about-page">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Floating Success Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-5 right-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs font-semibold"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white ml-1 cursor-pointer"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSaveAll} className="max-w-6xl space-y-6 lg:space-y-8">
        {/* Error Banner */}
        {(errorMessage || aboutPageError) && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3.5 flex items-start justify-between gap-3 text-xs text-rose-800">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Terjadi Kendala</p>
                <p className="leading-relaxed">{errorMessage || aboutPageError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {aboutPageError && (
                <button
                  type="button"
                  onClick={() => refreshAboutPage()}
                  className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  Muat Ulang
                </button>
              )}
              {errorMessage && (
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="p-1 rounded-lg hover:bg-rose-100 text-rose-500 cursor-pointer"
                  aria-label="Tutup pesan kesalahan"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Unsaved Changes Banner */}
        {hasUnsavedAnything && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Anda memiliki perubahan yang belum disimpan
                {pendingFile ? ` (termasuk gambar baru "${pendingFile.name}")` : ''}. Klik{' '}
                <strong>Simpan Perubahan</strong> untuk mempublikasikan ke Halaman Tentang.
              </span>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl bg-[#07529A] hover:bg-[#053d73] text-white font-bold cursor-pointer transition-colors"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Sekarang'}
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isAboutPageLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-3 text-xs font-semibold text-slate-600">
            <RefreshCw className="w-4 h-4 text-[#07529A] animate-spin" />
            <span>Memuat data terbaru Halaman Tentang dari server...</span>
          </div>
        )}

        {/* ===================================================================
            PANEL 1: KELOLA GAMBAR PROFIL KEDEPUTIAN SDMA (PERSISTENT UPLOAD)
           =================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#07529A] flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Gambar Profil Kedeputian SDMA (Section 1)
                </h2>
                <p className="text-xs text-slate-500">
                  Gambar ini ditampilkan secara dinamis pada kolom kanan atas Halaman Tentang pengunjung.
                </p>
              </div>
            </div>

            {/* Published Image Status Indicator */}
            <div className="flex items-center gap-2">
              {pendingFile ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>Menunggu Disimpan</span>
                </span>
              ) : aboutPage.profileImageUrl ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gambar Terpublikasi</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">
                  <Landmark className="w-3.5 h-3.5 text-slate-500" />
                  <span>Belum Ada Gambar (Placeholder Aktif)</span>
                </span>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Live Image / Placeholder Preview */}
            <div className="lg:col-span-6 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  {pendingPreviewUrl
                    ? 'Pratinjau Gambar Baru (Belum Disimpan)'
                    : isPublishedImageActive
                    ? 'Gambar yang Sedang Dipublikasikan'
                    : 'Tampilan Placeholder Saat Ini'}
                </span>
                {aboutPage.profileImageUpdatedAt && !pendingPreviewUrl && (
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    Diperbarui: {formatDateTimeId(aboutPage.profileImageUpdatedAt)}
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-100">
                  {activeDisplayImageUrl ? (
                    <img
                      src={activeDisplayImageUrl}
                      alt="Pratinjau Gambar Profil Kedeputian SDMA"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#07529A] via-[#09437D] to-[#0B192E] p-6 flex flex-col justify-between text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFD84D]">
                          Placeholder Resmi Aktif
                        </span>
                        <Landmark className="w-5 h-5 text-[#FFD84D]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-extrabold">{formState.subheading}</p>
                        <p className="text-[11px] text-blue-100/80">
                          Pengunjung melihat visual placeholder ini hingga Anda mengunggah dan menyimpan foto profil.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Upload Dropzone & Actions */}
            <div className="lg:col-span-6 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDropFile}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                  isDraggingOver
                    ? 'border-[#07529A] bg-blue-50/60'
                    : 'border-slate-300 hover:border-[#07529A]/60 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-[#07529A] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  {aboutPage.profileImageUrl || pendingFile
                    ? 'Klik atau tarik file ke sini untuk mengganti gambar'
                    : 'Klik atau tarik file ke sini untuk mengunggah gambar profil'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Format didukung: <strong>JPG, JPEG, PNG, WebP</strong> · Maksimal <strong>5 MB</strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Rasio proporsional yang disarankan: 4:3 atau 16:10 (lanskap)
                </p>
              </div>

              {!isStorageEnabled && (
                <div className="rounded-xl bg-amber-50/90 border border-amber-200 px-3.5 py-2.5 text-[11px] text-amber-900 leading-relaxed">
                  <strong>Mode Spark Plan (Gratis):</strong> Unggah file gambar langsung dinonaktifkan (
                  <code className="font-mono">VITE_ENABLE_FIREBASE_STORAGE=false</code>) agar tidak memicu layanan berbayar. Gunakan kolom <strong>URL Gambar Eksternal</strong> di bawah untuk menyimpan tautan gambar sebagai metadata di Cloud Firestore.
                </div>
              )}

              {/* External Image URL Metadata Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  URL Gambar Profil Eksternal (Metadata Cloud Firestore)
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={formState.profileImageUrl}
                    onChange={(e) => updateTopField('profileImageUrl', e.target.value)}
                    placeholder="https://www.menpan.go.id/... (kosongkan untuk memakai placeholder resmi)"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none"
                  />
                </div>
              </div>

              {/* Staged File Details (only active when VITE_ENABLE_FIREBASE_STORAGE=true) */}
              {pendingFile && isStorageEnabled && (
                <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{pendingFile.name}</p>
                    <p className="text-[11px] text-slate-600 font-mono tabular-nums">
                      {formatBytes(pendingFile.size)} · Akan diunggah ke Firebase Storage saat klik Simpan Perubahan
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingFile(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold shrink-0 cursor-pointer"
                  >
                    Batalkan Pilihan
                  </button>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {isStorageEnabled && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {aboutPage.profileImageUrl || pendingFile ? 'Ganti File Gambar' : 'Unggah File Gambar'}
                    </span>
                  </button>
                )}

                {pendingFile && (
                  <button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-[#FFD84D]" />
                    )}
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan & Publikasikan Gambar'}</span>
                  </button>
                )}

                {aboutPage.profileImageUrl && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteImageModal(true)}
                    disabled={isDeletingImage}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Gambar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            PANEL 2: PROFIL KEDEPUTIAN & JUDUL SEKSI
           =================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#07529A] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Teks Profil Kedeputian & Judul Seksi
              </h2>
              <p className="text-xs text-slate-500">
                Sesuaikan judul, subjudul, dan narasi pengantar pada Halaman Tentang.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Heading Utama (Section 1)
                </label>
                <input
                  type="text"
                  value={formState.heading}
                  onChange={(e) => updateTopField('heading', e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Subheading (Section 1)
                </label>
                <input
                  type="text"
                  value={formState.subheading}
                  onChange={(e) => updateTopField('subheading', e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Deskripsi Profil Kedeputian SDMA
              </label>
              <textarea
                rows={4}
                value={formState.description}
                onChange={(e) => updateTopField('description', e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Judul Seksi Struktur Organisasi (Section 2)
                </label>
                <input
                  type="text"
                  value={formState.orgSectionTitle}
                  onChange={(e) => updateTopField('orgSectionTitle', e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Nama Pucuk Pimpinan Level 1 (Bagan Organisasi)
                </label>
                <input
                  type="text"
                  value={formState.orgTopLevelTitle}
                  onChange={(e) => updateTopField('orgTopLevelTitle', e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Judul Seksi Tugas Unit Kerja (Section 3)
                </label>
                <input
                  type="text"
                  value={formState.unitSectionTitle}
                  onChange={(e) => updateTopField('unitSectionTitle', e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Subjudul Seksi Tugas Unit Kerja (Section 3)
                </label>
                <input
                  type="text"
                  value={formState.unitSectionSubtitle}
                  onChange={(e) => updateTopField('unitSectionSubtitle', e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            PANEL 3: TUGAS DAN FUNGSI 6 UNIT KERJA
           =================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#07529A] flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Daftar Tugas dan Fungsi Unit Kerja (6 Unit Level 2)
                </h2>
                <p className="text-xs text-slate-500">
                  Klik salah satu unit kerja untuk menyunting deskripsi utama, rincian tugas, atau catatan sub-unit.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {formState.units.map((unit, unitIdx) => {
              const isOpen = activeUnitIndex === unitIdx;
              return (
                <div key={unit.id} className="bg-white">
                  <button
                    type="button"
                    onClick={() => setActiveUnitIndex(isOpen ? null : unitIdx)}
                    aria-expanded={isOpen}
                    className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-[#07529A] bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 tabular-nums shrink-0">
                        0{unitIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {unit.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {unit.detailedTasks.length} butir rincian tugas
                          {unit.subUnit ? ` · Sub-unit: ${unit.subUnit.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-800">
                            Nama Unit pada Kartu Tugas
                          </label>
                          <input
                            type="text"
                            value={unit.name}
                            onChange={(e) =>
                              updateUnitField(unitIdx, { name: e.target.value })
                            }
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#07529A] focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-800">
                            Nama Lengkap pada Bagan Struktur Organisasi
                          </label>
                          <input
                            type="text"
                            value={unit.orgChartLabel}
                            onChange={(e) =>
                              updateUnitField(unitIdx, { orgChartLabel: e.target.value })
                            }
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#07529A] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800">
                          Deskripsi Tugas Utama
                        </label>
                        <textarea
                          rows={3}
                          value={unit.mainTask}
                          onChange={(e) =>
                            updateUnitField(unitIdx, { mainTask: e.target.value })
                          }
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#07529A] focus:outline-none leading-relaxed"
                        />
                      </div>

                      {/* Detailed Tasks List */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">
                            Rincian Tugas ({unit.detailedTasks.length} Butir)
                          </label>
                          <button
                            type="button"
                            onClick={() => addUnitDetailedTask(unitIdx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-[#07529A] border border-slate-200 text-[11px] font-bold cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah Butir</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {unit.detailedTasks.map((task, taskIdx) => (
                            <div key={taskIdx} className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-slate-400 w-6 text-right shrink-0 tabular-nums">
                                {taskIdx + 1}.
                              </span>
                              <input
                                type="text"
                                value={task}
                                onChange={(e) =>
                                  updateUnitDetailedTask(unitIdx, taskIdx, e.target.value)
                                }
                                placeholder="Tulis butir rincian tugas..."
                                className="flex-1 text-xs px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#07529A] focus:outline-none"
                              />
                              <button
                                type="button"
                                disabled={unit.detailedTasks.length <= 1}
                                onClick={() => removeUnitDetailedTask(unitIdx, taskIdx)}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                title="Hapus butir tugas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sub-unit Editor (for Sekretariat Deputi) */}
                      {unit.subUnit && (
                        <div className="pt-3 border-t border-slate-200/80 space-y-3">
                          <p className="text-xs font-bold text-[#07529A]">
                            Pengaturan Sub-unit di Bawah {unit.name}
                          </p>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-800">
                              Nama Sub-unit
                            </label>
                            <input
                              type="text"
                              value={unit.subUnit.name}
                              onChange={(e) =>
                                updateUnitField(unitIdx, {
                                  subUnit: {
                                    name: e.target.value,
                                    description: unit.subUnit?.description || '',
                                  },
                                })
                              }
                              className="w-full text-xs px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#07529A] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-800">
                              Deskripsi Tugas Sub-unit
                            </label>
                            <textarea
                              rows={2}
                              value={unit.subUnit.description}
                              onChange={(e) =>
                                updateUnitField(unitIdx, {
                                  subUnit: {
                                    name: unit.subUnit?.name || '',
                                    description: e.target.value,
                                  },
                                })
                              }
                              className="w-full text-xs px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#07529A] focus:outline-none leading-relaxed"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Save Footer */}
          <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              Pembaruan terakhir: {formatDateTimeId(aboutPage.updatedAt)}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo({ name: 'about' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 text-xs font-bold transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5 text-[#07529A] shrink-0" />
                <span>Lihat Halaman Publik</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/90 text-xs font-semibold transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Reset Teks Default</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#07529A] hover:bg-[#053d73] disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-[#FFD84D]" />
                )}
                <span>{isSaving ? 'Menyimpan Perubahan...' : 'Simpan Seluruh Perubahan'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Image Confirmation Modal */}
      <AnimatePresence>
        {showDeleteImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteImageModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-md w-full space-y-4"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Hapus Gambar Profil Kedeputian SDMA?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                File gambar yang saat ini terpublikasi akan dihapus secara permanen dari server, dan Halaman Tentang akan kembali menampilkan visual placeholder resmi.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteImageModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteImage}
                  disabled={isDeletingImage}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
                >
                  {isDeletingImage ? 'Menghapus...' : 'Ya, Hapus Gambar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Default Content Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResetModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-md w-full space-y-4"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Kembalikan Konten Teks ke Standar Resmi?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seluruh judul, deskripsi profil, dan rincian tugas 6 unit kerja pada Halaman Tentang akan dikembalikan ke teks resmi standar Kedeputian SDMA.
              </p>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepImageOnReset}
                  onChange={(e) => setKeepImageOnReset(e.target.checked)}
                  className="rounded text-[#07529A] focus:ring-[#07529A]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Pertahankan gambar profil yang sedang terpublikasi
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetContent}
                  disabled={isResetting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#07529A] hover:bg-[#053d73] rounded-xl cursor-pointer"
                >
                  {isResetting ? 'Mereset...' : 'Ya, Reset Konten'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};
