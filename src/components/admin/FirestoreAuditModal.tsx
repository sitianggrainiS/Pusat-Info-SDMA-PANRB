import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Play,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { usePolicy } from '../../context/PolicyContext';
import {
  ConnectionStabilityReport,
  FirestoreAuditReport,
  FirestoreDocumentCounts,
  SafeReadWriteTestResult,
} from '../../lib/firestoreService';

interface FirestoreAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirestoreAuditModal: React.FC<FirestoreAuditModalProps> = ({ isOpen, onClose }) => {
  const {
    firebaseProjectId,
    firestoreDatabaseId,
    provisionedDatabaseId,
    isStorageEnabled,
    isFirebaseAuthConnected,
    lastKnownCounts,
    retryFirestoreConnection,
    loginWithGoogleFirebase,
    auditFirestoreConnection,
    verifyConnectionStability,
    executeSafeReadWriteTest,
    seedInitialDataManually,
  } = usePolicy();

  const [auditReport, setAuditReport] = useState<FirestoreAuditReport | null>(null);
  const [cachedValidCounts, setCachedValidCounts] = useState<FirestoreDocumentCounts | null>(
    lastKnownCounts
  );
  const [isAuditing, setIsAuditing] = useState(false);

  const [isRunningStabilityTest, setIsRunningStabilityTest] = useState(false);
  const [stabilityReport, setStabilityReport] = useState<ConnectionStabilityReport | null>(null);

