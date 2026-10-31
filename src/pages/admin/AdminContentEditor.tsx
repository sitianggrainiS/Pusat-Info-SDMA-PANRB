import React, { useState, useEffect, useRef } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Policy, PolicyStatus, SourceDocument } from '../../types';
import { InstagramEmbed, extractInstagramInfo } from '../../components/common/InstagramEmbed';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { CalendarDatePicker } from '../../components/common/CalendarDatePicker';
import { STANDARD_KLASTER_IDS } from '../../data/initialData';
import {
  detectInstagramThumbnail,
  AVAILABLE_INSTAGRAM_PREVIEWS,
  compressImageFile,
} from '../../utils/thumbnailUtils';
import {
  detectRegulationFromUrl,
  POPULAR_REGULATION_PRESETS,
} from '../../utils/regulationUtils';
import {
  Save,
  ArrowLeft,
  Instagram,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Info,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  FolderOpen,
  X,
  Check,
  FileText,
  Plus,
  Trash2,
  Shield,
  ShieldCheck,
  Loader2,
  BookOpen,
} from 'lucide-react';

interface AdminContentEditorProps {
  policyId?: string;
  initialDraftData?: Partial<Policy>;
}

export const AdminContentEditor: React.FC<AdminContentEditorProps> = ({
  policyId,
  initialDraftData,
}) => {
  const { policies, categories, createPolicy, updatePolicy, navigateTo } = usePolicy();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingPolicy = policyId ? policies.find((p) => p.id === policyId) : undefined;

  // Form states
  const [instagramPostUrl, setInstagramPostUrl] = useState(
    existingPolicy?.instagramPostUrl || initialDraftData?.instagramPostUrl || ''
  );
  const [categoryId, setCategoryId] = useState(
    existingPolicy?.categoryId || initialDraftData?.categoryId || categories[0]?.id || ''
  );
  const [title, setTitle] = useState(existingPolicy?.title || initialDraftData?.title || '');
  const [summary, setSummary] = useState(existingPolicy?.summary || initialDraftData?.summary || '');
  const [instagramDate, setInstagramDate] = useState(
    existingPolicy?.instagramDate ||
      existingPolicy?.publicationDate ||
      initialDraftData?.instagramDate ||
      initialDraftData?.publicationDate ||
      new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const [status, setStatus] = useState<PolicyStatus>(existingPolicy?.status || 'published');
  const [formError, setFormError] = useState<string | null>(null);

  // Thumbnail states
  const [isManualOverride, setIsManualOverride] = useState<boolean>(
    Boolean(existingPolicy?.isCustomThumbnail)
  );
  const [customThumbnailValue, setCustomThumbnailValue] = useState<string>(
    existingPolicy?.customThumbnail || existingPolicy?.thumbnail || ''
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'embed' | 'card' | 'regulations' | 'ai-summary'>('embed');

  // AI Summary states
  const [instagramCaption, setInstagramCaption] = useState<string>(
    existingPolicy?.instagramCaption || ''
  );
  const [aiSummary, setAiSummary] = useState<string>(
    existingPolicy?.aiSummary || ''
  );
  const [isAiSummaryApproved, setIsAiSummaryApproved] = useState<boolean>(
    Boolean(existingPolicy?.isAiSummaryApproved && existingPolicy?.aiSummary)
  );
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [aiSummarySuccess, setAiSummarySuccess] = useState<string | null>(null);

  // Regulatory references (Regulasi Terkait) state
  const [regulations, setRegulations] = useState<SourceDocument[]>(() => {
    if (existingPolicy?.sources && Array.isArray(existingPolicy.sources)) {
      return existingPolicy.sources.map((s, idx) => ({
        id: s.id || `src-${Date.now()}-${idx}`,
        title: s.title || '',
        fileUrl: s.fileUrl || '',
        regulationType: s.regulationType || 'Peraturan Menteri PANRB',
        regulationNumber: s.regulationNumber || '',
        year: s.year || new Date().getFullYear().toString(),
        articles: s.articles || '',
        description: s.description || '',
        isVerified: s.isVerified !== undefined ? s.isVerified : true,
      }));
    }
    return [];
  });

  const handleAddRegulation = () => {
    setRegulations((prev) => [
      ...prev,
      {
        id: `src-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: '',
        fileUrl: '',
        regulationType: 'Peraturan Menteri PANRB',
        regulationNumber: '',
        year: new Date().getFullYear().toString(),
        articles: '',
        description: '',
        isVerified: true,
      },
    ]);
  };

  const handleRemoveRegulation = (index: number) => {
    setRegulations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUrlChange = (index: number, newUrl: string) => {
    setRegulations((prev) => {
      const next = [...prev];
      const current = { ...next[index], fileUrl: newUrl };

      // Automatically retrieve regulation title from URL if available
      const detected = detectRegulationFromUrl(newUrl);
      if (detected.title) {
        // If current title is empty or generic, autofill
        if (
          !current.title.trim() ||
          current.title.startsWith('Peraturan') ||
          current.title.startsWith('Keputusan') ||
          current.title.startsWith('Undang-Undang')
        ) {
          current.title = detected.title;
        }
        if (detected.regulationType) current.regulationType = detected.regulationType;
        if (detected.regulationNumber) current.regulationNumber = detected.regulationNumber;
        if (detected.year) current.year = detected.year;
      }

      next[index] = current;
      return next;
    });
  };

  const handleTitleChange = (index: number, newTitle: string) => {
    setRegulations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], title: newTitle };
      return next;
    });
  };

  const handleForceDetect = (index: number) => {
    const current = regulations[index];
    if (!current?.fileUrl) return;
    const detected = detectRegulationFromUrl(current.fileUrl);
    if (detected.title) {
      setRegulations((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          title: detected.title,
          regulationType: detected.regulationType || next[index].regulationType,
          regulationNumber: detected.regulationNumber || next[index].regulationNumber,
          year: detected.year || next[index].year,
        };
        return next;
      });
    }
  };

  const handleAddPreset = (preset: (typeof POPULAR_REGULATION_PRESETS)[0]) => {
    if (regulations.some((r) => r.fileUrl === preset.fileUrl)) {
      return;
    }
    setRegulations((prev) => [
      ...prev,
      {
        id: `src-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: preset.title,
        fileUrl: preset.fileUrl,
        regulationType: preset.regulationType,
        regulationNumber: preset.regulationNumber,
        year: preset.year,
        isVerified: true,
      },
    ]);
  };

  const instagramInfo = extractInstagramInfo(instagramPostUrl);
  const selectedCluster = categories.find((c) => c.id === categoryId) || categories[0];
  const klasterCategories = categories.filter(
    (c) => c.group === 'klaster' || (!c.group && STANDARD_KLASTER_IDS.has(c.id))
  );
  const pilarCategories = categories.filter(
    (c) => !klasterCategories.some((k) => k.id === c.id)
  );

  // Auto-detected cover based on title/post/cluster
  const autoDetectedThumbnail = detectInstagramThumbnail({
    id: existingPolicy?.id,
    title,
    slug: existingPolicy?.slug,
    instagramPostUrl,
    categoryId,
  });

  // Effective thumbnail that will be used
  const effectiveThumbnail = isManualOverride
    ? customThumbnailValue || autoDetectedThumbnail
    : autoDetectedThumbnail;

  // Auto-generate title if user enters Instagram URL and title is empty
  useEffect(() => {
    if (instagramInfo.isValid && !title.trim()) {
      if (instagramInfo.type === 'reel') {
        setTitle('Reel Edukasi Kebijakan ASN');
      } else {
        setTitle('Infografis Edukasi Kebijakan SDM Aparatur');
      }
    }
  }, [instagramInfo.cleanUrl]);

  const handlePasteExample = () => {
    setInstagramPostUrl('https://www.instagram.com/p/Ddi76RtGXeH/');
    setFormError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Harap pilih file gambar JPG, PNG, atau WEBP.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const compressedDataUrl = await compressImageFile(file);
      setCustomThumbnailValue(compressedDataUrl);
      setIsManualOverride(true);
    } catch (err) {
      console.error('Failed to compress uploaded image', err);
      setUploadError('Gagal memproses gambar. Silakan coba file lain.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Helper to count sentences accurately
  const countSentences = (text: string): number => {
    if (!text || !text.trim()) return 0;
    const matches = text
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    return matches.length;
  };

  const handleGenerateAiSummary = async () => {
    setAiSummaryError(null);
    setAiSummarySuccess(null);

    const captionTrimmed = instagramCaption.trim();
    if (!captionTrimmed) {
      setAiSummaryError(
        'Teks kepsyen atau materi teks slide infografis belum diisi. Masukkan teks kepsyen atau salin poin teks slide Instagram terlebih dahulu agar AI dapat merangkum secara akurat.'
      );
      return;
    }

    try {
      setIsGeneratingSummary(true);
      const res = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || 'Edukasi Kebijakan SDM Aparatur',
          clusterName: selectedCluster?.name || 'SDM Aparatur',
          captionText: captionTrimmed,
          regulations: regulations.filter((r) => r.title.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menghasilkan ringkasan AI.');
      }

      const generated = (data.summary || '').trim();
      setAiSummary(generated);
      // As per requirement: Never publish AI-generated summaries automatically.
      setIsAiSummaryApproved(false);
      setAiSummarySuccess(
        'Ringkasan AI berhasil dibuat (3–4 kalimat). Silakan periksa, edit jika perlu, lalu klik "Setujui Ringkasan AI untuk Publikasi" sebelum menyimpan.'
      );
    } catch (err: any) {
      console.error('Error generating AI summary:', err);
      setAiSummaryError(err.message || 'Terjadi kesalahan saat memproses ringkasan AI.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleToggleApproval = () => {
    if (!aiSummary.trim()) {
      setAiSummaryError('Tidak ada teks ringkasan AI untuk disetujui.');
      return;
    }
    const nextApproved = !isAiSummaryApproved;
    setIsAiSummaryApproved(nextApproved);
    if (nextApproved) {
      setAiSummarySuccess(
        'Ringkasan AI telah disetujui! Ringkasan ini akan ditampilkan pada panel "Tentang Konten" di halaman publik setelah Anda menyimpan perubahan.'
      );
      setAiSummaryError(null);
    } else {
      setAiSummarySuccess(
        'Persetujuan ringkasan AI dibatalkan. Halaman publik akan tetap menampilkan deskripsi manual sampai admin menyetujui kembali.'
      );
    }
  };

  const handleFillSampleCaption = () => {
    if (title.toLowerCase().includes('naik pangkat')) {
      setInstagramCaption(
        'Pernah bingung bedanya Naik Pangkat dan Naik Jenjang bagi Pejabat Fungsional (JF)? Kenaikan pangkat berhubungan dengan golongan ruang PNS yang berlaku bagi seluruh ASN dan mempengaruhi hak gaji serta tunjangan. Sedangkan kenaikan jenjang adalah perpindahan level keahlian JF (Pertama, Muda, Madya, Utama) yang mutlak memerlukan kelulusan Uji Kompetensi dan ketersediaan formasi lowong. Jika keduanya dapat diajukan bersamaan, kenaikan jenjang jabatan wajib diproses terlebih dahulu sebelum pengusulan kenaikan pangkat.'
      );
    } else if (title.toLowerCase().includes('jabatan pelaksana')) {
      setInstagramCaption(
        'Birokrasi bertransformasi! Jabatan Pelaksana tidak lagi identik dengan sekadar urusan administrasi berkas. Berdasarkan PermenPANRB No. 45/2022 dan KepmenPANRB No. 11/2024, nomenklatur jabatan pelaksana dikelompokkan menjadi tiga kluster utama: Kluster Teknis, Kluster Pelayanan Publik, dan Kluster Tata Usaha/Administrasi. Kualifikasi pendidikan juga disesuaikan secara realistis mulai dari SLTA hingga Sarjana/D-IV agar sejalan dengan kebutuhan riil birokrasi masa kini.'
      );
    } else {
      setInstagramCaption(
        `Materi edukasi resmi KemenPANRB mengenai ${title || 'Kebijakan Manajemen ASN'}. Kebijakan ini mengatur hak, kewajiban, dan standar operasional terbaru bagi pegawai ASN dalam rangka mewujudkan birokrasi yang lincah, profesional, dan akuntabel. Pegawai dan unit kerja dapat memedomani ketentuan pokok serta alur pelayanan yang tercantum dalam infografis ini.`
      );
    }
    setAiSummaryError(null);
  };

  const handleSave = (targetStatus: PolicyStatus = status) => {
    const trimmedUrl = instagramPostUrl.trim();
    if (!trimmedUrl) {
      setFormError('URL Postingan Instagram wajib diisi.');
      return;
    }

    const check = extractInstagramInfo(trimmedUrl);
    if (!check.isValid) {
      setFormError('Masukkan URL postingan, karusel, atau Reel Instagram yang valid.');
      return;
    }

    if (!categoryId) {
      setFormError('Pilih salah satu Klaster Manajemen ASN atau Pilar Konten.');
      return;
    }

    const finalTitle = title.trim() || 'Edukasi Kebijakan SDM Aparatur';
    const slug =
      existingPolicy?.slug ||
      finalTitle
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-') + '-' + Date.now().toString().slice(-4);

    const finalThumb = effectiveThumbnail;

    // Filter and map admin-linked regulations (persisted to public website)
    const validSources: SourceDocument[] = regulations
      .filter((r) => r.title.trim() || (r.fileUrl || '').trim())
      .map((r, index) => {
        const urlStr = (r.fileUrl || '').trim();
        const detected = detectRegulationFromUrl(urlStr);
        return {
          id: r.id || `src-${Date.now()}-${index}`,
          title: r.title.trim() || detected.title || 'Dokumen Regulasi Resmi',
          fileUrl: urlStr,
          regulationType: r.regulationType || detected.regulationType || 'Regulasi Resmi',
          regulationNumber: r.regulationNumber || detected.regulationNumber || '',
          year: r.year || detected.year || new Date().getFullYear().toString(),
          articles: r.articles || '',
          description: r.description || '',
          isVerified: r.isVerified !== undefined ? r.isVerified : true,
        };
      });

    const payload: Partial<Policy> = {
      title: finalTitle,
      slug,
      categoryId,
      summary:
        summary.trim() ||
        'Materi edukasi kebijakan SDM Aparatur yang bersumber dari media sosial resmi KemenPANRB.',
      status: targetStatus,
      thumbnail: finalThumb,
      instagramThumbnail: finalThumb,
      isCustomThumbnail: isManualOverride,
      customThumbnail: isManualOverride ? finalThumb : undefined,
      autoThumbnail: autoDetectedThumbnail,
      instagramPostUrl: check.cleanUrl,
      instagramDate: instagramDate.trim(),
      instagramAccountHandle: '@sdmapanrb',
      contextExplanation: summary.trim() || existingPolicy?.contextExplanation || '',
      sources: validSources,
      // AI Summary fields
      aiSummary: aiSummary.trim() || undefined,
      isAiSummaryApproved: Boolean(isAiSummaryApproved && aiSummary.trim()),
      aiSummaryGeneratedAt: aiSummary.trim()
        ? existingPolicy?.aiSummaryGeneratedAt || new Date().toISOString()
        : undefined,
      instagramCaption: instagramCaption.trim() || undefined,
      publicationDate:
        instagramDate.trim() ||
        existingPolicy?.publicationDate ||
        new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
    };

    if (existingPolicy) {
      updatePolicy(existingPolicy.id, payload);
    } else {
      createPolicy(payload);
    }

    navigateTo({ name: 'admin-content' });
  };

  return (
    <AdminLayout
      activeNav="content"
      title={existingPolicy ? `Edit Konten: ${existingPolicy.title}` : 'Tambah Konten Instagram'}
      description="Alur kerja sederhana: tempelkan URL Instagram, pilih Klaster Manajemen ASN atau Pilar Konten, kelola cover thumbnail, dan publikasikan."
      actionButton={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo({ name: 'admin-content' })}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => handleSave('draft')}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Simpan Draf
          </button>
          <button
            type="button"
            onClick={() => handleSave('published')}
            className="px-4 py-2 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan & Publikasikan</span>
          </button>
        </div>
      }
    >
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="max-w-5xl space-y-6">
        {/* Validation Error Banner */}
        {formError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Inputs (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs">
            {/* Step 1: Instagram Post URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#07529A] text-white flex items-center justify-center text-[11px] font-mono font-bold">
                    1
                  </span>
                  <span>URL Postingan Instagram *</span>
                </label>
                <button
                  type="button"
                  onClick={handlePasteExample}
                  className="text-[11px] font-semibold text-[#07529A] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#E1306C]" />
                  <span>Tempel Contoh URL</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Instagram className="w-4 h-4 text-[#E1306C]" />
                </div>
                <input
                  type="url"
                  required
                  value={instagramPostUrl}
                  onChange={(e) => {
                    setInstagramPostUrl(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="https://www.instagram.com/p/Ddi76RtGXeH/ atau Reels / Karusel"
                  className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#07529A] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Mendukung postingan foto tunggal, karusel gambar (multi-slide), dan Instagram Reels.
              </p>
            </div>

            {/* Step 2: Assign to Klaster Manajemen ASN or Pilar Konten */}
            <div className="space-y-3.5 pt-4 border-t border-slate-100">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#07529A] text-white flex items-center justify-center text-[11px] font-mono font-bold">
                    2
                  </span>
                  <span>Pilih Klaster Manajemen ASN / Pilar Konten (Wajib) *</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Tugaskan konten pada salah satu dari 8 Klaster Manajemen ASN atau Pilar Konten Sekolah Kedinasan:
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Group 1: 8 Klaster Manajemen ASN */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      8 Klaster Manajemen ASN
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {klasterCategories.length} Klaster
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {klasterCategories.map((cat) => {
                      const isSelected = categoryId === cat.id;
                      return (
                        <label
                          key={cat.id}
                          onClick={() => {
                            setCategoryId(cat.id);
                            setFormError(null);
                          }}
                          className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50/80 border-[#07529A] ring-2 ring-[#07529A]/10 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="klaster_assignment"
                            checked={isSelected}
                            onChange={() => setCategoryId(cat.id)}
                            className="mt-0.5 text-[#07529A] focus:ring-[#07529A]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                              <CategoryIcon
                                name={cat.iconName}
                                className="w-3.5 h-3.5 text-[#07529A] shrink-0"
                              />
                              <span className="truncate">{cat.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                              {cat.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Group 2: Pilar Konten (Sekolah Kedinasan & Custom Pillars) */}
                {pilarCategories.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#07529A]">
                        Pilar Konten
                      </span>
                      <span className="text-[10px] font-semibold text-[#07529A] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Non-Klaster
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {pilarCategories.map((cat) => {
                        const isSelected = categoryId === cat.id;
                        return (
                          <label
                            key={cat.id}
                            onClick={() => {
                              setCategoryId(cat.id);
                              setFormError(null);
                            }}
                            className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50/80 border-[#07529A] ring-2 ring-[#07529A]/10 shadow-xs'
                                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70'
                            }`}
                          >
                            <input
                              type="radio"
                              name="klaster_assignment"
                              checked={isSelected}
                              onChange={() => setCategoryId(cat.id)}
                              className="mt-0.5 text-[#07529A] focus:ring-[#07529A]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                                <CategoryIcon
                                  name={cat.iconName}
                                  className="w-3.5 h-3.5 text-[#07529A] shrink-0"
                                />
                                <span className="truncate">{cat.name}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                {cat.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Title & Educational Summary */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#07529A] text-white flex items-center justify-center text-[11px] font-mono font-bold">
                  3
                </span>
                <span>Judul & Keterangan Edukatif</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Konten / Topik Kebijakan *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="Contoh: Mengenal Jabatan Pelaksana"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ringkasan / Catatan Edukasi Singkat
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Jelaskan ringkasan materi kebijakan yang disampaikan di postingan ini..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <CalendarDatePicker
                  value={instagramDate}
                  onChange={setInstagramDate}
                  label="Tanggal Publikasi Instagram"
                />
              </div>
            </div>

            {/* Step 4: AI Summary Generation & Review (Requirement 1 & 2) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#07529A] text-white flex items-center justify-center text-[11px] font-mono font-bold">
                    4
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ringkasan AI Konten (AI Summary Assistant)</span>
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  {isAiSummaryApproved && aiSummary.trim() ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Status: Disetujui untuk Publikasi</span>
                    </span>
                  ) : aiSummary.trim() ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Status: Draf (Menunggu Persetujuan Admin)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Status: Belum Dibuat
                    </span>
                  )}
                </div>
              </div>

              {/* Authorized Methods & Instagram Access Notice */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <ShieldCheck className="w-4 h-4 text-[#07529A] shrink-0" />
                  <span>Kepatuhan Akses Konten Instagram & Anti-Scraping</span>
                </div>
                <p className="text-[11px] text-blue-900/90 leading-relaxed">
                  Sesuai kebijakan keamanan dan privasi Meta/Instagram (tanpa web scraping tidak berizin), sistem menganalisis materi kepsyen dan poin teks slide infografis resmi yang dimasukkan secara sah oleh admin. AI merangkum maksimal <strong>3–4 kalimat</strong> padat tanpa mengarang regulasi di luar materi.
                </p>
              </div>

              {/* Caption & Slide Text Input Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span>Teks Kepsyen & Materi Slide Infografis Instagram *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {!instagramCaption.trim() && (
                      <button
                        type="button"
                        onClick={handleFillSampleCaption}
                        className="text-[10px] font-semibold text-[#07529A] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        <span>Isi Contoh Teks Kepsyen</span>
                      </button>
                    )}
                    {instagramCaption.trim() && (
                      <button
                        type="button"
                        onClick={() => setInstagramCaption('')}
                        className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Bersihkan
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={instagramCaption}
                  onChange={(e) => {
                    setInstagramCaption(e.target.value);
                    if (aiSummaryError) setAiSummaryError(null);
                  }}
                  placeholder="Tempelkan kepsyen postingan Instagram atau masukkan teks materi dari slide-slide infografis di sini..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none leading-relaxed bg-slate-50/40"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    {instagramCaption.trim()
                      ? `${instagramCaption.trim().length} karakter · ${instagramCaption.trim().split(/\s+/).filter(Boolean).length} kata`
                      : 'Materi ini menjadi satu-satunya dasar fakta bagi AI untuk merangkum.'}
                  </span>
                  <span>Bahasa Indonesia baku</span>
                </div>
              </div>

              {/* Generate AI Summary Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleGenerateAiSummary}
                  disabled={isGeneratingSummary || !instagramCaption.trim()}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                    isGeneratingSummary || !instagramCaption.trim()
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#07529A] via-[#0960b3] to-[#4F46E5] hover:opacity-95 text-white active:scale-98'
                  }`}
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Menyusun Ringkasan AI (gemini-3.8-flash)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{aiSummary.trim() ? 'Generate Ulang AI Summary' : 'Generate AI Summary'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Alerts: Error or Success */}
              {aiSummaryError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{aiSummaryError}</span>
                </div>
              )}

              {aiSummarySuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="leading-relaxed">{aiSummarySuccess}</span>
                </div>
              )}

              {/* Review & Approval Section */}
              {aiSummary.trim() && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-200/80 pb-2">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#07529A]" />
                      <span>Draf Ringkasan AI (Review & Edit Admin)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          countSentences(aiSummary) >= 3 && countSentences(aiSummary) <= 4
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {countSentences(aiSummary)} Kalimat (Target: 3–4 Kalimat)
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug">
                    Teks ini dapat disunting manual secara bebas oleh admin. Pastikan isi akurat sebelum menyetujui.
                  </p>

                  <textarea
                    rows={4}
                    value={aiSummary}
                    onChange={(e) => {
                      setAiSummary(e.target.value);
                      if (aiSummarySuccess) setAiSummarySuccess(null);
                    }}
                    placeholder="Teks ringkasan AI..."
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none leading-relaxed bg-white"
                  />

                  {/* Approval Actions & Controls */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={handleGenerateAiSummary}
                      disabled={isGeneratingSummary}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-200/60 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
                      <span>Buat Ulang (Regenerate)</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {isAiSummaryApproved ? (
                        <button
                          type="button"
                          onClick={handleToggleApproval}
                          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <X className="w-3.5 h-3.5 text-amber-700" />
                          <span>Batalkan Persetujuan (Tarik ke Draf)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleToggleApproval}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Setujui Ringkasan AI untuk Publikasi</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Informational note about publishing rule */}
                  <div className="text-[10px] text-slate-500 pt-1 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {isAiSummaryApproved
                        ? 'Ringkasan ini telah DISETUJUI dan akan menggantikan deskripsi manual pada panel "Tentang Konten" di halaman detail publik setelah disimpan.'
                        : 'Ringkasan ini BELUM disetujui. Halaman publik akan tetap menampilkan deskripsi manual sampai admin mengklik tombol "Setujui Ringkasan AI untuk Publikasi".'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 5: Thumbnail & Cover Management */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#07529A] text-white flex items-center justify-center text-[11px] font-mono font-bold">
                    5
                  </span>
                  <span>Thumbnail & Cover Postingan</span>
                </label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    !isManualOverride
                      ? 'bg-blue-50 text-[#07529A] border border-blue-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {!isManualOverride ? 'Mode: Cover Otomatis' : 'Mode: Override Manual'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Thumbnail ini ditampilkan pada kartu konten di website publik KOMPAK dan wajib selaras dengan cover postingan Instagram.
              </p>

              {/* Mode Selection Radio Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Automatic Detection */}
                <label
                  onClick={() => setIsManualOverride(false)}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                    !isManualOverride
                      ? 'bg-blue-50/90 border-[#07529A] ring-2 ring-[#07529A]/15'
                      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="thumbnail_mode"
                      checked={!isManualOverride}
                      onChange={() => setIsManualOverride(false)}
                      className="mt-0.5 text-[#07529A] focus:ring-[#07529A]"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#07529A]" />
                        <span>Otomatis (Sesuai Instagram)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Sistem mendeteksi cover resmi dari materi Instagram secara otomatis.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 shrink-0 bg-slate-200">
                      <img
                        src={autoDetectedThumbnail}
                        alt="Cover Otomatis"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium truncate">
                      {autoDetectedThumbnail.includes('jabatan_pelaksana')
                        ? 'Cover: JABATAN PELAKSANA'
                        : autoDetectedThumbnail.includes('naik_pangkat')
                        ? 'Cover: NAIK PANGKAT ≠ NAIK JENJANG'
                        : autoDetectedThumbnail.includes('manajemen_talenta')
                        ? 'Cover: MANAJEMEN TALENTA & SISTEM MERIT'
                        : 'Cover Otomatis Instagram'}
                    </span>
                  </div>
                </label>

                {/* Option 2: Manual Override */}
                <label
                  onClick={() => setIsManualOverride(true)}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                    isManualOverride
                      ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/15'
                      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="thumbnail_mode"
                      checked={isManualOverride}
                      onChange={() => setIsManualOverride(true)}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                        <span>Ganti / Override Manual</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Pilih dari cover slide resmi yang tersedia, unggah file foto baru, atau masukkan link gambar.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 shrink-0 bg-slate-200">
                      <img
                        src={customThumbnailValue || autoDetectedThumbnail}
                        alt="Cover Manual"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] text-amber-800 font-semibold truncate">
                      {isManualOverride ? 'Thumbnail Manual Aktif' : 'Klik untuk mengubah'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Expanded Controls for Manual Override */}
              {isManualOverride && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 animate-in fade-in duration-150">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#07529A]" />
                    <span>Pilih Cover dari Galeri Slide Resmi KemenPANRB:</span>
                  </div>

                  {/* Preset Previews Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AVAILABLE_INSTAGRAM_PREVIEWS.map((opt) => {
                      const isChosen = customThumbnailValue === opt.url;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setCustomThumbnailValue(opt.url);
                            setIsManualOverride(true);
                          }}
                          className={`group relative rounded-xl overflow-hidden border text-left p-1 transition-all cursor-pointer ${
                            isChosen
                              ? 'border-[#07529A] ring-2 ring-[#07529A] bg-white shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="aspect-4/3 w-full rounded-lg overflow-hidden bg-slate-100 relative">
                            <img
                              src={opt.url}
                              alt={opt.name}
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                            />
                            {isChosen && (
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#07529A] text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-900 mt-1 line-clamp-1">
                            {opt.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Upload from Device / Computer */}
                  <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      {isUploading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#07529A]" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>{isUploading ? 'Memproses Foto...' : 'Unggah File Gambar Baru'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomThumbnailValue(autoDetectedThumbnail);
                        setIsManualOverride(false);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Kembalikan ke Otomatis
                    </button>
                  </div>

                  {uploadError && (
                    <p className="text-xs text-rose-600 font-semibold">{uploadError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Step 6: Regulasi Terkait (JDIH / Dokumen Resmi) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#07529A] text-white flex items-center justify-center text-[11px] font-mono font-bold">
                    6
                  </span>
                  <span>Regulasi Terkait (JDIH / Dokumen Resmi)</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#07529A] border border-blue-200">
                  {regulations.length} Dokumen Ditautkan
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tautkan dasar hukum dan regulasi resmi (JDIH MenPANRB, BKN, atau Undang-Undang) yang menjadi rujukan materi konten ini. Judul regulasi dapat terdeteksi otomatis dari URL dokumen atau diedit manual. Hanya regulasi yang ditautkan di sini yang akan muncul di halaman detail publik.
              </p>

              {/* Quick Preset Selector */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pilihan Cepat Regulasi Resmi Populer (JDIH):</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_REGULATION_PRESETS.map((preset) => {
                    const isAdded = regulations.some((r) => r.fileUrl === preset.fileUrl);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleAddPreset(preset)}
                        disabled={isAdded}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          isAdded
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 opacity-70 cursor-default'
                            : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-[#07529A] border-slate-200 hover:border-blue-300 shadow-2xs'
                        }`}
                      >
                        {isAdded ? (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <Plus className="w-3 h-3 text-[#07529A] shrink-0" />
                        )}
                        <span className="truncate max-w-[200px]">
                          {preset.regulationType} {preset.regulationNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Regulations List */}
              <div className="space-y-3">
                {regulations.map((reg, index) => {
                  const detected = detectRegulationFromUrl(reg.fileUrl || '');
                  return (
                    <div
                      key={reg.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <span className="w-5 h-5 rounded-md bg-blue-100 text-[#07529A] flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          <span>Regulasi #{index + 1}</span>
                          {reg.fileUrl && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Terverifikasi JDIH</span>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRegulation(index)}
                          className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Hapus regulasi ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-semibold">Hapus</span>
                        </button>
                      </div>

                      {/* URL input */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="font-semibold text-slate-700 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3 text-[#07529A]" />
                            <span>URL Dokumen / Portal JDIH *</span>
                          </label>
                          {reg.fileUrl && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleForceDetect(index)}
                                className="text-[10px] font-semibold text-[#07529A] hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Deteksi Ulang Judul</span>
                              </button>
                              <a
                                href={reg.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                              >
                                <span>Buka Tautan</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}
                        </div>
                        <input
                          type="url"
                          value={reg.fileUrl}
                          onChange={(e) => handleUrlChange(index, e.target.value)}
                          placeholder="https://jdih.menpan.go.id/dokumen-hukum/permenpan/1-2023"
                          className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none bg-slate-50/50"
                        />
                      </div>

                      {/* Title input (Auto-retrieved with manual fallback) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="font-semibold text-slate-700 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span>Judul Regulasi * (Dapat diedit manual)</span>
                          </label>
                          {detected.isRecognized && (
                            <span className="text-[10px] text-emerald-700 font-medium">
                              ✓ Terdeteksi otomatis dari URL
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          value={reg.title}
                          onChange={(e) => handleTitleChange(index, e.target.value)}
                          placeholder="Contoh: Peraturan Menteri PANRB Nomor 1 Tahun 2023 tentang Jabatan Fungsional"
                          className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none leading-relaxed"
                        />
                      </div>
                    </div>
                  );
                })}

                {regulations.length === 0 && (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 space-y-2">
                    <Shield className="w-7 h-7 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      Belum Ada Regulasi Terkait yang Ditautkan
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Klik tombol di bawah atau pilih salah satu regulasi populer di atas untuk menambahkan rujukan hukum resmi JDIH.
                    </p>
                  </div>
                )}
              </div>

              {/* Add Regulation Button */}
              <button
                type="button"
                onClick={handleAddRegulation}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#07529A]/60 bg-blue-50/60 hover:bg-blue-50 text-[#07529A] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Regulasi Terkait</span>
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigateTo({ name: 'admin-content' })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Kembali
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors cursor-pointer"
                >
                  Simpan Draf
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('published')}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#07529A] hover:bg-[#053d73] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan & Publikasikan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Instagram Embed & Thumbnail Preview (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 sticky top-20">
            {/* View Switcher Tabs */}
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab('embed')}
                className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  previewTab === 'embed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                <span className="hidden sm:inline">Embed</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('card')}
                className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  previewTab === 'card'
                    ? 'bg-white text-[#07529A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#07529A]" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('ai-summary')}
                className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  previewTab === 'ai-summary'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="truncate">Ringkasan AI</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('regulations')}
                className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  previewTab === 'regulations'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate">Regulasi ({regulations.length})</span>
              </button>
            </div>

            {previewTab === 'embed' ? (
              /* Instagram Embed Preview Box */
              <div className="bg-white rounded-3xl border border-blue-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-[#E1306C] flex items-center justify-center font-bold">
                      <Instagram className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">
                        Pratinjau Instagram Embed
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Tampilan embed resmi di halaman detail
                      </p>
                    </div>
                  </div>

                  {instagramInfo.isValid && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>URL Valid</span>
                    </span>
                  )}
                </div>

                {/* Cluster Preview Tag */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold text-slate-500 text-[11px]">Klaster:</span>
                  <span className="font-bold text-[#07529A] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-[11px]">
                    {selectedCluster?.name}
                  </span>
                </div>

                {/* Instagram Embed Component */}
                <div className="py-1">
                  <InstagramEmbed
                    url={instagramPostUrl}
                    thumbnail={effectiveThumbnail}
                    clusterName={selectedCluster?.name}
                    title={title || 'Pratinjau Konten Instagram'}
                    hideHeader={false}
                  />
                </div>
              </div>
            ) : previewTab === 'card' ? (
              /* Public Website PolicyCard Preview */
              <div className="bg-white rounded-3xl border border-blue-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#07529A] flex items-center justify-center font-bold">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">
                        Pratinjau Kartu Website Publik
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Tampilan kartu konten bagi masyarakat & ASN
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      !isManualOverride
                        ? 'bg-blue-50 text-[#07529A] border border-blue-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {!isManualOverride ? 'Otomatis' : 'Kustom'}
                  </span>
                </div>

                {/* Simulated Public Card */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
                  {/* Thumbnail Banner */}
                  <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={effectiveThumbnail}
                      alt={title || 'Pratinjau'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                      <Instagram className="w-3 h-3 text-[#FFD84D]" />
                      <span>@sdmapanrb</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#07529A] font-bold">
                      <CategoryIcon
                        name={selectedCluster?.iconName || 'FileText'}
                        className="w-3.5 h-3.5"
                      />
                      <span>{selectedCluster?.name}</span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                      {title || 'Judul Konten Kebijakan'}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {summary ||
                        'Materi edukasi kebijakan SDM Aparatur yang bersumber dari media sosial resmi KemenPANRB.'}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{instagramDate}</span>
                      <span className="font-semibold text-[#07529A]">Pelajari selengkapnya →</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                  ✓ Thumbnail ini cocok dengan gambar cover Instagram yang ada di halaman beranda.
                </div>
              </div>
            ) : previewTab === 'ai-summary' ? (
              /* AI Summary & Tentang Konten Preview */
              <div className="bg-white rounded-3xl border border-blue-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">
                        Pratinjau "Tentang Konten" (Halaman Publik)
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Simulasi panel kanan pada layout Spotify-inspired
                      </p>
                    </div>
                  </div>

                  {isAiSummaryApproved && aiSummary.trim() ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Ringkasan AI Disetujui</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Deskripsi Manual Aktif
                    </span>
                  )}
                </div>

                {/* Simulated Public Right-Panel "Tentang Konten" */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#07529A] uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-[#07529A]" />
                      <span>Tentang Konten</span>
                    </div>
                    {isAiSummaryApproved && aiSummary.trim() && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#07529A] border border-blue-200">
                        <Sparkles className="w-2.5 h-2.5 text-[#07529A]" />
                        <span>Ringkasan AI Terverifikasi</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    {isAiSummaryApproved && aiSummary.trim()
                      ? aiSummary
                      : summary ||
                        'Materi edukasi kebijakan SDM Aparatur yang bersumber dari media sosial resmi KemenPANRB.'}
                  </p>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Klaster ASN:</span>
                      <span className="font-bold text-[#07529A]">{selectedCluster?.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100">
                      <span>Tanggal Rilis:</span>
                      <span className="font-semibold text-slate-700">{instagramDate}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  {isAiSummaryApproved && aiSummary.trim() ? (
                    <span className="text-emerald-800 font-medium">
                      ✓ Ringkasan AI ini telah disetujui dan akan menggantikan deskripsi manual saat disimpan.
                    </span>
                  ) : (
                    <span className="text-amber-800">
                      ℹ Karena ringkasan AI belum disetujui (atau belum dibuat), pengunjung website akan melihat deskripsi manual di atas.
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* Regulations Preview */
              <div className="bg-white rounded-3xl border border-blue-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">
                        Pratinjau Regulasi Terkait
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        {regulations.filter((r) => r.title.trim() || (r.fileUrl || '').trim()).length} dokumen akan tampil di halaman detail
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {regulations.filter((r) => r.title.trim() || (r.fileUrl || '').trim()).length > 0 ? (
                    regulations
                      .filter((r) => r.title.trim() || (r.fileUrl || '').trim())
                      .map((reg, i) => (
                        <div
                          key={reg.id || i}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{reg.regulationType || 'Regulasi Terverifikasi JDIH'}</span>
                          </div>
                          <h5 className="font-bold text-slate-900 text-xs leading-snug">
                            {reg.title || 'Dokumen Regulasi'}
                          </h5>
                          {reg.fileUrl && (
                            <a
                              href={reg.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#07529A] font-semibold hover:underline"
                            >
                              <span>Buka Dokumen Resmi JDIH</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 space-y-1 text-xs">
                      <p className="font-medium text-slate-600">Belum ada regulasi yang ditautkan.</p>
                      <p className="text-[11px] text-slate-400">Tautkan regulasi pada Langkah 5 di formulir kiri.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
