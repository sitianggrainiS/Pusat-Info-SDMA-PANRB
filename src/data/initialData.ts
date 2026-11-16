import { Category, Policy, SourceDocument } from '../types';

export const STANDARD_KLASTER_IDS = new Set([
  'cat-perencanaan-pengadaan',
  'cat-budaya-kerja',
  'cat-pengelolaan-kinerja',
  'cat-talenta-karier',
  'cat-pengembangan-kompetensi',
  'cat-penghargaan-pengakuan',
  'cat-pemberhentian',
  'cat-sistem-merit',
]);

export const STANDARD_PILAR_IDS = [
  'cat-sekolah-kedinasan',
  'cat-fun-content',
  'cat-greetings',
  'cat-quiz',
  'cat-collab',
] as const;

export function isRemovedSubstansiCategory(cat?: {
  id?: string;
  slug?: string;
  name?: string;
} | null): boolean {
  if (!cat) return false;
  return (
    cat.id === 'cat-substansi' ||
    cat.slug?.toLowerCase() === 'substansi' ||
    cat.name?.trim().toLowerCase() === 'substansi'
  );
}

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-perencanaan-pengadaan',
    name: 'Perencanaan Kebutuhan dan Pengadaan ASN',
    slug: 'perencanaan-kebutuhan-dan-pengadaan-asn',
    description: 'Penyusunan kebijakan formasi nasional berbasis prioritas rencana pembangunan nasional (RPJMN) dan Kebijakan Rekrutmen Pegawai ASN.',
    iconName: 'UserCheck',
    group: 'klaster',
  },
  {
    id: 'cat-budaya-kerja',
    name: 'Penguatan Budaya Kerja dan Citra Institusi',
    slug: 'penguatan-budaya-kerja-dan-citra-institusi',
    description: 'Internalisasi kode etik, kode perilaku, dan nilai dasar tunggal (core values) BerAKHLAK sebagai panduan perilaku pegawai.',
    iconName: 'ShieldCheck',
    group: 'klaster',
  },
  {
    id: 'cat-pengelolaan-kinerja',
    name: 'Pengelolaan Kinerja',
    slug: 'pengelolaan-kinerja',
    description: 'Pengukuran pencapaian target dan sasaran organisasi melalui dialog kinerja yang fleksibel, kolaboratif, dan terukur.',
    iconName: 'Target',
    group: 'klaster',
  },
  {
    id: 'cat-talenta-karier',
    name: 'Pengembangan Talenta dan Karier',
    slug: 'pengembangan-talenta-dan-karier',
    description: 'Pengaturan mobilitas pegawai (rotasi, mutasi, promosi) yang mempertimbangkan kualifikasi, kompetensi, dan kinerja melalui Manajemen Talenta.',
    iconName: 'TrendingUp',
    group: 'klaster',
  },
  {
    id: 'cat-pengembangan-kompetensi',
    name: 'Pengembangan Kompetensi',
    slug: 'pengembangan-kompetensi',
    description: 'Kewajiban pemenuhan pembelajaran berkelanjutan bagi pegawai melalui sistem pembelajaran terintegrasi (ASN Corporate University).',
    iconName: 'GraduationCap',
    group: 'klaster',
  },
  {
    id: 'cat-penghargaan-pengakuan',
    name: 'Pemberian Penghargaan dan Pengakuan',
    slug: 'pemberian-penghargaan-dan-pengakuan',
    description: 'Skema apresiasi materiil maupun nonmateriil (gaji, tunjangan, jaminan sosial, bantuan hukum, dan pengembangan diri) secara adil dan kompetitif.',
    iconName: 'Award',
    group: 'klaster',
  },
  {
    id: 'cat-pemberhentian',
    name: 'Pemberhentian',
    slug: 'pemberhentian',
    description: 'Pemutusan hubungan kerja pegawai secara bermartabat sesuai ketentuan peraturan perundang-undangan.',
    iconName: 'Briefcase',
    group: 'klaster',
  },
  {
    id: 'cat-sistem-merit',
    name: 'Penguatan Implementasi Sistem Merit',
    slug: 'penguatan-implementasi-sistem-merit',
    description: 'Informasi terkait pelaksanaan pengukuran sistem merit pada Instansi Pemerintah.',
    iconName: 'Sparkles',
    group: 'klaster',
  },
  {
    id: 'cat-sekolah-kedinasan',
    name: 'Sekolah Kedinasan',
    slug: 'sekolah-kedinasan',
    description: 'Informasi kebijakan seleksi, alokasi formasi, tata kelola pendidikan, dan pemenuhan kebutuhan calon aparatur melalui Perguruan Tinggi Kedinasan.',
    iconName: 'School',
    group: 'pilar',
  },
  {
    id: 'cat-fun-content',
    name: 'Fun Content',
    slug: 'fun-content',
    description: 'Konten kreatif, interaktif, dan menghibur seputar dunia kerja ASN, serba-serbi kepegawaian, serta edukasi ringan yang dekat dengan keseharian aparatur.',
    iconName: 'Smile',
    group: 'pilar',
  },
  {
    id: 'cat-greetings',
    name: 'Greetings',
    slug: 'greetings',
    description: 'Ucapan resmi hari besar nasional, peringatan hari penting, serta apresiasi institusional dari Kedeputian Bidang SDM Aparatur.',
    iconName: 'CalendarHeart',
    group: 'pilar',
  },
  {
    id: 'cat-quiz',
    name: 'Quiz',
    slug: 'quiz',
    description: 'Kuis interaktif, tebak regulasi, dan tantangan pengetahuan seputar kebijakan manajemen ASN untuk menguji pemahaman publik.',
    iconName: 'HelpCircle',
    group: 'pilar',
  },
  {
    id: 'cat-collab',
    name: 'Collab',
    slug: 'collab',
    description: 'Konten kolaborasi lintas instansi pemerintah, kementerian/lembaga, serta pemangku kepentingan ekosistem SDM Aparatur.',
    iconName: 'Handshake',
    group: 'pilar',
  },
];