  const [cleanupAfterVerify, setCleanupAfterVerify] = useState(true);
  const [isRunningWriteTest, setIsRunningWriteTest] = useState(false);
  const [writeTestResult, setWriteTestResult] = useState<SafeReadWriteTestResult | null>(null);

  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (lastKnownCounts) {
      setCachedValidCounts(lastKnownCounts);
    }
  }, [lastKnownCounts]);

  const runAudit = async () => {
    setIsAuditing(true);
    setErrorMsg(null);
    try {
      const report = await auditFirestoreConnection();
      setAuditReport(report);
      if (report.serverDocumentCounts) {
        setCachedValidCounts(report.serverDocumentCounts);
      } else {
        await retryFirestoreConnection();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menjalankan audit koneksi Firestore.');
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setWriteTestResult(null);
      setStabilityReport(null);
      setSeedSuccessMsg(null);
      setErrorMsg(null);
      runAudit();
    }
  }, [isOpen]);

  const handleRunStabilityTest = async () => {
    setErrorMsg(null);
    setStabilityReport(null);
    setIsRunningStabilityTest(true);
    try {
      const res = await verifyConnectionStability();
      setStabilityReport(res);
      setCachedValidCounts(res.verifiedCounts);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menjalankan uji stabilitas koneksi Firestore.');
    } finally {
      setIsRunningStabilityTest(false);
    }
  };

  const handleRunSafeWriteTest = async () => {
    setErrorMsg(null);
    setSeedSuccessMsg(null);
    setWriteTestResult(null);
    setIsRunningWriteTest(true);
    try {
      const res = await executeSafeReadWriteTest(cleanupAfterVerify);
      setWriteTestResult(res);
      await runAudit();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Uji tulis & baca Cloud Firestore gagal.');
    } finally {
      setIsRunningWriteTest(false);
    }
  };

  const handleManualSeed = async () => {
    setErrorMsg(null);
    setSeedSuccessMsg(null);
    setIsSeeding(true);
    try {
      await seedInitialDataManually();
      setSeedSuccessMsg(
        'Data referensi awal (Kategori Klaster ASN, Dokumen Dasar Hukum, Slide Beranda, & Halaman Tentang) berhasil disimpan ke Cloud Firestore atas persetujuan Anda.'
      );
      await runAudit();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan data referensi awal ke Firestore.');
    } finally {
      setIsSeeding(false);
    }
  };

  const activeConsoleUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/firestore/databases/${encodeURIComponent(
    firestoreDatabaseId
  )}/data`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl max-w-2xl w-full space-y-5 my-8 max-h-[90vh] overflow-y-auto text-slate-800"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#07529A] text-[#FFD84D] flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Audit & Uji Koneksi Cloud Firestore (Admin)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pemeriksaan read-only otomatis, serta uji tulis/baca aman yang hanya berjalan atas persetujuan Anda.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            )}

            {seedSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{seedSuccessMsg}</span>
              </div>
            )}

            {/* Section 1: Configuration & Database Identity */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900">1. Identitas Proyek & Database Aktif</span>
                <button
                  type="button"
                  onClick={runAudit}
                  disabled={isAuditing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isAuditing ? 'animate-spin' : ''}`} />
                  <span>Periksa Ulang</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    Firebase Project ID
                  </span>
                  <span className="font-mono font-bold text-slate-900">{firebaseProjectId}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    Firebase Storage (Spark Plan)
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    VITE_ENABLE_FIREBASE_STORAGE={String(isStorageEnabled)}
                  </span>
                </div>
                <div className="sm:col-span-2 p-2.5 rounded-xl bg-white border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                      Database Firestore Aktif
                    </span>
                    <span className="font-mono font-bold text-[#07529A] break-all">
                      {firestoreDatabaseId}
                    </span>
                  </div>
                  <a
                    href={activeConsoleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#07529A] font-bold text-[11px] shrink-0"
                  >
                    <span>Buka Tab Data Database Ini</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {firestoreDatabaseId !== '(default)' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-[11px] text-amber-950 leading-relaxed">
                  <strong>Status Dua Database di Proyek <code>{firebaseProjectId}</code>:</strong>{' '}
                  Seluruh fitur tambah, baca, edit, dan hapus pada aplikasi ini terhubung secara tunggal ke database{' '}
                  <code className="break-all font-semibold">{provisionedDatabaseId}</code> (berlabel{' '}
                  <strong>AI SHARED QUOTA</strong> — berbagi kuota gratis paket <strong>Firebase Spark</strong> tanpa biaya Blaze). Database{' '}
                  <code>(default)</code> tidak digunakan oleh aplikasi dan tidak dilakukan migrasi otomatis tanpa persetujuan Anda.
                </div>
              )}

              {auditReport && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-600">Status Database Aktif:</span>
                    <span
                      className={`font-bold text-right ${
                        auditReport.activeDbStatus.rulesStatus === 'ok'
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {auditReport.activeDbStatus.rulesStatus === 'ok'
                        ? 'TERHUBUNG (Server & Rules Aktif)'
                        : auditReport.activeDbStatus.message}
                    </span>
                  </div>

                  {(() => {
                    const liveCounts = auditReport.serverDocumentCounts;
                    const displayCounts = liveCounts ?? cachedValidCounts;
                    const isStaleFallback = !liveCounts && Boolean(cachedValidCounts);

                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Penghitung Dokumen pada Database Aktif:
                          </span>
                          {liveCounts ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Terverifikasi langsung dari server
                            </span>
                          ) : isStaleFallback ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Data terakhir yang valid — belum diperbarui dari server
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Pembacaan server gagal — penghitung tidak direset ke 0
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                          {[
                            {
                              label: 'Policies',
                              val: displayCounts ? displayCounts.policies : '—',
                            },
                            {
                              label: 'Berita',
                              val: displayCounts ? displayCounts.deputyNews : '—',
                            },
                            {
                              label: 'Kategori',
                              val: displayCounts ? displayCounts.categories : '—',
                            },
                            {
                              label: 'Regulasi',
                              val: displayCounts ? displayCounts.sources : '—',
                            },
                            {
                              label: 'Slide Hero',
                              val: displayCounts ? displayCounts.heroSlides : '—',
                            },
                            {
                              label: 'Tentang',
                              val: displayCounts
                                ? displayCounts.aboutPageExists
                                  ? 1
                                  : 0
                                : '—',
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className={`p-2 rounded-lg bg-white border text-center ${
                                isStaleFallback
                                  ? 'border-amber-300/90'
                                  : liveCounts
                                  ? 'border-slate-200/80'
                                  : 'border-rose-200/90'
                              }`}
                            >
                              <span className="block text-sm font-extrabold text-slate-900 tabular-nums">
                                {item.val}
                              </span>
                              <span className="block text-[10px] text-slate-500">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Section 2: Safe Explicit Admin Write & Read Verification */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900">
                    2. Mekanisme Pengujian Simpan, Baca Server & Hapus Aman
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tidak berjalan otomatis. Saat diklik, menguji CREATE → READ dari Server → UPDATE → READ dari Server pada dokumen internal non-publik (<code>isPublic: false</code>).
                  </p>
                </div>
              </div>

              {!isFirebaseAuthConnected && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-[#07529A] font-medium">
                    Hubungkan sesi Google Admin (Firebase Auth) terlebih dahulu untuk menguji izin tulis admin.
                  </span>
                  <button
                    type="button"
                    onClick={() => loginWithGoogleFirebase()}
                    className="px-3 py-1.5 rounded-lg bg-[#07529A] text-white font-bold text-[11px] cursor-pointer"
                  >
                    Masuk dengan Google
                  </button>
                </div>
              )}

              <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanupAfterVerify}
                  onChange={(e) => setCleanupAfterVerify(e.target.checked)}
                  className="rounded text-[#07529A] focus:ring-[#07529A]"
                />
                <span>
                  Hapus kembali dokumen uji secara otomatis setelah verifikasi berhasil (uncheck jika ingin melihat dokumen uji di tab Data Firebase Console)
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRunSafeWriteTest}
                  disabled={isRunningWriteTest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#07529A] hover:bg-[#053d73] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isRunningWriteTest ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-[#FFD84D]" />
                  )}
                  <span>
                    {isRunningWriteTest
                      ? 'Menguji Tulis & Baca Server...'
                      : 'Jalankan Uji Simpan & Baca Firestore'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleRunStabilityTest}
                  disabled={isRunningStabilityTest}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-emerald-700 ${
                      isRunningStabilityTest ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {isRunningStabilityTest
                      ? 'Menguji Stabilitas...'
                      : 'Uji Stabilitas Refresh & Navigasi (Read-Only)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleManualSeed}
                  disabled={isSeeding}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSeeding ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-[#07529A]" />
                  )}
                  <span>
                    {isSeeding
                      ? 'Menyimpan Data Standar...'
                      : 'Simpan Kategori & Konten Bawaan ke Firestore'}
                  </span>
                </button>
              </div>

              {stabilityReport && (
                <div
                  className={`p-3.5 rounded-xl border space-y-1.5 text-[11px] ${
                    stabilityReport.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Hasil Uji Stabilitas Refresh, Sesi Auth & Navigasi (Assertion:{' '}
                      {stabilityReport.internalAssertionCount})
                    </span>
                  </div>
                  <p className="leading-relaxed">{stabilityReport.message}</p>
                </div>
              )}

              {writeTestResult && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Verifikasi Tulis & Baca Langsung ke Server Berhasil</span>
                  </div>
                  <p className="leading-relaxed">{writeTestResult.message}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
