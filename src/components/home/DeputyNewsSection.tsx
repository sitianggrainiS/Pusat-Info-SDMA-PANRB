import React, { useMemo, useState } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { DeputyNews } from '../../types';
import {
  formatIndonesianNewsDate,
  resolveDeputyNewsImageUrl,
  sortDeputyNewsNewestFirst,
} from '../../utils/deputyNewsUtils';
import { ScrollReveal } from '../common/ScrollReveal';
import { Newspaper, ExternalLink, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

const NewsCardImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [imgFailed, setImgFailed] = useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [src]);

  if (!src || imgFailed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#07529A] via-[#06427d] to-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <Newspaper className="w-8 h-8 text-[#FFD84D] mb-2" />
        <span className="text-xs font-semibold text-white/90 line-clamp-2 max-w-xs">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-104"
    />
  );
};

const DeputyNewsCard: React.FC<{ item: DeputyNews; imageSrc: string }> = ({ item, imageSrc }) => {
  return (
    <article className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 overflow-hidden flex flex-col h-full shadow-2xs transition-all duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-12px_rgba(7,82,154,0.13)] hover:border-[#07529A]/35">
      {/* Thumbnail */}
      <div className="aspect-16/10 w-full bg-slate-100 overflow-hidden border-b border-slate-100 relative">
        <NewsCardImage src={imageSrc} alt={item.title} />
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1 justify-between">
        <div className="space-y-2.5">
          {/* Clean unboxed metadata with typographic separator */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-[#07529A]">{item.category}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={item.publicationDate} className="tabular-nums">
              {formatIndonesianNewsDate(item.publicationDate)}
            </time>
          </div>

          <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-[#07529A] transition-colors">
            {item.title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
            {item.summary}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-slate-400 font-medium truncate">
            {(() => {
              try {
                return new URL(item.articleUrl).hostname.replace(/^www\./, '') || 'menpan.go.id';
              } catch {
                return 'menpan.go.id';
              }
            })()}
          </span>
          <motion.a
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            href={item.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 shadow-2xs"
          >
            <span>Baca Selengkapnya</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#FFD84D] group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </motion.a>
        </div>
      </div>
    </article>
  );
};

export const DeputyNewsSection: React.FC = () => {
  const { deputyNews, deputyNewsImageUrls, isDeputyNewsLoading } = usePolicy();

  // Strictly show only 'published' news sorted by newest publicationDate first
  const publishedNews = useMemo(() => {
    return sortDeputyNewsNewestFirst(
      deputyNews.filter((item) => item.status === 'published')
    );
  }, [deputyNews]);

  return (
    <section
      id="berita-deputi-sdma"
      className="scroll-mt-16 py-16 sm:py-20 bg-white border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal direction="up" duration={500}>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#07529A] uppercase tracking-wider mb-2">
                <Newspaper className="w-4 h-4 text-[#07529A] shrink-0" />
                <span>Publikasi Resmi Kementerian PANRB</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
                Berita Deputi SDM Aparatur
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
                Informasi, liputan kegiatan, dan perkembangan kebijakan terbaru dari unit Deputi Bidang SDM Aparatur yang terhubung langsung dengan portal resmi Kementerian PANRB.
              </p>
            </div>

            <div className="self-start md:self-auto shrink-0">
              <motion.a
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                href="https://www.menpan.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-[#07529A] text-[#07529A] hover:text-white border border-slate-200/90 hover:border-[#07529A] text-xs font-bold transition-all duration-150 whitespace-nowrap shrink-0"
              >
                <span>Portal Resmi KemenPANRB</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              </motion.a>
            </div>
          </div>
        </ScrollReveal>

        {/* Loading State */}
        {isDeputyNewsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden h-96 animate-pulse flex flex-col"
              >
                <div className="aspect-16/10 bg-slate-200/70 w-full" />
                <div className="p-6 space-y-3 flex-1">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded w-5/6" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : publishedNews.length > 0 ? (
          /* Populated News Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {publishedNews.map((item) => (
              <DeputyNewsCard
                key={item.id}
                item={item}
                imageSrc={resolveDeputyNewsImageUrl(item, deputyNewsImageUrls)}
              />
            ))}
          </div>
        ) : (
          /* Neat Empty State when no published news exists yet */
          <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200/90 px-6 py-14 text-center max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-[#07529A] flex items-center justify-center mx-auto mb-4 shadow-2xs">
              <Newspaper className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Belum Ada Berita Deputi Terbaru
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              Saat ini belum ada berita Deputi Bidang SDM Aparatur yang diterbitkan. Pembaruan artikel resmi dari portal Kementerian PANRB akan ditampilkan pada bagian ini.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
