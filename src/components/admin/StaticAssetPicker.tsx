import React, { useEffect, useState } from 'react';
import {
  Check,
  FolderCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import {
  PROJECT_STATIC_IMAGES,
  ProjectStaticImage,
  StaticImageCategory,
  normalizeStaticImageUrl,
} from '../../data/staticImages';

interface StaticAssetPickerProps {
  selectedUrl: string;
  onSelect: (path: string, asset: ProjectStaticImage) => void;
  excludeLogos?: boolean;
  filterCategories?: StaticImageCategory[];
  title?: string;
  compact?: boolean;
}

export const StaticAssetPicker: React.FC<StaticAssetPickerProps> = ({
  selectedUrl,
  onSelect,
  excludeLogos = true,
  filterCategories,
  title = 'Pilih dari Aset Statis Proyek Permanen (/images/...)',
  compact = false,
}) => {
  const [assets, setAssets] = useState<ProjectStaticImage[]>(PROJECT_STATIC_IMAGES);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/static-images', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.items) && data.items.length > 0) {
          setAssets(data.items);
        }
      })
      .catch(() => {
        // Fallback ke daftar statis terbundel jika offline
      });
    return () => {
      active = false;
    };
  }, []);

  const normalizedSelected = normalizeStaticImageUrl(selectedUrl);

  const visibleAssets = assets.filter((item) => {
    if (excludeLogos && item.category === 'logo') return false;
    if (filterCategories && filterCategories.length > 0) {
      return filterCategories.includes(item.category);
    }
    return true;
  });

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-blue-50/35 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderCheck className="w-4 h-4 text-[#07529A] shrink-0" />
          <span className="text-xs font-bold text-slate-900">{title}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Permanen & Ikut Build
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowWorkflowGuide((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#07529A] hover:underline cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Cara Tambah Aset Permanen</span>
          {showWorkflowGuide ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {showWorkflowGuide && (
        <div className="rounded-xl bg-white border border-blue-200 p-3 text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
          <p className="font-bold text-slate-900">
            Alur Menambahkan Gambar Permanen Tanpa Backend / Firebase:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600">
            <li>
              Masukkan file gambar (<code className="font-mono text-[#07529A]">.jpg</code>,{' '}
              <code className="font-mono text-[#07529A]">.png</code>, atau{' '}
              <code className="font-mono text-[#07529A]">.webp</code>) ke folder proyek{' '}
              <code className="font-mono font-semibold text-slate-900">public/images/</code>{' '}
              (misalnya <code className="font-mono">public/images/poster-asn.jpg</code>).
            </li>
            <li>
              Opsional: tambahkan deskripsi gambar di{' '}
              <code className="font-mono font-semibold text-slate-900">
                src/data/staticImages.ts
              </code>{' '}
              (file baru di <code className="font-mono">public/images/</code> juga otomatis
              terdeteksi di daftar ini).
            </li>
            <li>
              Pilih gambar dengan path{' '}
              <code className="font-mono font-semibold text-[#07529A]">/images/poster-asn.jpg</code>,
              lalu jalankan <code className="font-mono font-semibold text-slate-900">npm run build</code>{' '}
              sebelum publish ulang agar gambar terpaketkan permanen di{' '}
              <code className="font-mono">dist/images/</code>.
            </li>
          </ol>
        </div>
      )}

      <div
        className={`grid gap-2 ${
          compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
        }`}
      >
        {visibleAssets.map((item) => {
          const isSelected = normalizedSelected === item.path;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.path, item)}
              className={`group relative rounded-xl overflow-hidden border p-1 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#07529A] ring-2 ring-[#07529A]/30 bg-white shadow-xs'
                  : 'border-slate-200 hover:border-[#07529A]/50 bg-white'
              }`}
              title={`${item.name} (${item.path})`}
            >
              <div className="aspect-4/3 w-full rounded-lg overflow-hidden bg-slate-100 relative">
                <img
                  src={item.path}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                />
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#07529A] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-900 mt-1 line-clamp-1 px-0.5">
                {item.name}
              </p>
              <p className="text-[9px] font-mono text-slate-400 truncate px-0.5">{item.path}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const UploadLimitationNotice: React.FC<{ isTemporaryActive?: boolean }> = ({
  isTemporaryActive = false,
}) => (
  <div
    className={`rounded-xl px-3.5 py-2.5 border text-[11px] leading-relaxed flex items-start gap-2 ${
      isTemporaryActive
        ? 'bg-amber-50 border-amber-300 text-amber-950'
        : 'bg-slate-50 border-slate-200 text-slate-600'
    }`}
  >
    <AlertTriangle
      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
        isTemporaryActive ? 'text-amber-600' : 'text-slate-400'
      }`}
    />
    <div>
      <strong className="font-bold">Batasan Upload Tanpa Database / Cloud Storage:</strong>{' '}
      Unggahan file langsung dari perangkat hanya tersimpan sementara pada browser lokal atau ruang
      preview saat ini, sehingga <strong>tidak permanen lintas perangkat dan akan hilang saat website dipublikasikan ulang</strong>.
      Untuk gambar permanen, pilih dari <strong>Aset Statis Proyek (<code className="font-mono">/images/...</code>)</strong>{' '}
      atau gunakan URL gambar resmi eksternal (<code className="font-mono">https://...</code>).
    </div>
  </div>
);
