import { Policy } from '../types';

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

  // 1. Mengenal Jabatan Pelaksana -> infographic_jabatan_pelaksana_1790755819303.jpg
  if (t.includes('pelaksana') || s.includes('pelaksana') || id.includes('pelaksana')) {
    return '/src/assets/images/infographic_jabatan_pelaksana_1790755819303.jpg';
  }

  // 2. Naik Pangkat vs Naik Jenjang -> infographic_naik_pangkat_1790755802597.jpg
  if (
    t.includes('naik pangkat') ||
    t.includes('jenjang') ||
    s.includes('naik-pangkat') ||
    s.includes('jenjang') ||
    id.includes('naik-pangkat')
  ) {
    return '/src/assets/images/infographic_naik_pangkat_1790755802597.jpg';
  }

  // 3. Manajemen Talenta & Sistem Merit -> infographic_manajemen_talenta_1790755861584.jpg
  if (
    t.includes('talenta') ||
    t.includes('merit') ||
    s.includes('talenta') ||
    s.includes('merit') ||
    id.includes('talenta')
  ) {
    return '/src/assets/images/infographic_manajemen_talenta_1790755861584.jpg';
  }

  // 4. Pola Karier -> pola_karier_pns_slide_1791792629283.jpg
  if (t.includes('karier') || s.includes('karier') || id.includes('karier')) {
    return '/src/assets/images/pola_karier_pns_slide_1791792629283.jpg';
  }

  // Default fallback cover
  return '/src/assets/images/infographic_jabatan_pelaksana_1790755819303.jpg';
}

/**
 * Gets effective thumbnail for display:
 * 1. If manual override is active, returns thumbnail / customThumbnail
 * 2. Otherwise returns the detected Instagram cover
 */
export function getEffectiveThumbnail(policy: Partial<Policy>): string {
  if (policy.isCustomThumbnail && policy.thumbnail) {
    return policy.thumbnail;
  }
  if (policy.thumbnail && !policy.thumbnail.includes('placeholder')) {
    // If it's a valid non-empty thumbnail, use it
    return policy.thumbnail;
  }
  return detectInstagramThumbnail(policy);
}

/**
 * Resizes and compresses an image in browser using HTMLCanvasElement
 * to keep base64 strings lightweight (~100-250KB) preventing localStorage quota overflow.
 */
export function compressImageFile(file: File, maxDimension = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses file gambar.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari penyimpanan lokal.'));
    reader.readAsDataURL(file);
  });
}
