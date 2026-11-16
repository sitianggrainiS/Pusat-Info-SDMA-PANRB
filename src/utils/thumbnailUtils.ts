import { Policy } from '../types';
import {
  DEFAULT_FALLBACK_IMAGE_PATH,
  normalizeStaticImageUrl,
  readAndCompressLocalPreviewImage,
} from '../data/staticImages';

export interface InstagramPreviewOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  url: string;
}

export const AVAILABLE_INSTAGRAM_PREVIEWS: InstagramPreviewOption[] = [
  {
    id: 'jabatan-pelaksana',
    name: 'Cover: JABATAN PELAKSANA',
    badge: 'Cover Utama',
    description: 'Cover resmi infografis pengenalan dan klasifikasi Jabatan Pelaksana KemenPANRB',
    url: '/images/infographic_jabatan_pelaksana_1790755819303.jpg',
  },
  {
    id: 'naik-pangkat',
    name: 'Cover: NAIK PANGKAT ≠ NAIK JENJANG',
    badge: 'Cover Utama',
    description: 'Cover resmi infografis perbedaan naik pangkat dan naik jenjang Jabatan Fungsional',
    url: '/images/infographic_naik_pangkat_1790755802597.jpg',
  },
  {
    id: 'manajemen-talenta',
    name: 'Cover: MANAJEMEN TALENTA & SISTEM MERIT',
    badge: 'Cover Utama',
    description: 'Cover resmi infografis 9-Box Matrix dan percepatan suksesi ASN',
    url: '/images/infographic_manajemen_talenta_1790755861584.jpg',
  },
  {
    id: 'pola-karier',
    name: 'Slide: POLA KARIER PEGAWAI NEGERI SIPIL',
    badge: 'Slide Infografis',
    description: 'Slide ilustrasi jalur pengembangan dan mobilitas karier ASN',
    url: '/images/pola_karier_pns_slide_1791792629283.jpg',
  },
  {
    id: 'hero-sdm',
    name: 'Ilustrasi: SDM APARATUR TRANSFORMASI',
    badge: 'Ilustrasi Tema',
    description: 'Visual aparatur sipil negara modern dan BerAKHLAK',
    url: '/images/hero_sdm_aparatur_1790755834040.jpg',
  },
  {
    id: 'dokumentasi-sdma',
    name: 'Dokumentasi: VISUAL KEGIATAN SDMA',
    badge: 'Aset Proyek',
    description: 'Dokumentasi visual kegiatan Kedeputian SDMA pada aset statis proyek',
    url: '/images/WhatsApp_Image_2026-10-28_at_11.32.35_AM_f1b0cf21.jpeg',
  },
];

/**
 * Automatically detects the appropriate Instagram thumbnail / cover image
 * for a policy based on its ID, slug, title, or Instagram post details.
 * Always returns a permanent post-build static path (`/images/...`).
 */
export function detectInstagramThumbnail(item: {
  id?: string;
  slug?: string;
  title?: string;
  instagramPostUrl?: string;
  categoryId?: string;
}): string {
  const t = (item.title || '').toLowerCase();
  const s = (item.slug || '').toLowerCase();
  const id = (item.id || '').toLowerCase();

  if (t.includes('pelaksana') || s.includes('pelaksana') || id.includes('pelaksana')) {
    return '/images/infographic_jabatan_pelaksana_1790755819303.jpg';
  }

  if (
    t.includes('naik pangkat') ||
    t.includes('jenjang') ||
    s.includes('naik-pangkat') ||
    s.includes('jenjang') ||
    id.includes('naik-pangkat')
  ) {
    return '/images/infographic_naik_pangkat_1790755802597.jpg';
  }

  if (
    t.includes('talenta') ||
    t.includes('merit') ||
    s.includes('talenta') ||
    s.includes('merit') ||
    id.includes('talenta')
  ) {
    return '/images/infographic_manajemen_talenta_1790755861584.jpg';
  }

  if (t.includes('karier') || s.includes('karier') || id.includes('karier')) {
    return '/images/pola_karier_pns_slide_1791792629283.jpg';
  }

  return DEFAULT_FALLBACK_IMAGE_PATH;
}

export function getEffectiveThumbnail(policy: Partial<Policy>): string {
  const explicitCustom = normalizeStaticImageUrl(policy.customThumbnail);
  const custom = normalizeStaticImageUrl(policy.thumbnail);
  if (policy.isCustomThumbnail && (explicitCustom || custom)) {
    return explicitCustom || custom;
  }
  if (custom && !custom.includes('placeholder')) {
    return custom;
  }
  return detectInstagramThumbnail(policy);
}

/**
 * Compresses an uploaded file into a local preview data URL (NEVER blob: and NEVER Firebase).
 * Note: Callers in Admin UI must inform the admin that direct device uploads without a backend
 * database/cloud storage are temporary to the current browser/preview session.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1100,
  quality = 0.82
): Promise<string> {
  return readAndCompressLocalPreviewImage(file, maxDimension, quality);
}

/**
 * Compresses an uploaded image File so its data URL fits comfortably within
 * Firestore document/field size limits (max ~480 KB chars) for persistent cross-device sync.
 */
export async function compressImageForFirestore(
  file: Blob | File,
  maxChars = 480000
): Promise<string> {
  const attempts: Array<{ dim: number; quality: number }> = [
    { dim: 1100, quality: 0.82 },
    { dim: 900, quality: 0.72 },
    { dim: 720, quality: 0.62 },
    { dim: 560, quality: 0.52 },
  ];

  let lastResult = '';
  for (const attempt of attempts) {
    lastResult = await readAndCompressLocalPreviewImage(file, attempt.dim, attempt.quality);
    if (lastResult.length <= maxChars) {
      return lastResult;
    }
  }
  return lastResult;
}
