import { HeroSlide } from '../types';

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-slide-1',
    imageUrl: '/src/assets/images/hero_sdm_aparatur_1790755834040.jpg',
    title: 'Edukasi Kebijakan SDM Aparatur',
    isActive: true,
    order: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'hero-slide-2',
    imageUrl: '/src/assets/images/infographic_manajemen_talenta_1790755861584.jpg',
    title: 'Manajemen Talenta & Sistem Merit ASN',
    isActive: true,
    order: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'hero-slide-3',
    imageUrl: '/src/assets/images/pola_karier_pns_slide_1791792629283.jpg',
    title: 'Pola Karier Pegawai Negeri Sipil',
    isActive: true,
    order: 2,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export const HERO_SLIDE_SLOT_COUNT = 3;

export function normalizeHeroSlides(slides: HeroSlide[]): HeroSlide[] {
  const sorted = [...slides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const now = new Date().toISOString();

  return Array.from({ length: HERO_SLIDE_SLOT_COUNT }, (_, idx) => {
    const existing = sorted[idx];
    if (existing) {
      const cleanUrl = typeof existing.imageUrl === 'string' ? existing.imageUrl.trim() : '';
      return {
        ...existing,
        id: existing.id || `hero-slide-slot-${idx + 1}`,
        imageUrl: cleanUrl,
        title: cleanUrl ? existing.title || `Slide Kebijakan SDM Aparatur #${idx + 1}` : '',
        isActive: cleanUrl ? Boolean(existing.isActive) : false,
        order: idx,
      };
    }

    return {
      id: `hero-slide-slot-${idx + 1}`,
      imageUrl: '',
      title: '',
      isActive: false,
      order: idx,
      createdAt: now,
      updatedAt: now,
    };
  });
}
