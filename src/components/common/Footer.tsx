import React from 'react';
import { KompakLogo } from './KompakLogo';
import { ExternalLink, Instagram, Building2, Mail, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-[#0B1528] text-slate-300 border-t border-slate-800/90 mt-auto">
      {/* Subtle Top Institutional Accent Hairline */}
      <div className="h-1 w-full bg-gradient-to-r from-[#07529A] via-[#5BA7E8] to-[#FFD84D]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Brand & Purpose */}
          <div className="space-y-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <KompakLogo variant="light" height={38} />
            </div>
            <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed max-w-sm">
              Pusat edukasi kebijakan SDM Aparatur resmi yang dirancang untuk masyarakat umum, ASN, dan calon ASN agar memahami regulasi dengan cara yang lebih ramah, visual, dan akurat.
            </p>
            <div className="pt-1">
              <a
                href="https://www.instagram.com/sdmapanrb"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white text-xs font-semibold transition-all duration-150 border border-slate-700/80 hover:border-[#FFD84D]/50 shadow-xs"
              >
                <Instagram className="w-4 h-4 text-[#FFD84D] shrink-0" />
                <span>Instagram @sdmapanrb</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
              </a>
            </div>
          </div>

          {/* PPID Kementerian PANRB */}
          <div className="lg:col-span-8 space-y-5">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight border-b border-slate-800/80 pb-3">
              PPID Kementerian PANRB
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 text-xs sm:text-[13px] leading-relaxed">
              {/* Alamat */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/70 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-0.5 text-slate-300">
                  <p className="font-semibold text-white">Alamat:</p>
                  <p>Lantai 1 Ruang Media Center</p>
                  <p>Gedung Kementerian PANRB</p>
                  <p>Jl. Jend. Sudirman Kav. 69</p>
                  <p>Jakarta Selatan 12190</p>
                </div>
              </div>

              {/* Pengiriman Surat & Pengaduan */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/70 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-2.5 text-slate-300">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">Pengiriman Surat:</p>
                    <a
                      href="https://mapanrb.menpan.go.id"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#FFD84D] transition-colors inline-block"
                    >
                      mapanrb.menpan.go.id
                    </a>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">Pengaduan:</p>
                    <a
                      href="https://prod.lapor.go.id"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#FFD84D] transition-colors inline-block"
                    >
                      prod.lapor.go.id
                    </a>
                  </div>
                </div>
              </div>

              {/* Telepon */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/70 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-0.5 text-slate-300">
                  <p className="font-semibold text-white">Telepon:</p>
                  <a
                    href="tel:0217398381"
                    className="hover:text-[#FFD84D] transition-colors inline-block"
                  >
                    (021) 7398381
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center lg:text-left">
          <p>
            © {new Date().getFullYear()} Pusat Informasi Kebijakan SDM Aparatur. Data Demo / Prototipe Edukasi Publik.
          </p>
        </div>
      </div>
    </footer>
  );
};
