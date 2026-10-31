import React from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { CategoryCard } from '../common/CategoryCard';
import { ArrowRight, Layers } from 'lucide-react';
import { motion } from 'motion/react';

export const CategorySection: React.FC = () => {
  const { categories, navigateTo } = usePolicy();

  return (
    <section className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-12 gap-4"
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-[#07529A] uppercase tracking-wider mb-2">
              <Layers className="w-4 h-4 shrink-0" />
              <span>Klasifikasi Kebijakan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
              Jelajahi 8 Klaster Manajemen ASN
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Temukan informasi kebijakan SDM Aparatur yang disusun rapi sesuai 8 Klaster Manajemen ASN.
            </p>
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateTo({ name: 'categories' })}
            className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-[#07529A] text-[#07529A] hover:text-white border border-slate-200/90 hover:border-[#07529A] text-xs font-bold transition-all duration-150 self-start sm:self-auto cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Semua Kategori</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch">
          {categories.map((category, idx) => (
            <CategoryCard key={category.id} category={category} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
};
