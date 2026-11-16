import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  FileJson,
  Layers,
  ArrowUpRight,
  Flame,
  Cloud,
} from 'lucide-react';
import { usePolicy } from '../../context/PolicyContext';
import { syncAllStoresToFirestore, fetchAllStoresFromFirestore } from '../../lib/firestoreSync';
import firebaseConfig from '../../../firebase-applet-config.json';
import { INITIAL_CATEGORIES, INITIAL_POLICIES, INITIAL_SOURCES } from '../../data/initialData';
import { DEFAULT_HERO_SLIDES, normalizeHeroSlides } from '../../data/initialHeroSlides';
import { DEFAULT_ABOUT_PAGE_CONTENT } from '../../data/initialAboutData';

interface StoreInfo {
  name: string;
  label: string;
  filePath: string;
  exists: boolean;
  sizeBytes: number;
  updatedAt: string | null;
  itemCount: number;
}

interface StorageStatus {
  status: string;
  storageDirectory: string;
  isGitTracked: boolean;
  stores: StoreInfo[];
  backupCount: number;
  githubIntegration?: {
    configured: boolean;
    repo: string | null;
    branch: string;
  };
}

interface GitHubStatus {
  configured: boolean;
  repo: string | null;
  branch: string;
  hasToken: boolean;
}

