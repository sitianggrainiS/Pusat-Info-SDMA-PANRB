import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import appletConfig from './firebase-applet-config.json';
import { DEFAULT_ABOUT_PAGE_CONTENT } from './src/data/initialAboutData';
import {
  PROJECT_STATIC_IMAGES,
  ProjectStaticImage,
  normalizeStaticImageUrl,
} from './src/data/staticImages';
import {
  INITIAL_CATEGORIES,
  INITIAL_POLICIES,
  INITIAL_SOURCES,
  STANDARD_KLASTER_IDS,
  STANDARD_PILAR_IDS,
  isRemovedSubstansiCategory,
} from './src/data/initialData';
import { detectInstagramThumbnail } from './src/utils/thumbnailUtils';
import { isInstagramWebPageUrl, validateDirectImageUrl } from './src/utils/imageUrlUtils';
import { formatContentDate, getTodayIndonesianDate } from './src/utils/dateUtils';
import type {
  AboutPageContent,
  AboutUnitWork,
  AboutUnitIconName,
  Policy,
  Category,
  SourceDocument,
} from './src/types';

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
    imageUrl: '/assets/aistudio/462411664_513021548204419_9151970918488268348_n__1__223b9cc0.jpg',
    title: '',
    isActive: true,
    order: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'hero-slide-2',
    imageUrl: '/assets/aistudio/Screenshot_2026-10-26_100608_a9ae79d1.png',
    title: '',
    isActive: true,
    order: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'hero-slide-3',
    imageUrl: '/assets/aistudio/Heading__3__00fd1277.png',
    title: '',
    isActive: true,
    order: 2,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

const PUBLIC_DIR = path.resolve(__dirname, 'public');
const DIST_DIR = path.resolve(__dirname, 'dist');

function doesStaticPublicAssetExist(assetWebPath: string): boolean {
  if (!assetWebPath.startsWith('/images/') && !assetWebPath.startsWith('/assets/')) {
    return false;
  }
  const cleanRel = assetWebPath.split('?')[0].split('#')[0].replace(/^\/+/, '');
  if (!cleanRel || cleanRel.includes('..')) return false;

  const publicCandidate = path.resolve(PUBLIC_DIR, cleanRel);
  if (publicCandidate.startsWith(PUBLIC_DIR) && fs.existsSync(publicCandidate)) {
    return true;
  }

  const distCandidate = path.resolve(DIST_DIR, cleanRel);
  if (distCandidate.startsWith(DIST_DIR) && fs.existsSync(distCandidate)) {
    return true;
  }

  return false;
}

async function listAvailableStaticImages(): Promise<ProjectStaticImage[]> {
  const byPath = new Map<string, ProjectStaticImage>();
  for (const item of PROJECT_STATIC_IMAGES) {
    byPath.set(item.path, item);
  }

  const scanDirs = [path.join(PUBLIC_DIR, 'images'), path.join(DIST_DIR, 'images')];
  const validExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = await fsPromises.readdir(dir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!validExts.has(ext)) continue;
        const webPath = `/images/${file}`;
        if (!byPath.has(webPath)) {
          const readable = file
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]+/g, ' ')
            .trim();
          byPath.set(webPath, {
            id: `auto-${file}`,
            name: `Aset Proyek: ${readable || file}`,
            path: webPath,
            badge: 'Aset Proyek',
            description: 'File gambar statis yang tersimpan di dalam folder public/images/',
            category: ext === '.svg' ? 'logo' : 'general',
          });
        }
      }
    } catch (err) {
      console.error('Failed scanning static images directory:', err);
    }
  }

  return Array.from(byPath.values());
}

const DATA_DIR = path.resolve(__dirname, 'data');
const LEGACY_DATA_DIR = path.resolve(__dirname, '.data');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const DEPUTY_NEWS_FILE = path.join(DATA_DIR, 'deputy-news.json');
const DEPUTY_NEWS_DELETED_FILE = path.join(DATA_DIR, 'deputy-news-deleted.json');
const HERO_SLIDES_FILE = path.join(DATA_DIR, 'hero-slides.json');
const ABOUT_PAGE_FILE = path.join(DATA_DIR, 'about-page.json');
const POLICIES_FILE = path.join(DATA_DIR, 'policies.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const SOURCES_FILE = path.join(DATA_DIR, 'sources.json');
const ABOUT_UPLOADS_DIR = path.resolve(__dirname, 'public', 'images', 'about');
const DEPUTY_NEWS_UPLOADS_DIR = path.resolve(__dirname, 'public', 'images', 'deputy-news');
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
let policiesWriteChain: Promise<void> = Promise.resolve();
let categoriesWriteChain: Promise<void> = Promise.resolve();
let sourcesWriteChain: Promise<void> = Promise.resolve();
interface VerifiedFirebaseAdmin {
  uid: string;
  email: string;
  role: string;
}

async function verifyFirebaseAdminToken(idToken: string): Promise<VerifiedFirebaseAdmin | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  const apiKey = appletConfig?.apiKey?.trim();
  const projectId = appletConfig?.projectId?.trim();
  const databaseId = appletConfig?.firestoreDatabaseId?.trim() || '(default)';
  if (!apiKey || !projectId) return null;

  try {
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!authRes.ok) return null;
    const authData = (await authRes.json()) as {
      users?: Array<{ localId?: string; email?: string; disabled?: boolean }>;
    };
    const fbUser = authData.users?.[0];
    if (!fbUser?.localId || fbUser.disabled) return null;

    const uid = fbUser.localId;
    const adminDocRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/${encodeURIComponent(databaseId)}/documents/admins/${encodeURIComponent(uid)}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );
    if (!adminDocRes.ok) return null;
    const docJson = (await adminDocRes.json()) as {
      fields?: {
        role?: { stringValue?: string };
        isActive?: { booleanValue?: boolean };
        email?: { stringValue?: string };
      };
    };
    const role = docJson.fields?.role?.stringValue || '';
    const isActive = docJson.fields?.isActive?.booleanValue;
    if (isActive === false) return null;
    if (!['superadmin', 'content_manager', 'legal_reviewer', 'editor'].includes(role)) {
      return null;
    }

    return {
      uid,
      email: fbUser.email || docJson.fields?.email?.stringValue || '',
      role,
    };
  } catch (err) {
    console.warn('Error verifying Firebase admin token:', err);
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
    const verified = await verifyFirebaseAdminToken(token);
    if (!verified) {
      return res.status(401).json({
        error:
          'Akses ditolak. Sesi otorisasi Firebase Admin tidak valid atau UID belum terdaftar pada koleksi admins.',
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
    const legacyPath = path.join(LEGACY_DATA_DIR, 'about-page.json');
    if (fs.existsSync(legacyPath)) {
      try {
        const raw = await fsPromises.readFile(legacyPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          await fsPromises.writeFile(ABOUT_PAGE_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          return;
        }
      } catch {}
    }
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
      const normalized = normalizeStaticImageUrl(parsed.profileImageUrl.trim());
      const filename = extractAboutUploadFilename(normalized);
      if (filename && fs.existsSync(path.join(ABOUT_UPLOADS_DIR, filename))) {
        validImageUrl = `/api/uploads/about/${filename}`;
      } else if (doesStaticPublicAssetExist(normalized)) {
        validImageUrl = normalized.split('?')[0].split('#')[0];
      } else if (normalized.startsWith('https://') || normalized.startsWith('http://')) {
        validImageUrl = normalized;
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
    await saveStoreBackup('about-page', content);
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
          'Format gambar sementara (blob:/data:) tidak diizinkan. Pilih aset statis proyek (/images/...) atau gunakan URL gambar resmi (https://...).',
      };
    }

    const normalizedImg = normalizeStaticImageUrl(rawImageUrl);
    const filename = extractAboutUploadFilename(normalizedImg);

    if (filename) {
      if (!fs.existsSync(path.join(ABOUT_UPLOADS_DIR, filename))) {
        return {
          valid: false,
          error:
            'File gambar unggahan preview tidak ditemukan di server. Pilih aset statis proyek (/images/...) agar permanen atau unggah ulang.',
        };
      }
      finalImageUrl = `/api/uploads/about/${filename}`;
    } else if (normalizedImg.startsWith('/images/') || normalizedImg.startsWith('/assets/')) {
      if (!doesStaticPublicAssetExist(normalizedImg)) {
        return {
          valid: false,
          error: `File aset statis "${normalizedImg}" belum ditemukan di folder public/images/. Pastikan file sudah ditambahkan ke proyek.`,
        };
      }
      finalImageUrl = normalizedImg.split('?')[0].split('#')[0];
    } else {
      if (isInstagramWebPageUrl(normalizedImg)) {
        return {
          valid: false,
          error:
            'URL yang dimasukkan adalah tautan halaman Instagram, bukan URL file gambar langsung. Masukkan URL file gambar langsung (.jpg, .png, .webp) atau pilih aset proyek (/images/...).',
        };
      }
      try {
        const parsedUrl = new URL(normalizedImg);
        if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
          return {
            valid: false,
            error: 'URL gambar eksternal wajib menggunakan protokol https:// atau http://.',
          };
        }
        finalImageUrl = parsedUrl.toString();
      } catch {
        return {
          valid: false,
          error:
            'Path atau URL gambar tidak valid. Gunakan /images/nama-gambar.jpg atau tautan lengkap https://...',
        };
      }
    }

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

async function saveStoreBackup(storeName: string, data: any): Promise<void> {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      await fsPromises.mkdir(BACKUPS_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUPS_DIR, `${storeName}-${timestamp}.json`);
    await fsPromises.writeFile(backupFile, JSON.stringify(data, null, 2), 'utf-8');

    // Retain up to 10 latest backup snapshots per store
    const files = await fsPromises.readdir(BACKUPS_DIR);
    const matching = files
      .filter((f) => f.startsWith(`${storeName}-`) && f.endsWith('.json'))
      .sort()
      .reverse();
    if (matching.length > 10) {
      for (const oldFile of matching.slice(10)) {
        await fsPromises.unlink(path.join(BACKUPS_DIR, oldFile)).catch(() => {});
      }
    }
  } catch (err) {
    console.warn(`[Backup] Warning saving backup for ${storeName}:`, err);
  }
}

async function ensureDeputyNewsStore(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DEPUTY_NEWS_DELETED_FILE)) {
    await fsPromises.writeFile(DEPUTY_NEWS_DELETED_FILE, '[]', 'utf-8');
  }
  if (!fs.existsSync(DEPUTY_NEWS_FILE)) {
    let initialRaw = '[]';
    const legacyPath = path.join(LEGACY_DATA_DIR, 'deputy-news.json');
    if (fs.existsSync(legacyPath)) {
      try {
        const legacyContent = await fsPromises.readFile(legacyPath, 'utf-8');
        if (Array.isArray(JSON.parse(legacyContent))) {
          initialRaw = legacyContent;
        }
      } catch {
        // Ignore corrupted legacy file
      }
    }
    await fsPromises.writeFile(DEPUTY_NEWS_FILE, initialRaw, 'utf-8');
  }
}

