import React, { useState, useRef } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { HeroSlide } from '../../types';
import { HERO_SLIDE_SLOT_COUNT, normalizeHeroSlides } from '../../data/initialHeroSlides';
import { compressImageForFirestore } from '../../utils/thumbnailUtils';
import {
  isTemporaryRuntimeUploadUrl,
  normalizeStaticImageUrl,
} from '../../data/staticImages';
import { StaticAssetPicker, UploadLimitationNotice } from './StaticAssetPicker';
import {
  UrlImagePreviewStatus,
  ImagePreviewLoadState,
} from './UrlImagePreviewStatus';
import { validateDirectImageUrl } from '../../utils/imageUrlUtils';
import {
  Plus,
  Upload,
  FolderOpen,
  RefreshCw,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  EyeOff,
  X,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Images,
  Link as LinkIcon,
  ImagePlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeroSlidesManagerProps {
  externalCreateModalOpen?: boolean;
  onCloseExternalCreateModal?: () => void;
  onOpenCreateModal?: () => void;
  onShowToast?: (message: string) => void;
}

export const HeroSlidesManager: React.FC<HeroSlidesManagerProps> = ({
  externalCreateModalOpen,
  onCloseExternalCreateModal,
  onShowToast,
}) => {
  const { heroSlides, saveHeroSlides, resetHeroSlides } = usePolicy();

  // Always work with 3 normalized slots (Slot 1, Slot 2, Slot 3)
  const slots = React.useMemo(() => normalizeHeroSlides(heroSlides), [heroSlides]);
  const filledCount = slots.filter((s) => Boolean(s.imageUrl)).length;
  const firstActiveSlotIndex = slots.findIndex((s) => s.isActive && Boolean(s.imageUrl));

  // Modal state for Filling / Editing a specific slot (0, 1, or 2)
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [slidePreviewLoadState, setSlidePreviewLoadState] =
    useState<ImagePreviewLoadState>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Clear Slot & Reset Modals
  const [clearingSlotIndex, setClearingSlotIndex] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Live Preview Slider Index
  const [previewIndex, setPreviewIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string) => {
    onShowToast?.(msg);
  };

  const openSlotModal = React.useCallback(
    (slotIndex: number) => {
      const clamped = Math.max(0, Math.min(HERO_SLIDE_SLOT_COUNT - 1, slotIndex));
      const targetSlot = slots[clamped];
      const hasImage = Boolean(targetSlot?.imageUrl);

      setEditingSlotIndex(clamped);
      setFormTitle(hasImage ? targetSlot.title : '');
      setFormImageUrl(hasImage ? targetSlot.imageUrl : '');
      setFormIsActive(hasImage ? targetSlot.isActive : true);
      setFormError(null);
      setSlidePreviewLoadState('idle');
    },
    [slots]
  );

  const openFirstAvailableSlot = React.useCallback(() => {
    const emptyIdx = slots.findIndex((s) => !s.imageUrl);
    openSlotModal(emptyIdx !== -1 ? emptyIdx : 0);
  }, [slots, openSlotModal]);

  React.useEffect(() => {
    if (externalCreateModalOpen) {
      openFirstAvailableSlot();
      onCloseExternalCreateModal?.();
    }
  }, [externalCreateModalOpen, openFirstAvailableSlot, onCloseExternalCreateModal]);

  const activePreviewSlides = slots.filter((s) => s.isActive && Boolean(s.imageUrl));
  const safePreviewIndex =
    activePreviewSlides.length > 0
      ? Math.min(previewIndex, activePreviewSlides.length - 1)
      : 0;

  const closeFormModal = () => {
    setEditingSlotIndex(null);
    setFormError(null);
    setSlidePreviewLoadState('idle');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Harap pilih file gambar berformat JPG, PNG, atau WEBP.');
      return;
    }

    try {
      setIsUploading(true);
      setFormError(null);
      const localPreviewUrl = await compressImageForFirestore(file);
      setFormImageUrl(localPreviewUrl);
    } catch (err) {
      console.error('Failed to process slide image:', err);
      setFormError(
        err instanceof Error
          ? err.message
          : 'Gagal memproses file gambar. Pilih dari Aset Proyek (/images/...) atau gunakan URL https://...'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSlotIndex === null) return;

    const rawTrimmed = formImageUrl.trim();
    const cleanTitle = formTitle.trim();

    if (!rawTrimmed) {
      setFormError(
        'Silakan pilih gambar dari Galeri Aset Proyek (/images/...) atau masukkan URL gambar (https://...).'
      );
      return;
    }

    const check = validateDirectImageUrl(rawTrimmed, {
      allowEmpty: false,
      allowDataUrl: true,
    });
    if (!check.isValid) {
      setFormError(
        check.error ||
          'Format path/URL gambar tidak valid. Gunakan /images/nama-gambar.jpg atau URL https://...'
      );
      return;
    }

    if (slidePreviewLoadState === 'error') {
      setFormError(
        'URL gambar gagal dimuat. Pastikan tautan mengarah langsung ke file gambar yang valid dan dapat diakses publik sebelum menyimpan.'
      );
      return;
    }

    const cleanImg = check.cleanUrl;

    try {
      setIsSaving(true);
      setFormError(null);
      const now = new Date().toISOString();
      const wasEmpty = !slots[editingSlotIndex]?.imageUrl;

      const nextSlots = slots.map((slot, idx) =>
        idx === editingSlotIndex
          ? {
              ...slot,
              id: slot.id || `hero-slide-slot-${idx + 1}`,
              imageUrl: cleanImg,
              title: cleanTitle,
              isActive: formIsActive,
              order: idx,
              updatedAt: now,
            }
          : slot
      );

      await saveHeroSlides(nextSlots);
      notify(
        wasEmpty
          ? `Gambar berhasil disimpan ke Slot Slide #${editingSlotIndex + 1} di Cloud Firestore.`
          : `Slot Slide #${editingSlotIndex + 1} berhasil diperbarui di Cloud Firestore.`
      );
      closeFormModal();
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan gambar pada slot slide.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveSlot = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slots.length) return;

    const reordered = [...slots];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await saveHeroSlides(reordered);
      notify(`Urutan Slot #${index + 1} dipindahkan ke Slot #${targetIndex + 1}.`);
    } catch (err: any) {
      notify(err?.message || 'Gagal mengubah urutan slot di Firestore.');
    }
  };

  const handleToggleActive = async (slotIndex: number) => {
    const slide = slots[slotIndex];
    if (!slide || !slide.imageUrl) return;

    const activeCount = slots.filter((s) => s.isActive && Boolean(s.imageUrl)).length;
    if (slide.isActive && activeCount <= 1) {
      notify('Minimal harus ada 1 slot gambar yang aktif ditampilkan di beranda.');
      return;
    }

    const nextSlots = slots.map((s, idx) =>
      idx === slotIndex ? { ...s, isActive: !s.isActive } : s
    );
    try {
      await saveHeroSlides(nextSlots);
      notify(
        !slide.isActive
          ? `Slot Slide #${slotIndex + 1} kini ditampilkan di beranda.`
          : `Slot Slide #${slotIndex + 1} disembunyikan dari beranda.`
      );
    } catch (err: any) {
      notify(err?.message || 'Gagal mengubah status tampil slot di Firestore.');
    }
  };

  const handleConfirmClearSlot = async () => {
    if (clearingSlotIndex === null) return;

    const now = new Date().toISOString();
    const nextSlots = slots.map((s, idx) =>
      idx === clearingSlotIndex
        ? {
            ...s,
            imageUrl: '',
            title: '',
            isActive: false,
            updatedAt: now,
          }
        : s
    );

    // If another slot has an image and none are active, auto-activate the first filled slot
    const hasAnyActive = nextSlots.some((s) => s.isActive && Boolean(s.imageUrl));
    if (!hasAnyActive) {
      const firstFilled = nextSlots.findIndex((s) => Boolean(s.imageUrl));
      if (firstFilled !== -1) {
        nextSlots[firstFilled] = { ...nextSlots[firstFilled], isActive: true };
      }
    }

    try {
      await saveHeroSlides(nextSlots);
      const clearedNum = clearingSlotIndex + 1;
      setClearingSlotIndex(null);
      notify(`Slot Slide #${clearedNum} berhasil dikosongkan.`);
    } catch (err: any) {
      setClearingSlotIndex(null);
      notify(err?.message || 'Gagal mengosongkan slot di Firestore.');
    }
  };

  const handleConfirmReset = async () => {
    try {
      await resetHeroSlides();
      setShowResetConfirm(false);
      setPreviewIndex(0);
      notify('Ketiga slot slide beranda dikembalikan ke gambar standar bawaan.');
    } catch (err: any) {
      setShowResetConfirm(false);
      notify(err?.message || 'Gagal mereset slot slide di Firestore.');
    }
  };

  const clearingSlot = clearingSlotIndex !== null ? slots[clearingSlotIndex] : null;

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3 Fixed Slide Slots & Reorder Controls */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                3 Slot Gambar Slider Hero ({filledCount}/{HERO_SLIDE_SLOT_COUNT} Slot Terisi)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tersedia 3 slot slide untuk halaman beranda. Unggah atau ganti foto pada masing-masing slot.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                title="Kembalikan ke 3 gambar default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
              {filledCount < HERO_SLIDE_SLOT_COUNT && (
                <button
                  type="button"
                  onClick={openFirstAvailableSlot}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Isi Slot Kosong</span>
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {slots.map((slide, idx) => {
              const hasImage = Boolean(slide.imageUrl);
              return (
                <div
                  key={slide.id || `slot-${idx}`}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    !hasImage
                      ? 'bg-slate-50/40 hover:bg-blue-50/25'
                      : slide.isActive
                      ? 'hover:bg-slate-50/70'
                      : 'bg-slate-50/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Order Controls */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSlot(idx, 'up')}
                        className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none text-slate-600 cursor-pointer transition-colors"
                        title="Geser slot ke atas"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-slate-500 tabular-nums">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        disabled={idx === slots.length - 1}
                        onClick={() => handleMoveSlot(idx, 'down')}
                        className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none text-slate-600 cursor-pointer transition-colors"
                        title="Geser slot ke bawah"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Image Thumbnail or Empty Slot Drop Target */}
                    {hasImage ? (
                      <div
                        onClick={() => openSlotModal(idx)}
                        className="group relative w-24 sm:w-28 aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 cursor-pointer shadow-2xs"
                        title={`Klik untuk mengganti gambar Slot #${idx + 1}`}
                      >
                        <img
                          src={slide.imageUrl}
                          alt={slide.title || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Edit className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openSlotModal(idx)}
                        className="group w-24 sm:w-28 aspect-4/3 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#07529A] bg-white hover:bg-blue-50/50 shrink-0 cursor-pointer flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#07529A] transition-colors"
                        title={`Klik untuk mengisi gambar pada Slot #${idx + 1}`}
                      >
                        <ImagePlus className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Slot #{idx + 1}</span>
                      </button>
                    )}

                    {/* Title & Slot Status */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            hasImage
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200/80'
                          }`}
                        >
                          Slot Slide {idx + 1}
                        </span>

                        {hasImage && idx === firstActiveSlotIndex && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#07529A] border border-blue-200">
                            Slide Utama
                          </span>
                        )}

                        {hasImage ? (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(idx)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                              slide.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Klik untuk menampilkan atau menyembunyikan slot ini"
                          >
                            {slide.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Tampil di Beranda</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3 text-slate-500" />
                                <span>Disembunyikan</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            Kosong · Belum diisi
                          </span>
                        )}
                      </div>

                      {!hasImage ? (
                        <h4 className="text-xs sm:text-sm font-bold truncate text-slate-500">
                          Belum Ada Gambar di Slot #{idx + 1}
                        </h4>
                      ) : slide.title ? (
                        <h4 className="text-xs sm:text-sm font-bold truncate text-slate-900">
                          {slide.title}
                        </h4>
                      ) : null}

                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                        {!hasImage
                          ? 'Klik tombol Isi Gambar untuk memilih aset'
                          : slide.imageUrl.startsWith('data:image/')
                          ? 'Unggahan Perangkat (Tersimpan di Cloud Firestore)'
                          : slide.imageUrl}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                    {hasImage ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openSlotModal(idx)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-700" />
                          <span>Ubah</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setClearingSlotIndex(idx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                          title={`Kosongkan gambar pada Slot #${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openSlotModal(idx)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Isi Gambar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Interactive Hero Slider Preview */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#07529A]">
                Pratinjau Langsung Beranda
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                Tampilan Kartu Geser di Halaman Utama
              </h4>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg tabular-nums">
              {activePreviewSlides.length} / {HERO_SLIDE_SLOT_COUNT} Aktif
            </span>
          </div>

          {activePreviewSlides.length > 0 ? (
            <div className="relative rounded-2xl overflow-hidden shadow-md border border-slate-200/90 bg-white p-2 group">
              <div className="relative rounded-xl overflow-hidden bg-slate-100">
                <div
                  style={{
                    transform: `translate3d(-${safePreviewIndex * 100}%, 0, 0)`,
                  }}
                  className="flex w-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                >
                  {activePreviewSlides.map((slide, idx) => (
                    <div key={slide.id || idx} className="w-full shrink-0 aspect-4/3 bg-slate-100">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {activePreviewSlides.length > 1 && (
                  <>
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/45 backdrop-blur-md">
                      {activePreviewSlides.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setPreviewIndex(idx)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            idx === safePreviewIndex
                              ? 'w-4 bg-[#FFD84D]'
                              : 'w-1.5 bg-white/65 hover:bg-white'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-slate-900/45 backdrop-blur-md text-[10px] font-mono font-bold text-white tabular-nums">
                      {safePreviewIndex + 1} / {activePreviewSlides.length}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewIndex(
                          (prev) =>
                            (prev - 1 + activePreviewSlides.length) % activePreviewSlides.length
                        )
                      }
                      className="absolute left-2 top-[42%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewIndex((prev) => (prev + 1) % activePreviewSlides.length)
                      }
                      className="absolute right-2 top-[42%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
              Belum ada slot gambar aktif. Silakan isi salah satu dari 3 slot di sebelah kiri.
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Pengunjung website dapat menggeser gambar ke kiri/kanan menggunakan jari di layar ponsel, menarik dengan kursor, atau menekan tombol panah.
          </p>
        </div>
      </div>

      {/* Fill / Edit Slot Modal */}
      <AnimatePresence>
        {editingSlotIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeFormModal}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs overflow-y-auto"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleSaveForm}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl max-w-2xl w-full space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#07529A] flex items-center justify-center">
                    <Images className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {slots[editingSlotIndex]?.imageUrl
                        ? `Ubah Gambar — Slot Slide #${editingSlotIndex + 1}`
                        : `Isi Gambar — Slot Slide #${editingSlotIndex + 1}`}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Unggah foto dari perangkat atau tempel URL gambar untuk slot ini.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3-Slot Selector Tabs */}
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s, idx) => {
                  const isCurrent = idx === editingSlotIndex;
                  const isFilled = Boolean(s.imageUrl);
                  return (
                    <button
                      key={s.id || idx}
                      type="button"
                      onClick={() => openSlotModal(idx)}
                      className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#07529A] bg-blue-50/70 ring-2 ring-[#07529A]/20'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold ${
                            isCurrent ? 'text-[#07529A]' : 'text-slate-800'
                          }`}
                        >
                          Slot #{idx + 1}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isFilled
                              ? 'bg-emerald-100/80 text-emerald-700'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          {isFilled ? 'Terisi' : 'Kosong'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 1. Primary Permanent Option: Project Static Assets (/images/...) */}
              <StaticAssetPicker
                selectedUrl={formImageUrl}
                onSelect={(assetPath) => {
                  setFormImageUrl(assetPath);
                  setFormError(null);
                }}
              />

              {/* 2. Path / External URL Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Path Aset Proyek (/images/...) atau URL Gambar Eksternal (https://...)
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formImageUrl.startsWith('data:image/') ? '' : formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder={
                      formImageUrl.startsWith('data:image/')
                        ? 'Pratinjau file perangkat sedang dipilih (ketik /images/... atau https://... untuk mengganti)...'
                        : '/images/nama-gambar.jpg atau https://...'
                    }
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Device Upload (Temporary Preview Session Only) + Honest Limitation Notice */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#07529A] flex items-center justify-center shrink-0 shadow-2xs">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">
                        Unggah File Gambar dari Perangkat (Disimpan ke Firestore)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        File dikompresi otomatis dan disimpan langsung ke Cloud Firestore.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {isUploading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#07529A]" />
                    ) : (
                      <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{isUploading ? 'Memproses...' : 'Pilih File Gambar'}</span>
                  </button>
                </div>

                <UploadLimitationNotice isTemporaryActive={false} />
              </div>

              {/* Title & Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-8 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Judul / Keterangan Gambar <span className="font-normal text-slate-400">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Kosongkan jika tidak perlu diberi judul"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#07529A] focus:ring-2 focus:ring-[#07529A]/15 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded text-[#07529A] focus:ring-[#07529A]"
                    />
                    <span className="text-xs font-bold text-slate-800">Tampilkan di Beranda</span>
                  </label>
                </div>
              </div>

              {/* Selected Image Preview & Load Verification */}
              {formImageUrl && (
                <div className="pt-2 border-t border-slate-100">
                  <UrlImagePreviewStatus
                    imageUrl={formImageUrl}
                    label={formTitle || `Pratinjau Slot Slide #${editingSlotIndex + 1}`}
                    allowEmpty={false}
                    onStatusChange={(st) => setSlidePreviewLoadState(st)}
                  />
                </div>
              )}

              {formError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#07529A] hover:bg-[#053d73] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {isSaving
                      ? 'Menyimpan...'
                      : `Simpan ke Slot #${editingSlotIndex + 1}`}
                  </span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Slot Confirmation Modal */}
      <AnimatePresence>
        {clearingSlotIndex !== null && clearingSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setClearingSlotIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-md w-full space-y-4"
            >
              <h4 className="font-bold text-sm text-slate-900">
                Kosongkan Slot Slide #{clearingSlotIndex + 1}?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gambar <strong>"{clearingSlot.title || `Slot Slide #${clearingSlotIndex + 1}`}"</strong> akan dihapus sehingga Slot #{clearingSlotIndex + 1} menjadi kosong dan dapat diisi gambar baru.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClearingSlotIndex(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearSlot}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
                >
                  Ya, Kosongkan Slot
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Default Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResetConfirm(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-md w-full space-y-4"
            >
              <h4 className="font-bold text-sm text-slate-900">Reset 3 Slot Slider ke Default?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ketiga slot gambar slider beranda akan dikembalikan ke 3 gambar bawaan standar KOMPAK SDMA.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#07529A] hover:bg-[#053d73] rounded-xl cursor-pointer"
                >
                  Ya, Reset Default
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
