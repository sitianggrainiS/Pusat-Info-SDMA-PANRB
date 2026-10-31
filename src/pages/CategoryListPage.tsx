import React from 'react';
import { usePolicy } from '../context/PolicyContext';
import { CategoryCard } from '../components/common/CategoryCard';
import { Layers } from 'lucide-react';

export const CategoryListPage: React.FC = () => {
  const { categories } = usePolicy();

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
            <span>Rumpun Manajemen Kepegawaian</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
            Kategori Kebijakan SDM Aparatur
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Jelajahi regulasi dan edukasi kebijakan berdasarkan bidang penataan pegawai ASN di instansi pemerintah.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch">
          {categories.map((category, idx) => (
            <CategoryCard key={category.id} category={category} index={idx} />
          ))}
        </div>
      </div>
    </div>
  );
};