export const INITIAL_SOURCES: SourceDocument[] = [
  {
    id: 'src-permenpan-1-2023',
    title: 'Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 1 Tahun 2023 tentang Jabatan Fungsional',
    regulationType: 'Peraturan Menteri PANRB',
    regulationNumber: 'Nomor 1 Tahun 2023',
    year: '2023',
    articles: 'Pasal 29, Pasal 30, Pasal 40, Pasal 41',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/permenpan/1-2023',
    description: 'Mengatur simplifikasi pengelolaan Jabatan Fungsional, tata cara penilaian angka kredit berbasis konversi predikat kinerja, serta mekanisme kenaikan pangkat dan jenjang.',
    isVerified: true,
  },
  {
    id: 'src-kepmenpan-11-2024',
    title: 'Keputusan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 11 Tahun 2024 tentang Nomenklatur Jabatan Pelaksana Bagi Pegawai Negeri Sipil di Lingkungan Instansi Pemerintah',
    regulationType: 'Keputusan Menteri PANRB',
    regulationNumber: 'Nomor 11 Tahun 2024',
    year: '2024',
    articles: 'Diktum Kesatu sampai Ketujuh',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/kepmenpan/11-2024',
    description: 'Memperbarui penetapan klasifikasi dan rincian nomenklatur jabatan pelaksana yang mencerminkan tugas nyata organisasi serta kualifikasi pendidikan minimal.',
    isVerified: true,
  },
  {
    id: 'src-permenpan-45-2022',
    title: 'Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 45 Tahun 2022 tentang Jabatan Pelaksana Pegawai Negeri Sipil di Lingkungan Instansi Pemerintah',
    regulationType: 'Peraturan Menteri PANRB',
    regulationNumber: 'Nomor 45 Tahun 2022',
    year: '2022',
    articles: 'Pasal 4 sampai Pasal 12',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/permenpan/45-2022',
    description: 'Dasar hukum tata kelola jabatan pelaksana berdasarkan 3 kluster tugas: kluster teknis, kluster pelayanan publik, dan kluster tata usaha/administrasi.',
    isVerified: true,
  },
  {
    id: 'src-permenpan-3-2020',
    title: 'Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 3 Tahun 2020 tentang Manajemen Talenta Aparatur Sipil Negara',
    regulationType: 'Peraturan Menteri PANRB',
    regulationNumber: 'Nomor 3 Tahun 2020',
    year: '2020',
    articles: 'Pasal 10 - Pasal 22',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/permenpan/3-2020',
    description: 'Pedoman nasional penyelenggaraan manajemen talenta instansi dan nasional melalui pemetaan kuadran kinerja dan potensi (9-box matrix).',
    isVerified: true,
  },
  {
    id: 'src-permenpan-6-2022',
    title: 'Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 6 Tahun 2022 tentang Pengelolaan Kinerja Pegawai Aparatur Sipil Negara',
    regulationType: 'Peraturan Menteri PANRB',
    regulationNumber: 'Nomor 6 Tahun 2022',
    year: '2022',
    articles: 'Pasal 3 - Pasal 15',
    fileUrl: 'https://jdih.menpan.go.id/dokumen-hukum/permenpan/6-2022',
    description: 'Transformasi penilaian SKP ASN yang berfokus pada dialog kinerja, ekspektasi pimpinan, dan umpan balik berkala, bukan sekadar pemenuhan administrasi.',
    isVerified: true,
  },
];

import { INITIAL_POLICIES } from './initialPolicies';
export { INITIAL_POLICIES };

