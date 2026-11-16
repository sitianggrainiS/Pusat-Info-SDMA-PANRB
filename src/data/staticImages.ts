/**
 * DAFTAR ASET GAMBAR STATIS PERMANEN PROYEK KOMPAK SDMA
 * ============================================================================
 * Seluruh gambar di dalam folder `public/images/` akan otomatis disalin ke
 * folder `dist/images/` saat proses `npm run build` dijalankan, sehingga
 * memiliki path publik permanen `/images/<nama-file>` yang:
 *  - Tidak hilang setelah refresh halaman,
 *  - Tidak hilang setelah beberapa menit atau sesi berakhir,
 *  - Tetap muncul setelah website dipublikasikan ulang (republish),
 *  - Tidak memerlukan Firebase, database eksternal, atau layanan berbayar.
 *
 * ALUR MENAMBAHKAN GAMBAR PERMANEN BARU TANPA BACKEND / DATABASE:
 * 1. Simpan file gambar baru (.jpg, .jpeg, .png, .webp, atau .svg) ke dalam
 *    folder `public/images/` pada proyek (contoh: `public/images/infografis-baru.jpg`).
 * 2. Daftarkan entri gambar tersebut pada array `PROJECT_STATIC_IMAGES` di bawah
 *    dengan `path: '/images/infografis-baru.jpg'` agar muncul lengkap dengan judul
 *    dan deskripsi pada Galeri Aset Proyek di Dashboard Admin.
 *    (Catatan: Server juga memindai folder `public/images/` secara otomatis melalui
 *    endpoint `/api/static-images` sehingga file baru langsung terdeteksi).
 * 3. Jalankan `npm run build` sebelum mempublikasikan ulang website agar file baru
 *    di dalam `public/images/` ikut terpaketkan ke dalam hasil build `dist/images/`.
 */

export type StaticImageCategory = 'hero' | 'cover' | 'about' | 'logo' | 'general';

export interface ProjectStaticImage {
  id: string;
  name: string;
  path: string;
  badge: string;
  description: string;
  category: StaticImageCategory;
}

export const PROJECT_STATIC_IMAGES: ProjectStaticImage[] = [
  {
    id: 'hero-slide-kedeputian-sdma',
    name: 'Visual Slide 1',
    path: '/assets/aistudio/462411664_513021548204419_9151970918488268348_n__1__223b9cc0.jpg',
    badge: 'Banner Utama',
    description: 'Foto slide beranda Kedeputian SDMA',
    category: 'hero',
  },
  {
    id: 'hero-slide-deputi-sdma',
    name: 'Visual Slide 2',
    path: '/assets/aistudio/Screenshot_2026-10-26_100608_a9ae79d1.png',
    badge: 'Banner Utama',
    description: 'Foto kegiatan Deputi SDM Aparatur Kementerian PANRB',
    category: 'hero',
  },
  {
    id: 'hero-slide-arga-zea',
    name: 'Visual Slide 3',
    path: '/assets/aistudio/Heading__3__00fd1277.png',
    badge: 'Banner Utama',
    description: 'Visual Arga & Zea Sahabat Setia SDM Aparatur',
    category: 'hero',
  },
  {
    id: 'hero-sdm-aparatur',
    name: 'Ilustrasi: SDM Aparatur Transformasi',
    path: '/images/hero_sdm_aparatur_1790755834040.jpg',
    badge: 'Banner Utama',
    description: 'Visual aparatur sipil negara modern dan BerAKHLAK untuk banner beranda & profil',
    category: 'hero',
  },
  {
    id: 'manajemen-talenta',
    name: 'Infografis: Manajemen Talenta & Sistem Merit',
    path: '/images/infographic_manajemen_talenta_1790755861584.jpg',
    badge: 'Slide & Cover',
    description: 'Visual resmi infografis 9-Box Matrix dan percepatan suksesi ASN',
    category: 'cover',
  },
  {
    id: 'pola-karier-pns',
    name: 'Slide: Pola Karier Pegawai Negeri Sipil',
    path: '/images/pola_karier_pns_slide_1791792629283.jpg',
    badge: 'Slide Infografis',
    description: 'Slide ilustrasi jalur pengembangan dan mobilitas karier ASN',
    category: 'hero',
  },
  {
    id: 'jabatan-pelaksana',
    name: 'Cover: Jabatan Pelaksana',
    path: '/images/infographic_jabatan_pelaksana_1790755819303.jpg',
    badge: 'Cover Utama',
    description: 'Cover resmi infografis pengenalan dan klasifikasi Jabatan Pelaksana KemenPANRB',
    category: 'cover',
  },
  {
    id: 'naik-pangkat-jenjang',
    name: 'Cover: Naik Pangkat ≠ Naik Jenjang',
    path: '/images/infographic_naik_pangkat_1790755802597.jpg',
    badge: 'Cover Utama',
    description: 'Cover resmi infografis perbedaan naik pangkat dan naik jenjang Jabatan Fungsional',
    category: 'cover',
  },
  {
    id: 'aset-proyek-dokumentasi-1',
    name: 'Dokumentasi: Kegiatan & Visual Kedeputian SDMA',
    path: '/images/WhatsApp_Image_2026-10-28_at_11.32.35_AM_f1b0cf21.jpeg',
    badge: 'Aset Proyek',
    description: 'Foto dokumentasi statis yang tersimpan permanen di folder aset proyek',
    category: 'about',
  },
  {
    id: 'logo-kompak-sdma',
    name: 'Logo Resmi KOMPAK SDMA (SVG)',
    path: '/images/kompak_logo.svg',
    badge: 'Identitas Brand',
    description: 'Aset vektor ikon dan identitas resmi KOMPAK SDMA',
    category: 'logo',
  },
];

