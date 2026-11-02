import { DeputyNews } from '../types';

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

/**
 * Validates that an article URL strictly uses HTTPS and belongs to
 * menpan.go.id or one of its official subdomains (e.g. www.menpan.go.id).
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
      error: 'Link artikel wajib diisi.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      cleanUrl: '',
      error: 'Format URL tidak valid. Gunakan URL lengkap yang diawali https://',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      isValid: false,
      cleanUrl: '',
      error: 'Link artikel wajib menggunakan protokol HTTPS (https://).',
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isOfficialMenpanDomain = host === 'menpan.go.id' || host.endsWith('.menpan.go.id');

  if (!isOfficialMenpanDomain) {
    return {
      isValid: false,
      cleanUrl: '',
      error:
        'Link artikel hanya menerima URL resmi dari domain menpan.go.id atau subdomain resminya (contoh: https://www.menpan.go.id/...).',
    };
  }

  return {
    isValid: true,
    cleanUrl: parsed.toString(),
  };
}

/**
 * Validates a thumbnail URL metadata string (external HTTPS/HTTP image URL or static asset path).
 * Inline binary data:/blob: strings are rejected so Firestore only stores permanent URL metadata.
 */
export function validateNewsThumbnail(rawThumbnail: string): {
  isValid: boolean;
  cleanThumbnail: string;
  error?: string;
} {
  const trimmed = (rawThumbnail || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      cleanThumbnail: '',
      error: 'URL gambar/thumbnail berita wajib diisi (contoh: https://...).',
    };
  }

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return {
      isValid: false,
      cleanThumbnail: '',
      error:
        'Penyimpanan file gambar langsung belum tersedia karena Firebase Storage dinonaktifkan (VITE_ENABLE_FIREBASE_STORAGE=false). Masukkan tautan URL gambar eksternal (https://...).',
    };
  }

  if (trimmed.length > 2048) {
    return {
      isValid: false,
      cleanThumbnail: '',
      error: 'Panjang URL gambar melebihi batas maksimum metadata (2048 karakter).',
    };
  }

  if (trimmed.startsWith('/')) {
    return { isValid: true, cleanThumbnail: trimmed };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        isValid: false,
        cleanThumbnail: '',
        error: 'URL gambar harus menggunakan protokol https:// atau http://.',
      };
    }
    return { isValid: true, cleanThumbnail: parsed.toString() };
  } catch {
    return {
      isValid: false,
      cleanThumbnail: '',
      error: 'Format URL gambar tidak valid. Masukkan tautan URL gambar lengkap (https://...).',
    };
  }
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into Indonesian human-readable format
 * without timezone drift (e.g. "25 Oktober 2026").
 */
export function formatIndonesianNewsDate(dateStr: string): string {
  if (!dateStr) return '-';
  const trimmed = dateStr.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIndex = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const localDate = new Date(year, monthIndex, day);
    if (!Number.isNaN(localDate.getTime())) {
      return localDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  return trimmed;
}

/**
 * Converts a YYYY-MM-DD date string into a comparable numeric timestamp.
 */
function parseDateScore(dateStr: string): number {
  if (!dateStr) return 0;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])).getTime();
  }
  const t = new Date(dateStr).getTime();
  return Number.isNaN(t) ? 0 : t;
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