export const SAMPLE_DOCUMENTS = [
  {
    id: 'sample-doc-1',
    title: 'Peraturan Menteri PANRB No. 1 Tahun 2023 tentang Jabatan Fungsional',
    type: 'Peraturan Menteri',
    snippet: `PERATURAN MENTERI PENDAYAGUNAAN APARATUR NEGARA DAN REFORMASI BIROKRASI
NOMOR 1 TAHUN 2023 TENTANG JABATAN FUNGSIONAL

BAB VI: KENAIKAN PANGKAT DAN KENAIKAN JENJANG JABATAN
Pasal 29
(1) Kenaikan jenjang jabatan fungsional dapat dipertimbangkan apabila pejabat fungsional memenuhi angka kredit kumulatif yang ditentukan untuk kenaikan jenjang.
(2) Selain memenuhi angka kredit kumulatif sebagaimana dimaksud pada ayat (1), pejabat fungsional harus:
a. telah memenuhi paling singkat 1 (satu) tahun dalam jenjang jabatan terakhir;
b. memiliki predikat kinerja paling rendah Baik dalam 2 (dua) tahun terakhir;
c. lulus uji kompetensi; dan
d. tersedianya lowongan kebutuhan jabatan fungsional yang akan diduduki.

Pasal 30
Kenaikan jenjang jabatan fungsional sebagaimana dimaksud dalam Pasal 29 dilaksanakan mendahului kenaikan pangkat pegawai yang bersangkutan.

Pasal 40
(1) Angka Kredit diperoleh dari hasil konversi Predikat Kinerja tahunan yang tercantum dalam evaluasi kinerja pegawai.
(2) Predikat Kinerja Sangat Baik bernilai 150% dari koefisien tahunan.
(3) Predikat Kinerja Baik bernilai 100% dari koefisien tahunan.
(4) Predikat Kinerja Cukup bernilai 75% dari koefisien tahunan.`,
  },
  {
    id: 'sample-doc-2',
    title: 'Keputusan Menteri PANRB No. 11 Tahun 2024 tentang Nomenklatur Jabatan Pelaksana',
    type: 'Keputusan Menteri',
    snippet: `KEPUTUSAN MENTERI PENDAYAGUNAAN APARATUR NEGARA DAN REFORMASI BIROKRASI REPUBLIK INDONESIA
NOMOR 11 TAHUN 2024
TENTANG NOMENKLATUR JABATAN PELAKSANA BAGI PEGAWAI NEGERI SIPIL DI LINGKUNGAN INSTANSI PEMERINTAH

DIKTUM KESATU:
Menetapkan Nomenklatur Jabatan Pelaksana bagi Pegawai Negeri Sipil di Lingkungan Instansi Pemerintah sebagaimana tercantum dalam Lampiran yang merupakan bagian tidak terpisahkan dari Keputusan Menteri ini.

DIKTUM KEDUA:
Nomenklatur Jabatan Pelaksana sebagaimana dimaksud dalam Diktum KESATU dikelompokkan ke dalam 3 (tiga) klasifikasi jabatan:
a. Kluster Teknis;
b. Kluster Pelayanan Publik; dan
c. Kluster Tata Usaha/Administrasi.

DIKTUM KETIGA:
Instansi Pemerintah wajib melakukan penyesuaian nomenklatur jabatan pelaksana yang telah ada paling lambat 1 (satu) tahun sejak Keputusan Menteri ini ditetapkan.

DIKTUM KEEMPAT:
Kualifikasi pendidikan untuk Jabatan Pelaksana diselaraskan dengan kebutuhan nyata pelaksanaan tugas, dengan kualifikasi minimal Sekolah Lanjutan Tingkat Atas (SLTA)/sederajat, Diploma Tiga (D-III), dan Sarjana (S-1)/Diploma Empat (D-IV).`,
  },
  {
    id: 'sample-doc-3',
    title: 'Surat Edaran BKN No. 16 Tahun 2023 tentang Tata Cara Kenaikan Pangkat ASN Periodik',
    type: 'Surat Edaran',
    snippet: `SURAT EDARAN BADAN KEPEGAWAIAN NEGARA
NOMOR 16 TAHUN 2023 TENTANG PENYELENGGARAAN PERIODISASI KENAIKAN PANGKAT PNS

A. Latar Belakang:
Untuk meningkatkan efisiensi dan fleksibilitas pelayanan kepegawaian bagi Pegawai Negeri Sipil, terhitung mulai tanggal 1 Januari 2024, periodisasi kenaikan pangkat PNS yang semula dilaksanakan 2 (dua) periode setahun (April dan Oktober), diubah menjadi 6 (enam) periode setiap tahunnya, yaitu pada tanggal 1 Februari, 1 April, 1 Juni, 1 Agustus, 1 Oktober, dan 1 Desember.

B. Maksud dan Tujuan:
Memberikan kemudahan bagi ASN yang telah memenuhi syarat agar tidak perlu menunggu lama untuk mendapatkan penetapan kenaikan pangkat.

C. Ketentuan:
1. Usulan kenaikan pangkat dilakukan secara paperless melalui Sistem Informasi ASN (SIASN).
2. Kenaikan pangkat reguler dan pilihan tetap berpedoman pada ketentuan perundang-undangan yang berlaku.`,
  },
];
