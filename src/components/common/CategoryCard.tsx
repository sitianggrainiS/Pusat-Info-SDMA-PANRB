import React from 'react';
import { Category } from '../../types';
import { usePolicy } from '../../context/PolicyContext';
import { CategoryIcon } from './CategoryIcon';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface CategoryCardProps {
  category: Category;
  index?: number;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, index = 0 }) => {
  const { navigateTo, policies } = usePolicy();
  const count = policies.filter(
    (p) => p.categoryId === category.id && p.status === 'published'
  ).length;

  const handleClick = () => {
    navigateTo({ name: 'category-detail', slug: category.slug });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.4,
        delay: (index % 4) * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.985 }}
      onClick={handleClick}
      className="group h-full bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs hover:shadow-[0_18px_36px_-12px_rgba(7,82,154,0.12)] hover:border-[#07529A]/40 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
    >
      <div>
        <div className="w-11 h-11 rounded-xl bg-[#07529A]/8 group-hover:bg-[#07529A] text-[#07529A] group-hover:text-[#FFD84D] flex items-center justify-center transition-colors duration-200 mb-4 shrink-0">
          <CategoryIcon name={category.iconName} className="w-5 h-5" />
        </div>

        <h3 className="font-bold text-slate-900 group-hover:text-[#07529A] transition-colors text-[15px] sm:text-base leading-snug mb-2 line-clamp-2 min-h-[2.6rem]">
          {category.name}
        </h3>

        <p className="text-xs sm:text-[13px] text-slate-600 line-clamp-3 leading-relaxed mb-5">
          {category.description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 text-xs text-slate-500">
        <span className="font-semibold text-slate-700 tabular-nums">
          {count} Kebijakan
        </span>
        <span className="text-[#07529A] group-hover:translate-x-1 transition-transform duration-150 flex items-center gap-1 font-bold whitespace-nowrap shrink-0">
          <span>Lihat topik</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.div>
  );
};
