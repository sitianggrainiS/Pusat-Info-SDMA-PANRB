export interface SekolahKedinasanItem {
  id: string;
  shortName: string;
  fullName: string;
  ministry: string;
  location: string;
  description: string;
  studyFields: string[];
  officialUrl: string;
  registrationUrl: string;
  keywords: string[];
}

export const SEKOLAH_KEDINASAN_LIST: SekolahKedinasanItem[] = [
  {
    id: 'sekdin-pkn-stan',
    shortName: 'PKN STAN',
    fullName: 'Politeknik Keuangan Negara STAN',
    ministry: 'Kementerian Keuangan',
    location: 'Tangerang Selatan, Banten',
    description:
      'Perguruan tinggi kedinasan di bawah Kementerian Keuangan yang menyelenggarakan pendidikan vokasi bidang pengelolaan keuangan dan kekayaan negara.',
    studyFields: [
      'Akuntansi Sektor Publik',
      'Manajemen Keuangan Negara',
      'Manajemen Aset Publik',
    ],
    officialUrl: 'https://pknstan.ac.id',
    registrationUrl: 'https://dikdin.bkn.go.id',
    keywords: [
      'stan',
      'pkn stan',
      'kemenkeu',
      'keuangan',
      'pajak',
      'bea cukai',
      'kepabeanan',
      'akuntansi',
      'perbendaharaan',
    ],
  },
  {
    id: 'sekdin-ipdn',
    shortName: 'IPDN',
    fullName: 'Institut Pemerintahan Dalam Negeri',
    ministry: 'Kementerian Dalam Negeri',
    location: 'Jatinangor, Sumedang & Kampus Regional',
    description:
      'Lembaga pendidikan tinggi kepamongprajaan yang menyiapkan kader aparatur pemerintahan pusat dan daerah di lingkungan Kemendagri serta Pemda.',
    studyFields: [
      'Politik Pemerintahan',
      'Manajemen Pemerintahan',
      'Pembangunan Ekonomi & Pemberdayaan Masyarakat',
    ],
    officialUrl: 'https://ipdn.ac.id',
    registrationUrl: 'https://dikdin.bkn.go.id',
    keywords: [
      'ipdn',
      'praja',
      'spcp',
      'kemendagri',
      'dalam negeri',
      'pamong praja',
      'kepamongprajaan',
      'pemda',
      'pemerintahan',
    ],
  },
  {
    id: 'sekdin-stis',
    shortName: 'Polstat STIS',
    fullName: 'Politeknik Statistika STIS',
    ministry: 'Badan Pusat Statistik (BPS)',
    location: 'Jakarta Timur, DKI Jakarta',
    description:
      'Perguruan tinggi kedinasan di lingkungan Badan Pusat Statistik yang berfokus pada pengembangan ahli statistika resmi dan sains data nasional.',
    studyFields: ['Statistika', 'Komputasi Statistik'],
    officialUrl: 'https://stis.ac.id',
    registrationUrl: 'https://dikdin.bkn.go.id',
    keywords: [
      'stis',
      'polstat',
      'polstat stis',
      'bps',
      'badan pusat statistik',
      'statistik',
      'statistika',
      'komputasi',
      'sains data',
    ],
  },
  {
    id: 'sekdin-poltek-ssn',
    shortName: 'Poltek SSN',
    fullName: 'Politeknik Siber dan Sandi Negara',
    ministry: 'Badan Siber dan Sandi Negara (BSSN)',
    location: 'Bogor, Jawa Barat',
    description:
      'Perguruan tinggi kedinasan yang menyelenggarakan pendidikan vokasi di bidang keamanan siber, kriptografi, dan persandian negara.',
    studyFields: [
      'Rekayasa Keamanan Siber',
      'Rekayasa Kriptografi',
      'Rekayasa Perangkat Keras Kriptografi',
    ],
    officialUrl: 'https://poltekssn.ac.id',
    registrationUrl: 'https://dikdin.bkn.go.id',
    keywords: [
      'ssn',
      'poltek ssn',
      'stsn',
      'bssn',
      'siber',
      'cyber',
      'sandi',
      'persandian',
      'kriptografi',
      'keamanan siber',
    ],
  },
  {
    id: 'sekdin-stmkg',
    shortName: 'STMKG',
    fullName: 'Sekolah Tinggi Meteorologi Klimatologi dan Geofisika',
    ministry: 'Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)',
    location: 'Tangerang Selatan, Banten',
    description:
      'Perguruan tinggi kedinasan di bawah BMKG yang mencetak sumber daya manusia ahli pengamatan cuaca, iklim, gempa bumi, dan instrumentasi kebencanaan.',
    studyFields: [
      'Meteorologi',
      'Klimatologi',
      'Geofisika',
      'Instrumentasi-MKG',
    ],
    officialUrl: 'https://stmkg.ac.id',
    registrationUrl: 'https://dikdin.bkn.go.id',
    keywords: [
      'stmkg',
      'bmkg',
      'meteorologi',
      'klimatologi',
      'geofisika',
      'cuaca',
      'iklim',
      'instrumentasi',
      'gempa',
    ],
  },
  {
    id: 'sekdin-stin',
    shortName: 'STIN',
    fullName: 'Sekolah Tinggi Intelijen Negara',
    ministry: 'Badan Intelijen Negara (BIN)',
    location: 'Sentul, Bogor, Jawa Barat',
    description:
      'Perguruan tinggi kedinasan di bawah Badan Intelijen Negara yang menyiapkan SDM intelijen profesional guna mendukung keamanan strategis nasional.',
    studyFields: [
      'Agen Intelijen',
      'Analis Intelijen',
      'Siber Intelijen',
      'Ekonomi Intelijen',
    ],
    officialUrl: 'https://ptb.stin.ac.id',
    registrationUrl: 'https://dikdin.bkn.go.id',
    keywords: [
      'stin',
      'bin',
      'badan intelijen negara',
      'intelijen',
      'keamanan nasional',
    ],
  },
  {
    id: 'sekdin-poltekpin',
    shortName: 'Poltekpin (Poltekip & Poltekim)',
    fullName: 'Politeknik Pengayoman Indonesia',
    ministry: 'Kementerian Hukum / Kementerian Imigrasi dan Pemasyarakatan',
    location: 'Tangerang, Banten',
    description:
      'Perguruan tinggi kedinasan hasil penguatan kelembagaan Poltekip dan Poltekim yang mencetak kader aparatur di bidang pemasyarakatan dan keimigrasian.',
    studyFields: [
      'Ilmu Pemasyarakatan',
      'Keimigrasian',
      'Hukum & Teknologi Keimigrasian',
    ],
    officialUrl: 'https://catar.kemenkumham.go.id',
    registrationUrl: 'https://dikdin.bkn.go.id',
    keywords: [
      'poltekpin',
      'poltekip',
      'poltekim',
      'pengayoman',
      'imigrasi',
      'keimigrasian',
      'pemasyarakatan',
      'kemenkumham',
      'kemenkum',
      'kemenimipas',
      'catar',
    ],
  },
  {
    id: 'sekdin-kemenhub',
    shortName: 'Sekolah Kedinasan Kemenhub',
    fullName: 'Perguruan Tinggi Kedinasan Kementerian Perhubungan (Sipencatar)',
    ministry: 'Kementerian Perhubungan',
    location: 'Berbagai Kampus Matra Darat, Laut & Udara di Indonesia',
    description:
      'Jaringan politeknik dan akademi transportasi (seperti PTDI-STTD, PPI, STIP, PIP, Poltekpel, dan Poltekbang) melalui jalur Pola Pembibitan Kemenhub dan Pemda.',
    studyFields: [
      'Transportasi Darat (PTDI-STTD)',
      'Perkeretaapian (PPI)',
      'Pelayaran / Matra Laut',
      'Penerbangan / Matra Udara',
    ],
    officialUrl: 'https://sipencatar.kemenhub.go.id',
    registrationUrl: 'https://dikdin.bkn.go.id',
    keywords: [
      'kemenhub',
      'perhubungan',
      'sipencatar',
      'sttd',
      'ptdi sttd',
      'stip',
      'poltekpel',
      'poltekbang',
      'ppi curug',
      'ppi madiun',
      'transportasi',
      'pelayaran',
      'penerbangan',
      'perkeretaapian',
      'pola pembibitan',
    ],
  },
];

