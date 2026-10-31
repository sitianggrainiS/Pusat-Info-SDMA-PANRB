import React, { useState } from 'react';
import { usePolicy } from '../context/PolicyContext';
import { InstagramEmbed } from '../components/common/InstagramEmbed';
import { CategoryIcon } from '../components/common/CategoryIcon';
import {
  ArrowLeft,
  Calendar,
  Instagram,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  BookOpen,
  FileText,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { motion } from 'motion/react';

interface PolicyDetailPageProps {
  slug: string;
}

export const PolicyDetailPage: React.FC<PolicyDetailPageProps> = ({ slug }) => {
  const { getPolicyBySlug, getCategoryById, navigateTo } = usePolicy();
  const policy = getPolicyBySlug(slug);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!policy) {
    return (
      <div className="py-24 text-center max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-slate-800">Konten Tidak Ditemukan</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          Halaman konten yang Anda tuju tidak tersedia atau telah diubah URL-nya.
        </p>
        <button
          type="button"
          onClick={() => navigateTo({ name: 'policies' })}
          className="mt-6 px-4 py-2.5 bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Lihat Semua Konten
        </button>
      </div>
    );
  }

  const category = getCategoryById(policy.categoryId);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const adminLinkedRegulations = policy.sources || [];

  return (
    <div className="py-8 sm:py-10 bg-[#F8FAFC] min-h-[85vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Button & Share Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (category) {
                  navigateTo({ name: 'category-detail', slug: category.slug });
                } else {
                  navigateTo({ name: 'policies' });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#07529A] text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Kembali</span>
            </motion.button>

            {/* Breadcrumb Navigation */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-1 text-xs text-slate-500 scrollbar-none min-w-0"
            >
              <button
                type="button"
                onClick={() => navigateTo({ name: 'home' })}
                className="hover:text-[#07529A] transition-colors cursor-pointer shrink-0"
              >
                Beranda
              </button>
              <span aria-hidden="true" className="text-slate-300">/</span>
              <button
                type="button"
                onClick={() => navigateTo({ name: 'policies' })}
                className="hover:text-[#07529A] transition-colors font-medium text-slate-700 cursor-pointer shrink-0"
              >
                Jelajahi Konten
              </button>
              {category && (
                <>
                  <span aria-hidden="true" className="text-slate-300">/</span>
                  <button
                    type="button"
                    onClick={() => navigateTo({ name: 'category-detail', slug: category.slug })}
                    className="hover:text-[#07529A] transition-colors text-[#07529A] font-semibold cursor-pointer truncate max-w-[220px] sm:max-w-xs"
                  >
                    {category.name}
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Share Button */}
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleShare}
            className={`shrink-0 self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              copiedLink
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
            }`}
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span>{copiedLink ? 'Tautan Tersalin!' : 'Bagikan'}</span>
          </motion.button>
        </div>

        {/* Top Header Block: Title & Metadata */}
        <div className="relative overflow-hidden bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-3">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#07529A] via-[#5BA7E8] to-[#FFD84D]" />

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-slate-500">
            {category && (
              <button
                type="button"
                onClick={() => navigateTo({ name: 'category-detail', slug: category.slug })}
                className="font-bold text-[#07529A] hover:underline cursor-pointer flex items-center gap-1.5"
              >
                <CategoryIcon name={category.iconName} className="w-3.5 h-3.5 shrink-0" />
                <span>{category.name}</span>
              </button>
            )}
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Dipublikasikan {policy.publicationDate}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-600 font-medium inline-flex items-center gap-1">
              <Instagram className="w-3 h-3 text-[#E1306C] shrink-0" />
              <span>{policy.instagramAccountHandle || '@sdmapanrb'}</span>
            </span>
            {policy.aiAssisted && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Terverifikasi Tim</span>
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight [text-wrap:balance]">
            {policy.title}
          </h1>
        </div>

        {/* Responsive Two-Column Layout (Left 60%, Right 40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column (col-span-7) -> Instagram Embed & Media */}
          <div className="lg:col-span-7 space-y-4 min-w-0">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-4 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E1306C] border border-rose-100 flex items-center justify-center font-bold shrink-0">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Feed Instagram Resmi
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Infografis interaktif & karusel multi-slide
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-[#E1306C] flex items-center gap-1">
                  <Instagram className="w-3 h-3 text-[#E1306C] shrink-0" />
                  <span>Kepsyen Lengkap Aktif</span>
                </span>
              </div>

              {/* Instagram Embed Component with Carousel and Full Caption */}
              <div className="w-full flex justify-center py-1 overflow-hidden">
                <InstagramEmbed
                  url={policy.instagramPostUrl}
                  thumbnail={policy.thumbnail}
                  clusterName={category?.name}
                  title={policy.title}
                  captioned={true}
                  hideHeader={true}
                  className="w-full max-w-full"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 text-[11px]">
                  Navigasi geser slide aktif di dalam frame Instagram
                </span>
                <a
                  href={policy.instagramPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#07529A] hover:underline whitespace-nowrap"
                >
                  <span>Buka di Aplikasi Instagram</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Panel (col-span-5) -> Supporting Information (sticky offset clears sticky Header) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 min-w-0">
            {/* 1. Tentang Konten */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#07529A] uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-[#07529A] shrink-0" />
                  <span>Tentang Konten</span>
                </div>
                {policy.isAiSummaryApproved && policy.aiSummary?.trim() && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#07529A]">
                    <Sparkles className="w-3 h-3 text-[#07529A] shrink-0" />
                    <span>Ringkasan AI Terverifikasi</span>
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed font-normal">
                  {policy.isAiSummaryApproved && policy.aiSummary?.trim()
                    ? policy.aiSummary
                    : policy.summary ||
                      'Materi edukasi kebijakan SDM Aparatur yang bersumber dari media sosial resmi KemenPANRB.'}
                </p>

                <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 font-medium shrink-0">Klaster ASN:</span>
                    {category ? (
                      <button
                        type="button"
                        onClick={() => navigateTo({ name: 'category-detail', slug: category.slug })}
                        className="font-bold text-[#07529A] hover:underline text-right cursor-pointer"
                      >
                        {category.name}
                      </button>
                    ) : (
                      <span className="font-semibold text-slate-700">SDM Aparatur</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
                    <span className="text-slate-500 font-medium">Tanggal Rilis:</span>
                    <span className="font-semibold text-slate-700">{policy.publicationDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Regulasi Terkait */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#07529A] uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-[#07529A] shrink-0" />
                  <span>Regulasi Terkait</span>
                </div>
                <span className="text-xs font-bold text-[#07529A] tabular-nums">
                  {adminLinkedRegulations.length} Dokumen
                </span>
              </div>

              {adminLinkedRegulations.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dasar hukum resmi terverifikasi JDIH yang mendasari materi infografis kebijakan ini:
                  </p>

                  <div className="space-y-3">
                    {adminLinkedRegulations.map((src, idx) => (
                      <div
                        key={src.id || idx}
                        className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-[#07529A]/35 transition-all space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{src.regulationType || 'Regulasi Resmi'}</span>
                          </div>
                          {src.year && (
                            <span className="text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">
                              Tahun {src.year}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                          {src.title}
                        </h4>

                        {src.articles && (
                          <p className="text-[11px] font-mono text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200/90 inline-block">
                            Pasal Rujukan: {src.articles}
                          </p>
                        )}

                        {src.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {src.description}
                          </p>
                        )}

                        {src.fileUrl && (
                          <div className="pt-2 border-t border-slate-200/70">
                            <a
                              href={src.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#07529A] bg-blue-50/80 hover:bg-[#07529A] hover:text-white rounded-xl transition-colors border border-blue-200/70 hover:border-[#07529A]"
                            >
                              <span>Buka Dokumen Resmi (JDIH)</span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs space-y-1.5">
                  <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="font-bold text-slate-700">
                    Belum Ada Regulasi Terkait yang Ditautkan
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Dasar hukum rujukan resmi dapat ditautkan melalui Admin Portal → Manajemen Konten.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Sumber Konten */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#E1306C] uppercase tracking-wider border-b border-slate-100 pb-3">
                <Instagram className="w-4 h-4 text-[#E1306C] shrink-0" />
                <span>Sumber Konten</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/90">
                  <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4] shrink-0">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <Instagram className="w-5 h-5 text-[#E1306C]" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {policy.instagramAccountHandle || '@sdmapanrb'}
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      SDM Aparatur KemenPANRB Resmi
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 px-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Tanggal Tayang:</span>
                    <span className="font-semibold text-slate-800">{policy.instagramDate}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Tipe Media:</span>
                    <span className="font-semibold text-slate-800">Post / Karusel / Reel</span>
                  </div>
                </div>

                <motion.a
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  href={policy.instagramPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 text-white font-bold text-xs shadow-xs transition-opacity cursor-pointer"
                >
                  <Instagram className="w-4 h-4 shrink-0" />
                  <span>Buka Postingan Asli di Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </motion.a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