export const DataStorageManager: React.FC = () => {
  const {
    policies,
    deputyNews,
    heroSlides,
    categories,
    sources,
    aboutPage,
    firebaseUser,
    refreshPolicies,
    refreshCategories,
    refreshDeputyNews,
    refreshHeroSlides,
    refreshAboutPage,
  } = usePolicy();

  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [isFetchingFirestore, setIsFetchingFirestore] = useState(false);
  const [isSeedingFirestore, setIsSeedingFirestore] = useState(false);

  const handleSyncToFirestore = async () => {
    setIsSyncingFirestore(true);
    setActionMessage(null);
    try {
      const res = await syncAllStoresToFirestore({
        policies,
        deputyNews,
        heroSlides,
        categories,
        sources,
        aboutPage,
      });
      setActionMessage({
        type: 'success',
        text: `Sinkronisasi Firestore berhasil! ${res.counts.policies} kebijakan, ${res.counts.deputyNews} berita, ${res.counts.heroSlides} banner, dan ${res.counts.categories} kategori tersimpan di Cloud Firestore (Project: ${firebaseConfig.projectId}).`,
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Gagal sinkronisasi ke Cloud Firestore: ${err?.message || 'Periksa koneksi database'}`,
      });
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  const handleSeedInitialToFirestore = async () => {
    setIsSeedingFirestore(true);
    setActionMessage(null);
    try {
      const normalizedSlides = normalizeHeroSlides(DEFAULT_HERO_SLIDES);
      const res = await syncAllStoresToFirestore({
        policies: INITIAL_POLICIES,
        deputyNews,
        heroSlides: normalizedSlides,
        categories: INITIAL_CATEGORIES,
        sources: INITIAL_SOURCES,
        aboutPage: DEFAULT_ABOUT_PAGE_CONTENT,
      });
      await Promise.all([
        refreshPolicies(),
        refreshCategories(),
        refreshDeputyNews(),
        refreshHeroSlides(),
        refreshAboutPage(),
      ]);
      setActionMessage({
        type: 'success',
        text: `Data awal berhasil diimpor ke Cloud Firestore! ${res.counts.policies} kebijakan, ${res.counts.categories} kategori, ${res.counts.heroSlides} banner, dan ${res.counts.sources} dasar hukum kini aktif.`,
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Gagal mengimpor data awal ke Firestore: ${err?.message || 'Pastikan akun Firebase Anda terdaftar sebagai Admin aktif.'}`,
      });
    } finally {
      setIsSeedingFirestore(false);
    }
  };

  const handleFetchFromFirestore = async () => {
    setIsFetchingFirestore(true);
    setActionMessage(null);
    try {
      const data = await fetchAllStoresFromFirestore(Boolean(firebaseUser));
      await Promise.all([
        refreshPolicies(),
        refreshCategories(),
        refreshDeputyNews(),
        refreshHeroSlides(),
        refreshAboutPage(),
      ]);
      if (!data.policies.length && !data.deputyNews.length && !data.categories.length) {
        setActionMessage({
          type: 'info',
          text: 'Koleksi Cloud Firestore saat ini masih kosong. Tekan tombol "Impor Data Awal ke Firestore" untuk mengisi data awal.',
        });
        return;
      }
      setActionMessage({
        type: 'success',
        text: `Berhasil memuat ulang data langsung dari Cloud Firestore! ${data.policies.length} kebijakan, ${data.deputyNews.length} berita, ${data.categories.length} kategori.`,
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Gagal memuat data dari Firestore: ${err?.message || 'Periksa koneksi database'}`,
      });
    } finally {
      setIsFetchingFirestore(false);
    }
  };

  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState<any | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);

  // GitHub Sync State
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const [storageRes, ghRes] = await Promise.all([
        fetch('/api/admin/storage/status', { cache: 'no-store' }),
        fetch('/api/admin/github/status', { cache: 'no-store' }),
      ]);

      if (storageRes.ok) {
        const data = await storageRes.json();
        setStorageStatus(data);
      }
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        setGithubStatus(ghData);
      }
    } catch (err) {
      console.warn('Gagal memuat status penyimpanan data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDownloadBackup = () => {
    window.location.href = '/api/admin/backup/export';
    setActionMessage({
      type: 'success',
      text: 'Unduhan berkas cadangan JSON berhasil dimulai.',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Format berkas tidak valid.');
        }
        if (!parsed.stores || typeof parsed.stores !== 'object') {
          throw new Error('Berkas cadangan tidak memiliki struktur objek "stores".');
        }
        setSelectedFileContent(parsed);
        setRestoreModalOpen(true);
      } catch (err: any) {
        setActionMessage({
          type: 'error',
          text: `Berkas cadangan tidak valid: ${err?.message || 'Format JSON rusak'}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeRestore = async () => {
    if (!selectedFileContent) return;

    try {
      setIsRestoring(true);
      const idToken = firebaseUser ? await firebaseUser.getIdToken() : '';
      const res = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(selectedFileContent),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Gagal memulihkan cadangan.');
      }

      setActionMessage({
        type: 'success',
        text: `Pemulihan data berhasil! ${data?.details?.policiesCount ?? 0} kebijakan, ${data?.details?.deputyNewsCount ?? 0} berita, ${data?.details?.categoriesCount ?? 0} topik telah disinkronkan.`,
      });

      setRestoreModalOpen(false);
      setSelectedFileContent(null);
      setSelectedFileName('');

      // Refresh all context stores
      await Promise.all([
        refreshPolicies(),
        refreshCategories(),
        refreshDeputyNews(),
        refreshHeroSlides(),
        refreshAboutPage(),
        fetchStatus(),
      ]);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Gagal memulihkan data: ${err?.message || 'Kesalahan server'}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const executeGithubSync = async () => {
    try {
      setIsSyncingGithub(true);
      setActionMessage(null);
      const idToken = firebaseUser ? await firebaseUser.getIdToken() : '';
      const res = await fetch('/api/admin/github/sync', {
        method: 'POST',
        headers: {
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Gagal menyinkronkan ke GitHub.');
      }

      setActionMessage({
        type: 'success',
        text: `Sinkronisasi ke GitHub berhasil! ${data?.committedFiles?.length || 0} berkas data JSON berhasil di-commit (${data?.commitSha ? data.commitSha.slice(0, 7) : 'commit baru'}).`,
      });
      await fetchStatus();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Gagal melakukan sinkronisasi ke GitHub.',
      });
    } finally {
      setIsSyncingGithub(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const storeLabels: Record<string, { label: string; file: string; desc: string }> = {
    policies: {
      label: 'Konten Kebijakan & Instagram',
      file: 'data/policies.json',
      desc: 'Artikel kebijakan dan feed instagram edukasi',
    },
    deputyNews: {
      label: 'Berita Deputi SDM Aparatur',
      file: 'data/deputy-news.json',
      desc: 'Warta kegiatan dan siaran resmi kedeputian',
    },
    heroSlides: {
      label: 'Slide Banner Beranda',
      file: 'data/hero-slides.json',
      desc: 'Visual banner utama dan tautan tombol beranda',
    },
    categories: {
      label: 'Kategori & Pilar Konten',
      file: 'data/categories.json',
      desc: 'Klaster rumpun ASN dan pilar konten',
    },
    aboutPage: {
      label: 'Halaman Profil Kedeputian',
      file: 'data/about-page.json',
      desc: 'Profil Deputi, unit kerja, dan mandat kedeputian',
    },
    sources: {
      label: 'Dasar Hukum & Dokumen Rujukan',
      file: 'data/sources.json',
      desc: 'Regulasi perundang-undangan dan JDIH',
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#07529A] flex items-center justify-center shrink-0 border border-blue-200/70">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <span>Penyimpanan Data Permanen & Cadangan Repository</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Tracked in Git
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh data admin disimpan langsung dalam berkas JSON terstruktur di direktori{' '}
              <code className="text-xs font-mono font-bold text-[#07529A] bg-blue-50 px-1.5 py-0.5 rounded">
                data/*.json
              </code>{' '}
              dan ikut di-build serta terlindungi dari cold-start kontainer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-600 hover:text-[#07529A] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Muat Ulang Status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : actionMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : actionMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          ) : (
            <Database className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
          )}
          <span className="leading-relaxed flex-1">{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid of 6 Live Cloud Firestore Collections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {[
          {
            name: 'policies',
            label: 'Konten Kebijakan & Instagram',
            collectionPath: 'Cloud Firestore · policies',
            count: policies.length,
            unitLabel: 'data',
          },
          {
            name: 'deputy_news',
            label: 'Berita Deputi SDM Aparatur',
            collectionPath: 'Cloud Firestore · deputy_news',
            count: deputyNews.length,
            unitLabel: 'data',
          },
          {
            name: 'hero_slides',
            label: 'Slide Banner Beranda',
            collectionPath: 'Cloud Firestore · hero_slides',
            count: heroSlides.filter((s) => Boolean(s.imageUrl)).length,
            unitLabel: 'slide',
          },
          {
            name: 'categories',
            label: 'Kategori & Pilar Konten',
            collectionPath: 'Cloud Firestore · categories',
            count: categories.length,
            unitLabel: 'topik',
          },
          {
            name: 'about_page',
            label: 'Halaman Profil Kedeputian',
            collectionPath: 'Cloud Firestore · about_page/main',
            count: aboutPage.units.length,
            unitLabel: 'unit',
          },
          {
            name: 'sources',
            label: 'Dasar Hukum & Dokumen Rujukan',
            collectionPath: 'Cloud Firestore · sources',
            count: sources.length,
            unitLabel: 'dokumen',
          },
        ].map((store) => (
          <div
            key={store.name}
            className="bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 transition-colors flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {store.label}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Firestore Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{store.collectionPath}</p>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>{store.name}</span>
              </div>
              <div className="flex items-center gap-2 font-bold">
                <span className="text-slate-900 tabular-nums">
                  {store.count} {store.unitLabel}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions & Backup Controls */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-blue-100 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#07529A]" />
            <span>Cadangan Otomatis & Pemulihan Mandiri</span>
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Setiap kali admin menyimpan atau mengubah data, sistem secara otomatis membuat salinan riwayat cadangan berstempel waktu di folder{' '}
            <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
              data/backups/
            </code>{' '}
            (tersedia {storageStatus?.backupCount || 0} arsip cadangan aktif).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-200/90 shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-[#07529A]" />
            <span>Unduh Cadangan JSON</span>
          </button>

          <label className="px-4 py-2.5 rounded-xl bg-[#07529A] hover:bg-[#06427c] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-2">
            <Upload className="w-3.5 h-3.5" />
            <span>Pulihkan Cadangan</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Cloud Firestore & Firebase Auth Integration Panel */}
      <div className="border border-amber-200/90 rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 space-y-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                <span>Firebase Cloud Firestore & Authentication</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {firebaseConfig.projectId} (Aktif & Terhubung)
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Project ID: <code className="font-mono text-[#07529A] font-bold">{firebaseConfig.projectId}</code> · Database ID: <code className="font-mono text-slate-600">{firebaseConfig.firestoreDatabaseId || '(default)'}</code>
                {firebaseUser && (
                  <span className="ml-1 text-slate-700 font-medium">· Pengguna: <span className="font-mono text-amber-700 font-bold">{firebaseUser.email}</span></span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleFetchFromFirestore}
              disabled={isFetchingFirestore}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200/90 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Muat ulang seluruh data dari koleksi Cloud Firestore"
            >
              <Download className={`w-3.5 h-3.5 text-amber-600 ${isFetchingFirestore ? 'animate-bounce' : ''}`} />
              <span>{isFetchingFirestore ? 'Memuat...' : 'Muat dari Firestore'}</span>
            </button>

            <button
              type="button"
              onClick={handleSeedInitialToFirestore}
              disabled={isSeedingFirestore}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#07529A] font-bold text-xs border border-blue-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Isi Cloud Firestore dengan dataset referensi awal KOMPAK SDMA"
            >
              <Database className={`w-3.5 h-3.5 ${isSeedingFirestore ? 'animate-spin' : ''}`} />
              <span>{isSeedingFirestore ? 'Mengimpor...' : 'Impor Data Awal ke Firestore'}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncToFirestore}
              disabled={isSyncingFirestore}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Kirim dan perbarui seluruh dokumen ke koleksi Cloud Firestore"
            >
              <Cloud className={`w-3.5 h-3.5 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
              <span>{isSyncingFirestore ? 'Menyinkronkan...' : 'Sinkronkan ke Firestore'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* GitHub Repository Sync Panel */}
      <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Sinkronisasi Otomatis GitHub Repository</span>
                {githubStatus?.configured ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Terkoneksi: {githubStatus.repo} ({githubStatus.branch})
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Penyimpanan Lokal Aktif (Opsional GitHub Token)
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {githubStatus?.configured
                  ? 'Perubahan berkas data dapat langsung di-commit ke branch GitHub dari antarmuka ini.'
                  : 'Seluruh berkas data di folder data/*.json sudah otomatis tersimpan di server. Anda dapat menghubungkan GitHub Token untuk commit langsung dari browser.'}
              </p>
            </div>
          </div>

          {githubStatus?.configured && (
            <button
              type="button"
              onClick={executeGithubSync}
              disabled={isSyncingGithub}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGithub ? 'animate-spin' : ''}`} />
              <span>{isSyncingGithub ? 'Menyinkronkan...' : 'Komit ke GitHub Sekarang'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {restoreModalOpen && selectedFileContent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Konfirmasi Pemulihan Data</span>
              </h3>
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan memulihkan data website dari berkas cadangan{' '}
              <strong className="text-slate-900">{selectedFileName}</strong> (diexport pada{' '}
              {selectedFileContent.exportedAt
                ? new Date(selectedFileContent.exportedAt).toLocaleString('id-ID')
                : '-'}{' '}
              oleh {selectedFileContent.exportedBy || 'Admin'}).
            </p>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1.5">
              <p className="font-bold text-slate-700">Rincian Data yang Akan Dipulihkan:</p>
              <ul className="text-slate-600 space-y-1 pl-4 list-disc text-[11px]">
                <li>
                  Kebijakan: {selectedFileContent.stores?.policies?.length ?? 0} artikel/konten
                </li>
                <li>
                  Berita Deputi: {selectedFileContent.stores?.deputyNews?.length ?? 0} warta berita
                </li>
                <li>
                  Slide Hero Beranda: {selectedFileContent.stores?.heroSlides?.length ?? 0} banner
                </li>
                <li>
                  Kategori/Topik: {selectedFileContent.stores?.categories?.length ?? 0} kategori
                </li>
                <li>
                  Dasar Hukum: {selectedFileContent.stores?.sources?.length ?? 0} regulasi
                </li>
              </ul>
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
              Sistem akan secara otomatis membuat arsip cadangan pengaman dari kondisi saat ini sebelum menimpa data.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeRestore}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isRestoring && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isRestoring ? 'Memulihkan Data...' : 'Ya, Pulihkan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
