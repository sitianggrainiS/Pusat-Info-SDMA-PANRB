import React, { useState, useRef } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Policy, PolicyStatus } from '../../types';
import {
  InstagramEmbed,
  extractInstagramInfo,
  resolvePolicyReleaseDate,
} from '../../components/common/InstagramEmbed';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import {
  detectInstagramThumbnail,
  AVAILABLE_INSTAGRAM_PREVIEWS,
  compressImageFile,
} from '../../utils/thumbnailUtils';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  ExternalLink,
  Instagram,
  X,
  Layers,
  Sparkles,
  Save,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  FolderOpen,
  Check,
  CheckCircle2,
  Newspaper,
  Images,
} from 'lucide-react';
import { DeputyNewsManager } from '../../components/admin/DeputyNewsManager';
import { HeroSlidesManager } from '../../components/admin/HeroSlidesManager';

interface AdminContentListProps {
  initialTab?: 'instagram' | 'deputy-news' | 'hero-slides';
}

export const AdminContentList: React.FC<AdminContentListProps> = ({ initialTab }) => {
  const {
    policies,
    deputyNews,
    heroSlides,
    categories,
    navigateTo,
    deletePolicy,
    setPolicyStatus,
    createPolicy,
    updatePolicyThumbnail,
  } = usePolicy();

  const [activeContentTab, setActiveContentTab] = useState<'instagram' | 'deputy-news' | 'hero-slides'>(
    initialTab || 'instagram'
  );
  const [createNewsModalOpen, setCreateNewsModalOpen] = useState(false);
  const [createHeroSlideModalOpen, setCreateHeroSlideModalOpen] = useState(false);

  React.useEffect(() => {
    if (initialTab) {
      setActiveContentTab(initialTab);
    }
  }, [initialTab]);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCluster, setFilterCluster] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [deletingPolicy, setDeletingPolicy] = useState<{ id: string; title: string } | null>(null);
  const [previewPolicy, setPreviewPolicy] = useState<Policy | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Dedicated Edit Thumbnail Modal State (Requirement 2 & 3)
  const [editingThumbnailPolicy, setEditingThumbnailPolicy] = useState<Policy | null>(null);
  const [modalThumbnailMode, setModalThumbnailMode] = useState<'auto' | 'manual'>('auto');
  const [modalSelectedThumbnail, setModalSelectedThumbnail] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const thumbnailFileInputRef = useRef<HTMLInputElement>(null);

  // Quick Add Form state
  const [quickUrl, setQuickUrl] = useState('');
  const [quickClusterId, setQuickClusterId] = useState(categories[0]?.id || '');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickStatus, setQuickStatus] = useState<PolicyStatus>('published');
  const [quickError, setQuickError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filtered = policies.filter((p) => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchCluster = filterCluster === 'all' || p.categoryId === filterCluster;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      (p.instagramPostUrl && p.instagramPostUrl.toLowerCase().includes(q));
    return matchStatus && matchCluster && matchSearch;
  });

  const confirmDeletePolicy = async () => {
    if (!deletingPolicy) return;
    try {
      await deletePolicy(deletingPolicy.id);
      setDeletingPolicy(null);
      showToast('Konten berhasil dihapus dari Cloud Firestore.');
    } catch (err: any) {
      setDeletingPolicy(null);
      showToast(err?.message || 'Gagal menghapus konten dari Cloud Firestore.');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: PolicyStatus) => {
    const nextStatus: PolicyStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await setPolicyStatus(id, nextStatus);
      showToast(`Status berhasil diubah menjadi ${nextStatus === 'published' ? 'Terbit' : 'Draf'}.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui status di Cloud Firestore.');
    }
  };

  const handleQuickAdd = async () => {
    const trimmed = quickUrl.trim();
    if (!trimmed) {
      setQuickError('Tautan postingan Instagram wajib diisi.');
      return;
    }

    const check = extractInstagramInfo(trimmed);
    if (!check.isValid) {
      setQuickError('Masukkan URL postingan, karusel, atau Reel Instagram yang valid.');
      return;
    }

    if (!quickClusterId) {
      setQuickError('Pilih salah satu dari 8 Klaster Manajemen ASN.');
      return;
    }

    const titleToUse = quickTitle.trim() || 'Edukasi Kebijakan SDM Aparatur';
    const slug =
      titleToUse
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-') + '-' + Date.now().toString().slice(-4);

    const detectedThumb = detectInstagramThumbnail({
      title: titleToUse,
      slug,
      instagramPostUrl: check.cleanUrl,
      categoryId: quickClusterId,
    });

    try {
      await createPolicy({
        title: titleToUse,
        slug,
        categoryId: quickClusterId,
        summary:
          'Materi edukasi kebijakan SDM Aparatur yang bersumber dari media sosial resmi KemenPANRB.',
        status: quickStatus,
        thumbnail: detectedThumb,
        instagramPostUrl: check.cleanUrl,
        instagramThumbnail: detectedThumb,
        isCustomThumbnail: false,
        autoThumbnail: detectedThumb,
        instagramDate:
          check.detectedDate ||
          new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        instagramAccountHandle: check.accountHandle || '@sdmapanrb',
        publicationDate:
          check.detectedDate ||
          new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
      });

      // Reset and close
      setQuickUrl('');
      setQuickTitle('');
      setQuickError(null);
      setQuickAddOpen(false);
      showToast('Konten baru berhasil disimpan ke Cloud Firestore.');
    } catch (err: any) {
      setQuickError(err?.message || 'Gagal menyimpan konten ke Cloud Firestore.');
    }
  };

  // Open Edit Thumbnail Modal
  const openEditThumbnailModal = (policy: Policy) => {
    setEditingThumbnailPolicy(policy);
    const isCustom = Boolean(policy.isCustomThumbnail);
    setModalThumbnailMode(isCustom ? 'manual' : 'auto');
    setModalSelectedThumbnail(policy.thumbnail);
    setUploadError(null);
  };

  // Handle file upload inside Edit Thumbnail modal
  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Harap pilih file gambar JPG, PNG, atau WEBP.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const uploadedUrl = await compressImageFile(file);
      setModalSelectedThumbnail(uploadedUrl);
      setModalThumbnailMode('manual');
    } catch (err) {
      console.error('Failed to process image upload', err);
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Gagal memproses gambar. Gunakan URL gambar eksternal (https://...) atau cover bawaan.'
      );
    } finally {
      setIsUploading(false);
      if (thumbnailFileInputRef.current) {
        thumbnailFileInputRef.current.value = '';
      }
    }
  };

  // Save updated thumbnail
  const handleSaveThumbnailModal = async () => {
    if (!editingThumbnailPolicy) return;

    const detected = detectInstagramThumbnail(editingThumbnailPolicy);
    const finalThumb =
      modalThumbnailMode === 'auto'
        ? detected
        : modalSelectedThumbnail || detected;

    try {
      await updatePolicyThumbnail(
        editingThumbnailPolicy.id,
        finalThumb,
        modalThumbnailMode === 'manual'
      );

      const savedTitle = editingThumbnailPolicy.title;
      setEditingThumbnailPolicy(null);
      showToast(
        `Thumbnail untuk "${savedTitle}" berhasil diperbarui di Cloud Firestore!`
      );
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal memperbarui thumbnail di Cloud Firestore.');
    }
  };

  return (
    <AdminLayout
      activeNav={activeContentTab === 'hero-slides' ? 'hero-slides' : 'content'}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Thumbnail Modal */}
      <input
        ref={thumbnailFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleModalFileUpload}
        className="hidden"
      />

      <div className="space-y-6 max-w-6xl">
        {/* Top-Level Category Switcher & Inline Add Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-1.5 inline-flex flex-wrap items-center gap-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveContentTab('instagram')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeContentTab === 'instagram'
                  ? 'bg-[#07529A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Instagram
                className={`w-4 h-4 ${
                  activeContentTab === 'instagram' ? 'text-[#FFD84D]' : 'text-[#E1306C]'
                }`}
              />
              <span>Konten Instagram</span>
              <span
                className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                  activeContentTab === 'instagram'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {policies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveContentTab('deputy-news')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeContentTab === 'deputy-news'
                  ? 'bg-[#07529A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Newspaper
                className={`w-4 h-4 ${
                  activeContentTab === 'deputy-news' ? 'text-[#FFD84D]' : 'text-[#07529A]'
                }`}
              />
              <span>Berita Deputi</span>
              <span
                className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                  activeContentTab === 'deputy-news'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {deputyNews.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveContentTab('hero-slides')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeContentTab === 'hero-slides'
                  ? 'bg-[#07529A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Images
                className={`w-4 h-4 ${
                  activeContentTab === 'hero-slides' ? 'text-[#FFD84D]' : 'text-[#07529A]'
                }`}
              />
              <span>Slide Banner Beranda</span>
              <span
                className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                  activeContentTab === 'hero-slides'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {heroSlides.filter((s) => Boolean(s.imageUrl)).length}/3
              </span>
            </button>
          </div>

          {activeContentTab === 'deputy-news' ? (
            <button
              type="button"
              onClick={() => setCreateNewsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Berita</span>
            </button>
          ) : activeContentTab === 'hero-slides' ? (
            <button
              type="button"
              onClick={() => setCreateHeroSlideModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Kelola / Isi Slot Slide</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickAddOpen(true);
                  setQuickUrl('https://www.instagram.com/p/Ddi76RtGXeH/');
                  setQuickClusterId(categories[0]?.id || '');
                  setQuickTitle('Panduan Kebijakan SDM Aparatur');
                  setQuickError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tambah Cepat</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo({ name: 'admin-editor' })}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Konten</span>
              </button>
            </div>
          )}
        </div>

        {activeContentTab === 'deputy-news' ? (
          <DeputyNewsManager
            externalCreateModalOpen={createNewsModalOpen}
            onCloseExternalCreateModal={() => setCreateNewsModalOpen(false)}
            onOpenCreateModal={() => setCreateNewsModalOpen(true)}
            onShowToast={showToast}
          />
        ) : activeContentTab === 'hero-slides' ? (
          <HeroSlidesManager
            externalCreateModalOpen={createHeroSlideModalOpen}
            onCloseExternalCreateModal={() => setCreateHeroSlideModalOpen(false)}
            onOpenCreateModal={() => setCreateHeroSlideModalOpen(true)}
            onShowToast={showToast}
          />
        ) : (
          <>
            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul atau URL Instagram..."
                className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#07529A] focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Cluster / Pillar Selector Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Topik:</span>
              <select
                value={filterCluster}
                onChange={(e) => setFilterCluster(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#07529A] max-w-xs truncate"
              >
                <option value="all">Semua Klaster & Pilar Konten</option>
                <optgroup label="8 Klaster Manajemen ASN">
                  {categories
                    .filter((c) => c.group !== 'pilar')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
                {categories.some((c) => c.group === 'pilar') && (
                  <optgroup label="Pilar Konten">
                    {categories
                      .filter((c) => c.group === 'pilar')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
            {[
              { id: 'all', label: `Semua Konten (${policies.length})` },
              {
                id: 'published',
                label: `Terbit (${policies.filter((p) => p.status === 'published').length})`,
              },
              {
                id: 'draft',
                label: `Draf (${policies.filter((p) => p.status === 'draft').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-[#07529A] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 w-16">Cover</th>
                    <th className="py-3.5 px-4">Postingan Instagram & Judul</th>
                    <th className="py-3.5 px-4">Klaster ASN / Pilar Konten</th>
                    <th className="py-3.5 px-4">Status Publikasi</th>
                    <th className="py-3.5 px-4">Tanggal Rilis</th>
                    <th className="py-3.5 px-6 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((pol) => {
                    const cat = categories.find((c) => c.id === pol.categoryId);
                    const isCustom = Boolean(pol.isCustomThumbnail);
                    const thumbSrc =
                      pol.thumbnail ||
                      pol.instagramThumbnail ||
                      detectInstagramThumbnail(pol);

                    return (
                      <tr key={pol.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Thumbnail Column with Quick Edit */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => openEditThumbnailModal(pol)}
                            className="group/thumb relative block w-14 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs hover:border-[#07529A] transition-all cursor-pointer"
                            title="Klik untuk mengubah thumbnail"
                          >
                            <img
                              src={thumbSrc}
                              alt={pol.title}
                              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Edit className="w-3.5 h-3.5" />
                            </div>
                            <span
                              className={`absolute bottom-0 inset-x-0 text-[8px] font-bold text-center py-0.2 backdrop-blur-xs ${
                                isCustom
                                  ? 'bg-amber-600/90 text-white'
                                  : 'bg-[#07529A]/85 text-white'
                              }`}
                            >
                              {isCustom ? 'Kustom' : 'Otomatis'}
                            </span>
                          </button>
                        </td>

                        {/* Title & Instagram Link */}
                        <td className="py-4 px-4 max-w-sm">
                          <div className="font-bold text-slate-900 text-sm leading-snug">
                            {pol.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1 font-mono text-[#E1306C] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                              <Instagram className="w-3 h-3" />
                              <span className="truncate max-w-[180px]">
                                {pol.instagramPostUrl || 'Belum diisi'}
                              </span>
                            </span>
                            {pol.instagramPostUrl && (
                              <a
                                href={pol.instagramPostUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-[#07529A]"
                                title="Buka tautan langsung di Instagram"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {/* AI Summary Status Badge */}
                          {pol.isAiSummaryApproved && pol.aiSummary && (
                            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Ringkasan AI Disetujui</span>
                            </div>
                          )}
                          {!pol.isAiSummaryApproved && pol.aiSummary && (
                            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                              <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Draf AI (Belum Disetujui)</span>
                            </div>
                          )}
                        </td>

                        {/* Cluster Badge */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                            <CategoryIcon
                              name={cat?.iconName || 'FileText'}
                              className="w-3.5 h-3.5 text-[#07529A] shrink-0"
                            />
                            <span className="font-semibold text-[#07529A]">
                              {cat?.name || 'Belum Ditetapkan'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {cat?.description}
                          </p>
                        </td>

                        {/* Status Toggle Badge */}
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(pol.id, pol.status)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all hover:scale-102 ${
                              pol.status === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Klik untuk beralih status antara Terbit & Draf"
                          >
                            {pol.status === 'published' ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Terbit (Publik)</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Draf (Tersimpan)</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 text-slate-600">
                          <div className="text-xs font-medium text-slate-800">
                            {resolvePolicyReleaseDate(pol)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {pol.instagramAccountHandle || '@sdmapanrb'}
                          </div>
                        </td>

                        {/* Action Buttons: Visible [Embed] [Edit Thumbnail] [Edit] [Hapus] */}
                        <td className="py-4 px-6 text-right space-x-1.5 shrink-0 whitespace-nowrap">
                          {/* 1. Embed Preview */}
                          <button
                            type="button"
                            onClick={() => setPreviewPolicy(pol)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#07529A] rounded-lg transition-colors cursor-pointer text-xs font-medium inline-flex items-center gap-1"
                            title="Pratinjau Instagram Embed"
                          >
                            <Instagram className="w-3 h-3 text-[#E1306C]" />
                            <span>Embed</span>
                          </button>

                          {/* 2. Edit Thumbnail Button (Visible on each item as required) */}
                          <button
                            type="button"
                            onClick={() => openEditThumbnailModal(pol)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg transition-colors cursor-pointer text-xs font-bold inline-flex items-center gap-1"
                            title="Ubah cover atau thumbnail kartu ini"
                          >
                            <ImageIcon className="w-3 h-3 text-amber-700" />
                            <span>Edit Thumbnail</span>
                          </button>

                          {/* 3. Full Edit */}
                          <button
                            type="button"
                            onClick={() =>
                              navigateTo({ name: 'admin-editor', policyId: pol.id })
                            }
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer text-xs font-medium inline-flex items-center gap-1"
                            title="Edit konten lengkap"
                          >
                            <Edit className="w-3 h-3 text-slate-600" />
                            <span>Edit</span>
                          </button>

                          {/* 4. Delete */}
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingPolicy({ id: pol.id, title: pol.title })
                            }
                            className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer text-xs font-medium inline-flex items-center gap-1"
                            title="Hapus konten"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <Instagram className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">
                {searchQuery || filterCluster !== 'all' || filterStatus !== 'all'
                  ? 'Konten Tidak Ditemukan'
                  : 'Belum Ada Konten Kebijakan'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || filterCluster !== 'all' || filterStatus !== 'all'
                  ? 'Tidak ada konten yang sesuai dengan filter atau kata kunci. Silakan sesuaikan filter.'
                  : 'Belum ada konten kebijakan atau postingan Instagram. Klik Tambah Konten untuk mulai menambahkan konten baru.'}
              </p>
              <div className="pt-2">
                {searchQuery || filterCluster !== 'all' || filterStatus !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterCluster('all');
                      setFilterStatus('all');
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Reset Filter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateTo({ name: 'admin-editor' })}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Konten</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DEDICATED EDIT THUMBNAIL MODAL (Requirement 2 & 3) */}
        {editingThumbnailPolicy && (
          <div
            onClick={() => setEditingThumbnailPolicy(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs overflow-y-auto"
          >
            <div
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl max-w-2xl w-full space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Kelola Thumbnail & Cover Postingan
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 max-w-md">
                      {editingThumbnailPolicy.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingThumbnailPolicy(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Switch: Automatic Detection vs Manual Override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Automatic Option */}
                {(() => {
                  const autoDetected = detectInstagramThumbnail(editingThumbnailPolicy);
                  const isAutoActive = modalThumbnailMode === 'auto';
                  return (
                    <label
                      onClick={() => {
                        setModalThumbnailMode('auto');
                        setModalSelectedThumbnail(autoDetected);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isAutoActive
                          ? 'bg-blue-50/90 border-[#07529A] ring-2 ring-[#07529A]/15'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="modal_thumb_mode"
                          checked={isAutoActive}
                          onChange={() => {
                            setModalThumbnailMode('auto');
                            setModalSelectedThumbnail(autoDetected);
                          }}
                          className="mt-0.5 text-[#07529A] focus:ring-[#07529A]"
                        />
                        <div>
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#07529A]" />
                            <span>Gunakan Cover Otomatis</span>
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Mencocokkan cover resmi dari slide pertama postingan Instagram terkait.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center gap-2">
                        <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-300 bg-slate-200 shrink-0">
                          <img
                            src={autoDetected}
                            alt="Cover Otomatis"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[10px] text-slate-700 font-semibold truncate">
                          Cover Terdeteksi
                        </span>
                      </div>
                    </label>
                  );
                })()}

                {/* 2. Manual Override Option */}
                {(() => {
                  const isManualActive = modalThumbnailMode === 'manual';
                  return (
                    <label
                      onClick={() => setModalThumbnailMode('manual')}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isManualActive
                          ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/15'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="modal_thumb_mode"
                          checked={isManualActive}
                          onChange={() => setModalThumbnailMode('manual')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                            <span>Ganti / Override Manual</span>
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Pilih slide lain dari galeri resmi atau unggah file foto dari perangkat.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center gap-2">
                        <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-300 bg-slate-200 shrink-0">
                          <img
                            src={modalSelectedThumbnail || editingThumbnailPolicy.thumbnail}
                            alt="Cover Manual"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[10px] text-amber-800 font-bold truncate">
                          {isManualActive ? 'Kustom Aktif' : 'Pilih untuk kustom'}
                        </span>
                      </div>
                    </label>
                  );
                })()}
              </div>

              {/* Gallery of Available Instagram Slide Covers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Pilihan Slide & Cover Instagram Resmi:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Klik cover untuk memilih
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {AVAILABLE_INSTAGRAM_PREVIEWS.map((item) => {
                    const isSelected = modalSelectedThumbnail === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setModalSelectedThumbnail(item.url);
                          setModalThumbnailMode('manual');
                        }}
                        className={`group relative rounded-xl overflow-hidden border p-1 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#07529A] ring-2 ring-[#07529A] bg-blue-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="aspect-4/3 w-full rounded-lg overflow-hidden bg-slate-100 relative">
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#07529A] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] font-bold text-slate-900 mt-1 line-clamp-1">
                          {item.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload Image from Device */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#07529A] flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      Unggah File Foto / Gambar Baru
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Mendukung JPG, PNG, WEBP dari HP atau Laptop
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => thumbnailFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-[#07529A] hover:bg-[#053d73] text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5" />
                  )}
                  <span>{isUploading ? 'Memproses...' : 'Pilih Foto'}</span>
                </button>
              </div>

              {uploadError && (
                <p className="text-xs text-rose-600 font-semibold">{uploadError}</p>
              )}

              {/* Public Card Live Preview */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Pratinjau Tampilan pada Kartu Website Publik:
                </span>
                <div className="max-w-md mx-auto bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex">
                  <div className="w-32 aspect-4/3 shrink-0 bg-slate-100 relative">
                    <img
                      src={
                        modalThumbnailMode === 'auto'
                          ? detectInstagramThumbnail(editingThumbnailPolicy)
                          : modalSelectedThumbnail || editingThumbnailPolicy.thumbnail
                      }
                      alt="Pratinjau Publik"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <span className="text-[10px] font-bold text-[#07529A]">
                        {categories.find((c) => c.id === editingThumbnailPolicy.categoryId)?.name}
                      </span>
                      <h5 className="font-bold text-xs text-slate-900 line-clamp-1 mt-0.5">
                        {editingThumbnailPolicy.title}
                      </h5>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      Thumbnail ini akan langsung tampil di beranda
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingThumbnailPolicy(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveThumbnailModal}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#07529A] hover:bg-[#053d73] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Thumbnail</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Instagram Embed Preview Modal */}
        {previewPolicy && (
          <div
            onClick={() => setPreviewPolicy(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs overflow-y-auto"
          >
            <div
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl max-w-xl w-full space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E1306C] flex items-center justify-center">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{previewPolicy.title}</h3>
                    <p className="text-[11px] text-slate-500">
                      Klaster: {categories.find((c) => c.id === previewPolicy.categoryId)?.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewPolicy(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Embed Box */}
              <div className="w-full flex justify-center py-2 bg-slate-50 rounded-2xl">
                <InstagramEmbed
                  url={previewPolicy.instagramPostUrl}
                  thumbnail={previewPolicy.thumbnail}
                  clusterName={categories.find((c) => c.id === previewPolicy.categoryId)?.name}
                  title={previewPolicy.title}
                  hideHeader={true}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <a
                  href={previewPolicy.instagramPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#07529A] font-semibold hover:underline"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                  <span>Buka Langsung di Instagram</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewPolicy(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Add Instagram Content Modal */}
        {quickAddOpen && (
          <div
            onClick={() => setQuickAddOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs overflow-y-auto"
          >
            <div
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl max-w-lg w-full space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white flex items-center justify-center">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Tambah Cepat Konten Instagram</h3>
                    <p className="text-[11px] text-slate-500">
                      Tempel tautan postingan Instagram dan tentukan klaster ASN.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickAddOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {quickError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{quickError}</span>
                </div>
              )}

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL Postingan Instagram *
                  </label>
                  <input
                    type="url"
                    value={quickUrl}
                    onChange={(e) => {
                      setQuickUrl(e.target.value);
                      setQuickError(null);
                    }}
                    placeholder="https://www.instagram.com/p/Ddi76RtGXeH/"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tugaskan ke Klaster ASN / Pilar Konten *
                  </label>
                  <select
                    value={quickClusterId}
                    onChange={(e) => setQuickClusterId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-[#07529A] focus:outline-none"
                  >
                    <optgroup label="8 Klaster Manajemen ASN">
                      {categories
                        .filter((c) => c.group !== 'pilar')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </optgroup>
                    {categories.some((c) => c.group === 'pilar') && (
                      <optgroup label="Pilar Konten">
                        {categories
                          .filter((c) => c.group === 'pilar')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Konten (Opsional)
                  </label>
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="Contoh: Mengenal Jabatan Pelaksana"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none"
                  />
                </div>

                {/* Auto detected thumbnail preview in quick add */}
                {(() => {
                  const detected = detectInstagramThumbnail({
                    title: quickTitle,
                    instagramPostUrl: quickUrl,
                    categoryId: quickClusterId,
                  });
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                      <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-300 bg-slate-200 shrink-0">
                        <img
                          src={detected}
                          alt="Cover Terdeteksi"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-[#07529A] block">
                          Cover Otomatis Terdeteksi
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {detected.includes('jabatan_pelaksana')
                            ? 'Cover: JABATAN PELAKSANA'
                            : detected.includes('naik_pangkat')
                            ? 'Cover: NAIK PANGKAT ≠ NAIK JENJANG'
                            : detected.includes('manajemen_talenta')
                            ? 'Cover: MANAJEMEN TALENTA & SISTEM MERIT'
                            : 'Cover Instagram'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Publikasi
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickStatus('published')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        quickStatus === 'published'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Terbit Langsung
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickStatus('draft')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        quickStatus === 'draft'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Simpan sebagai Draf
                    </button>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#07529A] hover:bg-[#053d73] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Konten</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingPolicy && (
          <div
            onClick={() => setDeletingPolicy(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
          >
            <div
              className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-7 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-rose-700">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">Konfirmasi Hapus Konten</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingPolicy(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus konten postingan{' '}
                <strong className="text-slate-900">"{deletingPolicy.title}"</strong>? Perubahan
                akan disimpan secara permanen.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingPolicy(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePolicy}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Konten</span>
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};
