import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  UserPlus,
  GraduationCap,
  Award,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ArrowLeft,
  Landmark,
  Network,
  Briefcase,
} from 'lucide-react';
import { usePolicy } from '../context/PolicyContext';
import { AboutUnitIconName } from '../types';

const UNIT_ICON_MAP: Record<AboutUnitIconName, React.ComponentType<{ className?: string }>> = {
  Building2,
  UserPlus,
  GraduationCap,
  Award,
  TrendingUp,
  ShieldCheck,
};

export const AboutPage: React.FC = () => {
  const { aboutPage, isAboutPageLoading, navigateTo } = usePolicy();
  const [expandedUnitIds, setExpandedUnitIds] = useState<Record<string, boolean>>({});
  const [imageLoadError, setImageLoadError] = useState(false);

  // Reset image error state whenever the published image URL changes
  useEffect(() => {
    setImageLoadError(false);
  }, [aboutPage.profileImageUrl]);

  const toggleUnitCard = (unitId: string) => {
    setExpandedUnitIds((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  const hasValidProfileImage = Boolean(aboutPage.profileImageUrl) && !imageLoadError;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 sm:pb-28">
      {/* =====================================================================
          SECTION 1 — PROFIL KEDEPUTIAN SDMA
         ===================================================================== */}
      <section
        aria-labelledby="profil-kedeputian-heading"
        className="relative overflow-hidden bg-white border-b border-slate-200/90"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-institutional-grid opacity-65"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 right-0 w-[34rem] h-[24rem] rounded-full bg-[#07529A]/[0.05] blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-14 sm:pb-20">
          {/* Subtle Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-8 sm:mb-10">
            <button
              type="button"
              onClick={() => navigateTo({ name: 'home' })}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#07529A] transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Beranda</span>
              <span aria-hidden="true" className="text-slate-300">
                /
              </span>
              <span className="text-slate-800">{aboutPage.heading}</span>
            </button>
          </nav>

          {/* Two-Column Desktop / Vertical Mobile Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
            {/* Left Column: Heading, Subheading, Description */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 xl:col-span-7 space-y-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#07529A]">
                Kementerian PANRB · Profil Organisasi
              </p>

              <div className="space-y-2.5">
                <h1
                  id="profil-kedeputian-heading"
                  className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-slate-900 tracking-tight leading-[1.14] [text-wrap:balance]"
                >
                  {aboutPage.heading}
                </h1>
                <p className="text-lg sm:text-xl font-bold text-[#07529A] tracking-tight [text-wrap:balance]">
                  {aboutPage.subheading}
                </p>
              </div>

              <div className="h-px w-20 bg-gradient-to-r from-[#07529A] via-[#5BA7E8] to-transparent" />

              <p className="text-[15px] sm:text-base lg:text-[17px] text-slate-600 leading-[1.8] max-w-2xl">
                {aboutPage.description}
              </p>
            </motion.div>

            {/* Right Column: Dynamic Profile Image from Admin Portal */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 xl:col-span-5"
            >
              <div className="relative rounded-3xl bg-white p-2.5 sm:p-3 border border-slate-200/90 shadow-[0_20px_50px_-18px_rgba(7,82,154,0.14)]">
                <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/70">
                  {isAboutPageLoading && !aboutPage.profileImageUrl ? (
                    <div
                      aria-label="Memuat visual profil Kedeputian SDMA"
                      className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center"
                    >
                      <Landmark className="w-10 h-10 text-slate-300" />
                    </div>
                  ) : hasValidProfileImage ? (
                    <img
                      src={aboutPage.profileImageUrl}
                      alt={`${aboutPage.subheading} — Kementerian PANRB`}
                      onError={() => setImageLoadError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Elegant Institutional Placeholder when no admin image is published yet */
                    <div className="relative w-full h-full bg-gradient-to-br from-[#07529A] via-[#09437D] to-[#0B192E] flex flex-col justify-between p-6 sm:p-8 text-white select-none overflow-hidden">
                      {/* Architectural geometric watermark */}
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 400 300"
                        className="pointer-events-none absolute inset-0 w-full h-full opacity-15"
                        fill="none"
                      >
                        <circle cx="330" cy="60" r="120" stroke="#5BA7E8" strokeWidth="1.5" />
                        <circle cx="330" cy="60" r="80" stroke="#FFD84D" strokeWidth="1" />
                        <path
                          d="M0 240 L140 130 L260 210 L400 95"
                          stroke="#FFFFFF"
                          strokeWidth="1.2"
                        />
                        <line x1="40" y1="0" x2="40" y2="300" stroke="#FFFFFF" strokeWidth="0.5" />
                        <line x1="200" y1="0" x2="200" y2="300" stroke="#FFFFFF" strokeWidth="0.5" />
                        <line x1="360" y1="0" x2="360" y2="300" stroke="#FFFFFF" strokeWidth="0.5" />
                        <line x1="0" y1="75" x2="400" y2="75" stroke="#FFFFFF" strokeWidth="0.5" />
                        <line x1="0" y1="150" x2="400" y2="150" stroke="#FFFFFF" strokeWidth="0.5" />
                        <line x1="0" y1="225" x2="400" y2="225" stroke="#FFFFFF" strokeWidth="0.5" />
                      </svg>

                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FFD84D]">
                          Kementerian PANRB
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 flex items-center justify-center">
                          <Landmark className="w-5 h-5 text-[#FFD84D]" />
                        </div>
                      </div>

                      <div className="relative z-10 space-y-2">
                        <div className="h-0.5 w-12 bg-[#FFD84D]" />
                        <p className="text-base sm:text-lg font-extrabold tracking-tight leading-snug text-white [text-wrap:balance]">
                          {aboutPage.subheading}
                        </p>
                        <p className="text-xs text-blue-100/85 leading-relaxed">
                          Perumusan, Koordinasi, dan Sinkronisasi Kebijakan Sumber Daya Manusia Aparatur
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtle Architectural Caption Bar */}
                <div className="px-2 pt-2.5 pb-0.5 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700 truncate">
                    {aboutPage.subheading}
                  </span>
                  <span className="shrink-0 text-slate-400">Kementerian PANRB RI</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2 — STRUKTUR ORGANISASI KEDEPUTIAN SDMA
         ===================================================================== */}
      <section
        aria-labelledby="struktur-organisasi-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8 sm:space-y-10"
        >
          {/* Section Heading */}
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#07529A]">
              <Network className="w-3.5 h-3.5" />
              <span>Bagan Susunan Organisasi</span>
            </div>
            <h2
              id="struktur-organisasi-heading"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]"
            >
              {aboutPage.orgSectionTitle}
            </h2>
          </div>

          {/* Organization Hierarchy Container */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 lg:p-10 shadow-[0_14px_38px_-18px_rgba(15,23,42,0.08)]">
            {/* DESKTOP HIERARCHY CHART (xl and above: 6 equal Level 2 columns directly under Level 1) */}
            <div className="hidden xl:block">
              {/* LEVEL 1: Deputi Bidang Sumber Daya Manusia Aparatur */}
              <div className="flex flex-col items-center">
                <div className="relative overflow-hidden rounded-2xl bg-[#07529A] text-white px-8 py-5 shadow-[0_12px_28px_-10px_rgba(7,82,154,0.45)] border border-[#053d73] max-w-md w-full text-center">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[#FFD84D]" />
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#FFD84D] mb-1">
                    Pimpinan Kedeputian
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold leading-snug [text-wrap:balance]">
                    {aboutPage.orgTopLevelTitle}
                  </h3>
                </div>

                {/* Vertical Trunk from Level 1 to Horizontal Connector Bar */}
                <div aria-hidden="true" className="w-0.5 h-9 bg-[#07529A]/40" />
              </div>

              {/* LEVEL 2: All 6 Units Directly Beneath Level 1 */}
              <div className="grid grid-cols-6 items-start">
                {aboutPage.units.map((unit, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === aboutPage.units.length - 1;
                  const isSecretariat = Boolean(unit.subUnit);

                  return (
                    <div key={unit.id} className="flex flex-col items-center">
                      {/* Horizontal Rail + Vertical Drop Stem */}
                      <div aria-hidden="true" className="relative w-full h-8">
                        <div
                          className={`absolute top-0 h-0.5 bg-[#07529A]/40 ${
                            isFirst
                              ? 'left-1/2 right-0'
                              : isLast
                              ? 'left-0 right-1/2'
                              : 'left-0 right-0'
                          }`}
                        />
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-[#07529A]/40" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-2 h-2 rounded-full bg-[#07529A]" />
                      </div>

                      {/* Level 2 Unit Box */}
                      <div className="w-full px-1.5">
                        <div
                          className={`w-full min-h-[156px] rounded-2xl p-3.5 flex flex-col justify-between text-center border transition-colors ${
                            isSecretariat
                              ? 'bg-blue-50/60 border-[#07529A]/35 shadow-2xs'
                              : 'bg-slate-50/75 hover:bg-white border-slate-200/95 shadow-2xs'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#07529A]">
                            {isSecretariat ? 'Unsur Dukungan' : 'Unit Pelaksana'}
                          </span>
                          <p className="text-[12px] font-bold text-slate-900 leading-snug my-auto py-2">
                            {unit.orgChartLabel || unit.name}
                          </p>
                          <div className="h-0.5 w-8 mx-auto rounded-full bg-[#07529A]/20" />
                        </div>
                      </div>

                      {/* LEVEL 3: Sub-unit directly beneath Sekretariat Deputi ONLY */}
                      {unit.subUnit && (
                        <div className="w-full px-1.5 flex flex-col items-center">
                          <div aria-hidden="true" className="relative h-7 flex flex-col items-center">
                            <div className="w-0.5 h-full bg-[#07529A]/35" />
                            <div className="w-2 h-2 rounded-full bg-[#5BA7E8] -mt-1" />
                          </div>
                          <div className="w-full rounded-xl bg-white border border-dashed border-[#07529A]/40 p-3 text-center shadow-2xs">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Sub-unit Sekretariat
                            </span>
                            <p className="text-[11px] font-bold text-slate-800 leading-snug">
                              {unit.subUnit.name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MOBILE & TABLET HIERARCHY TREE (< xl: Clean Vertical Tree, Zero Clipping/Overflow) */}
            <div className="xl:hidden">
              {/* LEVEL 1 */}
              <div className="relative overflow-hidden rounded-2xl bg-[#07529A] text-white p-4 sm:p-5 shadow-sm border border-[#053d73]">
                <div className="absolute inset-x-0 top-0 h-1 bg-[#FFD84D]" />
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#FFD84D] mb-1">
                  Pimpinan Kedeputian
                </span>
                <h3 className="text-sm sm:text-base font-extrabold leading-snug">
                  {aboutPage.orgTopLevelTitle}
                </h3>
              </div>

              {/* Vertical Connector Stem out of Level 1 */}
              <div aria-hidden="true" className="ml-5 sm:ml-7 w-0.5 h-4 bg-[#07529A]/35" />

              {/* LEVEL 2: All 6 Units Directly Connected to Level 1 Trunk */}
              <div className="ml-5 sm:ml-7">
                {aboutPage.units.map((unit, idx) => {
                  const isLast = idx === aboutPage.units.length - 1;
                  const isSecretariat = Boolean(unit.subUnit);

                  return (
                    <div
                      key={unit.id}
                      className={`relative pl-6 sm:pl-8 ${isLast ? 'pb-0' : 'pb-3.5'}`}
                    >
                      {/* Main Level 1 -> Level 2 Vertical Trunk */}
                      <div
                        aria-hidden="true"
                        className={`absolute left-0 top-0 w-0.5 bg-[#07529A]/35 ${
                          isLast ? 'h-7' : 'bottom-0'
                        }`}
                      />
                      {/* Horizontal Branch into Level 2 Unit */}
                      <div
                        aria-hidden="true"
                        className="absolute left-0 top-7 w-6 sm:w-8 h-0.5 bg-[#07529A]/35"
                      />

                      <div
                        className={`rounded-2xl p-4 border shadow-2xs ${
                          isSecretariat
                            ? 'bg-blue-50/50 border-[#07529A]/35'
                            : 'bg-slate-50/80 border-slate-200/90'
                        }`}
                      >
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#07529A] mb-1">
                          {isSecretariat ? 'Unsur Dukungan' : 'Unit Pelaksana'}
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {unit.orgChartLabel || unit.name}
                        </p>
                      </div>

                      {/* LEVEL 3: Sub-unit exclusively beneath Sekretariat Deputi */}
                      {unit.subUnit && (
                        <div className="ml-4 sm:ml-6 relative pl-5 sm:pl-7 pt-3">
                          <div
                            aria-hidden="true"
                            className="absolute left-0 top-0 h-8 w-0.5 bg-[#07529A]/30"
                          />
                          <div
                            aria-hidden="true"
                            className="absolute left-0 top-8 w-5 sm:w-7 h-0.5 bg-[#07529A]/30"
                          />
                          <div className="rounded-xl bg-white border border-dashed border-[#07529A]/40 p-3.5 shadow-2xs">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                              Sub-unit Sekretariat
                            </span>
                            <p className="text-xs font-bold text-slate-800 leading-snug">
                              {unit.subUnit.name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* =====================================================================
          SECTION 3 — TUGAS DAN FUNGSI UNIT KERJA
         ===================================================================== */}
      <section
        aria-labelledby="tugas-fungsi-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24"
      >
        <div className="space-y-8 sm:space-y-10">
          {/* Section Header */}
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#07529A]">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Mandat & Rincian Peran</span>
            </div>
            <h2
              id="tugas-fungsi-heading"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]"
            >
              {aboutPage.unitSectionTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {aboutPage.unitSectionSubtitle}
            </p>
          </div>

          {/* 6 Unit Kerja Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {aboutPage.units.map((unit, index) => {
              const IconComponent = UNIT_ICON_MAP[unit.iconName] || Building2;
              const isExpanded = Boolean(expandedUnitIds[unit.id]);
              const panelId = `unit-detail-panel-${unit.id}`;

              return (
                <motion.article
                  key={unit.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: 0.32,
                    delay: Math.min(index * 0.04, 0.2),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-[#07529A]/45 shadow-[0_18px_40px_-16px_rgba(7,82,154,0.16)]'
                      : 'border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-[0_14px_32px_-14px_rgba(15,23,42,0.09)]'
                  }`}
                >
                  <div className="p-6 space-y-4">
                    {/* Icon & Unit Number */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50/90 border border-blue-100 text-[#07529A] flex items-center justify-center shrink-0">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400 tabular-nums">
                        0{index + 1} · {unit.detailedTasks.length} Rincian
                      </span>
                    </div>

                    {/* Unit Title & Main Summary */}
                    <div className="space-y-2.5">
                      <h3 className="text-base sm:text-[17px] font-extrabold text-slate-900 leading-snug [text-wrap:balance]">
                        {unit.name}
                      </h3>
                      <p className="text-xs sm:text-[13.5px] text-slate-600 leading-[1.7]">
                        {unit.mainTask}
                      </p>
                    </div>

                    {/* Accessible Accordion Trigger Button */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleUnitCard(unit.id)}
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                        className="w-full inline-flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 text-xs font-bold text-[#07529A] transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Sembunyikan Rincian' : 'Lihat Selengkapnya'}</span>
                        <ChevronDown
                          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Detailed Tasks Panel */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-label={`Rincian tugas ${unit.name}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 bg-slate-50/70 border-t border-slate-100 space-y-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-2">
                            Rincian Tugas:
                          </p>
                          <ol className="space-y-2.5">
                            {unit.detailedTasks.map((task, taskIdx) => (
                              <li
                                key={taskIdx}
                                className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed"
                              >
                                <span className="font-mono text-[11px] font-bold text-[#07529A] bg-white border border-blue-200/80 rounded-md px-1.5 py-0.5 shrink-0 tabular-nums mt-0.5">
                                  {String(taskIdx + 1).padStart(2, '0')}
                                </span>
                                <span>{task}</span>
                              </li>
                            ))}
                          </ol>

                          {/* Sub-unit Callout (e.g., Bagian Sinkronisasi Program dan Anggaran) */}
                          {unit.subUnit && (
                            <div className="mt-4 pt-4 border-t border-slate-200/80">
                              <div className="rounded-xl bg-white border border-slate-200/90 p-4 space-y-1.5">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#07529A]">
                                  Sub-unit di Bawah {unit.name}
                                </span>
                                <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900">
                                  {unit.subUnit.name}
                                </h4>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {unit.subUnit.description}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
