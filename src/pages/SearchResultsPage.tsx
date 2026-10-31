import React, { useState, useEffect } from 'react';
import { usePolicy } from '../context/PolicyContext';
import { PolicyCard } from '../components/policy/PolicyCard';
import { Search, ArrowLeft, Tag, Layers, X, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface SearchResultsPageProps {
  initialQuery?: string;
}

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ initialQuery = '' }) => {
  const { policies, categories, navigateTo } = usePolicy();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const normalized = query.trim().toLowerCase();

  const matchingPolicies = normalized
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

  const matchingCategories = normalized
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(normalized) ||
          c.description.toLowerCase().includes(normalized)
      )
    : [];

  return (
    <div className="py-10 sm:py-12 bg-[#F8FAFC] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.button
          type="button"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigateTo({ name: 'home' })}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-xs font-semibold text-slate-600 hover:text-[#07529A] shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Beranda</span>
        </motion.button>

        {/* Search header & search input */}
        <div className="relative overflow-hidden bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-2xs space-y-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#07529A] via-[#5BA7E8] to-[#FFD84D]" />

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hasil Pencarian Kebijakan
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Ketik kata kunci untuk menelusuri topik, rumpun jabatan, atau regulasi ASN.
            </p>
          </div>

          <div className="relative max-w-2xl">
            <Search className="w-5 h-5 text-[#07529A] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari berdasarkan judul kebijakan, istilah, atau nomor peraturan..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-slate-200/90 focus:border-[#07529A] focus:ring-4 focus:ring-[#07529A]/10 focus:bg-white focus:outline-none text-sm text-slate-900 bg-slate-50/70 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick topic buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500 font-medium">Saran kata kunci:</span>
            {[
              'Naik Pangkat',
              'Jabatan Fungsional',
              'Jabatan Pelaksana',
              'Manajemen Talenta',
              'Kinerja',
            ].map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setQuery(s)}
                className={`px-3 py-1.5 rounded-xl font-medium border transition-all cursor-pointer ${
                  query.toLowerCase() === s.toLowerCase()
                    ? 'bg-[#07529A] text-white border-[#07529A]'
                    : 'bg-slate-50 hover:bg-blue-50 hover:text-[#07529A] text-slate-700 border-slate-200/80 hover:border-blue-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Results summary */}
        {query.trim() && (
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 tabular-nums">
            <span>
              Ditemukan <strong className="text-slate-900">{matchingPolicies.length}</strong> kebijakan dan{' '}
              <strong className="text-slate-900">{matchingCategories.length}</strong> kategori untuk "{query}"
            </span>
          </div>
        )}

        {/* Category Matches */}
        {matchingCategories.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#07529A] flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>Kategori yang Cocok</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {matchingCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => navigateTo({ name: 'category-detail', slug: cat.slug })}
                  className="p-4 bg-slate-50/70 hover:bg-blue-50/50 rounded-xl border border-slate-200/90 hover:border-[#07529A]/40 text-left transition-all group flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-[#07529A] block truncate">
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {cat.description}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#07529A] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Policy Matches */}
        {matchingPolicies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {matchingPolicies.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
          </div>
        ) : (
          query.trim() && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-12 text-center border border-slate-200/90 max-w-lg mx-auto space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                Tidak Ada Hasil untuk "{query}"
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Kami tidak menemukan kebijakan yang cocok dengan kata kunci tersebut. Coba gunakan istilah umum kepegawaian seperti "pangkat", "fungsional", "pelaksana", atau periksa daftar topik lengkap.
              </p>
              <button
                type="button"
                onClick={() => navigateTo({ name: 'policies' })}
                className="mt-2 px-4 py-2.5 bg-[#07529A] text-white text-xs font-bold rounded-xl hover:bg-[#053d73] transition-colors cursor-pointer"
              >
                Lihat Semua Kebijakan
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
