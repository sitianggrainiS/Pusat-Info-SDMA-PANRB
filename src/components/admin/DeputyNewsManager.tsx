import React, { useState, useRef, useMemo } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { DeputyNews, DeputyNewsInput, DeputyNewsStatus } from '../../types';
import { StaticAssetPicker } from './StaticAssetPicker';
import {
  DEFAULT_DEPUTY_NEWS_CATEGORIES,
  validateMenpanArticleUrl,
  validateNewsThumbnail,
  validateUploadedNewsImageFile,
  resolveDeputyNewsImageUrl,
  formatIndonesianNewsDate,
  sortDeputyNewsNewestFirst,
} from '../../utils/deputyNewsUtils';
import {
  Plus,
  Search,
  X,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Newspaper,
  AlertTriangle,
  RefreshCw,
  EyeOff,
  Send,
  Save,
  Calendar,
} from 'lucide-react';

interface DeputyNewsManagerProps {
  externalCreateModalOpen: boolean;
  onCloseExternalCreateModal: () => void;
  onOpenCreateModal: () => void;
  onShowToast: (msg: string) => void;
}

interface FormFieldErrors {
  articleUrl?: string;
  title?: string;
  thumbnailUrl?: string;
  publicationDate?: string;
  summary?: string;
  category?: string;
  general?: string;
}

