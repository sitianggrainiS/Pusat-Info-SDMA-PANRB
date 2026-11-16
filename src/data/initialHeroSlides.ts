import { HeroSlide } from '../types';
import { normalizeStaticImageUrl } from './staticImages';

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-slide-1',
    imageUrl: '/assets/aistudio/462411664_513021548204419_9151970918488268348_n__1__223b9cc0.jpg',
    title: '',
    isActive: true,
    order: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'hero-slide-2',
    imageUrl: '/assets/aistudio/Screenshot_2026-10-26_100608_a9ae79d1.png',
    title: '',
    isActive: true,
    order: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'hero-slide-3',
    imageUrl: '/assets/aistudio/Heading__3__00fd1277.png',
    title: '',
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
      const cleanUrl = normalizeStaticImageUrl(existing.imageUrl);
      return {
        ...existing,
        id: existing.id || `hero-slide-slot-${idx + 1}`,
        imageUrl: cleanUrl,
        title: cleanUrl && typeof existing.title === 'string' ? existing.title.trim() : '',
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
