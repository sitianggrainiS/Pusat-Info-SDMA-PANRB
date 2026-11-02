import React, { useState, useEffect } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Category } from '../../types';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Layers,
  ArrowUpDown,
  FileText,
  Info,
} from 'lucide-react';

export const AdminCategoryManager: React.FC = () => {
  const {
    categories,
    policies,
    createCategory,
    updateCategory,
    deleteCategory,
    resetCategoriesToDefault,
    navigateTo,
  } = usePolicy();

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'has_policies' | 'no_policies'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'name_asc' | 'name_desc' | 'policy_desc'>('default');

  // Modal states
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form field states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('Award');
  const [formError, setFormError] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const availableIcons = [
    'UserCheck',
    'ShieldCheck',
    'Target',
    'TrendingUp',
    'GraduationCap',
    'School',
    'Landmark',
    'Award',
    'Briefcase',
    'Sparkles',
    'Users',
    'HeartHandshake',
    'Scale',
    'CheckCircle2',
    'Layers',
    'Building2',
    'UserMinus',
    'Cpu',
    'BookOpen',
    'FileText',
  ];

  // Helper to generate slug
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Open Add Topic Form
  const startAdd = () => {
    setIsAdding(true);
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setIconName('Award');
    setFormError(null);
  };

  // Open Edit Topic Form
  const startEdit = (cat: Category) => {
    setIsAdding(false);
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description);
    setIconName(cat.iconName || 'Award');
    setFormError(null);
  };

  // Close Add/Edit Form
  const cancelForm = () => {
    setIsAdding(false);
    setEditingCategory(null);
    setFormError(null);
  };

  // Save Topic (Create or Update)
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Nama topik tidak boleh kosong.');
      return;
    }

    const finalSlug = slug.trim() ? generateSlug(slug) : generateSlug(trimmedName);

    try {
      setFormError(null);
      if (isAdding) {
        // Check for duplicate slug
        const slugExists = categories.some((c) => c.slug === finalSlug);
        const uniqueSlug = slugExists ? `${finalSlug}-${Date.now().toString().slice(-4)}` : finalSlug;

        const created = await createCategory({
          name: trimmedName,
          slug: uniqueSlug,
          description: description.trim(),
          iconName,
        });

        showToast(`Topik "${created.name}" berhasil disimpan ke Cloud Firestore!`, 'success');
      } else if (editingCategory) {
        // Check for duplicate slug among other categories
        const slugExists = categories.some(
          (c) => c.slug === finalSlug && c.id !== editingCategory.id
        );
        const uniqueSlug = slugExists ? `${finalSlug}-${Date.now().toString().slice(-4)}` : finalSlug;

        await updateCategory(editingCategory.id, {
          name: trimmedName,
          slug: uniqueSlug,
          description: description.trim(),
          iconName,
        });

        showToast(`Topik "${trimmedName}" berhasil diperbarui di Cloud Firestore!`, 'success');
      }

      cancelForm();
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan topik ke Cloud Firestore.');
    }
  };

  // Open Delete Confirmation Modal
  const startDelete = (cat: Category) => {
    setDeletingCategory(cat);
    // Find an alternative category for reassignment if needed
    const otherCats = categories.filter((c) => c.id !== cat.id);
    if (otherCats.length > 0) {
      setReassignTargetId(otherCats[0].id);
    } else {
      setReassignTargetId('');
    }
  };

  // Close Delete Confirmation Modal
  const cancelDelete = () => {
    setDeletingCategory(null);
    setReassignTargetId('');
  };

  // Confirm Delete Topic
  const confirmDelete = async () => {
    if (!deletingCategory) return;
    const catName = deletingCategory.name;
    const attachedCount = policies.filter((p) => p.categoryId === deletingCategory.id).length;

    try {
      await deleteCategory(deletingCategory.id, reassignTargetId || undefined);

      if (attachedCount > 0 && reassignTargetId) {
        const targetCat = categories.find((c) => c.id === reassignTargetId);
        showToast(
          `Topik "${catName}" dihapus. Sebanyak ${attachedCount} kebijakan dialihkan ke "${targetCat?.name || 'topik lain'}".`,
          'info'
        );
      } else {
        showToast(`Topik "${catName}" berhasil dihapus dari Cloud Firestore.`, 'success');
      }

      cancelDelete();
    } catch (err: any) {
      cancelDelete();
      showToast(err?.message || 'Gagal menghapus topik dari Cloud Firestore.', 'error');
    }
  };

  // Reset to default 8 Klaster + Pilar Sekolah Kedinasan
  const handleResetToDefault = async () => {
    try {
      await resetCategoriesToDefault();
      setShowResetConfirm(false);
      showToast(
        'Kategori telah dikembalikan ke 8 Klaster Manajemen ASN & Pilar Sekolah Kedinasan standar di Cloud Firestore.',
        'success'
      );
    } catch (err: any) {
      setShowResetConfirm(false);
      showToast(err?.message || 'Gagal mereset kategori ke Cloud Firestore.', 'error');
    }
  };

  // Filter and sort categories
  const filteredAndSortedCategories = categories
    .filter((cat) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Tab filter
      const attachedPoliciesCount = policies.filter((p) => p.categoryId === cat.id).length;
      if (filterTab === 'has_policies') return attachedPoliciesCount > 0;
      if (filterTab === 'no_policies') return attachedPoliciesCount === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'id');
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name, 'id');
      }
      if (sortBy === 'policy_desc') {
        const countA = policies.filter((p) => p.categoryId === a.id).length;
        const countB = policies.filter((p) => p.categoryId === b.id).length;
        return countB - countA;
      }
      return 0; // default order
    });

  const categoriesWithPoliciesCount = categories.filter(
    (c) => policies.filter((p) => p.categoryId === c.id).length > 0
  ).length;
  const categoriesWithoutPoliciesCount = categories.length - categoriesWithPoliciesCount;

  return (
    <AdminLayout activeNav="categories">
      <div className="space-y-6 max-w-5xl">
        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
              <span className="font-semibold">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 p-1"
              title="Tutup pesan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search, Filter, and Sorting Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama topik, slug, atau deskripsi..."
                className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#07529A] focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Bersihkan pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort & Topic Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Urutan:</span>
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#07529A]"
              >
                <option value="default">Urutan Standar</option>
                <option value="name_asc">Nama Topik (A-Z)</option>
                <option value="name_desc">Nama Topik (Z-A)</option>
                <option value="policy_desc">Kebijakan Terbanyak</option>
              </select>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                title="Pulihkan susunan 8 Klaster Manajemen ASN & Pilar Sekolah Kedinasan bawaan"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Pulihkan Standar</span>
              </button>
              <button
                type="button"
                onClick={startAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Topik</span>
              </button>
            </div>
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#07529A] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Semua Topik ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('has_policies')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterTab === 'has_policies'
                  ? 'bg-[#07529A] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Memiliki Kebijakan ({categoriesWithPoliciesCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('no_policies')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterTab === 'no_policies'
                  ? 'bg-[#07529A] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Belum Ada Kebijakan ({categoriesWithoutPoliciesCount})
            </button>
          </div>
        </div>

        {/* Modal / Card Form for Add & Edit */}
        {(isAdding || editingCategory) && (
          <div
            onClick={cancelForm}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs overflow-y-auto"
          >
            <div
              className="bg-white rounded-3xl border border-blue-200 p-6 sm:p-7 shadow-2xl max-w-2xl w-full space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Form Header with Close Button */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#07529A] flex items-center justify-center">
                    <CategoryIcon name={iconName} className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {isAdding ? 'Tambah Topik Baru' : `Edit Topik: ${editingCategory?.name}`}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Rumpun Klaster Manajemen ASN Kebijakan Publik
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Tutup formulir"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Validation error display */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Topik (Klaster Manajemen ASN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setFormError(null);
                      if (isAdding) {
                        setSlug(generateSlug(e.target.value));
                      }
                    }}
                    placeholder="Contoh: Perencanaan Kebutuhan dan Pengadaan ASN"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Slug URL
                  </label>
                  <div className="flex items-center">
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-3 py-2.5 rounded-l-xl border border-r-0 border-slate-300">
                      /kategori/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(generateSlug(e.target.value))}
                      placeholder="perencanaan-kebutuhan-dan-pengadaan-asn"
                      className="w-full text-xs font-mono px-3 py-2.5 rounded-r-xl border border-slate-300 focus:border-[#07529A] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi Ringkup Kebijakan
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Uraikan ruang lingkup atau batasan kebijakan pada klaster ini..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Pilih Ikon Simbol
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                    {availableIcons.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setIconName(ic)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] transition-colors cursor-pointer ${
                          iconName === ic
                            ? 'bg-[#07529A] text-white border-[#07529A] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <CategoryIcon name={ic} className="w-4 h-4" />
                        <span className="truncate max-w-full text-[9px]">{ic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Action Buttons: Cancel and Save */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#07529A] hover:bg-[#053d73] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Topik</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingCategory && (
          <div
            onClick={cancelDelete}
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
                  <h3 className="font-bold text-sm text-slate-900">Konfirmasi Hapus Topik</h3>
                </div>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title="Tutup dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  Apakah Anda yakin ingin menghapus topik{' '}
                  <strong className="text-slate-900">"{deletingCategory.name}"</strong>?
                </p>

                {(() => {
                  const attached = policies.filter((p) => p.categoryId === deletingCategory.id);
                  if (attached.length > 0) {
                    const otherOptions = categories.filter((c) => c.id !== deletingCategory.id);
                    return (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <span className="font-semibold">
                            Perhatian: Terdapat {attached.length} kebijakan yang menggunakan topik ini:
                          </span>
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-amber-800 pl-1 space-y-0.5">
                          {attached.map((p) => (
                            <li key={p.id} className="truncate">
                              {p.title}
                            </li>
                          ))}
                        </ul>

                        {otherOptions.length > 0 && (
                          <div className="pt-2 border-t border-amber-200/80">
                            <label className="block text-[11px] font-bold text-amber-900 mb-1">
                              Alihkan kebijakan ke topik berikut:
                            </label>
                            <select
                              value={reassignTargetId}
                              onChange={(e) => setReassignTargetId(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 focus:outline-none"
                            >
                              {otherOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <p className="text-slate-500 text-[11px]">
                      Topik ini tidak memiliki kebijakan yang ditautkan. Penghapusan aman dilakukan.
                    </p>
                  );
                })()}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Topik</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div
            onClick={() => setShowResetConfirm(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
          >
            <div
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <RotateCcw className="w-4 h-4 text-[#07529A]" />
                  <h3 className="font-bold text-sm text-slate-900">Pulihkan Topik Standar</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda ingin mengembalikan daftar topik menjadi <strong>8 Klaster Manajemen ASN & Pilar Konten Sekolah Kedinasan standar</strong>? Perubahan kustom pada kategori topik akan disesuaikan kembali ke definisi resmi.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#07529A] hover:bg-[#053d73] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Ya, Pulihkan Standar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Topics Table List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Daftar Topik Kebijakan ({filteredAndSortedCategories.length} dari {categories.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Setiap topik mewakili klaster manajemen ASN dan menghubungkan konten edukasi dengan regulasi.
              </p>
            </div>
          </div>

          {filteredAndSortedCategories.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-6">Klaster / Topik</th>
                    <th className="py-3.5 px-4">Deskripsi</th>
                    <th className="py-3.5 px-4">Kebijakan Terkait</th>
                    <th className="py-3.5 px-6 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedCategories.map((cat, index) => {
                    const policyList = policies.filter((p) => p.categoryId === cat.id);
                    const policyCount = policyList.length;

                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#07529A] flex items-center justify-center shrink-0 border border-blue-100/80 mt-0.5">
                              <CategoryIcon name={cat.iconName} className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs">
                                  {cat.name}
                                </span>
                                {cat.group === 'pilar' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                                    Pilar Konten
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 font-mono text-[10px] text-slate-400">
                                <span>/kategori/{cat.slug}</span>
                                <button
                                  type="button"
                                  onClick={() => navigateTo({ name: 'category-detail', slug: cat.slug })}
                                  className="text-slate-400 hover:text-[#07529A] transition-colors p-0.5"
                                  title="Buka halaman publik topik ini"
                                >
                                  <ExternalLink className="w-3 h-3 inline" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-slate-600 max-w-sm">
                          <p className="line-clamp-2 text-xs leading-relaxed">{cat.description}</p>
                        </td>

                        <td className="py-4 px-4 text-slate-700">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              policyCount > 0
                                ? 'bg-blue-50 text-[#07529A] border border-blue-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {policyCount} Kebijakan
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 rounded-lg transition-colors cursor-pointer text-xs font-medium"
                            title="Edit data topik"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => startDelete(cat)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer text-xs font-medium"
                            title="Hapus topik ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Topik Tidak Ditemukan</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery
                  ? `Tidak ada topik yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain atau bersihkan filter.`
                  : 'Belum ada topik yang sesuai dengan filter yang dipilih.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                  >
                    Bersihkan Pencarian
                  </button>
                )}
                <button
                  type="button"
                  onClick={startAdd}
                  className="px-3.5 py-1.5 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Topik Baru</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
