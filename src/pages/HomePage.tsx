import React from 'react';
import { Hero } from '../components/home/Hero';
import { DeputyNewsSection } from '../components/home/DeputyNewsSection';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Instagram, FileText, Shield } from 'lucide-react';

interface HomePageProps {
  onSearchFocus: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSearchFocus }) => {
  return (
    <div>
      {/* 1. Hero Section */}
      <Hero onSearchFocus={onSearchFocus} />

      {/* 2. Educational Framework Bridge Banner */}
      <section className="bg-[#F8FAFC] py-16 sm:py-20 border-b border-slate-200/80 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" duration={500}>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-xs font-bold text-[#07529A] uppercase tracking-wider mb-2.5">
                Ekosistem Informasi Kebijakan
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
                Menghubungkan Media Sosial dengan Penjelasan Resmi
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
                Website ini bukan sekadar salinan media sosial, melainkan ekspansi informasi kebijakan secara menyeluruh dan terverifikasi.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <ScrollReveal direction="up" delay={60} duration={500} className="h-full">
              <div className="group relative p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 flex flex-col justify-between h-full transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-12px_rgba(7,82,154,0.12)] hover:border-[#07529A]/35 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-[#07529A]" />
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#07529A]/10 group-hover:bg-[#07529A] text-[#07529A] group-hover:text-[#FFD84D] flex items-center justify-center font-bold mb-5 transition-colors duration-200">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-2">
                    1. Media Sosial (Instagram)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Menyajikan ringkasan visual, infografis karusel menarik, dan poin penting agar isu kebijakan menarik minat publik dan ASN.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#07529A] mt-6 pt-4 border-t border-slate-100 block">
                  Fungsi: Visualisasi & Kesadaran Awal
                </span>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={120} duration={500} className="h-full">
              <div className="group relative p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 flex flex-col justify-between h-full transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-12px_rgba(217,119,6,0.12)] hover:border-amber-400/60 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 group-hover:bg-amber-500 text-amber-600 group-hover:text-white flex items-center justify-center font-bold mb-5 transition-colors duration-200">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-2">
                    2. Platform Edukasi (Website)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Mengembangkan topik menjadi penjelasan terstruktur: komparasi konsep, syarat, tahapan proses, dan jawaban atas pertanyaan umum.
                  </p>
                </div>
                <span className="text-xs font-semibold text-amber-700 mt-6 pt-4 border-t border-slate-100 block">
                  Fungsi: Pemahaman Konseptual Lengkap
                </span>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={180} duration={500} className="h-full">
              <div className="group relative p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 flex flex-col justify-between h-full transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-12px_rgba(5,150,105,0.12)] hover:border-emerald-500/40 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/10 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-[#FFD84D] flex items-center justify-center font-bold mb-5 transition-colors duration-200">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-2">
                    3. Dokumen Regulasi Resmi
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Setiap konten terhubung dengan nomor regulasi, pasal rujukan, dan tautan dokumen autentik di JDIH KemenPANRB dan BKN.
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-700 mt-6 pt-4 border-t border-slate-100 block">
                  Fungsi: Sumber Hukum Otoritatif
                </span>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 3. Berita Deputi SDM Aparatur (from menpan.go.id) */}
      <DeputyNewsSection />
    </div>
  );
};
