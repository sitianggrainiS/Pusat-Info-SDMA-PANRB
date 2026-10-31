import React from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { ArrowRight, Sparkles, Scale, ExternalLink } from 'lucide-react';

export const FeaturedSection: React.FC = () => {
  const { policies, navigateTo } = usePolicy();
  const featured = policies.find((p) => p.isFeatured) || policies[0];

  if (!featured) return null;

  return (
    <section className="py-16 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-blue-50/80 via-white to-amber-50/40 rounded-3xl border border-blue-100/80 p-8 sm:p-12 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Visual Thumbnail */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div
                onClick={() => navigateTo({ name: 'policy-detail', slug: featured.slug })}
                className="relative rounded-2xl overflow-hidden shadow-md group cursor-pointer aspect-4/3 bg-slate-100"
              >
                <img
                  src={featured.thumbnail}
                  alt={featured.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white text-xs flex items-center justify-between">
                  <span className="font-semibold bg-slate-900/70 px-2.5 py-1 rounded-md backdrop-blur-xs">
                    Rujukan Infografis @sdmapanrb
                  </span>
                  <span className="text-blue-100">Klik untuk baca</span>
                </div>
              </div>
            </div>

            {/* Explanatory Content */}
            <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#07529A] text-white text-xs font-bold">
                <Scale className="w-3.5 h-3.5 text-[#FFD84D]" />
                <span>TOPIK UTAMA PILIHAN</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {featured.title}
              </h2>

              <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium">
                Sering dianggap sama oleh ASN dan masyarakat, padahal keduanya memiliki konsep, mekanisme yuridis, dan persyaratan yang sangat berbeda.
              </p>

              <div className="space-y-2.5 text-sm text-slate-600">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-[#07529A] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <span>
                    <strong className="text-slate-900">Naik Pangkat:</strong> Peningkatan golongan ruang PNS (I/a sampai IV/e) sebagai penghargaan prestasi kerja.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <span>
                    <strong className="text-slate-900">Naik Jenjang:</strong> Perpindahan level kemahiran/keahlian Jabatan Fungsional (Pertama → Muda → Madya → Utama) yang wajib lulus Uji Kompetensi.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigateTo({ name: 'policy-detail', slug: featured.slug })}
                  className="px-6 py-3.5 bg-[#07529A] hover:bg-[#053d73] text-white text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-102 cursor-pointer flex items-center gap-2"
                >
                  <span>Pelajari Kebijakannya</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href={featured.instagramPostUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <span>Lihat di Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
