import React, { useState } from 'react';
import { Policy } from '../../types';
import { usePolicy } from '../../context/PolicyContext';
import { ArrowRight, Instagram } from 'lucide-react';
import { getEffectiveThumbnail } from '../../utils/thumbnailUtils';
import { resolvePolicyReleaseDate } from '../../utils/instagramUtils';

interface PolicyCardProps {
  policy: Policy;
  featured?: boolean;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({ policy, featured = false }) => {
  const { navigateTo, getCategoryById } = usePolicy();
  const [imgError, setImgError] = useState(false);
  const category = getCategoryById(policy.categoryId);
  const thumbnailSrc = getEffectiveThumbnail(policy);

  const handleClick = () => {
    navigateTo({ name: 'policy-detail', slug: policy.slug });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={`group h-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-12px_rgba(7,82,154,0.13)] hover:border-[#07529A]/35 transition-all duration-200 ease-out cursor-pointer overflow-hidden flex flex-col ${
        featured ? 'md:grid md:grid-cols-12 md:gap-6 items-stretch' : ''
      }`}
    >
      {/* Thumbnail with smooth zoom */}
      <div
        className={`relative overflow-hidden bg-slate-100 border-b border-slate-100 ${
          featured ? 'md:col-span-6 h-64 md:h-full md:border-b-0 md:border-r' : 'aspect-4/3 w-full'
        }`}
      >
        {!imgError && thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={policy.title}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#07529A] to-[#043361] p-6 flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#FFD84D] font-semibold">
                Infografis Kebijakan
              </span>
              <Instagram className="w-4 h-4 text-white/70" />
            </div>
            <div>
              <p className="text-lg font-bold line-clamp-2 text-white">{policy.title}</p>
              <p className="text-xs text-blue-100 mt-1">{category?.name || 'SDM Aparatur'}</p>
            </div>
            <span className="text-[10px] text-blue-200">@sdmapanrb</span>
          </div>
        )}

        {/* Small floating Instagram origin tag */}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5 shadow-xs">
          <Instagram className="w-3 h-3 text-[#FFD84D]" />
          <span>{policy.instagramAccountHandle || '@sdmapanrb'}</span>
        </div>
      </div>

      {/* Card Content */}
      <div
        className={`p-6 flex flex-col justify-between flex-1 ${
          featured ? 'md:col-span-6 md:p-8' : ''
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2.5">
            <span className="font-semibold text-[#07529A]">
              {category?.name || 'Kebijakan ASN'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{resolvePolicyReleaseDate(policy)}</span>
            {policy.aiAssisted && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-medium">Bantuan AI</span>
              </>
            )}
          </div>

          <h3
            className={`font-bold text-slate-900 group-hover:text-[#07529A] transition-colors line-clamp-2 ${
              featured ? 'text-2xl sm:text-3xl leading-tight mb-3' : 'text-lg leading-snug mb-2'
            }`}
          >
            {policy.title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed mb-4">
            {policy.summary}
          </p>
        </div>

        {/* Action Link */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-bold text-[#07529A]">
          <span className="group-hover:translate-x-0.5 transition-transform flex items-center gap-1.5">
            <span>Pelajari selengkapnya</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
          <span className="text-slate-400 font-normal text-[11px] tabular-nums shrink-0">
            {policy.sources.length > 0 ? `${policy.sources.length} Dasar Hukum` : 'Regulasi Resmi'}
          </span>
        </div>
      </div>
    </article>
  );
};
