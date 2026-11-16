import React from 'react';
import { usePolicy } from '../context/PolicyContext';
import { CategoryCard } from '../components/common/CategoryCard';
import { STANDARD_KLASTER_IDS } from '../data/initialData';
import { Layers, Sparkles } from 'lucide-react';

export const CategoryListPage: React.FC = () => {
  const { categories } = usePolicy();

  const klasterCategories = categories.filter(
    (c) => c.group === 'klaster' || (!c.group && STANDARD_KLASTER_IDS.has(c.id))
  );
  const pilarCategories = categories.filter(
    (c) => !klasterCategories.some((k) => k.id === c.id)
  );

  return (
    <div className="bg-[#F8FAFC] min-h-[80vh] pb-16">
      {/* Institutional Page Header */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 py-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-institutional-grid opacity-70"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 text-[#07529A] text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4 shrink-0" />
            <span>Rumpun Manajemen Kepegawaian & Pilar Konten</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
            Kategori & Pilar Konten SDM Aparatur
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Jelajahi edukasi kebijakan berdasarkan 8 Klaster Manajemen ASN serta Pilar Konten Sekolah Kedinasan, Fun Content, Greetings, Quiz, dan Collab.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 space-y-12">
        {/* 8 Klaster Manajemen ASN */}
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                8 Klaster Manajemen ASN
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Rumpun utama kebijakan dan penataan manajemen aparatur sipil negara.
              </p>
            </div>
            <span className="text-xs font-bold text-[#07529A] bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-xl shrink-0">
              {klasterCategories.length} Klaster
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch">
            {klasterCategories.map((category, idx) => (
              <CategoryCard key={category.id} category={category} index={idx} />
            ))}
          </div>
        </div>

        {/* Pilar Konten */}
        {pilarCategories.length > 0 && (
          <div className="space-y-5 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Pilar Konten Khusus</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Pilar Konten SDM Aparatur
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Topik tematik meliputi Sekolah Kedinasan, Fun Content, Greetings, Quiz, dan Collab kebijakan ASN.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-xl shrink-0">
                {pilarCategories.length} Pilar Konten
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch">
              {pilarCategories.map((category, idx) => (
                <CategoryCard key={category.id} category={category} index={idx} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
