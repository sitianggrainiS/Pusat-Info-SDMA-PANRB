import React from 'react';
import { ExternalLink, Instagram, Sparkles, Heart } from 'lucide-react';

interface InstagramCardProps {
  thumbnail?: string;
  instagramPostUrl: string;
  instagramDate: string;
  accountHandle?: string;
  policyTitle: string;
}

export const InstagramCard: React.FC<InstagramCardProps> = ({
  thumbnail,
  instagramPostUrl,
  instagramDate,
  accountHandle = '@sdmapanrb',
  policyTitle,
}) => {
  return (
    <div className="bg-gradient-to-br from-[#07529A] to-[#043461] rounded-2xl p-6 sm:p-8 text-white shadow-md my-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-medium text-[#FFD84D]">
            <Instagram className="w-3.5 h-3.5" />
            <span>Versi Edukasi Visual Instagram</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
            Sudah Melihat Versi Singkatnya di Instagram?
          </h3>

          <p className="text-sm text-blue-100 max-w-xl leading-relaxed">
            Materi kebijakan <strong className="text-white">"{policyTitle}"</strong> ini berawal dari infografis ringkas yang telah dipublikasikan melalui akun resmi <span className="text-[#FFD84D] font-semibold">{accountHandle}</span> pada {instagramDate}.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-blue-200">
            <span>✓ Desain karusel edukatif</span>
            <span>·</span>
            <span>✓ Ringkasan poin penting</span>
            <span>·</span>
            <span>✓ Diskusi warganet ASN</span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
          <a
            href={instagramPostUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFD84D] hover:bg-[#ffe066] text-[#07529A] font-bold text-sm shadow-sm transition-all hover:scale-102 cursor-pointer"
          >
            <Instagram className="w-4 h-4" />
            <span>Lihat di Instagram</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#07529A]/80" />
          </a>
        </div>
      </div>
    </div>
  );
};
