import React, { useState, useEffect } from 'react';
import { ExternalLink, Instagram, RefreshCw } from 'lucide-react';

interface InstagramEmbedProps {
  url: string;
  thumbnail?: string;
  captioned?: boolean;
  className?: string;
  clusterName?: string;
  title?: string;
  hideHeader?: boolean;
}

import {
  extractInstagramInfo,
  extractInstagramDateFromShortcode,
  extractInstagramDateFromUrl,
  resolvePolicyReleaseDate,
} from '../../utils/instagramUtils';
import {
  isInstagramWebPageUrl,
  validateDirectImageUrl,
} from '../../utils/imageUrlUtils';

export {
  extractInstagramInfo,
  extractInstagramDateFromShortcode,
  extractInstagramDateFromUrl,
  resolvePolicyReleaseDate,
};

export const InstagramEmbed: React.FC<InstagramEmbedProps> = ({
  url,
  thumbnail,
  captioned = true,
  className = '',
  clusterName,
  title,
  hideHeader = false,
}) => {
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const info = extractInstagramInfo(url, captioned);

  // Manage embed states on URL change
  useEffect(() => {
    if (!info.isValid) return;

    // Reset loading state on URL change
    setIsLoading(true);
    setLoadError(false);
  }, [info.cleanUrl]);

  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    setThumbError(false);
  }, [url, thumbnail]);

  // Distinguish direct image URLs from Instagram post/reel embed URLs
  const trimmedUrl = (url || '').trim();
  const isDirectImageInUrl =
    Boolean(trimmedUrl) &&
    !info.isValid &&
    !isInstagramWebPageUrl(trimmedUrl) &&
    validateDirectImageUrl(trimmedUrl).isValid;

  const validThumbnailCheck = validateDirectImageUrl(thumbnail || '');
  const resolvedDirectImage = isDirectImageInUrl
    ? validateDirectImageUrl(trimmedUrl).cleanUrl
    : validThumbnailCheck.isValid
    ? validThumbnailCheck.cleanUrl
    : '';

  if (!url || !info.isValid) {
    if (resolvedDirectImage && !thumbError) {
      return (
        <div className={`w-full max-w-[540px] mx-auto ${className}`}>
          {!hideHeader && (
            <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-2 px-1 min-w-0">
              <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
                <Instagram className="w-4 h-4 text-[#E1306C] shrink-0" />
                <span className="truncate">{title || 'Visual Konten'}</span>
              </div>
              {clusterName && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#07529A] border border-blue-200 truncate ml-2">
                  {clusterName}
                </span>
              )}
            </div>
          )}
          <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-2xs">
            <img
              src={resolvedDirectImage}
              alt={title || 'Gambar Konten KOMPAK SDMA'}
              referrerPolicy="no-referrer"
              onError={() => setThumbError(true)}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      );
    }

    return (
      <div className={`p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 ${className}`}>
        <Instagram className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">
          Masukkan URL postingan Instagram (embed) atau URL gambar langsung untuk melihat pratinjau.
        </p>
        <p className="text-[11px] font-mono text-slate-400 break-all">
          Contoh: https://www.instagram.com/p/Ddi76RtGXeH/ atau https://.../gambar.jpg
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center w-full max-w-[540px] min-w-0 mx-auto ${className}`}>
      {/* Optional Top Meta Bar */}
      {!hideHeader && (
        <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-2 px-1 min-w-0">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
            <Instagram className="w-4 h-4 text-[#E1306C] shrink-0" />
            <span className="truncate">
              {title || (info.type === 'reel' ? 'Instagram Reel' : 'Instagram Post')}
            </span>
          </div>
          {clusterName && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#07529A] border border-blue-200 truncate ml-2">
              {clusterName}
            </span>
          )}
        </div>
      )}

      {/* Main Embed Box */}
      <div className="w-full min-w-0 relative bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        {/* Loading Indicator */}
        {isLoading && !loadError && (
          <div className="absolute inset-0 bg-white/92 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-slate-400 z-10">
            <RefreshCw className="w-6 h-6 animate-spin text-[#07529A] mb-2.5" />
            <span className="text-xs font-medium text-slate-600">Memuat Instagram Embed...</span>
          </div>
        )}

        {/* Embedded Iframe */}
        {!loadError ? (
          <div className={`w-full overflow-hidden ${!captioned ? 'max-h-[490px]' : ''}`}>
            <iframe
              key={`${info.cleanUrl}-${captioned ? 'cap' : 'nocap'}`}
              src={info.embedUrl}
              className={`w-full max-w-full border-none transition-opacity duration-200 ${
                captioned
                  ? 'min-h-[500px] sm:min-h-[600px]'
                  : 'min-h-[400px] sm:min-h-[475px]'
              }`}
              loading="lazy"
              allow="encrypted-media"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setLoadError(true);
              }}
              title={title || `Instagram Post ${info.shortcode}`}
            />
          </div>
        ) : (
          /* Error / Unavailable Fallback Card */
          <div className="p-6 text-center space-y-3 bg-slate-50">
            {thumbnail ? (
              <div className="relative aspect-4/3 max-w-[260px] mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-2xs mb-2 bg-slate-100">
                <img
                  src={thumbnail}
                  alt={title || 'Cover Instagram'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center mx-auto shadow-xs">
                <Instagram className="w-6 h-6" />
              </div>
            )}
            <h4 className="font-bold text-slate-900 text-sm">
              Pratinjau Embed Tidak Tersedia
            </h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Postingan Instagram dapat dilihat secara langsung melalui aplikasi atau peramban resmi Instagram.
            </p>
            <div className="pt-2">
              <a
                href={info.cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
              >
                <Instagram className="w-4 h-4" />
                <span>Buka di Instagram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Bottom Working Link bar */}
        <div className="px-3.5 py-2.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2 text-xs min-w-0">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate min-w-0">
            <Instagram className="w-3.5 h-3.5 text-[#E1306C] shrink-0" />
            <span className="truncate font-mono">{info.cleanUrl}</span>
          </div>
          <a
            href={info.cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#07529A] hover:text-[#053d73] hover:underline shrink-0 whitespace-nowrap"
          >
            <span>Lihat di Instagram</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