async function readDeputyNewsDeletedIds(): Promise<string[]> {
  await ensureDeputyNewsStore();
  try {
    const raw = await fsPromises.readFile(DEPUTY_NEWS_DELETED_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
    );
  } catch (err) {
    console.error('Error reading deputy-news-deleted.json:', err);
    return [];
  }
}

async function readDeputyNewsStore(): Promise<StoredDeputyNews[]> {
  await ensureDeputyNewsStore();
  try {
    const deletedSet = new Set(await readDeputyNewsDeletedIds());
    const raw = await fsPromises.readFile(DEPUTY_NEWS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item: StoredDeputyNews) => item && typeof item.id === 'string' && !deletedSet.has(item.id))
      .map((item: StoredDeputyNews) => ({
        ...item,
        thumbnailUrl: normalizeStaticImageUrl(item?.thumbnailUrl),
      }));
  } catch (err) {
    console.error('Error reading deputy-news.json:', err);
    return [];
  }
}

function writeDeputyNewsStore(
  items: StoredDeputyNews[],
  deletedIds?: string[]
): Promise<void> {
  const nextOp = deputyNewsWriteChain.then(async () => {
    await ensureDeputyNewsStore();
    let finalDeletedIds = deletedIds;
    if (finalDeletedIds) {
      finalDeletedIds = Array.from(
        new Set(finalDeletedIds.filter((id) => typeof id === 'string' && id.trim().length > 0))
      );
      const tmpDel = `${DEPUTY_NEWS_DELETED_FILE}.tmp`;
      await fsPromises.writeFile(tmpDel, JSON.stringify(finalDeletedIds, null, 2), 'utf-8');
      await fsPromises.rename(tmpDel, DEPUTY_NEWS_DELETED_FILE);
    } else {
      finalDeletedIds = await readDeputyNewsDeletedIds();
    }

    const deletedSet = new Set(finalDeletedIds);
    const cleanItems = items.filter((item) => item && !deletedSet.has(item.id));
    const serialized = JSON.stringify(cleanItems, null, 2);

    const tmpFile = `${DEPUTY_NEWS_FILE}.tmp`;
    await fsPromises.writeFile(tmpFile, serialized, 'utf-8');
    await fsPromises.rename(tmpFile, DEPUTY_NEWS_FILE);

    // Save automated backup snapshot
    await saveStoreBackup('deputy-news', cleanItems);
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
      const cleanUrl = normalizeStaticImageUrl(existing.imageUrl);
      return {
        id: existing.id || `hero-slide-slot-${idx + 1}`,
        imageUrl: cleanUrl,
        title: cleanUrl && typeof existing.title === 'string' ? existing.title.trim() : '',
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
    const legacyPath = path.join(LEGACY_DATA_DIR, 'hero-slides.json');
    if (fs.existsSync(legacyPath)) {
      try {
        const raw = await fsPromises.readFile(legacyPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          await fsPromises.writeFile(HERO_SLIDES_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          return;
        }
      } catch {}
    }
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
    await saveStoreBackup('hero-slides', items);
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

  const normalizedArticleCandidate = /^https?:\/\//i.test(articleUrl)
    ? articleUrl
    : `https://${articleUrl}`;

  let parsedArticleUrl: URL;
  try {
    parsedArticleUrl = new URL(normalizedArticleCandidate);
  } catch {
    return { valid: false, error: 'Format URL artikel tidak valid.' };
  }

  if (parsedArticleUrl.protocol !== 'https:' && parsedArticleUrl.protocol !== 'http:') {
    return { valid: false, error: 'Link artikel wajib menggunakan protokol https:// atau http://.' };
  }

  if (!parsedArticleUrl.hostname || !parsedArticleUrl.hostname.includes('.')) {
    return { valid: false, error: 'Domain pada link artikel tidak valid.' };
  }

  if (!title || title.length < 5) {
    return { valid: false, error: 'Judul berita wajib diisi (minimal 5 karakter).' };
  }

  const thumbValidation = validateDirectImageUrl(thumbnailUrl, {
    allowEmpty: false,
    allowDataUrl: true,
  });
  if (!thumbValidation.isValid) {
    return {
      valid: false,
      error:
        thumbValidation.error ||
        'Format gambar/thumbnail berita tidak valid. Gunakan /images/nama-gambar.jpg atau https://...',
    };
  }
  const normalizedThumb = thumbValidation.cleanUrl;

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
      thumbnailUrl: normalizedThumb,
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

function sanitizeStoredPolicy(raw: any): Policy {
  const now = new Date().toISOString();
  const title =
    typeof raw?.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Kebijakan SDM Aparatur';
  const slug =
    typeof raw?.slug === 'string' && raw.slug.trim()
      ? raw.slug.trim()
      : title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-') +
        '-' +
        Date.now().toString().slice(-4);
  const categoryId =
    typeof raw?.categoryId === 'string' && raw.categoryId.trim()
      ? raw.categoryId.trim()
      : 'cat-perencanaan-pengadaan';

  const detectedThumb = detectInstagramThumbnail({
    id: raw?.id,
    slug,
    title,
    instagramPostUrl: raw?.instagramPostUrl,
    categoryId,
  });

  const rawCustomThumb = normalizeStaticImageUrl(raw?.customThumbnail);
  const rawThumb = normalizeStaticImageUrl(raw?.thumbnail);
  const validCustom =
    rawCustomThumb && validateDirectImageUrl(rawCustomThumb, { allowDataUrl: true }).isValid
      ? validateDirectImageUrl(rawCustomThumb, { allowDataUrl: true }).cleanUrl
      : '';
  const validThumb =
    rawThumb && validateDirectImageUrl(rawThumb, { allowDataUrl: true }).isValid
      ? validateDirectImageUrl(rawThumb, { allowDataUrl: true }).cleanUrl
      : '';

  const isCustomThumbnail = Boolean(raw?.isCustomThumbnail && (validCustom || validThumb));
  const finalThumb = isCustomThumbnail
    ? validCustom || validThumb
    : validThumb || detectedThumb;

  const rawDate =
    (typeof raw?.instagramDate === 'string' && raw.instagramDate.trim()) ||
    (typeof raw?.publicationDate === 'string' && raw.publicationDate.trim()) ||
    getTodayIndonesianDate();
  const cleanDate = formatContentDate(rawDate) || rawDate;

  return {
    id:
      typeof raw?.id === 'string' && raw.id.trim()
        ? raw.id.trim()
        : `pol-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    title,
    slug,
    categoryId,
    summary: typeof raw?.summary === 'string' ? raw.summary.trim() : '',
    contextHeader: typeof raw?.contextHeader === 'string' ? raw.contextHeader : undefined,
    contextExplanation:
      typeof raw?.contextExplanation === 'string' ? raw.contextExplanation : '',
    conceptA: raw?.conceptA,
    conceptB: raw?.conceptB,
    comparison: raw?.comparison,
    simultaneousExplanation: raw?.simultaneousExplanation,
    generalContent: raw?.generalContent,
    classifications: Array.isArray(raw?.classifications) ? raw.classifications : undefined,
    requirementsHeader: raw?.requirementsHeader,
    requirements: Array.isArray(raw?.requirements) ? raw.requirements : [],
    processStepsHeader: raw?.processStepsHeader,
    processSteps: Array.isArray(raw?.processSteps) ? raw.processSteps : [],
    faqs: Array.isArray(raw?.faqs) ? raw.faqs : [],
    thumbnail: finalThumb,
    instagramPostUrl:
      typeof raw?.instagramPostUrl === 'string' ? raw.instagramPostUrl.trim() : '',
    instagramThumbnail:
      normalizeStaticImageUrl(raw?.instagramThumbnail) || finalThumb,
    isCustomThumbnail,
    customThumbnail: isCustomThumbnail ? validCustom || validThumb : undefined,
    autoThumbnail: detectedThumb,
    instagramDate: cleanDate,
    instagramAccountHandle:
      typeof raw?.instagramAccountHandle === 'string' && raw.instagramAccountHandle.trim()
        ? raw.instagramAccountHandle.trim()
        : '@sdmapanrb',
    status: raw?.status === 'published' ? 'published' : 'draft',
    sources: Array.isArray(raw?.sources) ? raw.sources : [],
    relatedPolicyIds: Array.isArray(raw?.relatedPolicyIds) ? raw.relatedPolicyIds : [],
    publicationDate: cleanDate,
    isFeatured: Boolean(raw?.isFeatured),
    createdAt: typeof raw?.createdAt === 'string' && raw.createdAt ? raw.createdAt : now,
    updatedAt: typeof raw?.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : now,
    aiAssisted: Boolean(raw?.aiAssisted),
    aiSummary:
      typeof raw?.aiSummary === 'string' && raw.aiSummary.trim()
        ? raw.aiSummary.trim()
        : undefined,
    isAiSummaryApproved: Boolean(
      raw?.isAiSummaryApproved && typeof raw?.aiSummary === 'string' && raw.aiSummary.trim()
    ),
    aiSummaryGeneratedAt:
      typeof raw?.aiSummaryGeneratedAt === 'string' && raw.aiSummaryGeneratedAt.trim()
        ? raw.aiSummaryGeneratedAt.trim()
        : undefined,
    instagramCaption:
      typeof raw?.instagramCaption === 'string' && raw.instagramCaption.trim()
        ? raw.instagramCaption.trim()
        : undefined,
  };
}

async function ensurePoliciesStore(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(POLICIES_FILE)) {
    const legacyPath = path.join(LEGACY_DATA_DIR, 'policies.json');
    if (fs.existsSync(legacyPath)) {
      try {
        const raw = await fsPromises.readFile(legacyPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          await fsPromises.writeFile(POLICIES_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          return;
        }
      } catch {}
    }
    await fsPromises.writeFile(
      POLICIES_FILE,
      JSON.stringify(INITIAL_POLICIES, null, 2),
      'utf-8'
    );
  }
}

async function readPoliciesStore(): Promise<Policy[]> {
  await ensurePoliciesStore();
  try {
    const raw = await fsPromises.readFile(POLICIES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (INITIAL_POLICIES && INITIAL_POLICIES.length > 0) {
        await writePoliciesStore(INITIAL_POLICIES);
        return INITIAL_POLICIES;
      }
      return [];
    }
    return parsed.map((p) => sanitizeStoredPolicy(p));
  } catch (err) {
    console.error('Error reading policies.json:', err);
    return INITIAL_POLICIES || [];
  }
}

function writePoliciesStore(items: Policy[]): Promise<void> {
  const nextOp = policiesWriteChain.then(async () => {
    await ensurePoliciesStore();
    const tmpFile = `${POLICIES_FILE}.tmp`;
    await fsPromises.writeFile(tmpFile, JSON.stringify(items, null, 2), 'utf-8');
    await fsPromises.rename(tmpFile, POLICIES_FILE);
    await saveStoreBackup('policies', items);
  });
  policiesWriteChain = nextOp.catch((err) => {
    console.error('Error writing policies.json:', err);
  });
  return nextOp;
}

function ensureDefaultCategoriesPresent(items: Category[]): {
  categories: Category[];
  didAppend: boolean;
} {
  const withoutRemoved = items.filter((c) => !isRemovedSubstansiCategory(c));
  let didAppend = withoutRemoved.length !== items.length;

  const normalized: Category[] = withoutRemoved.map((c) => ({
    ...c,
    group: c.group || (STANDARD_KLASTER_IDS.has(c.id) ? 'klaster' : 'pilar'),
  }));
  const existingIds = new Set(normalized.map((c) => c.id));
  const existingSlugs = new Set(normalized.map((c) => c.slug));

  for (const requiredPilarId of STANDARD_PILAR_IDS) {
    const def = INITIAL_CATEGORIES.find((c) => c.id === requiredPilarId);
    if (def && !existingIds.has(def.id) && !existingSlugs.has(def.slug)) {
      normalized.push(def);
      existingIds.add(def.id);
      existingSlugs.add(def.slug);
      didAppend = true;
    }
  }
  return { categories: normalized, didAppend };
}

async function ensureCategoriesStore(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CATEGORIES_FILE)) {
    await fsPromises.writeFile(
      CATEGORIES_FILE,
      JSON.stringify(INITIAL_CATEGORIES, null, 2),
      'utf-8'
    );
  }
}

async function readCategoriesStore(): Promise<Category[]> {
  await ensureCategoriesStore();
  try {
    const raw = await fsPromises.readFile(CATEGORIES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const { categories, didAppend } = ensureDefaultCategoriesPresent(parsed);
      if (didAppend) {
        writeCategoriesStore(categories).catch(() => {});
      }
      return categories;
    }
    return INITIAL_CATEGORIES;
  } catch (err) {
    console.error('Error reading categories.json:', err);
    return INITIAL_CATEGORIES;
  }
}

function writeCategoriesStore(items: Category[]): Promise<void> {
  const nextOp = categoriesWriteChain.then(async () => {
    await ensureCategoriesStore();
    const cleaned = items.filter((c) => !isRemovedSubstansiCategory(c));
    const tmpFile = `${CATEGORIES_FILE}.tmp`;
    await fsPromises.writeFile(tmpFile, JSON.stringify(cleaned, null, 2), 'utf-8');
    await fsPromises.rename(tmpFile, CATEGORIES_FILE);
    await saveStoreBackup('categories', cleaned);
  });
  categoriesWriteChain = nextOp.catch((err) => {
    console.error('Error writing categories.json:', err);
  });
  return nextOp;
}

async function ensureSourcesStore(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SOURCES_FILE)) {
    await fsPromises.writeFile(SOURCES_FILE, JSON.stringify(INITIAL_SOURCES, null, 2), 'utf-8');
  }
}

async function readSourcesStore(): Promise<SourceDocument[]> {
  await ensureSourcesStore();
  try {
    const raw = await fsPromises.readFile(SOURCES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return INITIAL_SOURCES;
  } catch (err) {
    console.error('Error reading sources.json:', err);
    return INITIAL_SOURCES;
  }
}

function writeSourcesStore(items: SourceDocument[]): Promise<void> {
  const nextOp = sourcesWriteChain.then(async () => {
    await ensureSourcesStore();
    const tmpFile = `${SOURCES_FILE}.tmp`;
    await fsPromises.writeFile(tmpFile, JSON.stringify(items, null, 2), 'utf-8');
    await fsPromises.rename(tmpFile, SOURCES_FILE);
    await saveStoreBackup('sources', items);
  });
  sourcesWriteChain = nextOp.catch((err) => {
    console.error('Error writing sources.json:', err);
  });
  return nextOp;
}

async function startServer() {
  const app = express();
  const cliPortArgIndex = process.argv.findIndex(
    (arg) => arg === '--port' || arg.startsWith('--port=')
  );
  let cliPort: number | undefined;
  if (cliPortArgIndex !== -1) {
    const arg = process.argv[cliPortArgIndex];
    const rawPort = arg.includes('=') ? arg.split('=')[1] : process.argv[cliPortArgIndex + 1];
    const parsed = parseInt(rawPort || '', 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      cliPort = parsed;
    }
  }
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  const nginxPort = process.env.NGINX_PORT ? parseInt(process.env.NGINX_PORT, 10) : undefined;
  const port =
    cliPort ||
    (process.env.NODE_ENV !== 'production'
      ? 3000
      : envPort && envPort !== nginxPort
      ? envPort
      : 3000);

  app.use(express.json({ limit: '20mb' }));

  // Helper to obtain server-side Gemini client using current GEMINI_API_KEY
  function getGeminiClient(): GoogleGenAI | null {
    const currentKey = process.env.GEMINI_API_KEY?.trim();
    if (!currentKey) return null;
    return new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim()) });
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

      // Invoke Gemini 4 Hydrogen for fast, reliable structured policy extraction
      const ai = getGeminiClient();
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

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: {
              abortSignal: abortController.signal,
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

          const rawText = (response.text ?? '{}')
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '');
          const parsed = JSON.parse(rawText);
          return res.json({
            source: 'gemini-4-hydrogen',
            data: parsed,
            disclaimer:
              'Draft dibuat dengan bantuan AI. Pastikan informasi telah diverifikasi berdasarkan dokumen resmi sebelum dipublikasikan.',
          });
        } finally {
          clearTimeout(timeoutId);
        }
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

  // Clean Indonesian Policy Summary Synthesizer (used when Gemini API is unreachable or quota-limited)
  function generateFallbackSummaryFromContent(
    title: string,
    clusterName: string,
    captionText: string,
    regulations: any[] = []
  ): string {
    const cleanTitle = (title || 'Kebijakan SDM Aparatur').trim();
    const cleanCluster = (clusterName || 'SDM Aparatur').trim();
    const isInteractivePillar = /^(fun\s*content|quiz|greetings|collab)$/i.test(cleanCluster);
    const emojiRegex = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u200D/gu;

    // Extract explicit "Sumber: ..." reference before stripping lines
    const sourceMatch = captionText.match(
      /(?:sumber|rujukan|dasar\s+hukum)\s*:\s*([^\n\r]+)/i
    );
    const extractedSource = sourceMatch
      ? sourceMatch[1]
          .replace(emojiRegex, '')
          .replace(/#[\w_]+/g, '')
          .trim()
          .replace(/[.!?]+$/, '')
      : '';

    // Normalize bullet/arrow lists into readable clauses
    const bulletItems: string[] = [];
    const normalizedLines = captionText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        if (/^(?:➡️|➡|✅|✔|•|-|\*)\s*/u.test(line)) {
          const item = line
            .replace(/^(?:➡️|➡|✅|✔|•|-|\*)\s*/u, '')
            .replace(emojiRegex, '')
            .replace(/#[\w_]+/g, '')
            .trim()
            .replace(/[.;,]+$/, '');
          if (item.length > 3) {
            bulletItems.push(item);
          }
          return '';
        }
        return line
          .replace(emojiRegex, ' ')
          .replace(/#[\w_]+/g, ' ')
          .replace(/\u2026+/g, '.')
          .replace(/\s+/g, ' ')
          .trim();
      })
      .filter(Boolean)
      .filter((line) => {
        const lower = line.toLowerCase();
        if (/^https?:\/\/\S+$/i.test(line)) return false;
        if (/^(sumber|rujukan|dasar\s+hukum|ib)\s*:/i.test(lower)) return false;
        if (/^selamat\s+(hari|jalan|memperingati)\b/i.test(lower)) return false;
        if (/^(mitos\s+atau\s+fakta|ini\s+serius|tinggal\s+\d+\s+hari\s+lagi)/i.test(lower)) {
          return false;
        }
        return true;
      })
      .map((line) => line.replace(/[.!?]?$/, (m) => (m ? m : '.')));

    const joinedText = normalizedLines
      .join(' ')
      .replace(/\bib\s*:\s*@\S+/gi, ' ')
      .replace(/https?:\/\/([^\s/]+)\S*/gi, '$1')
      .replace(/\bnggak\b/gi, 'tidak')
      .replace(/\budah\b/gi, 'sudah')
      .replace(/\s+/g, ' ')
      .trim();

    const rawSentences = joinedText
      .split(/(?<=[.!?])\s+/)
      .map((s) =>
        s
          .replace(/^(?:halo|hai|hi)?\s*rekan\s+(?:aparatur|asn)\s*[,!.:-]?\s*/i, '')
          .replace(/^mari\s+terus\s+hadirkan\b/i, 'Seluruh aparatur diharapkan terus menghadirkan')
          .replace(/\s+\b(?:lho|nih|dong|deh|kok|sih|yaa|ya)\b(?=[.!?]+$|$)/gi, '')
          .replace(/\s+([.!?])/g, '$1')
          .trim()
      )
      .filter((s) => {
        if (s.length < 24) return false;
        if (s.endsWith('?')) return false;
        const lower = s.toLowerCase();
        if (
          /^(jangan\s+sampai\s+(?:salah\s+bedain|terlewat)|karena\s+yang\s+perlu\s+ditakuti|tapi\s+kalau\s+batas\s+waktunya)/i.test(
            lower
          )
        ) {
          return false;
        }
        if (
          /\b(yuk\b|swipe\b|kolom\s+komentar|drop\s+di\s+komentar|jangan\s+lupa\s+share|simak\s+sampai\s+akhir|simak\s+fakta|cek\s+di\s+instagram|tulis\s+idenya|tunjuk\s+orangnya|jangan\s+sampai\s+kelewatan|jangan\s+diabaikan|kabar\s+baik\s+buat)\b/i.test(
            lower
          )
        ) {
          return false;
        }
        return true;
      })
      .map((s) => {
        const trimmed = s.replace(/[!]+$/, '.').replace(/\.{2,}/g, '.');
        const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        return /[.]$/.test(capitalized) ? capitalized : `${capitalized}.`;
      });

    const resultSentences: string[] = [];

    for (const s of rawSentences) {
      if (resultSentences.length < 3) {
        resultSentences.push(s);
      }
    }

    if (bulletItems.length >= 2 && resultSentences.length < 4) {
      const lowered = bulletItems
        .slice(0, 4)
        .map((b) => b.charAt(0).toLowerCase() + b.slice(1));
      const formattedBullets =
        lowered.length > 2
          ? `${lowered.slice(0, -1).join(', ')}, serta ${lowered[lowered.length - 1]}`
          : lowered.join(' dan ');
      resultSentences.push(`Pokok bahasan utama meliputi ${formattedBullets}.`);
    }

    const regRef =
      extractedSource ||
      (Array.isArray(regulations) && regulations.length > 0 && regulations[0]?.title
        ? String(regulations[0].title).trim()
        : '');

    if (regRef && resultSentences.length < 4) {
      resultSentences.push(`Materi informasi ini merujuk pada ${regRef}.`);
    }

    if (resultSentences.length === 0) {
      if (isInteractivePillar) {
        return `Konten "${cleanTitle}" merupakan sajian pada pilar ${cleanCluster} dari Kedeputian SDM Aparatur Kementerian PANRB. Materi ini dikemas secara ringan, interaktif, dan komunikatif untuk mempererat keterlibatan serta wawasan keseharian Rekan Aparatur. Melalui pendekatan kreatif tersebut, nilai kebersamaan dan budaya kerja positif ASN diharapkan semakin dekat dan relevan.`;
      }
      return `Konten ini menyajikan informasi resmi mengenai ${cleanTitle} pada kategori ${cleanCluster}. Materi disusun untuk memberikan pemahaman yang jelas, ringkas, dan akurat bagi pegawai ASN maupun masyarakat umum. Melalui publikasi edukatif Kementerian PANRB ini, aparatur diharapkan dapat memedomani ketentuan serta informasi layanan kepegawaian secara tepat.`;
    }

    if (resultSentences.length === 1) {
      if (isInteractivePillar) {
        resultSentences.unshift(
          `Konten "${cleanTitle}" merupakan sajian komunikatif pada pilar ${cleanCluster} bagi Rekan Aparatur.`
        );
        resultSentences.push(
          `Melalui penyajian yang ringan dan relevan ini, pesan positif seputar dunia kerja ASN dapat diterima secara lebih segar dan dekat.`
        );
      } else {
        resultSentences.unshift(
          `Konten mengenai ${cleanTitle} menyajikan informasi pada kategori ${cleanCluster} bagi Aparatur Sipil Negara.`
        );
        resultSentences.push(
          `Melalui publikasi resmi Kedeputian SDM Aparatur Kementerian PANRB ini, pegawai dan instansi diharapkan memperoleh pemahaman yang utuh serta akurat.`
        );
      }
    } else if (resultSentences.length === 2) {
      if (isInteractivePillar) {
        resultSentences.push(
          `Sajian pada pilar ${cleanCluster} ini dikemas secara komunikatif untuk membangun interaksi positif serta semangat kebersamaan di lingkungan ASN.`
        );
      } else {
        resultSentences.push(
          `Informasi dalam kategori ${cleanCluster} ini dihadirkan guna mendukung pemahaman dan tata kelola SDM Aparatur yang profesional serta akuntabel.`
        );
      }
    }

    return resultSentences.slice(0, 4).join(' ');
  }

  // AI Content Summary Generation Endpoint (Instagram Caption + Infographic Slides)
  app.post('/api/ai/generate-summary', async (req, res) => {
    const { title, clusterName, captionText, regulations } = req.body || {};

    if (!captionText || typeof captionText !== 'string' || !captionText.trim()) {
      return res.status(400).json({
        error:
          'Teks kepsyen atau materi teks slide infografis belum diisi. Masukkan teks kepsyen atau salin poin teks slide Instagram terlebih dahulu agar AI dapat merangkum secara akurat.',
      });
    }

    const cleanKey = process.env.GEMINI_API_KEY?.trim() || '';
    const hasRealKey =
      Boolean(cleanKey) &&
      cleanKey !== 'MY_GEMINI_API_KEY' &&
      cleanKey !== 'YOUR_API_KEY';

    const regList = Array.isArray(regulations)
      ? regulations
          .map((r: any) => `${r.title || ''} (${r.regulationNumber || ''} ${r.year || ''})`)
          .filter(Boolean)
          .join(', ')
      : '';

    if (hasRealKey) {
      const ai = getGeminiClient();
      if (ai) {
        const systemInstruction = `Anda adalah Asisten Kebijakan SDM Aparatur (ASN) pada platform KOMPAK Kementerian PANRB.
TUGAS UTAMA:
Menyusun ringkasan deskripsi konten ("Tentang Konten") yang ringkas, informatif, dan akurat dengan menyintesis informasi dari teks slide infografis dan kepsyen postingan Instagram yang diberikan.

ATURAN WAJIB (STRICT REQUIREMENTS):
1. Panjang ringkasan HARUS 3 sampai 4 kalimat utuh (minimal 3 kalimat, maksimal 4 kalimat).
2. Tulis dalam Bahasa Indonesia baku yang lugas, jelas, komunikatif, dan mudah dipahami oleh pegawai ASN maupun masyarakat umum.
3. JANGAN menyalin mentah kalimat sapaan media sosial, ajakan klik/swipe ("Yuk simak...", "Klik link...", "Tulis di kolom komentar..."), hashtag, URL mentah, atau emoji. Ubah menjadi narasi deskriptif yang rapi untuk bagian "Tentang Konten" website resmi.
4. Fokus pada inti materi konten: topik/tujuan utama, pokok informasi atau ketentuan penting, serta manfaat/relevansinya bagi ASN atau publik.
5. DILARANG KERAS mengarang regulasi, nomor peraturan, pasal, tanggal, atau fakta yang tidak ada pada teks sumber.
6. DILARANG menggunakan bullet point, daftar bernomor, atau tanda petik pembungkus.
7. Kembalikan respons dalam format JSON valid sesuai schema.`;

        const prompt = `Susun deskripsi ringkasan "Tentang Konten" (3–4 kalimat) berdasarkan materi postingan berikut:
Judul Konten: "${title || 'Kebijakan SDM Aparatur'}"
Kategori / Klaster / Pilar: "${clusterName || 'SDM Aparatur'}"
${regList ? `Regulasi Rujukan Terkait: ${regList}` : ''}

TEKS KEPSYEN & MATERI SLIDE INSTAGRAM:
"""
${captionText.trim().slice(0, 15000)}
"""`;

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: {
              abortSignal: abortController.signal,
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: {
                    type: Type.STRING,
                    description:
                      'Deskripsi ringkasan 3-4 kalimat Bahasa Indonesia yang rapi, tanpa emoji atau ajakan media sosial.',
                  },
                  sentenceCount: {
                    type: Type.INTEGER,
                    description: 'Jumlah kalimat pada teks ringkasan (3 atau 4).',
                  },
                },
                required: ['summary'],
              },
            },
          });

          const rawText = (response.text ?? '{}')
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '');
          const parsed = JSON.parse(rawText);
          const generatedSummary =
            typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

          if (generatedSummary) {
            return res.json({
              summary: generatedSummary,
              sentenceCount: countSentences(generatedSummary),
              source: 'gemini-4-hydrogen',
              disclaimer:
                'Ringkasan AI disintesis dari materi kepsyen & slide Instagram yang dimasukkan dan siap ditampilkan pada bagian "Tentang Konten".',
            });
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.info(
            'Gemini summary fallback activated:',
            errMsg.includes('abort') ? 'Request timed out after 30s' : errMsg
          );
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }

    const synthesizedSummary = generateFallbackSummaryFromContent(
      title || 'Kebijakan SDM Aparatur',
      clusterName || 'SDM Aparatur',
      captionText,
      regulations
    );

    return res.json({
      summary: synthesizedSummary,
      sentenceCount: countSentences(synthesizedSummary),
      source: 'structured-synthesizer',
      disclaimer:
        'Ringkasan disintesis secara otomatis dari materi kepsyen & slide Instagram yang dimasukkan dan siap ditampilkan pada bagian "Tentang Konten".',
    });
  });

  // ============================================================================
  // Berita Deputi SDM Aparatur Persistent CRUD API
  // ============================================================================
  app.get('/api/deputy-news', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const [items, deletedIds] = await Promise.all([
        readDeputyNewsStore(),
        readDeputyNewsDeletedIds(),
      ]);
      const sorted = sortStoredNews(items);
      if (req.query.status === 'published') {
        return res.json({
          items: sorted.filter((n) => n.status === 'published'),
          deletedIds,
        });
      }
      return res.json({ items: sorted, deletedIds });
    } catch (err) {
      console.error('GET /api/deputy-news error:', err);
      return res.status(500).json({ error: 'Gagal memuat data berita.' });
    }
  });

  app.post('/api/deputy-news/sync', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const incomingItems = Array.isArray(req.body?.items) ? req.body.items : [];
      const incomingDeletedIds = Array.isArray(req.body?.deletedIds)
        ? req.body.deletedIds.filter(
            (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
          )
        : [];

      const [currentItems, currentDeletedIds] = await Promise.all([
        readDeputyNewsStore(),
        readDeputyNewsDeletedIds(),
      ]);

      const mergedDeletedIds = Array.from(
        new Set([...currentDeletedIds, ...incomingDeletedIds])
      );
      const deletedSet = new Set(mergedDeletedIds);

      const byId = new Map<string, StoredDeputyNews>();
      for (const existing of currentItems) {
        if (existing && existing.id && !deletedSet.has(existing.id)) {
          byId.set(existing.id, existing);
        }
      }

      const now = new Date().toISOString();
      for (const raw of incomingItems) {
        if (!raw || typeof raw !== 'object') continue;
        const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : '';
        if (!id || deletedSet.has(id)) continue;

        const check = validateDeputyNewsPayload(raw);
        if (!check.valid || !check.sanitized) continue;

        const incomingCreatedAt =
          typeof raw.createdAt === 'string' && raw.createdAt.trim() ? raw.createdAt.trim() : now;
        const incomingUpdatedAt =
          typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
            ? raw.updatedAt.trim()
            : incomingCreatedAt;

        const candidate: StoredDeputyNews = {
          id,
          ...check.sanitized,
          createdAt: incomingCreatedAt,
          updatedAt: incomingUpdatedAt,
        };

        const prev = byId.get(id);
        if (!prev) {
          byId.set(id, candidate);
        } else {
          const prevTs = Date.parse(prev.updatedAt) || 0;
          const nextTs = Date.parse(candidate.updatedAt) || 0;
          if (nextTs >= prevTs) {
            byId.set(id, candidate);
          }
        }
      }

      const mergedList = sortStoredNews(Array.from(byId.values()));
      await writeDeputyNewsStore(mergedList, mergedDeletedIds);
      return res.json({ items: mergedList, deletedIds: mergedDeletedIds });
    } catch (err) {
      console.error('POST /api/deputy-news/sync error:', err);
      return res.status(500).json({ error: 'Gagal menyinkronkan data berita deputi.' });
    }
  });

  app.post('/api/deputy-news', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const check = validateDeputyNewsPayload(req.body);
      if (!check.valid || !check.sanitized) {
        return res.status(400).json({ error: check.error || 'Data berita tidak valid.' });
      }

      const [items, deletedIds] = await Promise.all([
        readDeputyNewsStore(),
        readDeputyNewsDeletedIds(),
      ]);
      const now = new Date().toISOString();
      const requestedId =
        typeof req.body?.id === 'string' && req.body.id.trim()
          ? req.body.id.trim()
          : `news-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const newItem: StoredDeputyNews = {
        id: requestedId,
        ...check.sanitized,
        createdAt:
          typeof req.body?.createdAt === 'string' && req.body.createdAt.trim()
            ? req.body.createdAt.trim()
            : now,
        updatedAt: now,
      };

      const nextDeletedIds = deletedIds.filter((delId) => delId !== requestedId);
      const deduplicated = items.filter((item) => item.id !== requestedId);
      const updatedList = sortStoredNews([newItem, ...deduplicated]);
      await writeDeputyNewsStore(updatedList, nextDeletedIds);
      return res.status(201).json({ item: newItem, deletedIds: nextDeletedIds });
    } catch (err) {
      console.error('POST /api/deputy-news error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan berita baru.' });
    }
  });

  app.put('/api/deputy-news/:id', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const { id } = req.params;
      const check = validateDeputyNewsPayload(req.body);
      if (!check.valid || !check.sanitized) {
        return res.status(400).json({ error: check.error || 'Data pembaruan berita tidak valid.' });
      }

      const [items, deletedIds] = await Promise.all([
        readDeputyNewsStore(),
        readDeputyNewsDeletedIds(),
      ]);
      const now = new Date().toISOString();
      const existingIndex = items.findIndex((item) => item.id === id);
      const nextDeletedIds = deletedIds.filter((delId) => delId !== id);

      if (existingIndex === -1) {
        // Upsert cleanly if routed to a fresh Cloud Run container instance
        const createdItem: StoredDeputyNews = {
          id,
          ...check.sanitized,
          createdAt:
            typeof req.body?.createdAt === 'string' && req.body.createdAt.trim()
              ? req.body.createdAt.trim()
              : now,
          updatedAt: now,
        };
        const nextItems = sortStoredNews([createdItem, ...items]);
        await writeDeputyNewsStore(nextItems, nextDeletedIds);
        return res.json({ item: createdItem, deletedIds: nextDeletedIds });
      }

      const updatedItem: StoredDeputyNews = {
        ...items[existingIndex],
        ...check.sanitized,
        updatedAt: now,
      };

      const nextItems = [...items];
      nextItems[existingIndex] = updatedItem;
      await writeDeputyNewsStore(sortStoredNews(nextItems), nextDeletedIds);

      return res.json({ item: updatedItem, deletedIds: nextDeletedIds });
    } catch (err) {
      console.error('PUT /api/deputy-news/:id error:', err);
      return res.status(500).json({ error: 'Gagal memperbarui data berita.' });
    }
  });

  app.patch('/api/deputy-news/:id/status', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const { id } = req.params;
      const nextStatus = req.body?.status;
      if (nextStatus !== 'draft' && nextStatus !== 'published') {
        return res.status(400).json({ error: 'Status publikasi harus bernilai draft atau published.' });
      }

      const [items, deletedIds] = await Promise.all([
        readDeputyNewsStore(),
        readDeputyNewsDeletedIds(),
      ]);
      const now = new Date().toISOString();
      const existingIndex = items.findIndex((item) => item.id === id);

      if (existingIndex === -1) {
        // Upsert from fallback item payload if routed to another container instance
        if (req.body?.item && typeof req.body.item === 'object') {
          const check = validateDeputyNewsPayload({ ...req.body.item, status: nextStatus });
          if (check.valid && check.sanitized) {
            const upsertedItem: StoredDeputyNews = {
              id,
              ...check.sanitized,
              status: nextStatus,
              createdAt:
                typeof req.body.item.createdAt === 'string' && req.body.item.createdAt.trim()
                  ? req.body.item.createdAt.trim()
                  : now,
              updatedAt: now,
            };
            const nextDeletedIds = deletedIds.filter((delId) => delId !== id);
            await writeDeputyNewsStore(sortStoredNews([upsertedItem, ...items]), nextDeletedIds);
            return res.json({ item: upsertedItem, deletedIds: nextDeletedIds });
          }
        }
        return res.status(404).json({ error: 'Data berita tidak ditemukan.' });
      }

      const updatedItem: StoredDeputyNews = {
        ...items[existingIndex],
        status: nextStatus,
        updatedAt: now,
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
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const { id } = req.params;
      const [items, deletedIds] = await Promise.all([
        readDeputyNewsStore(),
        readDeputyNewsDeletedIds(),
      ]);
      const filtered = items.filter((item) => item.id !== id);
      const nextDeletedIds = Array.from(new Set([...deletedIds, id]));

      await writeDeputyNewsStore(filtered, nextDeletedIds);
      return res.json({ success: true, deletedIds: nextDeletedIds });
    } catch (err) {
      console.error('DELETE /api/deputy-news/:id error:', err);
      return res.status(500).json({ error: 'Gagal menghapus data berita.' });
    }
  });

  app.post(
    '/api/deputy-news/image',
    express.raw({
      type: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
        'image/svg+xml',
        'application/octet-stream',
      ],
      limit: '15mb',
    }),
    async (req, res) => {
      try {
        const buffer = req.body as Buffer;
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
          return res.status(400).json({ error: 'File gambar kosong atau gagal diterima server.' });
        }
        if (buffer.length > 15 * 1024 * 1024) {
          return res.status(400).json({ error: 'Ukuran file gambar melebihi batas maksimal 15 MB.' });
        }
        const detected = detectImageFormatFromBuffer(buffer);
        const ext = detected ? detected.ext : 'jpg';
        const mime = detected ? detected.mime : 'image/jpeg';

        if (!fs.existsSync(DEPUTY_NEWS_UPLOADS_DIR)) {
          await fsPromises.mkdir(DEPUTY_NEWS_UPLOADS_DIR, { recursive: true });
        }

        const filename = `berita-sdma-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const filePath = path.join(DEPUTY_NEWS_UPLOADS_DIR, filename);
        const tmpPath = `${filePath}.tmp`;
        await fsPromises.writeFile(tmpPath, buffer);
        await fsPromises.rename(tmpPath, filePath);

        const imageUrl = `/images/deputy-news/${filename}`;
        return res.status(201).json({
          imageUrl,
          mimeType: mime,
          sizeBytes: buffer.length,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('POST /api/deputy-news/image error:', err);
        return res.status(500).json({ error: 'Gagal menyimpan file gambar berita di server.' });
      }
    }
  );

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
        const rawImageUrl = typeof item?.imageUrl === 'string' ? item.imageUrl.trim() : '';
        let imageUrl = '';
        if (rawImageUrl) {
          const check = validateDirectImageUrl(rawImageUrl, {
            allowEmpty: true,
            allowDataUrl: true,
          });
          if (!check.isValid) {
            return res.status(400).json({
              error: `Slot #${i + 1}: ${check.error || 'Format URL gambar tidak valid.'}`,
            });
          }
          imageUrl = check.cleanUrl;
        }
        const title = imageUrl && typeof item?.title === 'string' ? item.title.trim() : '';

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
  // Policies (Konten Instagram, Artikel, Klaster ASN & Pilar Konten), Categories & Sources API
  // ============================================================================
  app.get('/api/policies', async (req, res) => {
    try {
      const statusQuery = req.query.status;
      const items = await readPoliciesStore();
      res.setHeader('Cache-Control', 'no-store');
      if (statusQuery === 'published' || statusQuery === 'draft') {
        return res.json({ items: items.filter((p) => p.status === statusQuery) });
      }
      return res.json({ items });
    } catch (err) {
      console.error('GET /api/policies error:', err);
      return res.status(500).json({ error: 'Gagal memuat data konten kebijakan & Instagram.' });
    }
  });

  // Safe non-destructive sync from existing browser cache if server store was empty
  app.post('/api/policies/sync', async (req, res) => {
    try {
      const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
      const current = await readPoliciesStore();
      if (current.length === 0 && incoming.length > 0) {
        const sanitizedList = incoming.map((p: any) => sanitizeStoredPolicy(p));
        await writePoliciesStore(sanitizedList);
        return res.json({ items: sanitizedList, migrated: true });
      }
      return res.json({ items: current, migrated: false });
    } catch (err) {
      console.error('POST /api/policies/sync error:', err);
      return res.status(500).json({ error: 'Gagal menyinkronkan data konten awal.' });
    }
  });

  app.post('/api/policies', async (req, res) => {
    try {
      const body = req.body || {};
      if (body.isCustomThumbnail && body.thumbnail) {
        const thumbCheck = validateDirectImageUrl(body.thumbnail, {
          allowEmpty: false,
          allowDataUrl: true,
        });
        if (!thumbCheck.isValid) {
          return res.status(400).json({
            error: thumbCheck.error || 'URL gambar konten tidak valid.',
          });
        }
      }

      const items = await readPoliciesStore();
      const now = new Date().toISOString();
      const newItem = sanitizeStoredPolicy({
        ...body,
        id:
          typeof body.id === 'string' && body.id.trim()
            ? body.id.trim()
            : `pol-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        createdAt: body.createdAt || now,
        updatedAt: now,
      });

      const deduplicated = items.filter((item) => item.id !== newItem.id);
      const nextItems = [newItem, ...deduplicated];
      await writePoliciesStore(nextItems);
      return res.status(201).json({ item: newItem });
    } catch (err) {
      console.error('POST /api/policies error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan konten ke server.' });
    }
  });

  app.put('/api/policies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};
      if (body.isCustomThumbnail && body.thumbnail) {
        const thumbCheck = validateDirectImageUrl(body.thumbnail, {
          allowEmpty: false,
          allowDataUrl: true,
        });
        if (!thumbCheck.isValid) {
          return res.status(400).json({
            error: thumbCheck.error || 'URL gambar konten tidak valid.',
          });
        }
      }

      const items = await readPoliciesStore();
      const idx = items.findIndex((p) => p.id === id);
      const now = new Date().toISOString();

      if (idx === -1) {
        const created = sanitizeStoredPolicy({ ...body, id, createdAt: now, updatedAt: now });
        await writePoliciesStore([created, ...items]);
        return res.json({ item: created });
      }

      const explicitDateUpdate =
        typeof body.instagramDate === 'string' && body.instagramDate.trim()
          ? body.instagramDate.trim()
          : typeof body.publicationDate === 'string' && body.publicationDate.trim()
          ? body.publicationDate.trim()
          : undefined;

      const merged = sanitizeStoredPolicy({
        ...items[idx],
        ...body,
        ...(explicitDateUpdate
          ? {
              instagramDate: explicitDateUpdate,
              publicationDate: explicitDateUpdate,
            }
          : {}),
        id,
        createdAt: items[idx].createdAt,
        updatedAt: now,
      });

      const nextItems = [...items];
      nextItems[idx] = merged;
      await writePoliciesStore(nextItems);
      return res.json({ item: merged });
    } catch (err) {
      console.error('PUT /api/policies/:id error:', err);
      return res.status(500).json({ error: 'Gagal memperbarui konten di server.' });
    }
  });

  app.patch('/api/policies/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const nextStatus = req.body?.status;
      if (nextStatus !== 'draft' && nextStatus !== 'published') {
        return res.status(400).json({ error: 'Status publikasi harus draft atau published.' });
      }
      const items = await readPoliciesStore();
      const idx = items.findIndex((p) => p.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Konten tidak ditemukan.' });
      }
      const updated: Policy = {
        ...items[idx],
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      const nextItems = [...items];
      nextItems[idx] = updated;
      await writePoliciesStore(nextItems);
      return res.json({ item: updated });
    } catch (err) {
      console.error('PATCH /api/policies/:id/status error:', err);
      return res.status(500).json({ error: 'Gagal memperbarui status publikasi konten.' });
    }
  });

  app.patch('/api/policies/:id/thumbnail', async (req, res) => {
    try {
      const { id } = req.params;
      const isCustom = Boolean(req.body?.isCustomThumbnail ?? req.body?.isCustom);
      const rawThumb = typeof req.body?.thumbnail === 'string' ? req.body.thumbnail.trim() : '';

      if (isCustom) {
        const check = validateDirectImageUrl(rawThumb, { allowEmpty: false, allowDataUrl: true });
        if (!check.isValid) {
          return res.status(400).json({ error: check.error || 'URL gambar tidak valid.' });
        }
      }

      const items = await readPoliciesStore();
      const idx = items.findIndex((p) => p.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Konten tidak ditemukan.' });
      }

      const updated = sanitizeStoredPolicy({
        ...items[idx],
        thumbnail: rawThumb,
        instagramThumbnail: rawThumb,
        customThumbnail: isCustom ? rawThumb : undefined,
        isCustomThumbnail: isCustom,
        updatedAt: new Date().toISOString(),
      });

      const nextItems = [...items];
      nextItems[idx] = updated;
      await writePoliciesStore(nextItems);
      return res.json({ item: updated });
    } catch (err) {
      console.error('PATCH /api/policies/:id/thumbnail error:', err);
      return res.status(500).json({ error: 'Gagal memperbarui gambar konten.' });
    }
  });

  app.delete('/api/policies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const items = await readPoliciesStore();
      const filtered = items.filter((p) => p.id !== id);
      if (filtered.length === items.length) {
        return res.status(404).json({ error: 'Konten tidak ditemukan.' });
      }
      await writePoliciesStore(filtered);
      return res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/policies/:id error:', err);
      return res.status(500).json({ error: 'Gagal menghapus konten dari server.' });
    }
  });

  app.get('/api/categories', async (_req, res) => {
    try {
      const items = await readCategoriesStore();
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ items });
    } catch (err) {
      console.error('GET /api/categories error:', err);
      return res.status(500).json({ error: 'Gagal memuat daftar klaster & pilar konten.' });
    }
  });

  app.put('/api/categories', async (req, res) => {
    try {
      const rawItems = req.body?.items;
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return res.status(400).json({ error: 'Daftar kategori tidak boleh kosong.' });
      }
      await writeCategoriesStore(rawItems);
      return res.json({ items: rawItems });
    } catch (err) {
      console.error('PUT /api/categories error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan daftar kategori.' });
    }
  });

  app.get('/api/sources', async (_req, res) => {
    try {
      const items = await readSourcesStore();
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ items });
    } catch (err) {
      console.error('GET /api/sources error:', err);
      return res.status(500).json({ error: 'Gagal memuat daftar regulasi sumber.' });
    }
  });

  app.put('/api/sources', async (req, res) => {
    try {
      const rawItems = req.body?.items;
      if (!Array.isArray(rawItems)) {
        return res.status(400).json({ error: 'Daftar regulasi sumber tidak valid.' });
      }
      await writeSourcesStore(rawItems);
      return res.json({ items: rawItems });
    } catch (err) {
      console.error('PUT /api/sources error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan daftar regulasi sumber.' });
    }
  });

  // ============================================================================
  // Firebase Admin Session Verification API (Bearer ID Token + Firestore UID)
  // ============================================================================
  app.get('/api/admin/session/verify', requireAdminAuth, (req, res) => {
    return res.json({ authenticated: true, session: (req as any).adminSession });
  });

  // ============================================================================
  // Backup, Restore & Persistent Data Storage Management API
  // ============================================================================
  app.get('/api/admin/storage/status', async (_req, res) => {
    try {
      const stores = [
        { name: 'policies', file: POLICIES_FILE, label: 'Konten Kebijakan & Instagram' },
        { name: 'deputy-news', file: DEPUTY_NEWS_FILE, label: 'Berita Deputi SDM Aparatur' },
        { name: 'hero-slides', file: HERO_SLIDES_FILE, label: 'Banner Beranda' },
        { name: 'categories', file: CATEGORIES_FILE, label: 'Kategori & Pilar Konten' },
        { name: 'about-page', file: ABOUT_PAGE_FILE, label: 'Halaman Profil Kedeputian' },
        { name: 'sources', file: SOURCES_FILE, label: 'Regulasi Rujukan' },
      ];

      const details = await Promise.all(
        stores.map(async (s) => {
          const exists = fs.existsSync(s.file);
          let sizeBytes = 0;
          let updatedAt = null;
          let itemCount = 0;
          if (exists) {
            try {
              const stats = await fsPromises.stat(s.file);
              sizeBytes = stats.size;
              updatedAt = stats.mtime.toISOString();
              const content = JSON.parse(await fsPromises.readFile(s.file, 'utf-8'));
              itemCount = Array.isArray(content)
                ? content.length
                : typeof content === 'object' && content !== null
                ? 1
                : 0;
            } catch {
              // ignore stat errors
            }
          }
          return {
            name: s.name,
            label: s.label,
            filePath: path.relative(__dirname, s.file),
            exists,
            sizeBytes,
            updatedAt,
            itemCount,
          };
        })
      );

      let backupCount = 0;
      if (fs.existsSync(BACKUPS_DIR)) {
        const bFiles = await fsPromises.readdir(BACKUPS_DIR);
        backupCount = bFiles.filter((f) => f.endsWith('.json')).length;
      }

      return res.json({
        status: 'healthy',
        storageDirectory: 'data/',
        isGitTracked: true,
        stores: details,
        backupCount,
        githubIntegration: {
          configured: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO),
          repo: process.env.GITHUB_REPO || null,
          branch: process.env.GITHUB_BRANCH || 'main',
        },
      });
    } catch (err) {
      console.error('GET /api/admin/storage/status error:', err);
      return res.status(500).json({ error: 'Gagal memuat status penyimpanan data.' });
    }
  });

  app.get('/api/admin/backup/export', async (_req, res) => {
    try {
      const [policies, deputyNews, heroSlides, categories, aboutPage, sources] = await Promise.all([
        readPoliciesStore(),
        readDeputyNewsStore(),
        readHeroSlidesStore(),
        readCategoriesStore(),
        readAboutPageStore(),
        readSourcesStore(),
      ]);

      const bundle = {
        app: 'KOMPAK SDMA',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        stores: {
          policies,
          deputyNews,
          heroSlides,
          categories,
          aboutPage,
          sources,
        },
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="kompak-sdma-backup-${new Date().toISOString().slice(0, 10)}.json"`
      );
      return res.json(bundle);
    } catch (err) {
      console.error('GET /api/admin/backup/export error:', err);
      return res.status(500).json({ error: 'Gagal mengekspor data cadangan.' });
    }
  });

  app.post('/api/admin/backup/restore', requireAdminAuth, async (req, res) => {
    try {
      const bundle = req.body;
      if (!bundle || typeof bundle !== 'object' || !bundle.stores) {
        return res.status(400).json({ error: 'Format berkas cadangan tidak valid.' });
      }

      const { policies, deputyNews, heroSlides, categories, aboutPage, sources } = bundle.stores;
      let restoredCount = 0;

      if (Array.isArray(policies)) {
        await writePoliciesStore(policies.map((p: any) => sanitizeStoredPolicy(p)));
        restoredCount += policies.length;
      }
      if (Array.isArray(deputyNews)) {
        await writeDeputyNewsStore(deputyNews);
        restoredCount += deputyNews.length;
      }
      if (Array.isArray(heroSlides)) {
        await writeHeroSlidesStore(normalizeStoredHeroSlides(heroSlides));
      }
      if (Array.isArray(categories)) {
        await writeCategoriesStore(categories.filter((c: any) => !isRemovedSubstansiCategory(c)));
      }
      if (aboutPage && typeof aboutPage === 'object') {
        const validation = validateAboutPagePayload(aboutPage, DEFAULT_ABOUT_PAGE_CONTENT);
        if (validation.valid && validation.sanitized) {
          await writeAboutPageStore(validation.sanitized);
        }
      }
      if (Array.isArray(sources)) {
        await writeSourcesStore(sources);
      }

      return res.json({
        success: true,
        message: 'Seluruh data berhasil dipulihkan dari cadangan.',
        restoredAt: new Date().toISOString(),
        totalRestoredItems: restoredCount,
      });
    } catch (err) {
      console.error('POST /api/admin/backup/restore error:', err);
      return res.status(500).json({ error: 'Gagal memulihkan data dari berkas cadangan.' });
    }
  });

  app.get('/api/admin/github/status', (_req, res) => {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    return res.json({
      configured: Boolean(token && repo),
      repo: repo || null,
      branch,
      message: token && repo
        ? `Tersambung ke GitHub repository ${repo} (branch: ${branch})`
        : 'GitHub Token belum dikonfigurasi. Data Anda tersimpan permanen di berkas repository data/*.json.',
    });
  });

  app.post('/api/admin/github/sync', requireAdminAuth, async (_req, res) => {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!token || !repo) {
      return res.status(400).json({
        configured: false,
        message:
          'GitHub Personal Access Token (GITHUB_TOKEN) atau Repository (GITHUB_REPO) belum diatur pada Environment Variables server. Data Anda tetap tersimpan permanen di berkas repository data/*.json. Anda juga dapat mengunduh berkas cadangan (JSON) untuk commit langsung ke GitHub.',
      });
    }

    try {
      const targetFiles = [
        'policies.json',
        'categories.json',
        'hero-slides.json',
        'about-page.json',
        'sources.json',
        'deputy-news.json',
      ];

      const results: Array<{ file: string; status: string }> = [];

      for (const filename of targetFiles) {
        const localFilePath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(localFilePath)) continue;
        const fileContent = await fsPromises.readFile(localFilePath, 'utf-8');
        const base64Content = Buffer.from(fileContent, 'utf-8').toString('base64');
        const githubPath = `data/${filename}`;

        let currentSha: string | undefined;
        try {
          const getRes = await fetch(
            `https://api.github.com/repos/${repo}/contents/${githubPath}?ref=${branch}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'KOMPAK-SDMA-Sync',
              },
            }
          );
          if (getRes.ok) {
            const getData = (await getRes.json()) as any;
            currentSha = getData.sha;
          }
        } catch {}

        const putRes = await fetch(
          `https://api.github.com/repos/${repo}/contents/${githubPath}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'KOMPAK-SDMA-Sync',
            },
            body: JSON.stringify({
              message: `chore(data): auto-sync ${filename} dari Dashboard Admin KOMPAK SDMA`,
              content: base64Content,
              branch,
              ...(currentSha ? { sha: currentSha } : {}),
            }),
          }
        );

        if (putRes.ok) {
          results.push({ file: filename, status: 'synced' });
        } else {
          const errText = await putRes.text();
          results.push({ file: filename, status: `failed: ${putRes.status}` });
          console.warn(`GitHub Sync failed for ${filename}:`, errText);
        }
      }

      return res.json({
        configured: true,
        syncedAt: new Date().toISOString(),
        repo,
        branch,
        results,
      });
    } catch (err: any) {
      console.error('POST /api/admin/github/sync error:', err);
      return res.status(500).json({ error: `Gagal sinkronisasi ke GitHub: ${err?.message || err}` });
    }
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

  app.get('/api/static-images', async (_req, res) => {
    try {
      const items = await listAvailableStaticImages();
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ items });
    } catch (err) {
      console.error('GET /api/static-images error:', err);
      return res.json({ items: PROJECT_STATIC_IMAGES });
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
    // Pastikan request ke aset gambar yang tidak ada mengembalikan 404 asli (bukan index.html)
    app.use(['/images', '/assets'], (_req, res) => {
      res.status(404).json({ error: 'Aset gambar statis tidak ditemukan pada hasil build.' });
    });
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
