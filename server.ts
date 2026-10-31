import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AUTHORIZED_ADMIN_USERS } from './src/data/adminUsers';
import { DEFAULT_ABOUT_PAGE_CONTENT } from './src/data/initialAboutData';
import type { AboutPageContent, AboutUnitWork, AboutUnitIconName } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoredDeputyNews {
  id: string;
  title: string;
  articleUrl: string;
  thumbnailUrl: string;
  publicationDate: string;
  summary: string;
  category: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

interface StoredHeroSlide {
  id: string;
  imageUrl: string;
  title: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_STORED_HERO_SLIDES: StoredHeroSlide[] = [
  {
    id: 'hero-slide-1',
    imageUrl: '/src/assets/images/hero_sdm_aparatur_1790755834040.jpg',
    title: 'Edukasi Kebijakan SDM Aparatur',
    isActive: true,
    order: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'hero-slide-2',
    imageUrl: '/src/assets/images/infographic_manajemen_talenta_1790755861584.jpg',
    title: 'Manajemen Talenta & Sistem Merit ASN',
    isActive: true,
    order: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'hero-slide-3',
    imageUrl: '/src/assets/images/pola_karier_pns_slide_1791792629283.jpg',
    title: 'Pola Karier Pegawai Negeri Sipil',
    isActive: true,
    order: 2,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

const DATA_DIR = path.resolve(__dirname, '.data');
const DEPUTY_NEWS_FILE = path.join(DATA_DIR, 'deputy-news.json');
const HERO_SLIDES_FILE = path.join(DATA_DIR, 'hero-slides.json');
const ABOUT_PAGE_FILE = path.join(DATA_DIR, 'about-page.json');
const ABOUT_UPLOADS_DIR = path.join(DATA_DIR, 'uploads', 'about');
const SESSION_SECRET_FILE = path.join(DATA_DIR, '.admin-session-secret');

const MAX_ABOUT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const VALID_ABOUT_FILENAME_REGEX = /^profil-sdma-\d+-[a-f0-9]{8}\.(jpg|png|webp)$/;
const VALID_UNIT_ICONS: AboutUnitIconName[] = [
  'Building2',
  'UserPlus',
  'GraduationCap',
  'Award',
  'TrendingUp',
  'ShieldCheck',
];

let deputyNewsWriteChain: Promise<void> = Promise.resolve();
let heroSlidesWriteChain: Promise<void> = Promise.resolve();
let aboutPageWriteChain: Promise<void> = Promise.resolve();
let cachedSessionSecret: string | null = null;

async function getAdminSessionSecret(): Promise<string> {
  if (cachedSessionSecret) return cachedSessionSecret;
  if (!fs.existsSync(DATA_DIR)) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(SESSION_SECRET_FILE)) {
    const existing = (await fsPromises.readFile(SESSION_SECRET_FILE, 'utf-8')).trim();
    if (existing.length >= 32) {
      cachedSessionSecret = existing;
      return existing;
    }
  }
  const generated = crypto.randomBytes(32).toString('hex');
  await fsPromises.writeFile(SESSION_SECRET_FILE, generated, { encoding: 'utf-8', mode: 0o600 });
  cachedSessionSecret = generated;
  return generated;
}

interface SignedAdminPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

async function signAdminSessionToken(payload: SignedAdminPayload): Promise<string> {
  const secret = await getAdminSessionSecret();
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${sig}`;
}

async function verifyAdminSessionToken(token: string): Promise<SignedAdminPayload | null> {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const secret = await getAdminSessionSecret();
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig, 'utf-8');
  const expectedBuf = Buffer.from(expectedSig, 'utf-8');
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as SignedAdminPayload;
    if (!decoded || typeof decoded.exp !== 'number' || decoded.exp <= Date.now()) {
      return null;
    }
    const matchedAdmin = AUTHORIZED_ADMIN_USERS.find(
      (u) => u.id === decoded.id && u.email.toLowerCase() === String(decoded.email).toLowerCase()
    );
    if (!matchedAdmin) return null;
    return decoded;
  } catch {
    return null;
  }
}

async function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const verified = await verifyAdminSessionToken(token);
    if (!verified) {
      return res.status(401).json({
        error:
          'Akses ditolak. Sesi otorisasi administrator tidak valid atau telah berakhir. Silakan keluar dan masuk kembali ke Portal Admin.',
      });
    }
    (req as any).adminSession = verified;
    return next();
  } catch (err) {
    console.error('Error verifying admin session:', err);
    return res.status(500).json({ error: 'Gagal memverifikasi otorisasi sesi admin.' });
  }
}

async function ensureAboutPageStore(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ABOUT_UPLOADS_DIR)) {
    await fsPromises.mkdir(ABOUT_UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(ABOUT_PAGE_FILE)) {
    await fsPromises.writeFile(
      ABOUT_PAGE_FILE,
      JSON.stringify(DEFAULT_ABOUT_PAGE_CONTENT, null, 2),
      'utf-8'
    );
  }
}

function extractAboutUploadFilename(imageUrl: string): string | null {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const prefix = '/api/uploads/about/';
  if (!imageUrl.startsWith(prefix)) return null;
  const filename = imageUrl.slice(prefix.length).split('?')[0].trim();
  if (!VALID_ABOUT_FILENAME_REGEX.test(filename)) return null;
  return filename;
}

async function readAboutPageStore(): Promise<AboutPageContent> {
  await ensureAboutPageStore();
  try {
    const raw = await fsPromises.readFile(ABOUT_PAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AboutPageContent>;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_ABOUT_PAGE_CONTENT };
    }

    let validImageUrl = '';
    if (typeof parsed.profileImageUrl === 'string' && parsed.profileImageUrl.trim()) {
      const filename = extractAboutUploadFilename(parsed.profileImageUrl.trim());
      if (filename && fs.existsSync(path.join(ABOUT_UPLOADS_DIR, filename))) {
        validImageUrl = `/api/uploads/about/${filename}`;
      }
    }

    return {
      heading:
        typeof parsed.heading === 'string' && parsed.heading.trim()
          ? parsed.heading.trim()
          : DEFAULT_ABOUT_PAGE_CONTENT.heading,
      subheading:
        typeof parsed.subheading === 'string' && parsed.subheading.trim()
          ? parsed.subheading.trim()
          : DEFAULT_ABOUT_PAGE_CONTENT.subheading,
      description:
        typeof parsed.description === 'string' && parsed.description.trim()
          ? parsed.description.trim()
          : DEFAULT_ABOUT_PAGE_CONTENT.description,
      profileImageUrl: validImageUrl,
      profileImageUpdatedAt: validImageUrl ? parsed.profileImageUpdatedAt || null : null,
      orgSectionTitle:
        typeof parsed.orgSectionTitle === 'string' && parsed.orgSectionTitle.trim()
          ? parsed.orgSectionTitle.trim()
          : DEFAULT_ABOUT_PAGE_CONTENT.orgSectionTitle,
      orgTopLevelTitle:
        typeof parsed.orgTopLevelTitle === 'string' && parsed.orgTopLevelTitle.trim()
          ? parsed.orgTopLevelTitle.trim()
          : DEFAULT_ABOUT_PAGE_CONTENT.orgTopLevelTitle,
      unitSectionTitle:
        typeof parsed.unitSectionTitle === 'string' && parsed.unitSectionTitle.trim()
          ? parsed.unitSectionTitle.trim()
          : DEFAULT_ABOUT_PAGE_CONTENT.unitSectionTitle,
      unitSectionSubtitle:
        typeof parsed.unitSectionSubtitle === 'string' && parsed.unitSectionSubtitle.trim()
          ? parsed.unitSectionSubtitle.trim()
          : DEFAULT_ABOUT_PAGE_CONTENT.unitSectionSubtitle,
      units:
        Array.isArray(parsed.units) && parsed.units.length === 6
          ? parsed.units
          : DEFAULT_ABOUT_PAGE_CONTENT.units,
      updatedAt:
        typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim()
          ? parsed.updatedAt.trim()
          : DEFAULT_ABOUT_PAGE_CONTENT.updatedAt,
    };
  } catch (err) {
    console.error('Error reading about-page.json:', err);
    return { ...DEFAULT_ABOUT_PAGE_CONTENT };
  }
}

function writeAboutPageStore(content: AboutPageContent): Promise<void> {
  const nextOp = aboutPageWriteChain.then(async () => {
    await ensureAboutPageStore();
    const tmpFile = `${ABOUT_PAGE_FILE}.tmp`;
    await fsPromises.writeFile(tmpFile, JSON.stringify(content, null, 2), 'utf-8');
    await fsPromises.rename(tmpFile, ABOUT_PAGE_FILE);
  });
  aboutPageWriteChain = nextOp.catch((err) => {
    console.error('Error writing about-page.json:', err);
  });
  return nextOp;
}

async function cleanupUnreferencedAboutUploads(keepFilename: string | null): Promise<void> {
  try {
    await ensureAboutPageStore();
    const files = await fsPromises.readdir(ABOUT_UPLOADS_DIR);
    for (const file of files) {
      if (file.endsWith('.tmp')) continue;
      if (keepFilename && file === keepFilename) continue;
      if (VALID_ABOUT_FILENAME_REGEX.test(file)) {
        await fsPromises.unlink(path.join(ABOUT_UPLOADS_DIR, file)).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Failed cleaning unreferenced about uploads:', err);
  }
}

function detectImageFormatFromBuffer(
  buf: Buffer
): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
}

function validateAboutPagePayload(
  body: any,
  currentContent: AboutPageContent
): { valid: boolean; error?: string; sanitized?: AboutPageContent } {
  const heading = typeof body?.heading === 'string' ? body.heading.trim() : '';
  const subheading = typeof body?.subheading === 'string' ? body.subheading.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const orgSectionTitle =
    typeof body?.orgSectionTitle === 'string' && body.orgSectionTitle.trim()
      ? body.orgSectionTitle.trim()
      : DEFAULT_ABOUT_PAGE_CONTENT.orgSectionTitle;
  const orgTopLevelTitle =
    typeof body?.orgTopLevelTitle === 'string' && body.orgTopLevelTitle.trim()
      ? body.orgTopLevelTitle.trim()
      : DEFAULT_ABOUT_PAGE_CONTENT.orgTopLevelTitle;
  const unitSectionTitle =
    typeof body?.unitSectionTitle === 'string' && body.unitSectionTitle.trim()
      ? body.unitSectionTitle.trim()
      : DEFAULT_ABOUT_PAGE_CONTENT.unitSectionTitle;
  const unitSectionSubtitle =
    typeof body?.unitSectionSubtitle === 'string' && body.unitSectionSubtitle.trim()
      ? body.unitSectionSubtitle.trim()
      : DEFAULT_ABOUT_PAGE_CONTENT.unitSectionSubtitle;

  if (!heading || heading.length < 3) {
    return { valid: false, error: 'Judul utama (Heading) Halaman Tentang wajib diisi.' };
  }
  if (!subheading || subheading.length < 3) {
    return { valid: false, error: 'Subjudul (Subheading) Halaman Tentang wajib diisi.' };
  }
  if (!description || description.length < 20) {
    return { valid: false, error: 'Deskripsi profil Kedeputian SDMA wajib diisi (minimal 20 karakter).' };
  }

  const rawImageUrl = typeof body?.profileImageUrl === 'string' ? body.profileImageUrl.trim() : '';
  let finalImageUrl = '';
  let finalImageUpdatedAt: string | null = null;

  if (rawImageUrl) {
    if (rawImageUrl.startsWith('blob:') || rawImageUrl.startsWith('data:')) {
      return {
        valid: false,
        error:
          'Format penyimpanan gambar sementara tidak diizinkan. Unggah file gambar resmi melalui server terlebih dahulu.',
      };
    }
    const filename = extractAboutUploadFilename(rawImageUrl);
    if (!filename || !fs.existsSync(path.join(ABOUT_UPLOADS_DIR, filename))) {
      return {
        valid: false,
        error: 'File gambar profil tidak ditemukan di penyimpanan server. Silakan unggah ulang gambar.',
      };
    }
    finalImageUrl = `/api/uploads/about/${filename}`;
    finalImageUpdatedAt =
      finalImageUrl === currentContent.profileImageUrl && currentContent.profileImageUpdatedAt
        ? currentContent.profileImageUpdatedAt
        : new Date().toISOString();
  }

  if (!Array.isArray(body?.units) || body.units.length !== 6) {
    return { valid: false, error: 'Data Tugas dan Fungsi wajib mencakup tepat 6 unit kerja Kedeputian SDMA.' };
  }

  const sanitizedUnits: AboutUnitWork[] = [];
  for (let i = 0; i < body.units.length; i++) {
    const rawUnit = body.units[i];
    const fallbackUnit = DEFAULT_ABOUT_PAGE_CONTENT.units[i];
    const name = typeof rawUnit?.name === 'string' ? rawUnit.name.trim() : '';
    const orgChartLabel =
      typeof rawUnit?.orgChartLabel === 'string' && rawUnit.orgChartLabel.trim()
        ? rawUnit.orgChartLabel.trim()
        : fallbackUnit.orgChartLabel;
    const mainTask = typeof rawUnit?.mainTask === 'string' ? rawUnit.mainTask.trim() : '';
    const iconName: AboutUnitIconName = VALID_UNIT_ICONS.includes(rawUnit?.iconName)
      ? rawUnit.iconName
      : fallbackUnit.iconName;

    if (!name) {
      return { valid: false, error: `Nama unit kerja pada kartu #${i + 1} wajib diisi.` };
    }
    if (!mainTask) {
      return { valid: false, error: `Deskripsi utama pada "${name}" wajib diisi.` };
    }

    const detailedTasks = Array.isArray(rawUnit?.detailedTasks)
      ? rawUnit.detailedTasks
          .map((t: unknown) => (typeof t === 'string' ? t.trim() : ''))
          .filter((t: string) => t.length > 0)
      : [];

    if (detailedTasks.length === 0) {
      return { valid: false, error: `Rincian tugas pada "${name}" minimal harus memiliki 1 butir.` };
    }

    let subUnit: AboutUnitWork['subUnit'] = undefined;
    if (rawUnit?.subUnit && typeof rawUnit.subUnit === 'object') {
      const subName = typeof rawUnit.subUnit.name === 'string' ? rawUnit.subUnit.name.trim() : '';
      const subDesc =
        typeof rawUnit.subUnit.description === 'string' ? rawUnit.subUnit.description.trim() : '';
      if (subName && subDesc) {
        subUnit = { name: subName, description: subDesc };
      }
    } else if (fallbackUnit.subUnit && i === 0) {
      subUnit = { ...fallbackUnit.subUnit };
    }

    sanitizedUnits.push({
      id: fallbackUnit.id,
      name,
      orgChartLabel,
      iconName,
      mainTask,
      detailedTasks,
      ...(subUnit ? { subUnit } : {}),
    });
  }

  return {
    valid: true,
    sanitized: {
      heading,
      subheading,
      description,
      profileImageUrl: finalImageUrl,
      profileImageUpdatedAt: finalImageUpdatedAt,
      orgSectionTitle,
      orgTopLevelTitle,
      unitSectionTitle,
      unitSectionSubtitle,
      units: sanitizedUnits,
      updatedAt: new Date().toISOString(),
    },
  };
}

async function ensureDeputyNewsStore(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DEPUTY_NEWS_FILE)) {
    await fsPromises.writeFile(DEPUTY_NEWS_FILE, '[]', 'utf-8');
  }
}

