import React from 'react';
import { Columns2, Columns3, LayoutGrid, Square } from 'lucide-react';
import { motion } from 'motion/react';

export type FeedLayoutOption = 'small' | 'medium' | 'large' | 'xlarge';

interface FeedLayoutSwitcherProps {
  currentLayout: FeedLayoutOption;
  onChange: (layout: FeedLayoutOption) => void;
  className?: string;
}

export const FEED_STORAGE_KEY = 'kompak_feed_layout';

export const getSavedFeedLayout = (): FeedLayoutOption => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(FEED_STORAGE_KEY);
      if (saved === 'small' || saved === 'medium' || saved === 'large' || saved === 'xlarge') {
        return saved;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
  }
  return 'medium';
};

export const getFeedGridClass = (layout: FeedLayoutOption): string => {
  switch (layout) {
    case 'small':
      return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 items-start';
    case 'medium':
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start';
    case 'large':
      return 'grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start';
    case 'xlarge':
      return 'grid grid-cols-1 max-w-xl mx-auto gap-8 items-start';
    default:
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start';
  }
};

const LAYOUTS: {
  id: FeedLayoutOption;
  label: string;
  subLabel: string;
  cols: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'small',
    label: 'Small',
    subLabel: '4 Kolom',
    cols: '4',
    icon: LayoutGrid,
  },
  {
    id: 'medium',
    label: 'Medium',
    subLabel: '3 Kolom (Default)',
    cols: '3',
    icon: Columns3,
  },
  {
    id: 'large',
    label: 'Large',
    subLabel: '2 Kolom',
    cols: '2',
    icon: Columns2,
  },
  {
    id: 'xlarge',
    label: 'Extra Large',
    subLabel: '1 Kolom',
    cols: '1',
    icon: Square,
  },
];

export const FeedLayoutSwitcher: React.FC<FeedLayoutSwitcherProps> = ({
  currentLayout,
  onChange,
  className = '',
}) => {
  return (
    <div
      role="group"
      aria-label="Pilihan Tampilan Grid Feed Instagram"
      className={`inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/90 shadow-2xs ${className}`}
    >
      {LAYOUTS.map((item) => {
        const Icon = item.icon;
        const isActive = currentLayout === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            title={`${item.label}: ${item.subLabel}`}
            aria-label={`${item.label} (${item.subLabel})`}
            aria-pressed={isActive}
            className={`relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer select-none whitespace-nowrap shrink-0 tabular-nums ${
              isActive
                ? 'text-white font-bold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="feedLayoutActivePill"
                className="absolute inset-0 bg-[#07529A] rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
              />
            )}
            <Icon className="relative z-10 w-3.5 h-3.5 shrink-0" />
            <span className="relative z-10 hidden sm:inline font-semibold">{item.label}</span>
            <span
              className={`relative z-10 text-[11px] ${
                isActive ? 'text-blue-100' : 'text-slate-400'
              }`}
            >
              ({item.cols})
            </span>
          </button>
        );
      })}
    </div>
  );
};
