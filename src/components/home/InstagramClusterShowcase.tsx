import React, { useState, useRef, useEffect } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { InstagramEmbed } from '../common/InstagramEmbed';
import { CategoryIcon } from '../common/CategoryIcon';
import {
  Instagram,
  ArrowRight,
  ExternalLink,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const InstagramClusterShowcase: React.FC = () => {
  const { categories, policies, navigateTo } = usePolicy();
  const publishedPolicies = policies.filter((p) => p.status === 'published');

  // Find initial cluster that has policies, or fallback to first category
  const initialClusterId =
    categories.find((c) => publishedPolicies.some((p) => p.categoryId === c.id))?.id ||
    categories[0]?.id ||
    '';

  const [activeClusterId, setActiveClusterId] = useState<string>(initialClusterId);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [categories]);

  const scrollTabs = (dir: 'left' | 'right') => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const distance = Math.max(el.clientWidth * 0.6, 240);
    el.scrollBy({
      left: dir === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
    setTimeout(updateScrollButtons, 280);
  };

  const activeCluster = categories.find((c) => c.id === activeClusterId) || categories[0];
  const clusterPosts = publishedPolicies.filter((p) => p.categoryId === activeCluster?.id);

  return (
    <section className="py-16 sm:py-20 bg-[#F8FAFC] border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E1306C] uppercase tracking-wider mb-2">
              <Instagram className="w-4 h-4 text-[#E1306C] shrink-0" />
              <span>Edukasi Visual Media Sosial Resmi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
              Konten Instagram per Klaster Manajemen ASN
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Jelajahi postingan, karusel edukatif, dan Reels Instagram resmi yang dikelompokkan secara tepat ke dalam 8 Klaster Manajemen ASN.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <motion.a
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              href="https://www.instagram.com/sdmapanrb"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white text-xs font-bold shadow-xs hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
            >
              <Instagram className="w-3.5 h-3.5 shrink-0" />
              <span>Ikuti @sdmapanrb</span>
              <ExternalLink className="w-3 h-3 text-white/85 shrink-0" />
            </motion.a>
          </div>
        </div>

        {/* Cluster Tabs Rail with Scroll Controls */}
        <div className="relative flex items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            disabled={!canScrollLeft}
            aria-label="Geser klaster ke kiri"
            className={`hidden sm:flex w-9 h-9 rounded-xl border items-center justify-center shrink-0 transition-all ${
              canScrollLeft
                ? 'bg-white hover:bg-[#07529A] border-slate-200/90 hover:border-[#07529A] text-slate-700 hover:text-white shadow-2xs cursor-pointer'
                : 'bg-slate-100/70 border-slate-200/50 text-slate-300 cursor-not-allowed opacity-45'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={tabsScrollRef}
            onScroll={updateScrollButtons}
            className="flex-1 flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-none scroll-smooth"
          >
            {categories.map((cluster) => {
              const count = publishedPolicies.filter((p) => p.categoryId === cluster.id).length;
              const isActive = activeClusterId === cluster.id;
              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => setActiveClusterId(cluster.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 border ${
                    isActive
                      ? 'text-white border-[#07529A] shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeInstagramClusterTab"
                      className="absolute inset-0 bg-[#07529A] rounded-xl"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <CategoryIcon
                    name={cluster.iconName}
                    className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[#FFD84D]' : 'text-[#07529A]'
                    }`}
                  />
                  <span className="relative z-10">{cluster.name}</span>
                  <span
                    className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-md font-mono tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollTabs('right')}
            disabled={!canScrollRight}
            aria-label="Geser klaster ke kanan"
            className={`hidden sm:flex w-9 h-9 rounded-xl border items-center justify-center shrink-0 transition-all ${
              canScrollRight
                ? 'bg-white hover:bg-[#07529A] border-slate-200/90 hover:border-[#07529A] text-slate-700 hover:text-white shadow-2xs cursor-pointer'
                : 'bg-slate-100/70 border-slate-200/50 text-slate-300 cursor-not-allowed opacity-45'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Active Cluster Content Area */}
        {activeCluster && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeCluster.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              {/* Cluster Description Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#07529A] text-[#FFD84D] flex items-center justify-center shrink-0 shadow-2xs">
                    <CategoryIcon name={activeCluster.iconName} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {activeCluster.name}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-600 line-clamp-2 sm:line-clamp-1 mt-0.5 leading-relaxed">
                      {activeCluster.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo({ name: 'category-detail', slug: activeCluster.slug })}
                  className="group text-xs font-bold text-[#07529A] hover:text-[#053d73] bg-blue-50/70 hover:bg-blue-100/70 px-3.5 py-2 rounded-xl border border-blue-100 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer whitespace-nowrap"
                >
                  <span>Lihat Informasi Klaster</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Posts Grid with Instagram Embeds */}
              {clusterPosts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                  {clusterPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-[0_16px_32px_-12px_rgba(7,82,154,0.1)] hover:border-[#07529A]/30 transition-all duration-200 p-5 sm:p-6 space-y-4 overflow-hidden"
                    >
                      {/* Header info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                            <span className="font-semibold text-[#07529A]">
                              {activeCluster.name}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{post.publicationDate}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-base sm:text-lg leading-snug">
                            {post.title}
                          </h4>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-[#E1306C]">
                          <Instagram className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">Feed Resmi</span>
                        </span>
                      </div>

                      {post.summary && (
                        <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed line-clamp-2">
                          {post.summary}
                        </p>
                      )}

                      {/* Official Instagram Embed Container */}
                      <div className="w-full flex justify-center py-2 bg-slate-50/70 rounded-2xl border border-slate-100 overflow-hidden">
                        <InstagramEmbed
                          url={post.instagramPostUrl}
                          clusterName={activeCluster.name}
                          title={post.title}
                          hideHeader={true}
                        />
                      </div>

                      {/* Card Actions */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <a
                          href={post.instagramPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1.5 text-slate-700 hover:text-[#07529A] font-semibold transition-colors whitespace-nowrap"
                        >
                          <Instagram className="w-3.5 h-3.5 text-[#E1306C] shrink-0" />
                          <span>Buka di Instagram</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#07529A] shrink-0" />
                        </a>

                        <motion.button
                          type="button"
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigateTo({ name: 'policy-detail', slug: post.slug })}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#07529A] hover:bg-[#053d73] text-white rounded-xl font-bold shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-[#FFD84D] shrink-0" />
                          <span>Penjelasan Regulasi</span>
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty state for cluster without posts */
                <div className="p-12 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-3 max-w-lg mx-auto">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                    <Instagram className="w-6 h-6 text-[#E1306C]" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                    Belum Ada Konten Instagram di Klaster Ini
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Tim konten sedang menyusun publikasi edukatif untuk{' '}
                    <strong>"{activeCluster.name}"</strong>. Silakan periksa klaster lainnya di atas.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};
