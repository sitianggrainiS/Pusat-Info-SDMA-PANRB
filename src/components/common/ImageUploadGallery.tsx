import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  RefreshCw,
  Link as LinkIcon,
  CheckCircle2,
  FolderOpen,
  Sparkles,
} from 'lucide-react';

interface ImageUploadGalleryProps {
  value: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  helperText?: string;
}

/**
 * Resizes and compresses an image in browser using HTMLCanvasElement
 * to keep base64 strings small (~150-300KB) and prevent localStorage quota overflow.
 */
const compressImageFile = (file: File, maxDimension = 1200, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original data URL if 2d context fails
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for photographic content, preserving clarity and small file size
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memuat elemen gambar.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsDataURL(file);
  });
};

export const ImageUploadGallery: React.FC<ImageUploadGalleryProps> = ({
  value,
  onChange,
  label = 'Foto / Gambar Infografis',
  helperText = 'Pilih foto langsung dari galeri HP atau komputer Anda.',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('File yang dipilih bukan gambar. Harap pilih file JPG, PNG, atau WEBP.');
      return;
    }

    // Check raw file size limit (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Ukuran file melebihi 25MB. Harap pilih gambar yang lebih kecil.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const compressedDataUrl = await compressImageFile(file);
      setUploadedFileName(file.name);
      onChange(compressedDataUrl);
    } catch (err: any) {
      console.error('Error compressing image:', err);
      setErrorMessage('Gagal memproses foto. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleTriggerPicker = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    onChange('');
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isBase64 = value?.startsWith('data:image/');

  return (
    <div className="space-y-2">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlField(!showUrlField)}
          className="text-[11px] text-[#07529A] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showUrlField ? 'Sembunyikan URL' : 'Gunakan URL Manual'}</span>
        </button>
      </div>

      {/* When an image is present */}
      {value ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
            {/* Thumbnail Preview Container */}
            <div className="relative w-full sm:w-28 h-32 sm:h-24 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 shadow-xs flex items-center justify-center">
              <img
                src={value}
                alt="Pratinjau Infografis"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                Pratinjau
              </div>
            </div>

            {/* Information & Action Buttons */}
            <div className="flex-1 min-w-0 space-y-2 w-full">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isBase64 ? 'Foto Galeri Berhasil Dipilih' : 'Gambar Terpasang'}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {uploadedFileName ? `File: ${uploadedFileName}` : value.substring(0, 60) + '...'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleTriggerPicker}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Memproses...' : 'Ganti Foto dari Galeri'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-700 hover:text-rose-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: Upload Dropzone & Gallery Selector */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleTriggerPicker}
          className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer select-none ${
            isDragging
              ? 'border-[#07529A] bg-blue-50/70 scale-[1.01]'
              : 'border-blue-200 hover:border-[#07529A] bg-blue-50/20 hover:bg-blue-50/40'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#07529A] to-[#1E88E5] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              {isLoading ? (
                <RefreshCw className="w-6 h-6 animate-spin text-[#FFD84D]" />
              ) : (
                <ImageIcon className="w-6 h-6" />
              )}
            </div>

            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                {isLoading ? 'Sedang Memproses Foto...' : 'Pilih Foto dari Galeri Anda'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm">
                Klik di sini untuk membuka galeri foto di HP/laptop atau seret file gambar langsung ke sini.
              </p>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200 text-[#07529A] text-xs font-bold shadow-xs">
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Buka Galeri Foto</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                JPG, PNG, WEBP (Maks 25MB)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Optional fallback text input for URL */}
      {showUrlField && (
        <div className="pt-2">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Atau masukkan path aset proyek (/images/...) maupun URL gambar eksternal:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={value?.startsWith('data:image/') ? '' : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="/images/nama-gambar.jpg atau https://..."
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#07529A] focus:outline-none"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-2 py-2 text-xs text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      )}

      {isBase64 && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
          Catatan: Foto unggahan langsung dari perangkat hanya tersimpan sementara di browser saat ini. Untuk gambar permanen lintas perangkat setelah publish ulang, simpan file di folder <code className="font-mono">public/images/</code> lalu gunakan path <code className="font-mono">/images/nama-gambar.jpg</code>.
        </p>
      )}

      {errorMessage && (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
          <X className="w-3.5 h-3.5" />
          {errorMessage}
        </p>
      )}

      {helperText && !errorMessage && (
        <p className="text-[11px] text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
};
