import React, { useState, useEffect, useRef } from 'react';
import { usePolicy } from '../../context/PolicyContext';
import {
  SEKOLAH_KEDINASAN_LIST,
  searchSekolahKedinasan,
} from '../../data/sekolahKedinasan';
import {
  Search,
  X,
  ArrowRight,
  Tag,
  GraduationCap,
  Building2,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { policies, categories, navigateTo } = usePolicy();
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const normalized = searchTerm.trim().toLowerCase();

  const filteredPolicies = normalized
    ? policies.filter((p) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        return (
          p.title.toLowerCase().includes(normalized) ||
          p.summary.toLowerCase().includes(normalized) ||
          (p.contextHeader && p.contextHeader.toLowerCase().includes(normalized)) ||
          (p.contextExplanation && p.contextExplanation.toLowerCase().includes(normalized)) ||
          (p.requirementsHeader && p.requirementsHeader.toLowerCase().includes(normalized)) ||
          (p.processStepsHeader && p.processStepsHeader.toLowerCase().includes(normalized)) ||
          (cat && cat.name.toLowerCase().includes(normalized))
        );
      })
    : [];

  const filteredCategories = normalized
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(normalized) ||
          c.description.toLowerCase().includes(normalized)
      )
    : [];

  const filteredSchools = normalized ? searchSekolahKedinasan(searchTerm) : [];

  const handleSelectPolicy = (slug: string) => {
    navigateTo({ name: 'policy-detail', slug });
    onClose();
  };

  const handleSelectCategory = (slug: string) => {
    navigateTo({ name: 'category-detail', slug });
    onClose();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-[#FFD84D]/60 text-slate-900 rounded-xs px-0.5 font-semibold"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-slate-900/55 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 sm:px-5 py-4 border-b border-slate-200/80 gap-3 bg-white">
              <div className="w-8 h-8 rounded-lg bg-[#07529A]/8 text-[#07529A] flex items-center justify-center shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kebijakan ASN atau Sekolah Kedinasan (misal: pangkat, PKN STAN, IPDN)..."
                className="w-full text-sm sm:text-base text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  aria-label="Bersihkan kata kunci"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] font-mono font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors cursor-pointer shrink-0"
              >
                Esc
              </button>
            </div>

            {/* Search Results Area */}
            <div className="max-h-[62vh] overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-5">
              {!searchTerm ? (
                <div className="py-5 sm:py-6 space-y-6">
                  {/* Pencarian Populer Kebijakan ASN */}
                  <div className="text-center space-y-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Pencarian Populer
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                      {[
                        'Naik Pangkat',
                        'Jabatan Fungsional',
                        'Jabatan Pelaksana',
                        'Manajemen Talenta',
                        'Sistem Merit',
                        'Uji Kompetensi',
                      ].map((suggestion) => (
                        <button
                          type="button"
                          key={suggestion}
                          onClick={() => setSearchTerm(suggestion)}
                          className="text-xs font-medium px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-[#07529A] text-slate-700 hover:text-white border border-slate-200/90 hover:border-[#07529A] transition-all duration-150 cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pencarian Sekolah Kedinasan */}
                  <div className="pt-5 border-t border-slate-200/80 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#07529A]/10 text-[#07529A] flex items-center justify-center shrink-0">
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Pencarian Sekolah Kedinasan
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSearchTerm('Sekolah Kedinasan')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#07529A] hover:text-[#053d73] transition-colors cursor-pointer"
                      >
                        <span>Lihat Semua ({SEKOLAH_KEDINASAN_LIST.length} Instansi)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SEKOLAH_KEDINASAN_LIST.map((school) => (
                        <button
                          type="button"
                          key={school.id}
                          onClick={() => setSearchTerm(school.shortName)}
                          className="group text-left px-3 py-2.5 rounded-xl bg-slate-50/90 hover:bg-[#07529A] border border-slate-200/90 hover:border-[#07529A] transition-all duration-150 cursor-pointer"
                        >
                          <span className="block text-xs font-bold text-slate-800 group-hover:text-white truncate">
                            {school.shortName}
                          </span>
                          <span className="block text-[10px] text-slate-500 group-hover:text-blue-100 truncate mt-0.5">
                            {school.ministry}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Sekolah Kedinasan Results */}
                  {filteredSchools.length > 0 && (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 tabular-nums flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-[#07529A]" />
                          <span>Sekolah Kedinasan ({filteredSchools.length})</span>
                        </h4>
                        <a
                          href="https://dikdin.bkn.go.id"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#07529A] hover:underline"
                        >
                          <span>Portal SSCASN-DIKDIN</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="space-y-2.5">
                        {filteredSchools.map((school) => (
                          <div
                            key={school.id}
                            className="p-3.5 sm:p-4 rounded-xl bg-slate-50/60 hover:bg-blue-50/40 border border-slate-200/80 hover:border-[#07529A]/35 transition-all space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#07529A] bg-[#07529A]/10 px-2 py-0.5 rounded-md">
                                    <Building2 className="w-3 h-3 shrink-0" />
                                    <span>{highlightMatch(school.ministry, normalized)}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span>{school.location}</span>
                                  </span>
                                </div>
                                <h5 className="text-sm font-bold text-slate-900 leading-snug">
                                  {highlightMatch(
                                    `${school.shortName} — ${school.fullName}`,
                                    normalized
                                  )}
                                </h5>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                              {highlightMatch(school.description, normalized)}
                            </p>

                            <div className="flex flex-wrap gap-1.5">
                              {school.studyFields.map((field) => (
                                <span
                                  key={field}
                                  className="text-[11px] font-medium text-slate-600 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80"
                                >
                                  {highlightMatch(field, normalized)}
                                </span>
                              ))}
                            </div>

                            <div className="pt-1 flex flex-wrap items-center gap-2">
                              <a
                                href={school.officialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#07529A] hover:bg-[#053d73] text-white text-xs font-semibold transition-colors"
                              >
                                <span>Website Resmi</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <a
                                href={school.registrationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 text-xs font-semibold transition-colors"
                              >
                                <span>Daftar di SSCASN-DIKDIN</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Results */}
                  {filteredCategories.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-2 tabular-nums">
                        Kategori Terkait ({filteredCategories.length})
                      </h4>
                      <div className="space-y-1.5">
                        {filteredCategories.map((cat) => (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => handleSelectCategory(cat.slug)}
                            className="w-full text-left p-3 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-100 flex items-center justify-between group transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-[#07529A]/10 text-[#07529A] flex items-center justify-center shrink-0">
                                <Tag className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-sm font-semibold text-slate-800 group-hover:text-[#07529A] truncate">
                                {highlightMatch(cat.name, normalized)}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#07529A] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Policy Results */}
                  {filteredPolicies.length > 0 ? (
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-2 tabular-nums">
                        Kebijakan Ditemukan ({filteredPolicies.length})
                      </h4>
                      <div className="space-y-2">
                        {filteredPolicies.map((pol) => {
                          const cat = categories.find((c) => c.id === pol.categoryId);
                          return (
                            <button
                              type="button"
                              key={pol.id}
                              onClick={() => handleSelectPolicy(pol.slug)}
                              className="w-full text-left p-3.5 rounded-xl bg-slate-50/50 hover:bg-blue-50/60 border border-slate-200/70 hover:border-[#07529A]/30 transition-all group cursor-pointer"
                            >
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                                <span className="font-semibold text-[#07529A]">
                                  {cat?.name || 'SDM Aparatur'}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{pol.publicationDate}</span>
                              </div>
                              <h5 className="text-sm font-bold text-slate-900 group-hover:text-[#07529A] leading-snug">
                                {highlightMatch(pol.title, normalized)}
                              </h5>
                              <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                                {highlightMatch(pol.summary, normalized)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    filteredCategories.length === 0 &&
                    filteredSchools.length === 0 && (
                      <div className="py-12 text-center space-y-2">
                        <p className="text-base font-bold text-slate-800">
                          Tidak ada hasil yang cocok dengan "{searchTerm}"
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Coba gunakan kata kunci lain seperti "fungsional", "pangkat", "sekolah kedinasan", "PKN STAN", atau "IPDN".
                        </p>
                      </div>
                    )
                  )}
                </>
              )}
            </div>

            {/* Footer info */}
            <div className="bg-slate-50/90 px-4 sm:px-5 py-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span>Pencarian kebijakan publik & Sekolah Kedinasan</span>
              <span className="font-mono text-[11px] hidden sm:inline">
                Tekan ESC untuk menutup
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
