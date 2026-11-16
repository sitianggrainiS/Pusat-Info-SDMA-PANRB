import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Instagram, Landmark } from 'lucide-react';
import { Policy } from '../../types';
import { InstagramEmbed } from '../common/InstagramEmbed';
import { resolvePolicyMedia } from '../../utils/imageUrlUtils';

interface PolicyMediaFrameProps {
  policy: Partial<Policy>;
  clusterName?: string;
  /** 'card' is used in PolicyListPage, CategoryDetailPage, InstagramClusterShowcase; 'detail' in PolicyDetailPage */
  variant?: 'card' | 'detail';
  onOpenDetail?: () => void;
}

/**
 * Renders the visual media of a Policy / Konten Instagram / Artikel item on public pages:
 * 1. If Admin provided a direct Image URL (`hasExplicitAdminImage`), displays the proportional
 *    image (`aspect-4/3`, `object-cover`, responsive, with fallback on load error).
 *    If the item ALSO has a valid Instagram Post/Reel URL, provides an inline toggle so visitors
 *    can view either the Admin's Cover Image or the interactive Instagram Embed.
 * 2. If only an Instagram Post/Reel URL was provided (`hasEmbeddableInstagramPost`), renders the
 *    official `InstagramEmbed`.
 * 3. Otherwise renders the resolved fallback image cleanly with `object-cover` + error fallback.
 */
export const PolicyMediaFrame: React.FC<PolicyMediaFrameProps> = ({
  policy,
  clusterName,
  variant = 'card',
  onOpenDetail,
}) => {
  const media = resolvePolicyMedia(policy);
  const [imgFailed, setImgFailed] = useState(false);

  // Default to showing the Admin's explicit image URL whenever provided, so saved URL images
  // immediately appear on public cards and detail pages; otherwise show Instagram embed if valid.
  const defaultTab: 'image' | 'embed' = media.hasExplicitAdminImage
    ? 'image'
    : media.hasEmbeddableInstagramPost
    ? 'embed'
    : 'image';

  const [activeMode, setActiveMode] = useState<'image' | 'embed'>(defaultTab);

  useEffect(() => {
    setImgFailed(false);
    setActiveMode(
      media.hasExplicitAdminImage
        ? 'image'
        : media.hasEmbeddableInstagramPost
        ? 'embed'
        : 'image'
    );
  }, [
    media.imageUrl,
    media.hasExplicitAdminImage,
    media.hasEmbeddableInstagramPost,
    policy.instagramPostUrl,
  ]);

  const showModeSwitcher = media.hasExplicitAdminImage && media.hasEmbeddableInstagramPost;

  return (
    <div className="w-full space-y-2.5">
      {showModeSwitcher && (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setActiveMode('image')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
              activeMode === 'image'
                ? 'bg-[#07529A] text-white border-[#07529A]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>Gambar Konten</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('embed')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
              activeMode === 'embed'
                ? 'bg-[#E1306C] text-white border-[#E1306C]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Instagram className="w-3 h-3" />
            <span>Embed Instagram</span>
          </button>
        </div>
      )}

      {activeMode === 'embed' && media.hasEmbeddableInstagramPost ? (
        <div
          className={`w-full flex justify-center ${
            variant === 'card'
              ? 'py-1 sm:py-2 bg-slate-50/70 rounded-2xl border border-slate-100 overflow-hidden'
              : 'py-1 overflow-hidden'
          }`}
        >
          <InstagramEmbed
            url={policy.instagramPostUrl || ''}
            thumbnail={media.imageUrl}
            clusterName={clusterName}
            title={policy.title}
            hideHeader={true}
            captioned={variant === 'detail'}
            className={variant === 'detail' ? 'w-full max-w-full' : ''}
          />
        </div>
      ) : (
        <div
          onClick={onOpenDetail}
          role={onOpenDetail ? 'button' : undefined}
          tabIndex={onOpenDetail ? 0 : undefined}
          onKeyDown={
            onOpenDetail
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenDetail();
                  }
                }
              : undefined
          }
          className={`group relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 ${
            onOpenDetail ? 'cursor-pointer' : ''
          }`}
        >
          {!imgFailed && media.imageUrl ? (
            <img
              src={media.imageUrl}
              alt={policy.title || 'Visual Konten KOMPAK SDMA'}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className={`w-full h-full object-cover ${
                onOpenDetail
                  ? 'transition-transform duration-300 ease-out group-hover:scale-104'
                  : ''
              }`}
            />
          ) : (
            /* Clean Institutional Fallback if URL fails to load */
            <div className="w-full h-full bg-gradient-to-br from-[#07529A] via-[#06427d] to-[#0B192E] p-6 flex flex-col justify-between text-white select-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#FFD84D] font-bold">
                  {clusterName || 'Publikasi SDM Aparatur'}
                </span>
                <Landmark className="w-5 h-5 text-[#FFD84D]" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm sm:text-base font-bold line-clamp-3 text-white leading-snug">
                  {policy.title || 'Informasi Kebijakan SDM Aparatur'}
                </p>
                <p className="text-[11px] text-blue-100/85">
                  Kementerian PANRB · Deputi Bidang SDM Aparatur
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