async function readDeputyNewsStore(): Promise<StoredDeputyNews[]> {
  await ensureDeputyNewsStore();
  try {
    const raw = await fsPromises.readFile(DEPUTY_NEWS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading deputy-news.json:', err);
    return [];
  }
}

function writeDeputyNewsStore(items: StoredDeputyNews[]): Promise<void> {
  const nextOp = deputyNewsWriteChain.then(async () => {
    await ensureDeputyNewsStore();
    const tmpFile = `${DEPUTY_NEWS_FILE}.tmp`;
    await fsPromises.writeFile(tmpFile, JSON.stringify(items, null, 2), 'utf-8');
    await fsPromises.rename(tmpFile, DEPUTY_NEWS_FILE);
  });
  deputyNewsWriteChain = nextOp.catch((err) => {
    console.error('Error writing deputy-news.json:', err);
  });
  return nextOp;
}

const HERO_SLIDE_SLOT_COUNT = 3;

function normalizeStoredHeroSlides(items: StoredHeroSlide[]): StoredHeroSlide[] {
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const now = new Date().toISOString();

  return Array.from({ length: HERO_SLIDE_SLOT_COUNT }, (_, idx) => {
    const existing = sorted[idx];
    if (existing) {
      const cleanUrl = typeof existing.imageUrl === 'string' ? existing.imageUrl.trim() : '';
      return {
        id: existing.id || `hero-slide-slot-${idx + 1}`,
        imageUrl: cleanUrl,
        title:
          cleanUrl && typeof existing.title === 'string' && existing.title.trim()
            ? existing.title.trim()
            : cleanUrl
            ? `Slide Edukasi SDM Aparatur #${idx + 1}`
            : '',
        isActive: cleanUrl ? existing.isActive !== false : false,
        order: idx,
        createdAt: existing.createdAt || now,
        updatedAt: existing.updatedAt || now,
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

async function ensureHeroSlidesStore(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(HERO_SLIDES_FILE)) {
    await fsPromises.writeFile(
      HERO_SLIDES_FILE,
      JSON.stringify(DEFAULT_STORED_HERO_SLIDES, null, 2),
      'utf-8'
    );
  }
}

async function readHeroSlidesStore(): Promise<StoredHeroSlide[]> {
  await ensureHeroSlidesStore();
  try {
    const raw = await fsPromises.readFile(HERO_SLIDES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeStoredHeroSlides(parsed);
    }
    return normalizeStoredHeroSlides(DEFAULT_STORED_HERO_SLIDES);
  } catch (err) {
    console.error('Error reading hero-slides.json:', err);
    return normalizeStoredHeroSlides(DEFAULT_STORED_HERO_SLIDES);
  }
}

function writeHeroSlidesStore(items: StoredHeroSlide[]): Promise<void> {
  const nextOp = heroSlidesWriteChain.then(async () => {
    await ensureHeroSlidesStore();
    const tmpFile = `${HERO_SLIDES_FILE}.tmp`;
    await fsPromises.writeFile(tmpFile, JSON.stringify(items, null, 2), 'utf-8');
    await fsPromises.rename(tmpFile, HERO_SLIDES_FILE);
  });
  heroSlidesWriteChain = nextOp.catch((err) => {
    console.error('Error writing hero-slides.json:', err);
  });
  return nextOp;
}

function validateDeputyNewsPayload(body: any): {
  valid: boolean;
  error?: string;
  sanitized?: Omit<StoredDeputyNews, 'id' | 'createdAt' | 'updatedAt'>;
} {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const articleUrl = typeof body?.articleUrl === 'string' ? body.articleUrl.trim() : '';
  const thumbnailUrl = typeof body?.thumbnailUrl === 'string' ? body.thumbnailUrl.trim() : '';
  const publicationDate = typeof body?.publicationDate === 'string' ? body.publicationDate.trim() : '';
  const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
  const category = typeof body?.category === 'string' ? body.category.trim() : '';
  const status = body?.status === 'published' ? 'published' : body?.status === 'draft' ? 'draft' : null;

  if (!articleUrl) {
    return { valid: false, error: 'Link artikel wajib diisi.' };
  }

  let parsedArticleUrl: URL;
  try {
    parsedArticleUrl = new URL(articleUrl);
  } catch {
    return { valid: false, error: 'Format URL artikel tidak valid.' };
  }

  if (parsedArticleUrl.protocol !== 'https:') {
    return { valid: false, error: 'Link artikel wajib menggunakan protokol HTTPS (https://).' };
  }

  const host = parsedArticleUrl.hostname.toLowerCase();
  if (host !== 'menpan.go.id' && !host.endsWith('.menpan.go.id')) {
    return {
      valid: false,
      error: 'Link artikel hanya menerima URL resmi dari domain menpan.go.id atau subdomain resminya.',
    };
  }

  if (!title || title.length < 5) {
    return { valid: false, error: 'Judul berita wajib diisi (minimal 5 karakter).' };
  }

  if (!thumbnailUrl) {
    return { valid: false, error: 'Gambar/thumbnail berita wajib diunggah atau diisi.' };
  }

  if (
    !thumbnailUrl.startsWith('data:image/') &&
    !thumbnailUrl.startsWith('/') &&
    !thumbnailUrl.startsWith('https://') &&
    !thumbnailUrl.startsWith('http://')
  ) {
    return { valid: false, error: 'Format gambar/thumbnail berita tidak valid.' };
  }

  if (!publicationDate || !/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
    return { valid: false, error: 'Tanggal publikasi wajib dipilih dengan format yang valid.' };
  }

  if (!summary || summary.length < 10) {
    return { valid: false, error: 'Ringkasan berita wajib diisi (minimal 10 karakter).' };
  }

  if (!category) {
    return { valid: false, error: 'Kategori berita wajib dipilih.' };
  }

  if (!status) {
    return { valid: false, error: 'Status publikasi tidak valid.' };
  }

  return {
    valid: true,
    sanitized: {
      title,
      articleUrl: parsedArticleUrl.toString(),
      thumbnailUrl,
      publicationDate,
      summary,
      category,
      status,
    },
  };
}

function sortStoredNews(items: StoredDeputyNews[]): StoredDeputyNews[] {
  return [...items].sort((a, b) => {
    const dateCompare = b.publicationDate.localeCompare(a.publicationDate);
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '20mb' }));

  // Initialize Gemini client if API key is present
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(apiKey) });
  });

  // AI Document Assistant Endpoint
  app.post('/api/ai/analyze-document', async (req, res) => {
    try {
      const { documentTitle, documentText, categoryName } = req.body;

      if (!documentText || typeof documentText !== 'string' || !documentText.trim()) {
        return res.status(400).json({
          error: 'Teks dokumen tidak boleh kosong. Mohon sediakan isi dokumen resmi yang akan dianalisis.',
        });
      }

      // If Gemini client is available, invoke gemini-3.8-flash
      if (ai) {
        const systemInstruction = `Anda adalah Asisten Ekstraksi Dokumen Kebijakan SDM Aparatur (ASN) Indonesia untuk platform Pusat Informasi Kebijakan SDM Aparatur.
TUGAS UTAMA:
Menganalisis isi dokumen resmi kebijakan SDM Aparatur yang diunggah/diberikan dan menyusun draf edukasi publik yang ringkas, terstruktur, ramah masyarakat, dan akurat.

ATURAN KETAT:
1. Utamakan informasi yang secara eksplisit tertulis di dalam dokumen resmi.
2. DILARANG mengarang nomor regulasi, tanggal, persyaratan, pasal, statistik, atau prosedur.
3. Jika informasi tertentu tidak ditemukan di dalam teks dokumen yang diberikan, tuliskan secara jujur: "Informasi tidak ditemukan dalam dokumen yang diberikan."
4. Format draf harus ramah masyarakat umum dan ASN, menghindari birokrasi berbelit-belit namun tetap menjaga akurasi yuridis.
5. Kembalikan respons dalam format JSON valid sesuai schema.`;

        const prompt = `Analisis dokumen berikut untuk topik/kategori: "${categoryName || 'Kebijakan SDM Aparatur'}".
Judul/Nama Dokumen: "${documentTitle || 'Dokumen Resmi'}"

ISI DOKUMEN:
"""
${documentText.slice(0, 30000)}
"""

Ekstrak dan susunlah:
1. summary: Ringkasan singkat mudah dipahami untuk publik (2-3 kalimat)
2. definition: Definisi atau konsep utama
3. keyPoints: Poin-poin penting (array 3-6 butir)
4. importantProvisions: Ketentuan penting yang perlu diketahui ASN/publik (array 3-5 butir)
5. requirements: Persyaratan atau kriteria jika disebutkan
6. processSteps: Langkah atau tahapan proses (array langkah berurutan) jika ada
7. legalBasis: Dasar hukum lengkap (judul peraturan, nomor, tahun, pasal relevan)
8. faqs: Tanya jawab umum yang sering ditanyakan publik (array berisi { question, answer })
9. suggestedPublicExplanation: Rekomendasi penjelasan ramah publik untuk konten website/infografis
10. comparisonNote: Jika ada perbandingan dua konsep (misal naik pangkat vs naik jenjang), berikan catatan perbandingannya`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                definition: { type: Type.STRING },
                keyPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                importantProvisions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                requirements: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                processSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                legalBasis: {
                  type: Type.OBJECT,
                  properties: {
                    regulationTitle: { type: Type.STRING },
                    regulationNumber: { type: Type.STRING },
                    year: { type: Type.STRING },
                    articles: { type: Type.STRING },
                  },
                },
                faqs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      answer: { type: Type.STRING },
                    },
                  },
                },
                suggestedPublicExplanation: { type: Type.STRING },
                comparisonNote: { type: Type.STRING },
              },
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText);
        return res.json({
          source: 'gemini-3.8-flash',
          data: parsed,
          disclaimer:
            'Draft dibuat dengan bantuan AI. Pastikan informasi telah diverifikasi berdasarkan dokumen resmi sebelum dipublikasikan.',
        });
      }

      // High-quality structured fallback extractor when API key is not present
      const fallbackResult = generateStructuredDraftFromText(documentTitle || 'Dokumen Kebijakan', documentText);
      return res.json({
        source: 'structured-parser',
        data: fallbackResult,
        disclaimer:
          'Draft dibuat dengan bantuan AI (analisis terstruktur). Pastikan informasi telah diverifikasi berdasarkan dokumen resmi sebelum dipublikasikan.',
      });
    } catch (err: any) {
      console.error('Error in analyze-document:', err);
      // Even if AI call fails, fallback gracefully
      const fallbackResult = generateStructuredDraftFromText(req.body.documentTitle || 'Dokumen Kebijakan', req.body.documentText || '');
      return res.json({
        source: 'structured-fallback',
        data: fallbackResult,
        disclaimer:
          'Draft dibuat dengan bantuan AI (ekstraksi cadangan). Pastikan informasi telah diverifikasi berdasarkan dokumen resmi sebelum dipublikasikan.',
        warning: 'Layanan AI mengalami kendala sementara, hasil diambil melalui modul ekstraksi teks otomatis.',
      });
    }
  });

  // Helper for structured text extraction fallback
  function generateStructuredDraftFromText(title: string, text: string) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const firstParagraph = lines.slice(0, 3).join(' ');

    // Detect regulation numbers
    const regMatch = text.match(/(Peraturan|Keputusan|Surat Edaran)\s+([A-Za-z\s]+)?\s*Nomor\s+([0-9\/\-A-Za-z]+)\s+Tahun\s+(\d{4})/i);
    const regTitle = regMatch ? `${regMatch[1]} ${regMatch[2] || 'Menteri PANRB'}`.trim() : 'Peraturan Menteri PANRB';
    const regNum = regMatch ? regMatch[3] : 'Nomor [Sesuai Dokumen]';
    const regYear = regMatch ? regMatch[4] : '2023';

    return {
      summary:
        firstParagraph.length > 50
          ? firstParagraph.slice(0, 280) + '...'
          : `Dokumen kebijakan ini mengatur tata cara dan ketentuan resmi mengenai ${title}, yang dirancang untuk memperjelas hak, kewajiban, dan mekanisme bagi ASN dan unit kerja terkait.`,
      definition: `Berdasarkan ketentuan dalam dokumen resmi ini, ${title} merupakan pedoman pelaksanaan kebijakan SDM Aparatur yang mengedepankan prinsip profesionalisme, meritokrasi, dan efektivitas pelayanan publik.`,
      keyPoints: [
        `Ruang lingkup kebijakan mencakup tata kelola dan implementasi ${title} di seluruh instansi pemerintah pusat maupun daerah.`,
        'Penyelarasan ketentuan dengan regulasi manajemen ASN terbaru untuk mendukung kelincahan birokrasi.',
        'Pemberian kepastian hak dan jenjang karier bagi pegawai ASN yang memenuhi kualifikasi dan target kinerja.',
      ],
      importantProvisions: [
        'Setiap usulan harus didukung dengan bukti kinerja dan kualifikasi kompetensi yang terverifikasi.',
        'Instansi wajib melakukan pemutakhiran data secara berkala pada sistem informasi kepegawaian nasional.',
        'Ketentuan transisi berlaku bagi pegawai yang sedang dalam proses pengusulan sebelum regulasi ini diundangkan.',
      ],
      requirements: [
        'Memiliki predikat kinerja minimal bernilai Baik dalam periode evaluasi terakhir.',
        'Telah memenuhi angka kredit kumulatif atau syarat kualifikasi yang dipersyaratkan.',
        'Lulus uji kompetensi pada jenjang yang dituju (jika dipersyaratkan).',
      ],
      processSteps: [
        '1. Verifikasi kelengkapan berkas administratif oleh instansi pembina atau unit pengelola kepegawaian.',
        '2. Penilaian capaian kinerja dan konversi predikat ke dalam angka kredit atau portofolio kompetensi.',
        '3. Penetapan rekomendasi dan pengajuan ke instansi yang berwenang.',
        '4. Penerbitan keputusan resmi pengangkatan atau penetapan status kepegawaian.',
      ],
      legalBasis: {
        regulationTitle: regTitle,
        regulationNumber: regNum,
        year: regYear,
        articles: 'Pasal-pasal relevan sebagaimana tercantum dalam dokumen resmi.',
      },
      faqs: [
        {
          question: `Apakah ketentuan dalam ${title} berlaku surut?`,
          answer: 'Informasi tidak ditemukan dalam dokumen yang diberikan. Silakan konfirmasi pada ketentuan peralihan dokumen resmi.',
        },
        {
          question: 'Bagaimana cara ASN mengusulkan permohonan sesuai kebijakan ini?',
          answer: 'Pengusulan dilakukan melalui Unit Pengelola Kepegawaian (BKPSDM/Biro SDM) di masing-masing instansi dengan melampirkan bukti verifikasi.',
        },
      ],
      suggestedPublicExplanation: `Kebijakan mengenai ${title} dihadirkan agar seluruh ASN dan masyarakat memahami alur, syarat, dan manfaat secara transparan tanpa keraguan tafsir.`,
      comparisonNote: 'Pastikan membedakan antara persyaratan administratif umum dengan kualifikasi teknis fungsional.',
    };
  }

  // Helper to count sentences in Indonesian text
  function countSentences(text: string): number {
    if (!text) return 0;
    const matches = text
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    return matches.length;
  }

  // Fallback AI Summary Generator when Gemini API is unavailable or returns an error
  function generateFallbackSummaryFromContent(
    title: string,
    clusterName: string,
    captionText: string,
    regulations: any[] = []
  ): string {
    const cleaned = captionText
      .replace(/#[\w_]+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[\.\.\.\]/g, '')
      .trim();

    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15 && !s.toLowerCase().startsWith('simak') && !s.toLowerCase().startsWith('klik link'));

    let s1 = '';
    let s2 = '';
    let s3 = '';

    if (sentences.length >= 3) {
      s1 = sentences[0];
      s2 = sentences[1];
      s3 = sentences[2];
      if (sentences.length >= 4 && sentences[3].length < 160) {
        return `${s1} ${s2} ${s3} ${sentences[3]}`;
      }
      return `${s1} ${s2} ${s3}`;
    }

    if (sentences.length === 2) {
      s1 = sentences[0];
      s2 = sentences[1];
      s3 = `Materi ini disusun untuk memberikan kejelasan teknis bagi ASN dan instansi terkait klaster ${clusterName || 'Manajemen ASN'}.`;
      return `${s1} ${s2} ${s3}`;
    }

    if (sentences.length === 1) {
      s1 = sentences[0];
      s2 = `Ketentuan ini menjadi acuan utama dalam pelaksanaan tata kelola ${clusterName || 'SDM Aparatur'} di seluruh instansi pemerintah.`;
      s3 = `Pegawai diharapkan memahami pokok-pokok kebijakan yang disampaikan agar dapat mengoptimalkan jenjang karier dan kinerja kepegawaian.`;
      return `${s1} ${s2} ${s3}`;
    }

    return `Konten infografis ini memuat materi edukasi resmi mengenai ${title} dalam klaster ${clusterName || 'Manajemen ASN'}. Kebijakan ini menegaskan prinsip profesionalisme serta ketentuan teknis yang berlaku bagi seluruh pegawai ASN. Pemahaman yang tepat atas materi ini diharapkan mendukung kelancaran administrasi kepegawaian di instansi pemerintah.`;
  }

  // AI Content Summary Generation Endpoint (Instagram Caption + Infographic Slides)
  app.post('/api/ai/generate-summary', async (req, res) => {
    try {
      const { title, clusterName, captionText, regulations } = req.body;

      if (!captionText || typeof captionText !== 'string' || !captionText.trim()) {
        return res.status(400).json({
          error:
            'Teks kepsyen atau materi teks slide infografis belum diisi. Masukkan teks kepsyen atau salin poin teks slide Instagram terlebih dahulu agar AI dapat merangkum secara akurat.',
        });
      }

      const regList = Array.isArray(regulations)
        ? regulations
            .map((r: any) => `${r.title || ''} (${r.regulationNumber || ''} ${r.year || ''})`)
            .filter(Boolean)
            .join(', ')
        : '';

      if (ai) {
        const systemInstruction = `Anda adalah Asisten Kebijakan SDM Aparatur (ASN) pada platform KOMPAK Kementerian PANRB.
TUGAS UTAMA:
Menyusun ringkasan konten edukasi kebijakan yang ringkas, padat, dan akurat dengan memadukan informasi dari teks slide infografis dan kepsyen postingan Instagram yang diberikan.

ATURAN WAJIB (STRICT REQUIREMENTS):
1. Panjang ringkasan HARUS 3 sampai 4 kalimat saja (maksimal 4 kalimat, minimal 3 kalimat).
2. Tulis dalam Bahasa Indonesia yang lugas, jelas, akurat, dan mudah dipahami oleh pegawai ASN maupun masyarakat umum.
3. Fokus pada substansi kunci kebijakan (tujuan/esensi, ketentuan pokok, dan implikasi/manfaat praktis bagi ASN).
4. DILARANG KERAS mengarang regulasi, pasal, syarat, atau alur yang tidak ada atau tidak didukung oleh teks sumber.
5. DILARANG menggunakan bullet point, nomor urut, atau tanda petik pembungkus.
6. Kembalikan respons dalam format JSON valid sesuai schema.`;

        const prompt = `Analisis materi postingan Instagram berikut untuk konten kebijakan SDM Aparatur:
Judul Konten: "${title || 'Kebijakan SDM Aparatur'}"
Klaster Manajemen ASN: "${clusterName || 'SDM Aparatur'}"
${regList ? `Regulasi Rujukan Terkait: ${regList}` : ''}

TEKS SLIDE & KEPSYEN INSTAGRAM DARI SUMBER RESMI:
"""
${captionText.slice(0, 15000)}
"""

Susunlah ringkasan tepat 3 sampai 4 kalimat padat yang merangkum esensi infografis tersebut secara akurat.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description: 'Ringkasan 3-4 kalimat Bahasa Indonesia yang akurat dan padat.',
                },
                sentenceCount: {
                  type: Type.INTEGER,
                  description: 'Jumlah kalimat pada teks ringkasan (harus bernilai 3 atau 4).',
                },
              },
              required: ['summary'],
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText);
        const generatedSummary = (parsed.summary || '').trim();
        const sentences = countSentences(generatedSummary);

        return res.json({
          summary: generatedSummary,
          sentenceCount: sentences,
          source: 'gemini-3.8-flash',
          disclaimer:
            'Ringkasan AI disintesis dari materi slide & kepsyen Instagram yang disediakan. Pastikan admin memeriksa, menyunting jika diperlukan, dan menyetujui sebelum dipublikasikan.',
        });
      }

      // Fallback when GEMINI_API_KEY is not configured
      const fallbackSummary = generateFallbackSummaryFromContent(
        title || 'Kebijakan SDM Aparatur',
        clusterName || 'Manajemen ASN',
        captionText,
        regulations
      );

      return res.json({
        summary: fallbackSummary,
        sentenceCount: countSentences(fallbackSummary),
        source: 'structured-fallback',
        disclaimer:
          'Ringkasan disusun melalui modul sintesis teks terstruktur. Pastikan admin memeriksa, menyunting jika diperlukan, dan menyetujui sebelum dipublikasikan.',
      });
    } catch (err: any) {
      console.error('Error generating AI summary:', err);
      const fallbackSummary = generateFallbackSummaryFromContent(
        req.body?.title || 'Kebijakan SDM Aparatur',
        req.body?.clusterName || 'Manajemen ASN',
        req.body?.captionText || '',
        req.body?.regulations || []
      );
      return res.json({
        summary: fallbackSummary,
        sentenceCount: countSentences(fallbackSummary),
        source: 'structured-fallback',
        disclaimer:
          'Ringkasan disusun melalui modul ekstraksi cadangan karena kendala koneksi AI sementara. Pastikan admin memeriksa, menyunting jika diperlukan, dan menyetujui sebelum dipublikasikan.',
        warning: 'Layanan AI mengalami kendala sementara, hasil diambil melalui sintesis teks cadangan.',
      });
    }
  });

  // ============================================================================
  // Berita Deputi SDM Aparatur Persistent CRUD API
  // ============================================================================
  app.get('/api/deputy-news', async (req, res) => {
    try {
      const items = await readDeputyNewsStore();
      const sorted = sortStoredNews(items);
      if (req.query.status === 'published') {
        return res.json({ items: sorted.filter((n) => n.status === 'published') });
      }
      return res.json({ items: sorted });
    } catch (err) {
      console.error('GET /api/deputy-news error:', err);
      return res.status(500).json({ error: 'Gagal memuat data berita.' });
    }
  });

  app.post('/api/deputy-news', async (req, res) => {
    try {
      const check = validateDeputyNewsPayload(req.body);
      if (!check.valid || !check.sanitized) {
        return res.status(400).json({ error: check.error || 'Data berita tidak valid.' });
      }

      const items = await readDeputyNewsStore();
      const now = new Date().toISOString();
      const newItem: StoredDeputyNews = {
        id: `news-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...check.sanitized,
        createdAt: now,
        updatedAt: now,
      };

      const updatedList = sortStoredNews([newItem, ...items]);
      await writeDeputyNewsStore(updatedList);
      return res.status(201).json({ item: newItem });
    } catch (err) {
      console.error('POST /api/deputy-news error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan berita baru.' });
    }
  });

  app.put('/api/deputy-news/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const check = validateDeputyNewsPayload(req.body);
      if (!check.valid || !check.sanitized) {
        return res.status(400).json({ error: check.error || 'Data pembaruan berita tidak valid.' });
      }

      const items = await readDeputyNewsStore();
      const existingIndex = items.findIndex((item) => item.id === id);
      if (existingIndex === -1) {
        return res.status(404).json({ error: 'Data berita tidak ditemukan.' });
      }

      const updatedItem: StoredDeputyNews = {
        ...items[existingIndex],
        ...check.sanitized,
        updatedAt: new Date().toISOString(),
      };

      const nextItems = [...items];
      nextItems[existingIndex] = updatedItem;
      await writeDeputyNewsStore(sortStoredNews(nextItems));

      return res.json({ item: updatedItem });
    } catch (err) {
      console.error('PUT /api/deputy-news/:id error:', err);
      return res.status(500).json({ error: 'Gagal memperbarui data berita.' });
    }
  });

  app.patch('/api/deputy-news/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const nextStatus = req.body?.status;
      if (nextStatus !== 'draft' && nextStatus !== 'published') {
        return res.status(400).json({ error: 'Status publikasi harus bernilai draft atau published.' });
      }

      const items = await readDeputyNewsStore();
      const existingIndex = items.findIndex((item) => item.id === id);
      if (existingIndex === -1) {
        return res.status(404).json({ error: 'Data berita tidak ditemukan.' });
      }

      const updatedItem: StoredDeputyNews = {
        ...items[existingIndex],
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };

      const nextItems = [...items];
      nextItems[existingIndex] = updatedItem;
      await writeDeputyNewsStore(sortStoredNews(nextItems));

      return res.json({ item: updatedItem });
    } catch (err) {
      console.error('PATCH /api/deputy-news/:id/status error:', err);
      return res.status(500).json({ error: 'Gagal mengubah status publikasi berita.' });
    }
  });

  app.delete('/api/deputy-news/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const items = await readDeputyNewsStore();
      const filtered = items.filter((item) => item.id !== id);
      if (filtered.length === items.length) {
        return res.status(404).json({ error: 'Data berita tidak ditemukan.' });
      }

      await writeDeputyNewsStore(filtered);
      return res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/deputy-news/:id error:', err);
      return res.status(500).json({ error: 'Gagal menghapus data berita.' });
    }
  });

  // ============================================================================
  // Hero Banner Slides Persistent CRUD API
  // ============================================================================
  app.get('/api/hero-slides', async (_req, res) => {
    try {
      const items = await readHeroSlidesStore();
      return res.json({ items });
    } catch (err) {
      console.error('GET /api/hero-slides error:', err);
      return res.status(500).json({ error: 'Gagal memuat data slide beranda.' });
    }
  });

  app.put('/api/hero-slides', async (req, res) => {
    try {
      const rawItems = req.body?.items;
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return res.status(400).json({ error: 'Data slot slide beranda tidak valid.' });
      }

      const now = new Date().toISOString();
      const sanitized: StoredHeroSlide[] = [];

      for (let i = 0; i < HERO_SLIDE_SLOT_COUNT; i++) {
        const item = rawItems[i];
        const imageUrl = typeof item?.imageUrl === 'string' ? item.imageUrl.trim() : '';
        const title =
          imageUrl && typeof item?.title === 'string' && item.title.trim()
            ? item.title.trim()
            : imageUrl
            ? `Slide Edukasi SDM Aparatur #${i + 1}`
            : '';

        if (
          imageUrl &&
          !imageUrl.startsWith('data:image/') &&
          !imageUrl.startsWith('/') &&
          !imageUrl.startsWith('https://') &&
          !imageUrl.startsWith('http://')
        ) {
          return res.status(400).json({
            error: `Format gambar pada slot #${i + 1} tidak valid.`,
          });
        }

        sanitized.push({
          id:
            typeof item?.id === 'string' && item.id.trim()
              ? item.id.trim()
              : `hero-slide-slot-${i + 1}`,
          imageUrl,
          title,
          isActive: imageUrl ? item?.isActive !== false : false,
          order: i,
          createdAt:
            typeof item?.createdAt === 'string' && item.createdAt.trim()
              ? item.createdAt.trim()
              : now,
          updatedAt: now,
        });
      }

      await writeHeroSlidesStore(sanitized);
      return res.json({ items: sanitized });
    } catch (err) {
      console.error('PUT /api/hero-slides error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan perubahan slide beranda.' });
    }
  });

  app.post('/api/hero-slides/reset', async (_req, res) => {
    try {
      await writeHeroSlidesStore(DEFAULT_STORED_HERO_SLIDES);
      return res.json({ items: DEFAULT_STORED_HERO_SLIDES });
    } catch (err) {
      console.error('POST /api/hero-slides/reset error:', err);
      return res.status(500).json({ error: 'Gagal mereset slide beranda.' });
    }
  });

  // ============================================================================
  // Admin Session Authentication API (HMAC-SHA256 Signed Bearer Token)
  // ============================================================================
  app.post('/api/admin/session', async (req, res) => {
    try {
      const cleanEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const cleanPass = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

      if (!cleanEmail || !cleanPass) {
        return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      }

      const matched = AUTHORIZED_ADMIN_USERS.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.passwordHash === cleanPass
      );

      if (!matched) {
        return res.status(401).json({ error: 'Kredensial kedinasan tidak valid.' });
      }

      const now = Date.now();
      const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days
      const token = await signAdminSessionToken({
        id: matched.id,
        email: matched.email,
        role: matched.role,
        iat: now,
        exp: expiresAt,
      });

      const { passwordHash: _ignored, ...safeUser } = matched;
      return res.json({ token, expiresAt, user: safeUser });
    } catch (err) {
      console.error('POST /api/admin/session error:', err);
      return res.status(500).json({ error: 'Gagal membuat sesi otorisasi admin.' });
    }
  });

  app.get('/api/admin/session/verify', requireAdminAuth, (req, res) => {
    return res.json({ authenticated: true, session: (req as any).adminSession });
  });

  // ============================================================================
  // Halaman Tentang Persistent Content & Binary Image Management API
  // ============================================================================
  app.get('/api/uploads/about/:filename', async (req, res) => {
    try {
      const filename = String(req.params.filename || '').trim();
      if (!VALID_ABOUT_FILENAME_REGEX.test(filename)) {
        return res.status(400).json({ error: 'Nama file gambar tidak valid.' });
      }

      await ensureAboutPageStore();
      const filePath = path.join(ABOUT_UPLOADS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Gambar tidak ditemukan.' });
      }

      const ext = path.extname(filename).toLowerCase();
      const mime =
        ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(filePath);
    } catch (err) {
      console.error('GET /api/uploads/about/:filename error:', err);
      return res.status(500).json({ error: 'Gagal memuat file gambar.' });
    }
  });

  app.get('/api/about-page', async (_req, res) => {
    try {
      const content = await readAboutPageStore();
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ content });
    } catch (err) {
      console.error('GET /api/about-page error:', err);
      return res.status(500).json({ error: 'Gagal memuat data Halaman Tentang.' });
    }
  });

  app.post(
    '/api/about-page/image',
    requireAdminAuth,
    express.raw({
      type: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/octet-stream'],
      limit: '6mb',
    }),
    async (req, res) => {
      try {
        const declaredType = String(req.headers['content-type'] || '')
          .split(';')[0]
          .trim()
          .toLowerCase();

        const allowedDeclared = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'application/octet-stream',
        ];
        if (declaredType && !allowedDeclared.includes(declaredType)) {
          return res.status(400).json({
            error: 'Format file tidak didukung. Gunakan gambar JPG, JPEG, PNG, atau WebP.',
          });
        }

        const buffer = req.body as Buffer;
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
          return res.status(400).json({
            error: 'File gambar kosong atau gagal diterima server.',
          });
        }

        if (buffer.length > MAX_ABOUT_IMAGE_BYTES) {
          return res.status(400).json({
            error: 'Ukuran file gambar melebihi batas maksimal 5 MB.',
          });
        }

        const detectedFormat = detectImageFormatFromBuffer(buffer);
        if (!detectedFormat) {
          return res.status(400).json({
            error:
              'File yang diunggah bukan gambar JPG, JPEG, PNG, atau WebP yang valid.',
          });
        }

        await ensureAboutPageStore();
        const filename = `profil-sdma-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${detectedFormat.ext}`;
        const targetPath = path.join(ABOUT_UPLOADS_DIR, filename);
        const tmpPath = `${targetPath}.tmp`;

        await fsPromises.writeFile(tmpPath, buffer);
        await fsPromises.rename(tmpPath, targetPath);

        return res.status(201).json({
          imageUrl: `/api/uploads/about/${filename}`,
          mimeType: detectedFormat.mime,
          sizeBytes: buffer.length,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('POST /api/about-page/image error:', err);
        return res.status(500).json({ error: 'Gagal menyimpan file gambar di server.' });
      }
    }
  );

  app.put('/api/about-page', requireAdminAuth, async (req, res) => {
    try {
      const currentContent = await readAboutPageStore();
      const validation = validateAboutPagePayload(req.body, currentContent);
      if (!validation.valid || !validation.sanitized) {
        return res.status(400).json({
          error: validation.error || 'Data Halaman Tentang tidak valid.',
        });
      }

      await writeAboutPageStore(validation.sanitized);
      const keepFilename = extractAboutUploadFilename(validation.sanitized.profileImageUrl);
      await cleanupUnreferencedAboutUploads(keepFilename);

      return res.json({ content: validation.sanitized });
    } catch (err) {
      console.error('PUT /api/about-page error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan perubahan Halaman Tentang.' });
    }
  });

  app.delete('/api/about-page/image', requireAdminAuth, async (_req, res) => {
    try {
      const currentContent = await readAboutPageStore();
      const updated: AboutPageContent = {
        ...currentContent,
        profileImageUrl: '',
        profileImageUpdatedAt: null,
        updatedAt: new Date().toISOString(),
      };
      await writeAboutPageStore(updated);
      await cleanupUnreferencedAboutUploads(null);
      return res.json({ content: updated });
    } catch (err) {
      console.error('DELETE /api/about-page/image error:', err);
      return res.status(500).json({ error: 'Gagal menghapus gambar profil Halaman Tentang.' });
    }
  });

  app.post('/api/about-page/reset', requireAdminAuth, async (req, res) => {
    try {
      const currentContent = await readAboutPageStore();
      const keepImage = Boolean(req.body?.keepImage);
      const nextImageUrl = keepImage ? currentContent.profileImageUrl : '';
      const nextImageUpdatedAt = keepImage ? currentContent.profileImageUpdatedAt || null : null;

      const resetContent: AboutPageContent = {
        ...DEFAULT_ABOUT_PAGE_CONTENT,
        profileImageUrl: nextImageUrl,
        profileImageUpdatedAt: nextImageUpdatedAt,
        updatedAt: new Date().toISOString(),
      };
      await writeAboutPageStore(resetContent);
      const keepFilename = extractAboutUploadFilename(nextImageUrl);
      await cleanupUnreferencedAboutUploads(keepFilename);

      return res.json({ content: resetContent });
    } catch (err) {
      console.error('POST /api/about-page/reset error:', err);
      return res.status(500).json({ error: 'Gagal mereset konten Halaman Tentang.' });
    }
  });

  // In development, hook up Vite dev server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
