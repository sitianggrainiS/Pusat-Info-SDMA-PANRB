import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePolicy } from '../context/PolicyContext';
import { Policy } from '../types';
import { InstagramEmbed } from '../components/common/InstagramEmbed';
import {
  FeedLayoutSwitcher,
  FeedLayoutOption,
  getFeedGridClass,
  getSavedFeedLayout,
  FEED_STORAGE_KEY,
} from '../components/common/FeedLayoutSwitcher';
import {
  Search,
  Layers,
  BookOpen,
  Instagram,
  ExternalLink,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';

type SortOrder = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 0,
  jan: 0,
  februari: 1,
  pebruari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  may: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agu: 7,
  ags: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  oktober: 9,
  okt: 9,
  oct: 9,
  november: 10,
  nopember: 10,
  nov: 10,
  desember: 11,
  des: 11,
  dec: 11,
};

const INDONESIAN_MONTH_LABELS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function parseDateString(raw?: string): Date | null {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw.trim().replace(/^[a-zA-ZÀ-ÿ]+,\s*/, '');

  // Format: "18 Oktober 2024" or "5 Nov 2024"
  const indoMatch = cleaned.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (indoMatch) {
    const day = Number(indoMatch[1]);
    const monthIdx = INDONESIAN_MONTHS[indoMatch[2].toLowerCase()];
    const year = Number(indoMatch[3]);
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      return new Date(year, monthIdx, day, 12, 0, 0, 0);
    }
  }

  // Format: "YYYY-MM-DD"
  const isoDayMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDayMatch) {
    return new Date(
      Number(isoDayMatch[1]),
      Number(isoDayMatch[2]) - 1,
      Number(isoDayMatch[3]),
      12,
      0,
      0,
      0
    );
  }

  // Format: "DD/MM/YYYY" or "DD-MM-YYYY"
  const slashMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    return new Date(
      Number(slashMatch[3]),
      Number(slashMatch[2]) - 1,
      Number(slashMatch[1]),
      12,
      0,
      0,
      0
    );
  }

  const parsedTs = Date.parse(cleaned);
  if (!Number.isNaN(parsedTs)) {
    return new Date(parsedTs);
  }

  return null;
}

function getPolicyDate(policy: Policy): Date | null {
  return (
    parseDateString(policy.instagramDate) ||
    parseDateString(policy.publicationDate) ||
    parseDateString(policy.createdAt) ||
    parseDateString(policy.updatedAt)
  );
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthKeyLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = Number(monthStr) - 1;
  if (!yearStr || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return monthKey;
  }
  return `${INDONESIAN_MONTH_LABELS[monthIdx]} ${yearStr}`;
}

function getOneMonthAgoStart(refDate: Date): Date {
  const targetYear = refDate.getMonth() === 0 ? refDate.getFullYear() - 1 : refDate.getFullYear();
  const targetMonth = refDate.getMonth() === 0 ? 11 : refDate.getMonth() - 1;
  const maxDayInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(refDate.getDate(), maxDayInTargetMonth);
  return new Date(targetYear, targetMonth, clampedDay, 0, 0, 0, 0);
}

interface PolicyListPageProps {
  initialCategoryFilter?: string;
}

