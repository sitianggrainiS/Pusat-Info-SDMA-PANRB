import { DeputyNews } from '../types';
import { validateDirectImageUrl } from './imageUrlUtils';
import { formatContentDate, parseContentDate } from './dateUtils';

export const DEFAULT_DEPUTY_NEWS_CATEGORIES: string[] = [
  'Kebijakan SDM Aparatur',
  'Transformasi Manajemen ASN',
  'Perencanaan & Pengadaan ASN',
  'Manajemen Talenta & Karier',
  'Pengelolaan Kinerja & Penghargaan',
  'Pengembangan Kompetensi ASN',
  'Sistem Merit & Budaya Kerja',
  'Digitalisasi Manajemen ASN',
  'Kegiatan Deputi SDM Aparatur',
];

export const MAX_DEPUTY_NEWS_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
]);

/**
 * Validates that an article/source URL uses a valid HTTPS/HTTP URL.
 */
export function validateMenpanArticleUrl(rawUrl: string): {
  isValid: boolean;
  cleanUrl: string;
  error?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      cleanUrl: '',
      error: 'Link artikel resmi Kementerian PANRB wajib diisi.',
    };
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      isValid: false,
      cleanUrl: '',
      error: 'Format URL tidak valid. Gunakan URL lengkap seperti https://www.menpan.go.id/...',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      isValid: false,
      cleanUrl: '',
      error: 'Link artikel wajib menggunakan protokol https:// atau http://.',
    };
  }

  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    return {
      isValid: false,
      cleanUrl: '',
      error: 'Domain pada link artikel tidak valid.',
    };
  }

  return {
    isValid: true,
    cleanUrl: parsed.toString(),
  };
}

/**
 * Validates an uploaded image File/Blob before saving to IndexedDB.
 */
export function validateUploadedNewsImageFile(file?: File | Blob | null): {
  isValid: boolean;
  error?: string;
} {
  if (!file || !(file instanceof Blob)) {
    return {
      isValid: false,
      error: 'Silakan pilih file gambar berita terlebih dahulu.',
    };
  }

  if (file.size <= 0) {
    return {
      isValid: false,
      error: 'File gambar kosong atau rusak. Silakan pilih file gambar lain.',
    };
  }

  if (file.size > MAX_DEPUTY_NEWS_IMAGE_BYTES) {
    return {
      isValid: false,
      error: 'Ukuran file gambar melebihi batas maksimal 15 MB.',
    };
  }

  const mime = (file.type || '').toLowerCase();
  if (!mime.startsWith('image/') || !ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    return {
      isValid: false,
      error: 'Format file tidak didukung. Gunakan gambar berformat JPG, PNG, WEBP, GIF, AVIF, atau SVG.',
    };
  }

  return { isValid: true };
}

/**
 * Validates a static project path (`/images/...`), compressed Data URL (`data:image/...`),
 * or external HTTPS image URL. Rejects temporary `blob:` URLs.
 */
export function validateNewsThumbnail(rawThumbnail: string): {
  isValid: boolean;
  cleanThumbnail: string;
  error?: string;
} {
  const check = validateDirectImageUrl(rawThumbnail, { allowEmpty: false, allowDataUrl: true });
  if (!check.isValid) {
    return {
      isValid: false,
      cleanThumbnail: '',
      error:
        check.error ||
        'Gambar berita wajib diunggah atau menggunakan path Aset Proyek (/images/...) maupun URL gambar resmi (https://...).',
    };
  }
  return {
    isValid: true,
    cleanThumbnail: check.cleanUrl,
  };
}

/**
 * Resolves the displayable image source for a DeputyNews item:
 * 1. Primary: runtime URL hydrated from the IndexedDB Blob matching `item.imageId`
 * 2. Fallback: static/external `item.thumbnailUrl` (never `blob:` or base64)
 */
export function resolveDeputyNewsImageUrl(
  item: Pick<DeputyNews, 'imageId' | 'thumbnailUrl'>,
  imageObjectUrls: Record<string, string>
): string {
  if (item.imageId && imageObjectUrls[item.imageId]) {
    return imageObjectUrls[item.imageId];
  }
  const thumb = (item.thumbnailUrl || '').trim();
  if (thumb && !thumb.startsWith('blob:')) {
    return thumb;
  }
  return '';
}

/**
 * Formats an inputted date string (YYYY-MM-DD or Indonesian text) into Indonesian human-readable format
 * without timezone drift (e.g. "25 Oktober 2026").
 */
export function formatIndonesianNewsDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '-';
  return formatContentDate(dateStr) || dateStr.trim();
}

/**
 * Converts an inputted date string into a comparable numeric timestamp without timezone drift.
 */
function parseDateScore(dateStr: string): number {
  const parsed = parseContentDate(dateStr);
  return parsed ? parsed.getTime() : 0;
}

/**
 * Sorts DeputyNews items by newest publicationDate first, breaking ties by createdAt descending.
 */
export function sortDeputyNewsNewestFirst(items: DeputyNews[]): DeputyNews[] {
  return [...items].sort((a, b) => {
    const diff = parseDateScore(b.publicationDate) - parseDateScore(a.publicationDate);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
