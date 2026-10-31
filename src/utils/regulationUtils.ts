import { INITIAL_SOURCES } from '../data/initialData';
import { SourceDocument } from '../types';

/**
 * Standard regulation types used across KemenPANRB / BKN / Government
 */
export const POPULAR_REGULATION_PRESETS: {
  id: string;
  title: string;
  fileUrl: string;
  regulationType: string;
  regulationNumber: string;
  year: string;
}[] = [
  {
    id: 'src-permenpan-1-2023',
    title: 'Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 1 Tahun 2023 tentang Jabatan Fungsional',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/permenpan/1-2023',
    regulationType: 'Peraturan Menteri PANRB',
    regulationNumber: 'Nomor 1 Tahun 2023',
    year: '2023',
  },
  {
    id: 'src-kepmenpan-11-2024',
    title: 'Keputusan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 11 Tahun 2024 tentang Nomenklatur Jabatan Pelaksana Pegawai Negeri Sipil di Lingkungan Instansi Pemerintah',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/kepmenpan/11-2024',
    regulationType: 'Keputusan Menteri PANRB',
    regulationNumber: 'Nomor 11 Tahun 2024',
    year: '2024',
  },
  {
    id: 'src-permenpan-45-2022',
    title: 'Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 45 Tahun 2022 tentang Jabatan Pelaksana Pegawai Negeri Sipil di Lingkungan Instansi Pemerintah',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/permenpan/45-2022',
    regulationType: 'Peraturan Menteri PANRB',
    regulationNumber: 'Nomor 45 Tahun 2022',
    year: '2022',
  },
  {
    id: 'src-uu-20-2023',
    title: 'Undang-Undang Nomor 20 Tahun 2023 tentang Aparatur Sipil Negara',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/uu/20-2023',
    regulationType: 'Undang-Undang',
    regulationNumber: 'Nomor 20 Tahun 2023',
    year: '2023',
  },
  {
    id: 'src-permenpan-3-2020',
    title: 'Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 3 Tahun 2020 tentang Manajemen Talenta Aparatur Sipil Negara',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/permenpan/3-2020',
    regulationType: 'Peraturan Menteri PANRB',
    regulationNumber: 'Nomor 3 Tahun 2020',
    year: '2020',
  },
  {
    id: 'src-permenpan-6-2022',
    title: 'Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 6 Tahun 2022 tentang Pengelolaan Kinerja Pegawai Aparatur Sipil Negara',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/permenpan/6-2022',
    regulationType: 'Peraturan Menteri PANRB',
    regulationNumber: 'Nomor 6 Tahun 2022',
    year: '2022',
  },
];

export interface DetectedRegulation {
  title: string;
  regulationType?: string;
  regulationNumber?: string;
  year?: string;
  isRecognized: boolean;
}

/**
 * Automatically retrieves and formats the regulation title and metadata from an official JDIH or document URL.
 */
export function detectRegulationFromUrl(rawUrl: string): DetectedRegulation {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { title: '', isRecognized: false };
  }

  const url = rawUrl.trim();

  // 1. Direct match with preset list of known official JDIH documents
  const allKnown = [...POPULAR_REGULATION_PRESETS, ...INITIAL_SOURCES];
  const foundPreset = allKnown.find((src) => {
    if (!src.fileUrl) return false;
    const sNorm = src.fileUrl.toLowerCase().replace(/\/+$/, '');
    const uNorm = url.toLowerCase().replace(/\/+$/, '');
    return sNorm === uNorm || uNorm.includes(sNorm) || sNorm.includes(uNorm);
  });

  if (foundPreset) {
    return {
      title: foundPreset.title,
      regulationType: foundPreset.regulationType,
      regulationNumber: foundPreset.regulationNumber,
      year: foundPreset.year,
      isRecognized: true,
    };
  }

  // 2. Parse JDIH KemenPANRB / BKN / JDIH Nasional URL structures:
  // Examples:
  // https://jdih.menpan.go.id/dokumen-hukum/permenpan/1-2023
  // https://jdih.menpan.go.id/dokumen-hukum/kepmenpan/11-2024
  // https://jdih.bkn.go.id/peraturan/detail/12-2023
  const jdihRegex = /(permenpan|kepmenpan|uu|pp|perpres|perbkn|kepbkn|se)[\/_-](\d+)[\/_-](\d{4})/i;
  const match = url.match(jdihRegex);

  if (match) {
    const typeKey = match[1].toLowerCase();
    const num = match[2];
    const year = match[3];

    const typeMap: Record<string, string> = {
      permenpan: 'Peraturan Menteri PANRB',
      kepmenpan: 'Keputusan Menteri PANRB',
      uu: 'Undang-Undang',
      pp: 'Peraturan Pemerintah',
      perpres: 'Peraturan Presiden',
      perbkn: 'Peraturan BKN',
      kepbkn: 'Keputusan Kepala BKN',
      se: 'Surat Edaran',
    };

    const typeName = typeMap[typeKey] || 'Peraturan';
    const regNumber = `Nomor ${num} Tahun ${year}`;
    const autoTitle = `${typeName} ${regNumber}`;

    return {
      title: autoTitle,
      regulationType: typeName,
      regulationNumber: regNumber,
      year,
      isRecognized: true,
    };
  }

  // 3. Fallback: Parse descriptive slug/filename from URL path
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const lastPart = pathParts.pop() || '';
    const cleanPart = decodeURIComponent(lastPart)
      .replace(/\.(pdf|html|php|docx?|aspx?)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();

    if (cleanPart.length > 5) {
      // Capitalize words into human-readable title
      const capitalized = cleanPart
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      return {
        title: capitalized,
        isRecognized: false,
      };
    }
  } catch {
    // If not a parseable URL yet, return empty
  }

  return { title: '', isRecognized: false };
}