export const PolicyListPage: React.FC<PolicyListPageProps> = ({ initialCategoryFilter }) => {
  const { policies, categories, getCategoryById, navigateTo } = usePolicy();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryFilter || 'all');
  const [searchFilter, setSearchFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [feedLayout, setFeedLayout] = useState<FeedLayoutOption>(getSavedFeedLayout);

  const handleLayoutChange = (layout: FeedLayoutOption) => {
    setFeedLayout(layout);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FEED_STORAGE_KEY, layout);
      } catch {
        // ignore storage errors
      }
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [categories]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.65, 260);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScrollability, 300);
  };

  // Synchronize category filter if passed via route props
  useEffect(() => {
    setSelectedCategory(initialCategoryFilter || 'all');
  }, [initialCategoryFilter]);

  // Only show published policies on the public view
  const publishedPolicies = useMemo(
    () => policies.filter((p) => p.status === 'published'),
    [policies]
  );

  // Reference month keys relative to current date
  const { thisMonthKey, prevMonthKey } = useMemo(() => {
    const now = new Date();
    const currentKey = toMonthKey(now);
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevKey = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}`;
    return { thisMonthKey: currentKey, prevMonthKey: prevKey };
  }, []);

  // Available months dynamically derived from published policies (sorted newest month first)
  const availableMonths = useMemo(() => {
    const counts = new Map<string, number>();
    publishedPolicies.forEach((p) => {
      const d = getPolicyDate(p);
      if (d) {
        const key = toMonthKey(d);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
      .map(([key, count]) => ({
        key,
        label: formatMonthKeyLabel(key),
        count,
      }));
  }, [publishedPolicies]);

  // Policies matching month & keyword search (used for cluster badge counts)
  const monthAndSearchMatched = useMemo(() => {
    const now = new Date();
    const oneMonthAgoStart = getOneMonthAgoStart(now);
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    const keyword = searchFilter.trim().toLowerCase();

    return publishedPolicies.filter((p) => {
      const matchesSearch =
        !keyword ||
        p.title.toLowerCase().includes(keyword) ||
        p.summary.toLowerCase().includes(keyword);

      if (!matchesSearch) return false;
      if (monthFilter === 'all') return true;

      const pDate = getPolicyDate(p);
      if (!pDate) return false;

      if (monthFilter === 'rolling-1m') {
        const ts = pDate.getTime();
        return ts >= oneMonthAgoStart.getTime() && ts <= endOfToday.getTime();
      }
      if (monthFilter === 'cal-prev-1m') {
        return toMonthKey(pDate) === prevMonthKey;
      }
      if (monthFilter === 'cal-this-m') {
        return toMonthKey(pDate) === thisMonthKey;
      }
      if (monthFilter.startsWith('month:')) {
        return toMonthKey(pDate) === monthFilter.slice('month:'.length);
      }
      return true;
    });
  }, [publishedPolicies, searchFilter, monthFilter, prevMonthKey, thisMonthKey]);

  // Final filtered & sorted policies
  const filtered = useMemo(() => {
    const byCategory = monthAndSearchMatched.filter(
      (p) => selectedCategory === 'all' || p.categoryId === selectedCategory
    );

    return [...byCategory].sort((a, b) => {
      if (sortOrder === 'title-asc') {
        return a.title.localeCompare(b.title, 'id');
      }
      if (sortOrder === 'title-desc') {
        return b.title.localeCompare(a.title, 'id');
      }

      const timeA = getPolicyDate(a)?.getTime() ?? 0;
      const timeB = getPolicyDate(b)?.getTime() ?? 0;

      if (timeA !== timeB) {
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      }

      const createdA = Date.parse(a.createdAt || '') || 0;
      const createdB = Date.parse(b.createdAt || '') || 0;
      if (createdA !== createdB) {
        return sortOrder === 'newest' ? createdB - createdA : createdA - createdB;
      }

      return a.title.localeCompare(b.title, 'id');
    });
  }, [monthAndSearchMatched, selectedCategory, sortOrder]);

  const selectedClusterObj = categories.find((c) => c.id === selectedCategory);
  const hasActiveFilter =
    selectedCategory !== 'all' || monthFilter !== 'all' || searchFilter.trim() !== '';

  const activeMonthBadgeLabel = useMemo(() => {
    if (monthFilter === 'all') return null;
    if (monthFilter === 'rolling-1m') return '1 Bulan Terakhir';
    if (monthFilter === 'cal-prev-1m') return `1 Bulan Lalu (${formatMonthKeyLabel(prevMonthKey)})`;
    if (monthFilter === 'cal-this-m') return `Bulan Ini (${formatMonthKeyLabel(thisMonthKey)})`;
    if (monthFilter.startsWith('month:')) {
      return formatMonthKeyLabel(monthFilter.slice('month:'.length));
    }
    return null;
  }, [monthFilter, prevMonthKey, thisMonthKey]);

  const handleResetAllFilters = () => {
    setSelectedCategory('all');
    setSearchFilter('');
    setMonthFilter('all');
    setSortOrder('newest');
  };

  return (
    <div className="bg-[#F8FAFC] min-h-[80vh] pb-16">
      {/* Institutional Page Header */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 py-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-institutional-grid opacity-70"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[#07529A] text-xs font-bold uppercase tracking-wider mb-3">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Katalog Informasi SDM Aparatur</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight [text-wrap:balance]">
            Jelajahi Informasi SDM Aparatur
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            Temukan beragam konten edukasi kebijakan dan manajemen ASN berdasarkan 8 Klaster Manajemen ASN serta Pilar Konten Sekolah Kedinasan.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 mb-10 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Saring konten berdasarkan kata kunci..."
                className="w-full text-xs sm:text-sm pl-10 pr-9 py-2.5 rounded-xl border border-slate-200/90 focus:border-[#07529A] focus:ring-4 focus:ring-[#07529A]/10 focus:bg-white focus:outline-none bg-slate-50/70 transition-all"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Month Filter & Sort Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {/* Month Filter Dropdown */}
              <div className="relative min-w-[215px]">
                <Calendar className="w-4 h-4 text-[#07529A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  aria-label="Filter konten berdasarkan bulan"
                  className="w-full appearance-none text-xs sm:text-sm font-medium text-slate-700 pl-10 pr-9 py-2.5 rounded-xl border border-slate-200/90 focus:border-[#07529A] focus:ring-4 focus:ring-[#07529A]/10 focus:bg-white focus:outline-none bg-slate-50/70 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <option value="all">Semua Bulan</option>
                  <optgroup label="Rentang Waktu">
                    <option value="rolling-1m">1 Bulan Terakhir (30 Hari)</option>
                    <option value="cal-prev-1m">
                      1 Bulan Lalu ({formatMonthKeyLabel(prevMonthKey)})
                    </option>
                    <option value="cal-this-m">
                      Bulan Ini ({formatMonthKeyLabel(thisMonthKey)})
                    </option>
                  </optgroup>
                  {availableMonths.length > 0 && (
                    <optgroup label="Pilih Bulan Posting">
                      {availableMonths.map((m) => (
                        <option key={m.key} value={`month:${m.key}`}>
                          {m.label} ({m.count} Konten)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sort Order Dropdown */}
              <div className="relative min-w-[185px]">
                <ArrowUpDown className="w-4 h-4 text-[#07529A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  aria-label="Urutkan postingan"
                  className="w-full appearance-none text-xs sm:text-sm font-medium text-slate-700 pl-10 pr-9 py-2.5 rounded-xl border border-slate-200/90 focus:border-[#07529A] focus:ring-4 focus:ring-[#07529A]/10 focus:bg-white focus:outline-none bg-slate-50/70 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <option value="newest">Urutkan: Terbaru</option>
                  <option value="oldest">Urutkan: Terlama</option>
                  <option value="title-asc">Judul: A – Z</option>
                  <option value="title-desc">Judul: Z – A</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Month Filter Shortcuts & Counter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setMonthFilter((prev) => (prev === 'rolling-1m' ? 'all' : 'rolling-1m'))
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border ${
                  monthFilter === 'rolling-1m'
                    ? 'bg-[#07529A] text-white border-[#07529A] shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>1 Bulan Terakhir</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMonthFilter((prev) => (prev === 'cal-prev-1m' ? 'all' : 'cal-prev-1m'))
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border ${
                  monthFilter === 'cal-prev-1m'
                    ? 'bg-[#07529A] text-white border-[#07529A] shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <span>1 Bulan Lalu ({formatMonthKeyLabel(prevMonthKey)})</span>
              </button>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 tabular-nums ml-auto">
              Menampilkan <span className="font-bold text-slate-900">{filtered.length}</span> dari{' '}
              <span className="font-bold text-slate-900">{publishedPolicies.length}</span> konten
            </div>
          </div>

          {/* Category / 8 Clusters Filter Buttons with Left/Right Navigation Arrows */}
          <div className="relative flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Geser kategori ke kiri"
              title="Geser ke kiri"
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                canScrollLeft
                  ? 'bg-white hover:bg-[#07529A] border-slate-200 hover:border-[#07529A] text-slate-700 hover:text-white shadow-2xs cursor-pointer'
                  : 'bg-slate-50 border-slate-200/60 text-slate-300 cursor-not-allowed opacity-40'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={scrollContainerRef}
              onScroll={checkScrollability}
              className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none scroll-smooth"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 tabular-nums ${
                  selectedCategory === 'all'
                    ? 'text-white'
                    : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-700'
                }`}
              >
                {selectedCategory === 'all' && (
                  <motion.div
                    layoutId="policyListActiveCluster"
                    className="absolute inset-0 bg-[#07529A] rounded-xl shadow-2xs"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10">
                  Semua Konten ({monthAndSearchMatched.length})
                </span>
              </button>

              {categories.map((cat) => {
                const count = monthAndSearchMatched.filter((p) => p.categoryId === cat.id).length;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 tabular-nums ${
                      isActive
                        ? 'text-white'
                        : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-700'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="policyListActiveCluster"
                        className="absolute inset-0 bg-[#07529A] rounded-xl shadow-2xs"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">
                      {cat.name} ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              aria-label="Geser kategori ke kanan"
              title="Geser ke kanan"
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                canScrollRight
                  ? 'bg-white hover:bg-[#07529A] border-slate-200 hover:border-[#07529A] text-slate-700 hover:text-white shadow-2xs cursor-pointer'
                  : 'bg-slate-50 border-slate-200/60 text-slate-300 cursor-not-allowed opacity-40'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Title & Status Bar with Display Options */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#E1306C] flex items-center justify-center border border-rose-100 shrink-0">
              <Instagram className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {selectedCategory === 'all'
                    ? 'Semua Feed Konten Instagram'
                    : `Feed Konten: ${selectedClusterObj?.name || 'Klaster ASN'}`}
                </h2>
                {activeMonthBadgeLabel && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#07529A] border border-blue-200/80 text-[11px] font-semibold">
                    <Calendar className="w-3 h-3" />
                    {activeMonthBadgeLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Postingan dan karusel infografis resmi @sdmapanrb ·{' '}
                {sortOrder === 'newest'
                  ? 'Diurutkan dari terbaru'
                  : sortOrder === 'oldest'
                  ? 'Diurutkan dari terlama'
                  : sortOrder === 'title-asc'
                  ? 'Diurutkan A – Z'
                  : 'Diurutkan Z – A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <FeedLayoutSwitcher
              currentLayout={feedLayout}
              onChange={handleLayoutChange}
            />

            <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs whitespace-nowrap tabular-nums">
              {filtered.length} Konten
            </span>
          </div>
        </div>

        {/* Instagram Embed Feed Grid */}
        {filtered.length > 0 ? (
          <div className={getFeedGridClass(feedLayout)}>
            {filtered.map((policy) => {
              const cluster = getCategoryById(policy.categoryId);
              return (
                <div
                  key={policy.id}
                  className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-[0_16px_32px_-12px_rgba(7,82,154,0.1)] hover:border-[#07529A]/30 transition-all duration-200 overflow-hidden ${
                    feedLayout === 'small' ? 'p-4 space-y-3' : 'p-5 sm:p-6 space-y-4'
                  }`}
                >
                  {/* Header info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-[#07529A] truncate">
                          {cluster?.name || 'SDM Aparatur'}
                        </span>
                        <span>·</span>
                        <span className="shrink-0">{policy.publicationDate}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                        {policy.title}
                      </h3>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-[#E1306C]">
                      <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
                      <span className="hidden sm:inline">Feed</span>
                    </span>
                  </div>

                  {/* Official Instagram Embed */}
                  <div className="w-full flex justify-center py-1 sm:py-2 bg-slate-50/70 rounded-2xl border border-slate-100 overflow-hidden">
                    <InstagramEmbed
                      url={policy.instagramPostUrl}
                      thumbnail={policy.thumbnail}
                      clusterName={cluster?.name}
                      title={policy.title}
                      hideHeader={true}
                      captioned={false}
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <a
                      href={policy.instagramPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#07529A] font-semibold transition-colors whitespace-nowrap"
                    >
                      <Instagram className="w-3.5 h-3.5 text-[#E1306C] shrink-0" />
                      <span>Buka di Instagram</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    </a>

                    <motion.button
                      type="button"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigateTo({ name: 'policy-detail', slug: policy.slug })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#07529A] hover:bg-[#053d73] text-white rounded-xl font-bold shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Buka Halaman Detail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90 max-w-lg mx-auto space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Konten Tidak Ditemukan
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {monthFilter !== 'all'
                ? 'Belum ada postingan pada periode bulan yang dipilih. Silakan pilih bulan lain atau tampilkan semua bulan.'
                : 'Tidak ada konten yang sesuai dengan kriteria penyaringan Anda. Silakan coba pilih klaster lain atau bersihkan kata kunci.'}
            </p>
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-50 text-[#07529A] hover:bg-[#07529A] hover:text-white text-xs font-bold transition-colors mt-1 cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
