import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { DEFAULT_HERO_SLIDES } from '../../data/initialHeroSlides';
import { Search, ArrowRight, Instagram, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroProps {
  onSearchFocus: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSearchFocus }) => {
  const { navigateTo, heroSlides } = usePolicy();
  const [searchInput, setSearchInput] = useState('');

  const activeSlides = React.useMemo(() => {
    const activeFilled = heroSlides.filter((s) => s.isActive && Boolean(s.imageUrl));
    if (activeFilled.length > 0) return activeFilled;
    const anyFilled = heroSlides.filter((s) => Boolean(s.imageUrl));
    return anyFilled.length > 0 ? anyFilled : DEFAULT_HERO_SLIDES;
  }, [heroSlides]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartTimeRef = useRef<number>(0);
  const activePointerIdRef = useRef<number | null>(null);
  const wheelCooldownRef = useRef<number>(0);

  const safeSlideIndex =
    activeSlides.length > 0 ? Math.min(currentSlide, activeSlides.length - 1) : 0;

  useEffect(() => {
    if (currentSlide >= activeSlides.length) {
      setCurrentSlide(0);
    }
  }, [activeSlides.length, currentSlide]);

  const goToNext = useCallback(() => {
    if (activeSlides.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const goToPrev = useCallback(() => {
    if (activeSlides.length <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  useEffect(() => {
    if (activeSlides.length <= 1 || isPaused || isDragging) return;
    const timer = window.setInterval(goToNext, 5500);
    return () => window.clearInterval(timer);
  }, [activeSlides.length, isPaused, isDragging, goToNext]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeSlides.length <= 1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    activePointerIdRef.current = e.pointerId;
    dragStartXRef.current = e.clientX;
    dragStartTimeRef.current = Date.now();
    setIsDragging(true);
    setDragOffset(0);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      !isDragging ||
      dragStartXRef.current === null ||
      (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current)
    ) {
      return;
    }
    const delta = e.clientX - dragStartXRef.current;
    setDragOffset(delta);
  };

  const finishPointerSwipe = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    if (e && activePointerIdRef.current !== null) {
      try {
        if (e.currentTarget.hasPointerCapture(activePointerIdRef.current)) {
          e.currentTarget.releasePointerCapture(activePointerIdRef.current);
        }
      } catch {
        // Ignore release errors
      }
    }

    const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
    const velocity = Math.abs(dragOffset) / elapsed;
    const isSwipeTriggered =
      Math.abs(dragOffset) >= 28 || (Math.abs(dragOffset) >= 12 && velocity > 0.25);

    if (isSwipeTriggered) {
      if (dragOffset < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    activePointerIdRef.current = null;
    dragStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleWheelSwipe = (e: React.WheelEvent<HTMLDivElement>) => {
    if (activeSlides.length <= 1) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 16) {
      const now = Date.now();
      if (now - wheelCooldownRef.current < 420) return;
      wheelCooldownRef.current = now;
      if (e.deltaX > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigateTo({ name: 'search', query: searchInput.trim() });
    } else {
      onSearchFocus();
    }
  };

  return (
    <section className="relative overflow-hidden bg-white pt-10 pb-16 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24 border-b border-slate-200/80">
      {/* Subtle Architectural Institutional Grid & Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-institutional-grid opacity-80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-0 w-[38rem] h-[38rem] rounded-full bg-gradient-to-bl from-[#07529A]/8 via-[#5BA7E8]/6 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-gradient-to-tr from-[#FFD84D]/12 via-blue-50/40 to-transparent blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Institutional Kicker */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 text-[#07529A] text-xs sm:text-[13px] font-bold tracking-tight"
            >
              <ShieldCheck className="w-4 h-4 text-[#07529A] shrink-0" />
              <span>Portal Edukasi Publik Resmi Kebijakan SDM Aparatur</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl sm:text-4xl lg:text-[3.15rem] font-extrabold text-slate-900 tracking-tight leading-[1.13] [text-wrap:balance]"
            >
              Pahami Kebijakan SDM Aparatur dengan Cara yang Lebih Mudah
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Informasi kebijakan SDM Aparatur yang disajikan secara ringkas, jelas, dan mudah dipahami. Menghubungkan visual edukatif media sosial dengan regulasi resmi.
            </motion.p>

            {/* Interactive Search Box */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleSearchSubmit}
              className="max-w-xl mx-auto lg:mx-0 relative flex items-center bg-white rounded-2xl shadow-[0_8px_28px_-8px_rgba(7,82,154,0.12)] hover:shadow-[0_12px_32px_-8px_rgba(7,82,154,0.18)] border border-slate-200/95 hover:border-[#07529A]/40 focus-within:border-[#07529A] focus-within:ring-4 focus-within:ring-[#07529A]/10 p-1.5 sm:p-2 transition-all duration-200"
            >
              <div className="pl-3 sm:pl-3.5 pr-2 text-slate-400 shrink-0">
                <Search className="w-5 h-5 text-[#07529A]" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={onSearchFocus}
                placeholder="Cari kebijakan atau topik (misal: naik pangkat, fungsional)..."
                className="w-full min-w-0 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent py-2.5 focus:outline-none"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="px-4 sm:px-5 py-2.5 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Cari</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </motion.form>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-1"
            >
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const newsSection = document.getElementById('berita-deputi-sdma');
                  if (newsSection) {
                    newsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="group px-6 py-3 bg-[#07529A] hover:bg-[#053d73] text-white text-sm font-bold rounded-xl shadow-[0_8px_20px_-6px_rgba(7,82,154,0.45)] transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Berita Kedeputian</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>

              <motion.a
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                href="https://www.instagram.com/sdmapanrb"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#07529A] text-sm font-semibold rounded-xl border border-slate-200/90 hover:border-[#07529A]/35 shadow-2xs transition-all duration-150 flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Instagram className="w-4 h-4 text-[#E1306C] shrink-0" />
                <span>Lihat Instagram @sdmapanrb</span>
              </motion.a>
            </motion.div>

            {/* Micro stats / Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.26 }}
              className="pt-5 border-t border-slate-200/80 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-slate-500 tabular-nums"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">8 Klaster Manajemen</span>
                <span>Kebijakan ASN</span>
              </div>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">JDIH KemenPANRB</span>
                <span>Dasar Hukum Resmi</span>
              </div>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">100% Edukasi</span>
                <span>Bebas Akses Publik</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Hero Visual Asset */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative max-w-lg mx-auto lg:max-w-none w-full"
          >
            <div
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onWheel={handleWheelSwipe}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  goToPrev();
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  goToNext();
                }
              }}
              tabIndex={activeSlides.length > 1 ? 0 : undefined}
              aria-roledescription={activeSlides.length > 1 ? 'carousel' : undefined}
              aria-label="Galeri Visual Edukasi Kebijakan SDM Aparatur"
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_24px_48px_-14px_rgba(15,23,42,0.16)] border border-slate-200/90 bg-white p-2 sm:p-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#07529A]"
            >
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishPointerSwipe}
                onPointerCancel={finishPointerSwipe}
                className={`relative rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 select-none touch-pan-y ${
                  activeSlides.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                {/* Sliding Image Track */}
                <div
                  style={{
                    transform: `translate3d(calc(-${safeSlideIndex * 100}% + ${dragOffset}px), 0, 0)`,
                  }}
                  className={`flex w-full will-change-transform ${
                    isDragging
                      ? 'transition-none'
                      : 'transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'
                  }`}
                >
                  {activeSlides.map((slide, idx) => (
                    <div key={slide.id || idx} className="w-full shrink-0 aspect-4/3 relative bg-slate-100">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title || 'Edukasi Kebijakan SDM Aparatur'}
                        referrerPolicy="no-referrer"
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none select-none"
                      />
                    </div>
                  ))}
                </div>

                {/* Top Pagination Dots & Counter (visible when > 1 slide) */}
                {activeSlides.length > 1 && (
                  <>
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/15"
                    >
                      {activeSlides.map((slide, idx) => {
                        const isActive = idx === safeSlideIndex;
                        return (
                          <button
                            key={slide.id || idx}
                            type="button"
                            onClick={() => setCurrentSlide(idx)}
                            aria-label={`Tampilkan gambar ${idx + 1}: ${slide.title}`}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                              isActive
                                ? 'w-5 bg-[#FFD84D]'
                                : 'w-1.5 bg-white/70 hover:bg-white'
                            }`}
                          />
                        );
                      })}
                    </div>

                    <div className="pointer-events-none absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white tabular-nums">
                      {safeSlideIndex + 1} / {activeSlides.length}
                    </div>

                    {/* Prev / Next Swipe Navigation Buttons */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={goToPrev}
                      aria-label="Geser ke gambar sebelumnya"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 hover:text-[#07529A] backdrop-blur-md border border-slate-200/70 shadow-md flex items-center justify-center opacity-90 hover:opacity-100 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </button>

                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={goToNext}
                      aria-label="Geser ke gambar berikutnya"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 hover:text-[#07529A] backdrop-blur-md border border-slate-200/70 shadow-md flex items-center justify-center opacity-90 hover:opacity-100 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
