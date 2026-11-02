import React, { useState } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { SourceDocument } from '../../types';
import { Plus, Edit, Trash2, Save, X, ExternalLink, ShieldCheck, FileText } from 'lucide-react';

export const AdminSourceManager: React.FC = () => {
  const { sources, policies, createSource, updateSource, deleteSource } = usePolicy();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [regulationType, setRegulationType] = useState('Peraturan Menteri PANRB');
  const [regulationNumber, setRegulationNumber] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [articles, setArticles] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [description, setDescription] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [deletingSource, setDeletingSource] = useState<{ id: string; title: string } | null>(null);

  const startEdit = (src: SourceDocument) => {
    setEditingId(src.id);
    setTitle(src.title);
    setRegulationType(src.regulationType);
    setRegulationNumber(src.regulationNumber);
    setYear(src.year);
    setArticles(src.articles || '');
    setFileUrl(src.fileUrl || '');
    setDescription(src.description || '');
    setIsAdding(false);
    setFormError(null);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setTitle('');
    setRegulationType('Peraturan Menteri PANRB');
    setRegulationNumber('');
    setYear(new Date().getFullYear().toString());
    setArticles('');
    setFileUrl('');
    setDescription('');
    setFormError(null);
  };

  const cancelForm = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !regulationNumber.trim()) {
      setFormError('Judul dokumen dan nomor regulasi wajib diisi.');
      return;
    }

    try {
      setFormError(null);
      if (isAdding) {
        await createSource({
          title: title.trim(),
          regulationType,
          regulationNumber: regulationNumber.trim(),
          year: year.trim(),
          articles: articles.trim(),
          fileUrl: fileUrl.trim(),
          description: description.trim(),
          isVerified: true,
        });
      } else if (editingId) {
        await updateSource(editingId, {
          title: title.trim(),
          regulationType,
          regulationNumber: regulationNumber.trim(),
          year: year.trim(),
          articles: articles.trim(),
          fileUrl: fileUrl.trim(),
          description: description.trim(),
        });
      }

      cancelForm();
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan dokumen regulasi ke Cloud Firestore.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingSource) return;
    try {
      await deleteSource(deletingSource.id);
      setDeletingSource(null);
    } catch (err: any) {
      setDeletingSource(null);
      setFormError(err?.message || 'Gagal menghapus dokumen regulasi dari Cloud Firestore.');
    }
  };

  return (
    <AdminLayout activeNav="sources">
      <div className="space-y-6 max-w-5xl">
        {!isAdding && !editingId && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Dokumen Regulasi</span>
            </button>
          </div>
        )}

        {/* Form */}
        {(isAdding || editingId) && (
          <div className="bg-white rounded-3xl border border-blue-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {isAdding ? 'Tambah Dokumen Regulasi Baru' : 'Edit Dokumen Regulasi'}
              </h3>
              <button onClick={cancelForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Peraturan *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 1 Tahun 2023..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:ring-3 focus:ring-[#07529A]/10 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Regulasi
                </label>
                <select
                  value={regulationType}
                  onChange={(e) => setRegulationType(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:ring-3 focus:ring-[#07529A]/10 focus:outline-none transition-all bg-white"
                >
                  <option value="Peraturan Menteri PANRB">Peraturan Menteri PANRB</option>
                  <option value="Keputusan Menteri PANRB">Keputusan Menteri PANRB</option>
                  <option value="Surat Edaran Menteri PANRB">Surat Edaran Menteri PANRB</option>
                  <option value="Peraturan BKN">Peraturan BKN</option>
                  <option value="Surat Edaran BKN">Surat Edaran BKN</option>
                  <option value="Peraturan Pemerintah (PP)">Peraturan Pemerintah (PP)</option>
                  <option value="Undang-Undang (UU)">Undang-Undang (UU)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Regulasi *
                </label>
                <input
                  type="text"
                  value={regulationNumber}
                  onChange={(e) => setRegulationNumber(e.target.value)}
                  placeholder="Nomor 1 Tahun 2023"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:ring-3 focus:ring-[#07529A]/10 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Pengundangan
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2023"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:ring-3 focus:ring-[#07529A]/10 focus:outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tautan File / Portal JDIH Resmi
                </label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://jdih.menpan.go.id/dokumen-hukum/..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:ring-3 focus:ring-[#07529A]/10 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pasal-Pasal Relevan
                </label>
                <input
                  type="text"
                  value={articles}
                  onChange={(e) => setArticles(e.target.value)}
                  placeholder="Pasal 29, Pasal 30, dsb."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:ring-3 focus:ring-[#07529A]/10 focus:outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Singkat Isi Kebijakan
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan singkat tentang materi pokok yang diatur..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:ring-3 focus:ring-[#07529A]/10 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={cancelForm}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#07529A] rounded-lg hover:bg-[#053d73] flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Dokumen</span>
              </button>
            </div>
          </div>
        )}

        {/* Sources List */}
        <div className="space-y-4">
          {sources.map((src) => {
            const attachedPolicies = policies.filter((p) =>
              p.sources.some((s) => s.id === src.id)
            );
            return (
              <div
                key={src.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#07529A]/35 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-[#07529A]">{src.regulationType}</span>
                    <span>·</span>
                    <span className="font-mono">{src.regulationNumber}</span>
                    <span>·</span>
                    <span>Tahun {src.year}</span>
                    {src.isVerified && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Terverifikasi JDIH
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{src.title}</h4>

                  {src.articles && (
                    <p className="text-xs text-slate-600 font-mono">
                      Rujukan Pasal: {src.articles}
                    </p>
                  )}

                  {src.description && (
                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      {src.description}
                    </p>
                  )}

                  <div className="pt-1 text-[11px] text-slate-400">
                    Digunakan oleh {attachedPolicies.length} kebijakan: {attachedPolicies.map(p => p.title).join(', ') || 'Belum ditautkan'}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                  {src.fileUrl && (
                    <a
                      href={src.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-500 hover:text-[#07529A] bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Buka link JDIH"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => startEdit(src)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingSource({ id: src.id, title: src.title })}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delete Confirmation Modal */}
        {deletingSource && (
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
                  <h3 className="font-bold text-sm text-slate-900">Konfirmasi Hapus Dokumen</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingSource(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus dokumen <strong className="text-slate-900">"{deletingSource.title}"</strong> dari daftar sumber regulasi?
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingSource(null)}
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
                  <span>Hapus Dokumen</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
