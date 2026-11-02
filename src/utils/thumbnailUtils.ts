import { Policy } from '../types';
import { StorageFolder, uploadImageAsset } from '../lib/storageService';

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
    url: '/src/assets/images/infographic_jabatan_pelaksana_1790755819303.jpg',
  },
  {
    id: 'naik-pangkat',
    name: 'Cover: NAIK PANGKAT ≠ NAIK JENJANG',
    badge: 'Cover Utama',
    description: 'Cover resmi infografis perbedaan naik pangkat dan naik jenjang Jabatan Fungsional',
    url: '/src/assets/images/infographic_naik_pangkat_1790755802597.jpg',
  },
  {
    id: 'manajemen-talenta',
    name: 'Cover: MANAJEMEN TALENTA & SISTEM MERIT',
    badge: 'Cover Utama',
    description: 'Cover resmi infografis 9-Box Matrix dan percepatan suksesi ASN',
    url: '/src/assets/images/infographic_manajemen_talenta_1790755861584.jpg',
  },
  {
    id: 'pola-karier',
    name: 'Slide: POLA KARIER PEGAWAI NEGERI SIPIL',
    badge: 'Slide Infografis',
    description: 'Slide ilustrasi jalur pengembangan dan mobilitas karier ASN',
    url: '/src/assets/images/pola_karier_pns_slide_1791792629283.jpg',
  },
  {
    id: 'hero-sdm',
    name: 'Ilustrasi: SDM APARATUR TRANSFORMASI',
    badge: 'Ilustrasi Tema',
    description: 'Visual aparatur sipil negara modern dan BerAKHLAK',
    url: '/src/assets/images/hero_sdm_aparatur_1790755834040.jpg',
  },
];

/**
 * Automatically detects the appropriate Instagram thumbnail / cover image
 * for a policy based on its ID, slug, title, or Instagram post details.
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
    return '/src/assets/images/infographic_jabatan_pelaksana_1790755819303.jpg';
  }

  if (
    t.includes('naik pangkat') ||
    t.includes('jenjang') ||
    s.includes('naik-pangkat') ||
    s.includes('jenjang') ||
    id.includes('naik-pangkat')
  ) {
    return '/src/assets/images/infographic_naik_pangkat_1790755802597.jpg';
  }

  if (
    t.includes('talenta') ||
    t.includes('merit') ||
    s.includes('talenta') ||
    s.includes('merit') ||
    id.includes('talenta')
  ) {
    return '/src/assets/images/infographic_manajemen_talenta_1790755861584.jpg';
  }

  if (t.includes('karier') || s.includes('karier') || id.includes('karier')) {
    return '/src/assets/images/pola_karier_pns_slide_1791792629283.jpg';
  }

  return '/src/assets/images/infographic_jabatan_pelaksana_1790755819303.jpg';
}

export function getEffectiveThumbnail(policy: Partial<Policy>): string {
  if (policy.isCustomThumbnail && policy.thumbnail) {
    return policy.thumbnail;
  }
  if (policy.thumbnail && !policy.thumbnail.includes('placeholder')) {
    return policy.thumbnail;
  }
  return detectInstagramThumbnail(policy);
}

/**
 * Uploads an image file to Firebase Cloud Storage ONLY when explicitly enabled
 * (VITE_ENABLE_FIREBASE_STORAGE=true). When disabled on the Spark Plan, throws
 * an honest explanation without storing binary blobs in Firestore or temporary storage.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1100,
  quality = 0.82,
  folder: StorageFolder = 'policies'
): Promise<string> {
  const result = await uploadImageAsset(file, folder, maxDimension, quality);
  return result.url;
}


