import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { validateDirectImageUrl } from '../../utils/imageUrlUtils';

export type ImagePreviewLoadState = 'idle' | 'invalid' | 'loading' | 'loaded' | 'error';

interface UrlImagePreviewStatusProps {
  imageUrl: string;
  label?: string;
  aspectClassName?: string;
  allowEmpty?: boolean;
  onStatusChange?: (state: ImagePreviewLoadState, errorMessage?: string) => void;
}

/**
 * Live URL image preview & load verifier for Admin Dashboard forms:
 * - Validates URL syntax & distinguishes direct image URLs from Instagram post web URLs.
 * - Verifies that the browser can actually load the image before saving (`onLoad` / `onError`).
 * - Displays a clear notification when the URL is invalid or fails to load.
 */
export const UrlImagePreviewStatus: React.FC<UrlImagePreviewStatusProps> = ({
  imageUrl,
  label = 'Pratinjau Gambar Sebelum Disimpan',
  aspectClassName = 'aspect-4/3 w-28 sm:w-32',
  allowEmpty = true,
  onStatusChange,
}) => {
  const trimmed = (imageUrl || '').trim();
  const validation = validateDirectImageUrl(trimmed, { allowEmpty });
  const [loadState, setLoadState] = useState<ImagePreviewLoadState>(() => {
    if (!trimmed) return allowEmpty ? 'idle' : 'invalid';
    if (!validation.isValid) return 'invalid';
    return 'loading';
  });

  useEffect(() => {
    if (!trimmed) {
      const next: ImagePreviewLoadState = allowEmpty ? 'idle' : 'invalid';
      setLoadState(next);
      onStatusChange?.(next, allowEmpty ? undefined : validation.error);
      return;
    }

    const check = validateDirectImageUrl(trimmed, { allowEmpty });
    if (!check.isValid) {
      setLoadState('invalid');
      onStatusChange?.('invalid', check.error);
      return;
    }

    setLoadState('loading');
    onStatusChange?.('loading');
  }, [trimmed, allowEmpty]);

  if (!trimmed) {
    return null;
  }

  if (!validation.isValid) {
    return (
      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">URL Gambar Tidak Valid</p>
          <p className="text-[11px] text-rose-800 leading-relaxed">{validation.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-2xl border flex items-center gap-3.5 transition-colors ${
        loadState === 'error'
          ? 'bg-rose-50/70 border-rose-200'
          : loadState === 'loaded'
          ? 'bg-emerald-50/50 border-emerald-200'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div
        className={`relative ${aspectClassName} rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center`}
      >
        {loadState !== 'error' ? (
          <>
            <img
              key={validation.cleanUrl}
              src={validation.cleanUrl}
              alt={label}
              referrerPolicy="no-referrer"
              onLoad={() => {
                setLoadState('loaded');
                onStatusChange?.('loaded');
              }}
              onError={() => {
                const msg =
                  'Gambar dari URL ini gagal dimuat. Pastikan URL mengarah langsung ke file gambar (.jpg, .png, .webp, .svg) dan dapat diakses secara publik.';
                setLoadState('error');
                onStatusChange?.('error', msg);
              }}
              className="w-full h-full object-cover"
            />
            {loadState === 'loading' && (
              <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 animate-spin text-[#07529A]" />
              </div>
            )}
          </>
        ) : (
          <ImageIcon className="w-6 h-6 text-rose-400" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-bold text-slate-900">{label}</p>
        {loadState === 'loading' && (
          <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin text-[#07529A] shrink-0" />
            <span>Memeriksa apakah URL gambar dapat dimuat...</span>
          </p>
        )}
        {loadState === 'loaded' && (
          <p className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>URL gambar valid & berhasil dimuat. Siap ditampilkan di halaman publik.</span>
          </p>
        )}
        {loadState === 'error' && (
          <p className="text-[11px] text-rose-700 font-semibold leading-snug flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span>
              URL gambar gagal dimuat atau tidak dapat diakses. Periksa kembali tautan sebelum menyimpan.
            </span>
          </p>
        )}
        <p className="text-[10px] font-mono text-slate-500 truncate">{validation.cleanUrl}</p>
      </div>
    </div>
  );
};