export const DEFAULT_FALLBACK_IMAGE_PATH = '/images/infographic_jabatan_pelaksana_1790755819303.jpg';
export const DEFAULT_HERO_FALLBACK_IMAGE_PATH =
  '/assets/aistudio/462411664_513021548204419_9151970918488268348_n__1__223b9cc0.jpg';

/**
 * Menormalkan path gambar agar tidak pernah menggunakan:
 * - Path lokal development (`/src/assets/images/...` atau `src/assets/images/...`)
 * - URL `blob:` sementara di memori browser
 *
 * Seluruh referensi lama `/src/assets/images/<nama-file>` otomatis dikonversi
 * menjadi path aset statis hasil build `/images/<nama-file>`.
 */
export function normalizeStaticImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Tolak URL blob: yang hanya hidup di memori tab browser saat ini
  if (trimmed.startsWith('blob:')) {
    return '';
  }

  // Konversi otomatis path lokal development lama ke path statis permanen /images/
  const legacyPrefixes = [
    '/src/assets/images/',
    'src/assets/images/',
    './src/assets/images/',
  ];

  for (const prefix of legacyPrefixes) {
    if (trimmed.startsWith(prefix)) {
      const filename = trimmed.slice(prefix.length).split('?')[0].split('#')[0].trim();
      return filename ? `/images/${filename}` : '';
    }
  }

  return trimmed;
}

/**
 * Mengecek apakah referensi gambar merupakan aset statis proyek yang ikut di-build
 * (`/images/...` atau `/assets/...`).
 */
export function isPermanentProjectAssetUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const normalized = normalizeStaticImageUrl(url);
  return normalized.startsWith('/images/') || normalized.startsWith('/assets/');
}

/**
 * Mengecek apakah referensi gambar berasal dari unggahan sementara (data URI browser
 * atau folder runtime `.data/uploads` di lingkungan preview) yang TIDAK ikut terbundel
 * ke dalam kode sumber saat publish ulang.
 */
export function isTemporaryRuntimeUploadUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/api/uploads/') ||
    trimmed.startsWith('blob:')
  );
}

/**
 * Mengompres gambar di sisi klien menjadi Data URL semata-mata untuk pratinjau / sesi
 * lokal browser sementara (BUKAN penyimpanan permanen lintas perangkat).
 * Tidak pernah menggunakan URL.createObjectURL (blob:).
 */
export function readAndCompressLocalPreviewImage(
  file: Blob | File,
  maxDimension = 1200,
  quality = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = typeof e.target?.result === 'string' ? e.target.result : '';
      if (!dataUrl) {
        reject(new Error('Gagal membaca file gambar dari perangkat.'));
        return;
      }

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
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const preferredMime = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
        let compressed = canvas.toDataURL(preferredMime, quality);
        if (preferredMime === 'image/webp' && !compressed.startsWith('data:image/webp')) {
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

export const UPLOAD_LIMITATION_SHORT_NOTICE =
  'Unggahan file langsung dari perangkat hanya tersimpan sementara di browser / server preview saat ini dan akan hilang jika website dipublikasikan ulang. Untuk gambar permanen tanpa Firebase/database, simpan file ke folder public/images/ pada proyek lalu pilih dari Galeri Aset Proyek (/images/...).';
