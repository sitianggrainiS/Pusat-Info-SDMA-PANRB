import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Landmark,
  Network,
  Briefcase,
  Building2,
  UserPlus,
  GraduationCap,
  Award,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { usePolicy } from '../context/PolicyContext';
import { DEFAULT_ABOUT_PAGE_CONTENT } from '../data/initialAboutData';
import { AboutUnitIconName } from '../types';

const UNIT_ICON_MAP: Record<AboutUnitIconName, React.ComponentType<{ className?: string }>> = {
  Building2,
  UserPlus,
  GraduationCap,
  Award,
  TrendingUp,
  ShieldCheck,
};

const DESKTOP_ORG_GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1 max-w-xs mx-auto',
  2: 'grid-cols-2 max-w-xl mx-auto',
  3: 'grid-cols-3 max-w-4xl mx-auto',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export const AboutPage: React.FC = () => {
  const { aboutPage, navigateTo } = usePolicy();
  const [imageLoadError, setImageLoadError] = useState(false);
  const [expandedUnitIds, setExpandedUnitIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setImageLoadError(false);
  }, [aboutPage.profileImageUrl]);

  const hasValidProfileImage = Boolean(aboutPage.profileImageUrl) && !imageLoadError;

  const resolvedHeading =
    aboutPage.heading?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.heading;
  const resolvedSubheading =
    aboutPage.subheading?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.subheading;
  const resolvedDescription =
    aboutPage.description?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.description;
  const resolvedOrgSectionTitle =
    aboutPage.orgSectionTitle?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.orgSectionTitle;
  const resolvedOrgTopLevelTitle =
    aboutPage.orgTopLevelTitle?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.orgTopLevelTitle;
  const resolvedUnitSectionTitle =
    aboutPage.unitSectionTitle?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.unitSectionTitle;
  const resolvedUnitSectionSubtitle =
    aboutPage.unitSectionSubtitle?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.unitSectionSubtitle;

  const resolvedUnits =
    aboutPage.units && aboutPage.units.length > 0
      ? aboutPage.units
      : DEFAULT_ABOUT_PAGE_CONTENT.units;

  const desktopGridClass = DESKTOP_ORG_GRID_COLS[resolvedUnits.length] || 'grid-cols-6';

  const toggleUnitExpanded = (unitId: string) => {
    setExpandedUnitIds((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 sm:pb-24">
      {/* =====================================================================
          SECTION 1 — HERO PROFIL ORGANISASI KEDEPUTIAN SDMA
         ===================================================================== */}
      <section
        aria-labelledby="tentang-kedeputian-heading"
        className="relative overflow-hidden bg-white border-b border-slate-200/90"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-institutional-grid opacity-55"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 w-[30rem] h-[20rem] rounded-full bg-[#07529A]/[0.04] blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 sm:pt-10 pb-12 sm:pb-16">
          {/* Breadcrumb Navigation */}
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
              <span className="text-slate-800">{resolvedHeading}</span>
            </button>
          </nav>

          {/* 2-Column Hero Profile Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Kicker, Heading, Subheading, Description */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-3.5 sm:space-y-4"
            >
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#07529A]">
                <span>Kementerian PANRB</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>Profil Organisasi</span>
              </div>

              <div className="space-y-1.5">
                <h1
                  id="tentang-kedeputian-heading"
                  className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-slate-900 tracking-tight leading-[1.15] [text-wrap:balance]"
                >
                  {resolvedHeading}
                </h1>
                <p className="text-base sm:text-lg font-bold text-[#07529A] leading-snug">
                  {resolvedSubheading}
                </p>
              </div>

              <div className="h-px w-20 bg-gradient-to-r from-[#07529A]/50 via-[#5BA7E8]/40 to-transparent" />

              <p className="text-[14.5px] sm:text-[15.5px] text-slate-600 leading-[1.82] max-w-2xl pt-1">
                {resolvedDescription}
              </p>
            </motion.div>

            {/* Right Column: Institutional Visual Frame or Admin-Uploaded Image */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5"
            >
              <div className="rounded-3xl bg-white p-2.5 sm:p-3 border border-slate-200/90 shadow-[0_18px_44px_-18px_rgba(7,82,154,0.14)]">
                <div className="relative aspect-[16/11] w-full rounded-2xl overflow-hidden bg-slate-100">
                  {hasValidProfileImage ? (
                    <img
                      src={aboutPage.profileImageUrl}
                      alt={resolvedSubheading}
                      referrerPolicy="no-referrer"
                      onError={() => setImageLoadError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full bg-gradient-to-br from-[#07529A] via-[#064A8B] to-[#043466] p-6 sm:p-7 flex flex-col justify-between text-white overflow-hidden">
                      {/* Subtle Geometric Concentric Line Decoration */}
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 400 280"
                        className="pointer-events-none absolute inset-0 w-full h-full opacity-20"
                        fill="none"
                      >
                        <circle cx="340" cy="70" r="115" stroke="white" strokeWidth="1" />
                        <circle cx="340" cy="70" r="165" stroke="white" strokeWidth="0.75" />
                        <path d="M-20 260 L260 60 L430 140" stroke="white" strokeWidth="1" />
                      </svg>

                      {/* Card Top Row */}
                      <div className="relative flex items-start justify-between gap-3">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-[#FFD84D]">
                          Kementerian PANRB
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                          <Landmark className="w-4 h-4 text-[#FFD84D]" />
                        </div>
                      </div>

                      {/* Card Bottom Copy */}
                      <div className="relative space-y-2">
                        <div className="w-10 h-0.5 bg-[#FFD84D]" />
                        <h2 className="text-lg sm:text-[1.22rem] font-extrabold leading-snug text-white [text-wrap:balance]">
                          {resolvedSubheading}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-blue-100/85 leading-relaxed max-w-sm">
                          Perumusan, Koordinasi, dan Sinkronisasi Kebijakan Sumber Daya Manusia Aparatur
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Caption Strip */}
                <div className="pt-2.5 pb-0.5 px-1.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-slate-600 truncate">
                    {resolvedSubheading}
                  </span>
                  <span className="text-slate-400 font-medium shrink-0">
                    Kementerian PANRB RI
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2 — BAGAN SUSUNAN ORGANISASI
         ===================================================================== */}
      <section
        aria-labelledby="struktur-organisasi-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16"
      >
        <div className="space-y-8 sm:space-y-10">
          {/* Centered Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center justify-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#07529A]">
              <Network className="w-3.5 h-3.5 shrink-0" />
              <span>Bagan Susunan Organisasi</span>
            </div>
            <h2
              id="struktur-organisasi-heading"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]"
            >
              {resolvedOrgSectionTitle}
            </h2>
          </div>

          {/* White Diagram Container */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 lg:p-10 shadow-[0_14px_38px_-20px_rgba(15,23,42,0.08)]">
            {/* DESKTOP HIERARCHY DIAGRAM (lg+) */}
            <div className="hidden lg:block">
              {/* LEVEL 1: Pimpinan Kedeputian */}
              <div className="flex justify-center">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#07529A] to-[#05437F] text-white px-8 py-5 shadow-[0_12px_28px_-10px_rgba(7,82,154,0.42)] border border-[#053d73] max-w-md w-full text-center">
                  <div className="h-1 w-full bg-[#FFD84D] absolute inset-x-0 top-0" />
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#FFD84D] mb-1">
                    Pimpinan Kedeputian
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold leading-snug [text-wrap:balance]">
                    {resolvedOrgTopLevelTitle}
                  </h3>
                </div>
              </div>

              {/* Vertical Center Stem Connecting Level 1 to Level 2 Horizontal Bus */}
              <div className="flex justify-center">
                <div aria-hidden="true" className="w-0.5 h-7 bg-[#07529A]/30" />
              </div>

              {/* LEVEL 2: 6 Equal Horizontal Columns (Sekretariat + 5 Asdep) */}
              <div className={`grid ${desktopGridClass} items-start`}>
                {resolvedUnits.map((unit, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === resolvedUnits.length - 1;
                  const isSecretariat = Boolean(unit.subUnit) || unit.id.includes('sekretariat');

                  return (
                    <div key={unit.id} className="flex flex-col items-center">
                      {/* Horizontal Bus Line + Vertical Drop Stem + Node Dot */}
                      <div aria-hidden="true" className="relative w-full h-8 shrink-0">
                        {resolvedUnits.length > 1 && (
                          <div
                            className={`absolute top-0 h-0.5 bg-[#07529A]/30 ${
                              isFirst
                                ? 'left-1/2 right-0'
                                : isLast
                                ? 'left-0 right-1/2'
                                : 'left-0 right-0'
                            }`}
                          />
                        )}
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-[#07529A]/30" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-2 h-2 rounded-full bg-[#07529A]" />
                      </div>

                      {/* Column Padding Wrapper (keeps bus rail continuous edge-to-edge while spacing cards) */}
                      <div className="w-full px-1.5">
                        <div
                          className={`rounded-2xl border p-4 flex flex-col justify-between text-center transition-colors min-h-[184px] ${
                            isSecretariat
                              ? 'border-[#07529A]/35 bg-blue-50/45 shadow-2xs'
                              : 'border-slate-200/90 bg-slate-50/55 hover:bg-white hover:border-[#07529A]/30 shadow-2xs'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#07529A]">
                            {isSecretariat ? 'Unsur Dukungan' : 'Unit Pelaksana'}
                          </span>

                          <p className="text-[11.5px] xl:text-[12px] font-bold text-slate-900 leading-snug my-auto py-2">
                            {unit.orgChartLabel || unit.name}
                          </p>

                          <div
                            className={`h-0.5 w-6 mx-auto rounded-full ${
                              isSecretariat ? 'bg-[#07529A]/25' : 'bg-slate-200'
                            }`}
                          />
                        </div>

                        {/* Dashed Sub-unit Node Directly Underneath Column 1 */}
                        {unit.subUnit && (
                          <div className="flex flex-col items-center">
                            <div aria-hidden="true" className="w-0.5 h-6 bg-[#07529A]/30" />
                            <div
                              aria-hidden="true"
                              className="w-2 h-2 rounded-full bg-[#07529A] -mt-1 mb-0.5"
                            />
                            <div className="w-full rounded-xl border border-dashed border-[#07529A]/45 bg-slate-50/70 px-3 py-3 text-center">
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
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MOBILE & TABLET HIERARCHY TREE (< lg) */}
            <div className="lg:hidden">
              {/* LEVEL 1 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#07529A] to-[#05437F] text-white p-4 sm:p-5 shadow-sm border border-[#053d73]">
                <div className="h-1 w-full bg-[#FFD84D] absolute inset-x-0 top-0" />
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#FFD84D] mb-1">
                  Pimpinan Kedeputian
                </span>
                <h3 className="text-sm sm:text-base font-extrabold leading-snug">
                  {resolvedOrgTopLevelTitle}
                </h3>
              </div>

              <div aria-hidden="true" className="ml-5 sm:ml-7 w-0.5 h-4 bg-[#07529A]/30" />

              <div className="ml-5 sm:ml-7">
                {resolvedUnits.map((unit, idx) => {
                  const isLast = idx === resolvedUnits.length - 1;
                  const isSecretariat = Boolean(unit.subUnit) || unit.id.includes('sekretariat');

                  return (
                    <div
                      key={unit.id}
                      className={`relative pl-6 sm:pl-8 ${isLast ? 'pb-0' : 'pb-3.5'}`}
                    >
                      <div
                        aria-hidden="true"
                        className={`absolute left-0 top-0 w-0.5 bg-[#07529A]/30 ${
                          isLast ? 'h-7' : 'bottom-0'
                        }`}
                      />
                      <div
                        aria-hidden="true"
                        className="absolute left-0 top-7 w-6 sm:w-8 h-0.5 bg-[#07529A]/30"
                      />

                      <div
                        className={`rounded-2xl p-4 border shadow-2xs ${
                          isSecretariat
                            ? 'bg-blue-50/45 border-[#07529A]/35'
                            : 'bg-slate-50/75 border-slate-200/90'
                        }`}
                      >
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#07529A] mb-1">
                          {isSecretariat ? 'Unsur Dukungan' : 'Unit Pelaksana'}
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {unit.orgChartLabel || unit.name}
                        </p>
                      </div>

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
                          <div className="rounded-xl bg-slate-50/70 border border-dashed border-[#07529A]/45 p-3.5">
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
        </div>
      </section>

      {/* =====================================================================
          SECTION 3 — TUGAS DAN FUNGSI UNIT KERJA
         ===================================================================== */}
      <section
        aria-labelledby="tugas-fungsi-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20"
      >
        <div className="space-y-8 sm:space-y-10">
          {/* Left-Aligned Section Heading */}
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#07529A]">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>Mandat & Rincian Peran</span>
            </div>
            <h2
              id="tugas-fungsi-heading"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]"
            >
              {resolvedUnitSectionTitle}
            </h2>
            <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
              {resolvedUnitSectionSubtitle}
            </p>
          </div>

          {/* 3-Column Unit Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-start">
            {resolvedUnits.map((unit, idx) => {
              const IconComponent = UNIT_ICON_MAP[unit.iconName] || Building2;
              const isExpanded = Boolean(expandedUnitIds[unit.id]);
              const orderLabel = String(idx + 1).padStart(2, '0');

              return (
                <article
                  key={unit.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs hover:border-[#07529A]/30 hover:shadow-[0_14px_30px_-14px_rgba(7,82,154,0.1)] transition-all duration-200 flex flex-col"
                >
                  {/* Top Row: Icon + Number & Task Count */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50/90 border border-blue-100/90 text-[#07529A] flex items-center justify-center shrink-0">
                      <IconComponent className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {orderLabel} · {unit.detailedTasks.length} Rincian
                    </span>
                  </div>

                  {/* Unit Title */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-2.5 [text-wrap:balance]">
                    {unit.name}
                  </h3>

                  {/* Main Task Description */}
                  <p className="text-[13.5px] text-slate-600 leading-[1.7] flex-1">
                    {unit.mainTask}
                  </p>

                  {/* Expandable Rincian Tugas Toggle Button */}
                  <button
                    type="button"
                    onClick={() => toggleUnitExpanded(unit.id)}
                    aria-expanded={isExpanded}
                    className="w-full mt-5 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 text-[#07529A] text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Selengkapnya'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Expanded Details Panel */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Rincian Tugas Pokok
                          </p>
                          <ul className="space-y-2">
                            {unit.detailedTasks.map((task, taskIdx) => (
                              <li
                                key={taskIdx}
                                className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#07529A] shrink-0 mt-0.5" />
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>

                          {unit.subUnit && (
                            <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3.5 space-y-1">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#07529A]">
                                Sub-unit: {unit.subUnit.name}
                              </span>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {unit.subUnit.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