const GENERAL_SEKDIN_TERMS = new Set([
  'sekolah',
  'kedinasan',
  'sekdin',
  'dikdin',
  'sscasn',
  'ptk',
  'ikatan',
  'dinas',
  'taruna',
  'praja',
  'perguruan',
  'tinggi',
]);

const GENERAL_SEKDIN_PHRASES = [
  'sekolah kedinasan',
  'kedinasan',
  'sekdin',
  'dikdin',
  'sscasn dikdin',
  'ikatan dinas',
  'perguruan tinggi kedinasan',
];

export function searchSekolahKedinasan(rawQuery: string): SekolahKedinasanItem[] {
  const normalized = rawQuery.trim().toLowerCase();
  if (!normalized) return [];

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const specificTokens = tokens.filter((t) => !GENERAL_SEKDIN_TERMS.has(t));

  // If the user typed a general Sekolah Kedinasan query (e.g. "Sekolah Kedinasan", "dikdin", "kedinasan"),
  // return all 8 official institutions so the user can browse the full directory.
  if (
    specificTokens.length === 0 &&
    GENERAL_SEKDIN_PHRASES.some((phrase) => phrase.includes(normalized) || normalized.includes(phrase))
  ) {
    return SEKOLAH_KEDINASAN_LIST;
  }

  const effectiveQuery = specificTokens.length > 0 ? specificTokens.join(' ') : normalized;

  return SEKOLAH_KEDINASAN_LIST.filter((item) => {
    const searchableBlob = [
      item.shortName,
      item.fullName,
      item.ministry,
      item.location,
      item.description,
      ...item.studyFields,
      ...item.keywords,
    ]
      .join(' ')
      .toLowerCase();

    if (searchableBlob.includes(effectiveQuery) || searchableBlob.includes(normalized)) {
      return true;
    }

    if (specificTokens.length > 0) {
      return specificTokens.every((tok) => searchableBlob.includes(tok));
    }

    return false;
  });
}
