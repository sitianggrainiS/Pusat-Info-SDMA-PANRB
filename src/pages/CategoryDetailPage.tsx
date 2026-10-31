import React, { useState } from 'react';
import { usePolicy } from '../context/PolicyContext';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { InstagramEmbed } from '../components/common/InstagramEmbed';
import {
  FeedLayoutSwitcher,
  FeedLayoutOption,
  getFeedGridClass,
  getSavedFeedLayout,
  FEED_STORAGE_KEY,
} from '../components/common/FeedLayoutSwitcher';
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Instagram } from 'lucide-react';
import { motion } from 'motion/react';

interface CategoryDetailPageProps {
  slug: string;
}

export const CategoryDetailPage: React.FC<CategoryDetailPageProps> = ({ slug }) => {
  const { getCategoryBySlug, policies, navigateTo } = usePolicy();
  const category = getCategoryBySlug(slug);
  const [feedLayout, setFeedLayout] = useState<FeedLayoutOption>(getSavedFeedLayout);

  const handleLayoutChange = (layout: FeedLayoutOption) => {
    setFeedLayout(layout);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FEED_STORAGE_KEY, layout);
      } catch {
        // ignore storage errors
      }
    }
  };

  if (!category) {
    return (
      <div className="py-20 text-center max-w-lg mx-auto px-4">
        <h2 className="text-xl font-bold text-slate-800">Klaster Tidak Ditemukan</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          Klaster manajemen ASN yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <button
          type="button"
          onClick={() => navigateTo({ name: 'policies' })}
          className="mt-6 px-4 py-2.5 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Kembali ke Jelajahi Konten
        </button>
      </div>
    );
  }

  const categoryPolicies = policies.filter(
    (p) => p.categoryId === category.id && p.status === 'published'
  );

  return (
    <div className="py-10 sm:py-12 bg-[#F8FAFC] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <motion.button
          type="button"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigateTo({ name: 'policies' })}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-xs font-semibold text-slate-600 hover:text-[#07529A] hover:border-slate-300 shadow-2xs transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Jelajahi Konten</span>
        </motion.button>

        {/* Category Header Card */}
        <div className="relative overflow-hidden bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-6 sm:p-10 mb-10 shadow-2xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#07529A] via-[#5BA7E8] to-[#FFD84D]" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#07529A] text-[#FFD84D] flex items-center justify-center shrink-0 shadow-xs">
              <CategoryIcon name={category.iconName} className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#07529A]">
                <span>8 Klaster Manajemen ASN</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500 tabular-nums">
                  {categoryPolicies.length} Konten Instagram
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
                {category.name}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
                {category.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content in this cluster */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E1306C] uppercase tracking-wider mb-1">
                <Instagram className="w-3.5 h-3.5 shrink-0" />
                <span>Feed Instagram Resmi</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Konten Instagram: {category.name}
              </h2>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
              <FeedLayoutSwitcher
                currentLayout={feedLayout}
                onChange={handleLayoutChange}
              />

              <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs whitespace-nowrap tabular-nums">
                {categoryPolicies.length} Konten
              </span>
            </div>
          </div>

          {categoryPolicies.length > 0 ? (
            <div className={getFeedGridClass(feedLayout)}>
              {categoryPolicies.map((policy) => (
                <div
                  key={policy.id}
                  className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-[0_16px_32px_-12px_rgba(7,82,154,0.1)] hover:border-[#07529A]/30 transition-all duration-200 overflow-hidden ${
                    feedLayout === 'small' ? 'p-4 space-y-3' : 'p-5 sm:p-6 space-y-4'
                  }`}
                >
                  {/* Header info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-[#07529A] truncate">
                          {category.name}
                        </span>
                        <span>·</span>
                        <span className="shrink-0">{policy.publicationDate}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                        {policy.title}
                      </h3>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-[#E1306C]">
                      <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                      <span className="hidden sm:inline">Feed</span>
                    </span>
                  </div>

                  {/* Official Instagram Embed */}
                  <div className="w-full flex justify-center py-1 sm:py-2 bg-slate-50/70 rounded-2xl border border-slate-100 overflow-hidden">
                    <InstagramEmbed
                      url={policy.instagramPostUrl}
                      thumbnail={policy.thumbnail}
                      clusterName={category.name}
                      title={policy.title}
                      hideHeader={true}
                      captioned={false}
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <a
                      href={policy.instagramPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#07529A] font-semibold transition-colors whitespace-nowrap"
                    >
                      <Instagram className="w-3.5 h-3.5 text-[#E1306C] shrink-0" />
                      <span>Buka di Instagram</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    </a>

                    <motion.button
                      type="button"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigateTo({ name: 'policy-detail', slug: policy.slug })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#07529A] hover:bg-[#053d73] text-white rounded-xl font-bold shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Buka Halaman Detail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90 max-w-md mx-auto space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Belum Ada Konten Diterbitkan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Konten Instagram untuk klaster ini sedang dalam tahap penyusunan oleh tim konten bersama verifikator regulasi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