const NewsThumbnailThumb: React.FC<{ src: string; alt: string; className?: string }> = ({
  src,
  alt,
  className = 'w-16 h-11',
}) => {
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`${className} rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0`}
      >
        <Newspaper className="w-4 h-4 text-[#07529A]/60" />
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0`}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export const DeputyNewsManager: React.FC<DeputyNewsManagerProps> = ({
  externalCreateModalOpen,
  onCloseExternalCreateModal,
  onOpenCreateModal,
  onShowToast,
}) => {
  const {
    deputyNews,
    deputyNewsImageUrls,
    categories,
    isDeputyNewsLoading,
    createDeputyNews,
    updateDeputyNews,
    setDeputyNewsStatus,
    deleteDeputyNews,
  } = usePolicy();

  // Table Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Form Modal State (used for both Create and Edit)
  const [editingNews, setEditingNews] = useState<DeputyNews | null>(null);
  const isFormOpen = externalCreateModalOpen || editingNews !== null;

  // Form Field States (strictly manual, stored locally via localStorage + IndexedDB Blob)
  const [articleUrl, setArticleUrl] = useState('');
  const [title, setTitle] = useState('');
  const [thumbnailMode, setThumbnailMode] = useState<'upload' | 'url'>('upload');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [localFilePreviewUrl, setLocalFilePreviewUrl] = useState('');
  const [existingImageId, setExistingImageId] = useState('');
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImgBroken, setPreviewImgBroken] = useState(false);
  const [clearedExistingUpload, setClearedExistingUpload] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingItem, setDeletingItem] = useState<DeputyNews | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const savingLockRef = useRef<boolean>(false);

  // Manage temporary in-modal object URL lifecycle for newly selected file preview
  React.useEffect(() => {
    if (!selectedImageFile) {
      setLocalFilePreviewUrl('');
      return;
    }
    const previewObjUrl = URL.createObjectURL(selectedImageFile);
    setLocalFilePreviewUrl(previewObjUrl);
    return () => {
      try {
        URL.revokeObjectURL(previewObjUrl);
      } catch {
        // ignore
      }
    };
  }, [selectedImageFile]);

  // Merge official SDMA news categories with dynamic 8 Klaster categories
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_DEPUTY_NEWS_CATEGORIES);
    categories.forEach((c) => {
      if (c.name) set.add(c.name);
    });
    return Array.from(set);
  }, [categories]);

  // Reset form when opening Create Modal
  React.useEffect(() => {
    if (externalCreateModalOpen && !editingNews) {
      const now = new Date();
      const localTodayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setArticleUrl('');
      setTitle('');
      setThumbnailMode('upload');
      setSelectedImageFile(null);
      setExistingImageId('');
      setThumbnailUrlInput('');
      setPublicationDate(localTodayIso);
      setSummary('');
      setCategory(DEFAULT_DEPUTY_NEWS_CATEGORIES[0] || '');
      setFieldErrors({});
      setPreviewImgBroken(false);
      setClearedExistingUpload(false);
    }
  }, [externalCreateModalOpen, editingNews]);

  const openEditModal = (item: DeputyNews) => {
    const hasStoredUpload = Boolean(
      item.imageId || (item.thumbnailUrl && item.thumbnailUrl.startsWith('data:image/'))
    );
    setEditingNews(item);
    setArticleUrl(item.articleUrl);
    setTitle(item.title);
    setThumbnailMode(hasStoredUpload ? 'upload' : 'url');
    setSelectedImageFile(null);
    setExistingImageId(item.imageId || '');
    setThumbnailUrlInput(hasStoredUpload ? '' : item.thumbnailUrl);
    setPublicationDate(item.publicationDate);
    setSummary(item.summary);
    setCategory(item.category || DEFAULT_DEPUTY_NEWS_CATEGORIES[0] || '');
    setFieldErrors({});
    setPreviewImgBroken(false);
    setClearedExistingUpload(false);
  };

  const closeFormModal = () => {
    if (isSubmitting || savingLockRef.current) return;
    setEditingNews(null);
    setSelectedImageFile(null);
    setExistingImageId('');
    setClearedExistingUpload(false);
    onCloseExternalCreateModal();
    setFieldErrors({});
  };

  const hasFallbackDataUrl = Boolean(
    !clearedExistingUpload && editingNews?.thumbnailUrl?.startsWith('data:image/')
  );

  const effectiveThumbnailPreview =
    thumbnailMode === 'upload'
      ? localFilePreviewUrl ||
        (existingImageId ? deputyNewsImageUrls[existingImageId] || '' : '') ||
        (hasFallbackDataUrl ? editingNews?.thumbnailUrl || '' : '')
      : thumbnailUrlInput.trim();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const fileCheck = validateUploadedNewsImageFile(file);
      if (!fileCheck.isValid) {
        setFieldErrors((prev) => ({
          ...prev,
          thumbnailUrl: fileCheck.error,
        }));
        return;
      }

      setFieldErrors((prev) => ({ ...prev, thumbnailUrl: undefined }));
      setSelectedImageFile(file);
      setThumbnailMode('upload');
      setPreviewImgBroken(false);
      setClearedExistingUpload(false);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const validateAllInputs = (): {
    valid: boolean;
    sanitized?: Omit<DeputyNewsInput, 'status'>;
  } => {
    const errors: FormFieldErrors = {};

    // 1. Validate Article Link (HTTPS + menpan.go.id / official subdomain)
    const urlCheck = validateMenpanArticleUrl(articleUrl);
    if (!urlCheck.isValid) {
      errors.articleUrl = urlCheck.error;
    }

    // 2. Validate Title
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      errors.title = 'Judul berita wajib diisi.';
    } else if (cleanTitle.length < 5) {
      errors.title = 'Judul berita minimal terdiri dari 5 karakter.';
    }

    // 3. Validate Thumbnail (Firestore upload OR valid static/external URL)
    let cleanThumbnailUrl = '';
    if (thumbnailMode === 'upload') {
      if (selectedImageFile) {
        const fileCheck = validateUploadedNewsImageFile(selectedImageFile);
        if (!fileCheck.isValid) {
          errors.thumbnailUrl = fileCheck.error;
        } else if (previewImgBroken) {
          errors.thumbnailUrl =
            'File gambar gagal dimuat pada pratinjau. Silakan pilih file gambar yang valid.';
        }
      } else if (!existingImageId && !hasFallbackDataUrl) {
        errors.thumbnailUrl = 'Silakan pilih dan unggah file gambar berita terlebih dahulu.';
      } else if (previewImgBroken) {
        errors.thumbnailUrl =
          'Gambar berita gagal dimuat. Silakan pilih ulang file gambar berita.';
      }
    } else {
      const thumbCheck = validateNewsThumbnail(thumbnailUrlInput);
      if (!thumbCheck.isValid) {
        errors.thumbnailUrl = thumbCheck.error;
      } else if (previewImgBroken) {
        errors.thumbnailUrl =
          'URL gambar gagal dimuat. Pastikan URL mengarah langsung ke file gambar (.jpg, .png, .webp) yang valid dan dapat diakses publik.';
      } else {
        cleanThumbnailUrl = thumbCheck.cleanThumbnail;
      }
    }

    // 4. Validate Publication Date
    const cleanDate = publicationDate.trim();
    if (!cleanDate) {
      errors.publicationDate = 'Tanggal publikasi wajib dipilih.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      errors.publicationDate = 'Format tanggal publikasi tidak valid.';
    }

    // 5. Validate Summary
    const cleanSummary = summary.trim();
    if (!cleanSummary) {
      errors.summary = 'Ringkasan berita wajib diisi.';
    } else if (cleanSummary.length < 10) {
      errors.summary = 'Ringkasan berita terlalu singkat (minimal 10 karakter).';
    }

    // 6. Validate Category
    const cleanCategory = category.trim();
    if (!cleanCategory) {
      errors.category = 'Kategori berita wajib dipilih.';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return { valid: false };
    }

    return {
      valid: true,
      sanitized: {
        articleUrl: urlCheck.cleanUrl,
        title: cleanTitle,
        imageFile: thumbnailMode === 'upload' ? selectedImageFile : null,
        imageId:
          thumbnailMode === 'upload' && !selectedImageFile && existingImageId
            ? existingImageId
            : undefined,
        thumbnailUrl:
          thumbnailMode === 'url'
            ? cleanThumbnailUrl
            : !selectedImageFile && hasFallbackDataUrl
            ? editingNews?.thumbnailUrl || ''
            : '',
        publicationDate: cleanDate,
        summary: cleanSummary,
        category: cleanCategory,
      },
    };
  };

  const handleSaveWithStatus = async (targetStatus: DeputyNewsStatus) => {
    if (savingLockRef.current || isSubmitting) return;

    const validation = validateAllInputs();
    if (!validation.valid || !validation.sanitized) return;

    try {
      savingLockRef.current = true;
      setIsSubmitting(true);
      setFieldErrors((prev) => ({ ...prev, general: undefined }));

      const payload: DeputyNewsInput = {
        ...validation.sanitized,
        status: targetStatus,
      };

      if (editingNews) {
        await updateDeputyNews(editingNews.id, payload);
        onShowToast(
          targetStatus === 'published'
            ? 'Perubahan berita dan gambar berhasil disimpan serta diterbitkan ke beranda publik.'
            : 'Perubahan berita berhasil disimpan sebagai Draft.'
        );
      } else {
        await createDeputyNews(payload);
        onShowToast(
          targetStatus === 'published'
            ? 'Berita Deputi dan gambar berhasil disimpan serta ditampilkan di beranda publik.'
            : 'Berita Deputi berhasil disimpan sebagai Draft.'
        );
      }

      setEditingNews(null);
      setSelectedImageFile(null);
      setExistingImageId('');
      setClearedExistingUpload(false);
      onCloseExternalCreateModal();
    } catch (err: any) {
      setFieldErrors((prev) => ({
        ...prev,
        general: err?.message || 'Terjadi kesalahan saat menyimpan data berita ke Cloud Firestore.',
      }));
    } finally {
      savingLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleToggleRowPublishStatus = async (item: DeputyNews) => {
    const nextStatus: DeputyNewsStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      setBusyRowId(item.id);
      await setDeputyNewsStatus(item.id, nextStatus);
      onShowToast(
        nextStatus === 'published'
          ? `Berita "${item.title}" berhasil diterbitkan ke beranda publik.`
          : `Publikasi berita "${item.title}" dibatalkan (dikembalikan ke Draft).`
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Gagal memperbarui status berita.');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      await deleteDeputyNews(deletingItem.id);
      onShowToast(`Berita "${deletingItem.title}" berhasil dihapus.`);
      setDeletingItem(null);
    } catch (err: any) {
      onShowToast(err?.message || 'Gagal menghapus berita.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered and sorted news list (by title search + Draft/Terbit filter)
  const sortedAll = useMemo(() => sortDeputyNewsNewestFirst(deputyNews), [deputyNews]);

  const filteredNews = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sortedAll.filter((item) => {
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchTitle = !q || item.title.toLowerCase().includes(q);
      return matchStatus && matchTitle;
    });
  }, [sortedAll, searchQuery, statusFilter]);

  const publishedCount = sortedAll.filter((n) => n.status === 'published').length;
  const draftCount = sortedAll.filter((n) => n.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Device Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Search & Status Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search by Title */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan judul berita..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#07529A] focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                aria-label="Hapus kata kunci pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2">
            <span className="text-[11px] text-slate-500">
              Sumber resmi: <span className="font-semibold text-slate-700">menpan.go.id</span>
            </span>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex sm:hidden items-center gap-1.5 px-3 py-2 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Berita</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs (Semua, Terbit, Draft) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          {[
            { id: 'all' as const, label: `Semua Berita (${sortedAll.length})` },
            { id: 'published' as const, label: `Terbit (${publishedCount})` },
            { id: 'draft' as const, label: `Draft (${draftCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 tabular-nums transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#07529A] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* News Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isDeputyNewsLoading && sortedAll.length === 0 ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="h-14 rounded-xl bg-slate-100 animate-pulse border border-slate-200/60"
              />
            ))}
          </div>
        ) : filteredNews.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 w-20">Thumbnail</th>
                  <th className="py-3.5 px-4">Judul Berita</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Status Publikasi</th>
                  <th className="py-3.5 px-4">Tanggal Publikasi</th>
                  <th className="py-3.5 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNews.map((item) => {
                  const isRowBusy = busyRowId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Thumbnail */}
                      <td className="py-3.5 px-4">
                        <NewsThumbnailThumb
                          src={resolveDeputyNewsImageUrl(item, deputyNewsImageUrls)}
                          alt={item.title}
                        />
                      </td>

                      {/* Judul Berita & Ringkasan singkat */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                          {item.title}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                          {item.summary}
                        </p>
                      </td>

                      {/* Kategori */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#07529A] text-xs">
                          {item.category}
                        </span>
                      </td>

                      {/* Status Publikasi */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.status === 'published' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Terbit</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      {/* Tanggal Publikasi */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap tabular-nums">
                        {formatIndonesianNewsDate(item.publicationDate)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-6 text-right space-x-1.5 whitespace-nowrap">
                        {/* 1. Lihat Artikel Sumber */}
                        <a
                          href={item.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#07529A] rounded-lg transition-colors text-xs font-semibold inline-flex items-center gap-1"
                          title="Buka artikel asli di website menpan.go.id"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>Sumber</span>
                        </a>

                        {/* 2. Edit Berita */}
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer text-xs font-semibold inline-flex items-center gap-1"
                          title="Edit informasi berita"
                        >
                          <Edit className="w-3 h-3 text-slate-600 shrink-0" />
                          <span>Edit</span>
                        </button>

                        {/* 3. Batalkan Publikasi / Terbitkan */}
                        {item.status === 'published' ? (
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => handleToggleRowPublishStatus(item)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg transition-colors cursor-pointer text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                            title="Batalkan publikasi agar tidak tampil di beranda publik"
                          >
                            <EyeOff className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>Batalkan Publikasi</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => handleToggleRowPublishStatus(item)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                            title="Terbitkan berita ke beranda publik"
                          >
                            <Send className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span>Terbitkan</span>
                          </button>
                        )}

                        {/* 4. Hapus Berita */}
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer text-xs font-semibold inline-flex items-center gap-1"
                          title="Hapus berita permanen"
                        >
                          <Trash2 className="w-3 h-3 shrink-0" />
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
          /* Empty State */
          <div className="py-14 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#07529A] flex items-center justify-center mx-auto">
              <Newspaper className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Berita Tidak Ditemukan'
                : 'Belum Ada Berita Deputi SDM Aparatur'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {searchQuery || statusFilter !== 'all'
                ? 'Tidak ada berita yang sesuai dengan kata kunci pencarian atau filter status yang dipilih.'
                : 'Tambahkan berita resmi dari portal Kementerian PANRB (menpan.go.id) untuk ditampilkan pada bagian Berita Deputi SDM Aparatur di beranda publik.'}
            </p>
            <div className="pt-2">
              {searchQuery || statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Reset Pencarian & Filter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Berita Pertama</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* FORM MODAL: TAMBAH / EDIT BERITA DEPUTI                                */}
      {/* ===================================================================== */}
      {isFormOpen && (
        <div
          onClick={closeFormModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs overflow-y-auto"
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl max-w-2xl w-full space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#07529A] text-[#FFD84D] flex items-center justify-center shrink-0">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingNews ? 'Edit Berita Deputi SDM Aparatur' : 'Tambah Berita Deputi Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Masukkan seluruh informasi berita secara manual dari sumber resmi Kementerian PANRB.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                aria-label="Tutup formulir"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {fieldErrors.general && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{fieldErrors.general}</span>
              </div>
            )}

            {/* Form Body */}
            <div className="space-y-4 text-xs max-h-[68vh] overflow-y-auto pr-1">
              {/* 1. Link Artikel */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Link Artikel Resmi (menpan.go.id) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={articleUrl}
                    onChange={(e) => {
                      setArticleUrl(e.target.value);
                      if (fieldErrors.articleUrl) {
                        setFieldErrors((prev) => ({ ...prev, articleUrl: undefined }));
                      }
                    }}
                    placeholder="https://www.menpan.go.id/site/berita-terkini/..."
                    className={`w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors ${
                      fieldErrors.articleUrl
                        ? 'border-rose-500 bg-rose-50/30 focus:border-rose-600'
                        : 'border-slate-300 focus:border-[#07529A] bg-white'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Wajib diawali <span className="font-mono font-semibold">https://</span> dari domain resmi <span className="font-mono font-semibold">menpan.go.id</span> atau subdomainnya.
                </p>
                {fieldErrors.articleUrl && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.articleUrl}</span>
                  </p>
                )}
              </div>

              {/* 2. Judul Berita */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Judul Berita <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) {
                      setFieldErrors((prev) => ({ ...prev, title: undefined }));
                    }
                  }}
                  placeholder="Masukkan judul berita yang akan ditampilkan di beranda..."
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors ${
                    fieldErrors.title
                      ? 'border-rose-500 bg-rose-50/30 focus:border-rose-600'
                      : 'border-slate-300 focus:border-[#07529A] bg-white'
                  }`}
                />
                {fieldErrors.title && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.title}</span>
                  </p>
                )}
              </div>

              {/* 3. Kategori & Tanggal Publikasi (2 columns on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kategori Berita <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (fieldErrors.category) {
                        setFieldErrors((prev) => ({ ...prev, category: undefined }));
                      }
                    }}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors ${
                      fieldErrors.category
                        ? 'border-rose-500 bg-rose-50/30 focus:border-rose-600'
                        : 'border-slate-300 focus:border-[#07529A] bg-white'
                    }`}
                  >
                    <option value="">-- Pilih Kategori Berita --</option>
                    {categoryOptions.map((catName) => (
                      <option key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.category}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tanggal Publikasi <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={publicationDate}
                      onChange={(e) => {
                        setPublicationDate(e.target.value);
                        if (fieldErrors.publicationDate) {
                          setFieldErrors((prev) => ({ ...prev, publicationDate: undefined }));
                        }
                      }}
                      className={`w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border tabular-nums focus:outline-none transition-colors ${
                        fieldErrors.publicationDate
                          ? 'border-rose-500 bg-rose-50/30 focus:border-rose-600'
                          : 'border-slate-300 focus:border-[#07529A] bg-white'
                      }`}
                    />
                  </div>
                  {fieldErrors.publicationDate ? (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.publicationDate}</span>
                    </p>
                  ) : (
                    publicationDate.trim() && (
                      <p className="text-[11px] font-medium text-emerald-700 mt-1 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Ditampilkan pada tabel & beranda:{' '}
                          <strong className="font-bold">
                            {formatIndonesianNewsDate(publicationDate)}
                          </strong>
                        </span>
                      </p>
                    )
                  )}
                </div>
              </div>

              {/* 4. Gambar / Thumbnail Berita */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Gambar / Thumbnail Berita <span className="text-rose-600">*</span>
                  </label>
                  {/* Segmented Mode Control */}
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailMode('upload');
                        setFieldErrors((prev) => ({ ...prev, thumbnailUrl: undefined }));
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        thumbnailMode === 'upload'
                          ? 'bg-white text-[#07529A] shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload Gambar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailMode('url');
                        setFieldErrors((prev) => ({ ...prev, thumbnailUrl: undefined }));
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        thumbnailMode === 'url'
                          ? 'bg-white text-[#07529A] shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Aset Proyek / URL Gambar
                    </button>
                  </div>
                </div>

                {thumbnailMode === 'url' ? (
                  <div className="space-y-3">
                    <StaticAssetPicker
                      selectedUrl={thumbnailUrlInput}
                      compact
                      onSelect={(assetPath) => {
                        setThumbnailUrlInput(assetPath);
                        setPreviewImgBroken(false);
                        setFieldErrors((prev) => ({ ...prev, thumbnailUrl: undefined }));
                      }}
                    />

                    <div>
                      <input
                        type="text"
                        value={thumbnailUrlInput}
                        onChange={(e) => {
                          setThumbnailUrlInput(e.target.value);
                          setPreviewImgBroken(false);
                          if (fieldErrors.thumbnailUrl) {
                            setFieldErrors((prev) => ({ ...prev, thumbnailUrl: undefined }));
                          }
                        }}
                        placeholder="/images/nama-gambar.jpg atau https://www.menpan.go.id/images/..."
                        className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors ${
                          fieldErrors.thumbnailUrl
                            ? 'border-rose-500 bg-rose-50/30 focus:border-rose-600'
                            : 'border-slate-300 focus:border-[#07529A] bg-white'
                        }`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div
                      className={`p-4 rounded-2xl border border-dashed flex flex-col sm:flex-row items-center justify-between gap-3 ${
                        fieldErrors.thumbnailUrl
                          ? 'border-rose-400 bg-rose-50/20'
                          : 'border-slate-300 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#07529A] flex items-center justify-center shrink-0">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {selectedImageFile
                              ? selectedImageFile.name
                              : existingImageId || hasFallbackDataUrl
                              ? 'Gambar tersimpan di Cloud Firestore'
                              : 'Pilih file gambar berita dari perangkat'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Format JPG, PNG, atau WEBP (maks. 15 MB). Dikompresi otomatis dan disimpan permanen di Cloud Firestore.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="px-3.5 py-2 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                      >
                        {isUploadingImage ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {selectedImageFile || existingImageId || hasFallbackDataUrl
                            ? 'Ganti Gambar'
                            : 'Pilih Gambar'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Thumbnail Preview */}
                {effectiveThumbnailPreview && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                        {!previewImgBroken ? (
                          <img
                            src={effectiveThumbnailPreview}
                            alt="Pratinjau Thumbnail Berita"
                            referrerPolicy="no-referrer"
                            onError={() => setPreviewImgBroken(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Newspaper className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">Pratinjau Thumbnail</p>
                        {previewImgBroken ? (
                          <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
                            Gambar tidak valid atau gagal dimuat. Periksa kembali file atau tautan gambar sebelum menyimpan.
                          </p>
                        ) : (
                          <p className="text-[11px] text-emerald-700 font-medium truncate mt-0.5">
                            ✓ Gambar berhasil dimuat & siap ditampilkan pada kartu berita publik.
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (thumbnailMode === 'upload') {
                          setSelectedImageFile(null);
                          setExistingImageId('');
                          setClearedExistingUpload(true);
                        } else {
                          setThumbnailUrlInput('');
                        }
                        setPreviewImgBroken(false);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    >
                      Hapus
                    </button>
                  </div>
                )}

                {fieldErrors.thumbnailUrl && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.thumbnailUrl}</span>
                  </p>
                )}
              </div>

              {/* 5. Ringkasan Berita */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Ringkasan Berita <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {summary.trim().length} karakter
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    if (fieldErrors.summary) {
                      setFieldErrors((prev) => ({ ...prev, summary: undefined }));
                    }
                  }}
                  placeholder="Tuliskan ringkasan singkat isi berita yang informatif untuk ditampilkan di beranda..."
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors leading-relaxed ${
                    fieldErrors.summary
                      ? 'border-rose-500 bg-rose-50/30 focus:border-rose-600'
                      : 'border-slate-300 focus:border-[#07529A] bg-white'
                  }`}
                />
                {fieldErrors.summary && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.summary}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer: Batal | Simpan sebagai Draft | Upload & Terbitkan */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Batal
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveWithStatus('draft')}
                  className="px-4 py-2.5 text-xs font-bold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-amber-700" />
                  <span>Simpan sebagai Draft</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveWithStatus('published')}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#07529A] hover:bg-[#053d73] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-[#FFD84D]" />
                  )}
                  <span>Upload & Terbitkan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DELETE CONFIRMATION MODAL                                             */}
      {/* ===================================================================== */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-7 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Hapus Berita Deputi</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus berita{' '}
              <strong className="text-slate-900">"{deletingItem.title}"</strong>? Berita yang
              dihapus akan dihilangkan secara permanen dari sistem dan beranda publik.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus Berita'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
