import { DeputyNews } from '../types';
import { normalizeStaticImageUrl } from '../data/staticImages';
import {
  sortDeputyNewsNewestFirst,
  validateUploadedNewsImageFile,
} from './deputyNewsUtils';

export const DEPUTY_NEWS_STORAGE_KEY = 'sdm_aparatur_deputy_news_cache_v1';
export const DEPUTY_NEWS_DELETED_STORAGE_KEY = 'sdm_aparatur_deputy_news_deleted_v1';

const IDB_NAME = 'kompak_sdma_persistence_v1';
const IDB_VERSION = 2;
const STORE_IMAGES = 'deputy_news_images';
const LEGACY_STORE_NEWS = 'deputy_news';
const LEGACY_STORE_META = 'meta';

export interface StoredDeputyNewsImage {
  id: string;
  newsId: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  size: number;
  createdAt: string;
}

export function generateUniqueNewsId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `news-${Date.now()}-${rand}`;
}

export function generateUniqueImageId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `img-${Date.now()}-${rand}`;
}

function getTimestampMs(iso?: string): number {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Sanitizes a raw news metadata object.
 * Never persists temporary `blob:` URLs in metadata.
 */
function sanitizeNewsMetadata(
  raw: any,
  options?: { preserveLegacyDataUrlForMigration?: boolean }
): DeputyNews | null {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id.trim()) {
    return null;
  }

  const now = new Date().toISOString();
  const rawThumb = typeof raw.thumbnailUrl === 'string' ? raw.thumbnailUrl.trim() : '';
  let cleanThumb = '';

  if (rawThumb && !rawThumb.startsWith('blob:')) {
    if (rawThumb.startsWith('data:image/')) {
      cleanThumb = options?.preserveLegacyDataUrlForMigration ? rawThumb : '';
    } else {
      cleanThumb = normalizeStaticImageUrl(rawThumb);
    }
  }

  const imageId =
    typeof raw.imageId === 'string' && raw.imageId.trim() ? raw.imageId.trim() : undefined;

  return {
    id: raw.id.trim(),
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    articleUrl: typeof raw.articleUrl === 'string' ? raw.articleUrl.trim() : '',
    ...(imageId ? { imageId } : {}),
    thumbnailUrl: imageId ? '' : cleanThumb,
    publicationDate: typeof raw.publicationDate === 'string' ? raw.publicationDate.trim() : '',
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    category:
      typeof raw.category === 'string' && raw.category.trim()
        ? raw.category.trim()
        : 'Kebijakan SDM Aparatur',
    status: raw.status === 'published' ? 'published' : 'draft',
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : now,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt
        ? raw.updatedAt
        : typeof raw.createdAt === 'string' && raw.createdAt
        ? raw.createdAt
        : now,
  };
}

/**
 * Deduplicates news records by `id` (keeping the most recently updated entry)
 * and sorts newest `publicationDate` first.
 */
export function deduplicateAndSortDeputyNews(items: DeputyNews[]): DeputyNews[] {
  const byId = new Map<string, DeputyNews>();
  for (const item of items) {
    if (!item || !item.id) continue;
    const existing = byId.get(item.id);
    if (!existing || getTimestampMs(item.updatedAt) >= getTimestampMs(existing.updatedAt)) {
      byId.set(item.id, item);
    }
  }
  return sortDeputyNewsNewestFirst(Array.from(byId.values()));
}

function readDeletedIdsSync(): Set<string> {
  try {
    const raw = localStorage.getItem(DEPUTY_NEWS_DELETED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    );
  } catch {
    return new Set();
  }
}

/**
 * Synchronously reads DeputyNews metadata from `localStorage`.
 */
export function readLocalDeputyNewsSync(): DeputyNews[] {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(DEPUTY_NEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const deletedSet = readDeletedIdsSync();
    const cleaned = parsed
      .map((item) => sanitizeNewsMetadata(item))
      .filter((item): item is DeputyNews => item !== null && !deletedSet.has(item.id));
    return deduplicateAndSortDeputyNews(cleaned);
  } catch (err) {
    console.error('Gagal membaca data Berita Deputi dari localStorage:', err);
    return [];
  }
}

/**
 * Saves DeputyNews metadata array into `localStorage` and strictly verifies
 * that the serialized JSON was persisted accurately.
 * Never writes `blob:` URLs or `base64` image payloads into `localStorage`.
 */
export function saveDeputyNewsMetadataToLocalStorage(items: DeputyNews[]): DeputyNews[] {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    throw new Error('Penyimpanan localStorage tidak tersedia pada browser ini.');
  }

  const sanitized = deduplicateAndSortDeputyNews(
    items
      .map((item) => sanitizeNewsMetadata(item, { preserveLegacyDataUrlForMigration: false }))
      .filter((item): item is DeputyNews => item !== null)
  );

  const payload = JSON.stringify(sanitized);

  try {
    window.localStorage.setItem(DEPUTY_NEWS_STORAGE_KEY, payload);
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      String(err?.message || '').toLowerCase().includes('quota');
    throw new Error(
      isQuota
        ? 'Penyimpanan localStorage browser penuh. Hapus sebagian data lama terlebih dahulu.'
        : 'Gagal menyimpan metadata berita ke localStorage browser.'
    );
  }

  // Immediate read-back verification
  const verifyRaw = window.localStorage.getItem(DEPUTY_NEWS_STORAGE_KEY);
  if (verifyRaw === null) {
    throw new Error('Verifikasi gagal: data berita tidak ditemukan kembali di localStorage.');
  }
  let verifiedParsed: unknown;
  try {
    verifiedParsed = JSON.parse(verifyRaw);
  } catch {
    throw new Error('Verifikasi gagal: format JSON metadata berita di localStorage rusak.');
  }
  if (!Array.isArray(verifiedParsed) || verifiedParsed.length !== sanitized.length) {
    throw new Error('Verifikasi gagal: jumlah data berita yang tersimpan tidak sesuai.');
  }

  return sanitized;
}

export function markDeputyNewsIdDeletedInLocalStorage(id: string): void {
  try {
    const deleted = readDeletedIdsSync();
    deleted.add(id);
    window.localStorage.setItem(
      DEPUTY_NEWS_DELETED_STORAGE_KEY,
      JSON.stringify(Array.from(deleted))
    );
  } catch {
    // Non-fatal auxiliary tombstone list
  }
}

export function clearDeputyNewsIdFromDeletedInLocalStorage(id: string): void {
  try {
    const deleted = readDeletedIdsSync();
    if (deleted.delete(id)) {
      window.localStorage.setItem(
        DEPUTY_NEWS_DELETED_STORAGE_KEY,
        JSON.stringify(Array.from(deleted))
      );
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Opens the IndexedDB database used to store uploaded DeputyNews image Blobs.
 */
function openDeputyNewsIndexedDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB) {
    return Promise.reject(
      new Error('Browser ini tidak mendukung IndexedDB untuk penyimpanan file gambar.')
    );
  }

  return new Promise((resolve, reject) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
          const imgStore = db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
          imgStore.createIndex('by_news_id', 'newsId', { unique: false });
        }
        if (!db.objectStoreNames.contains(LEGACY_STORE_NEWS)) {
          db.createObjectStore(LEGACY_STORE_NEWS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(LEGACY_STORE_META)) {
          db.createObjectStore(LEGACY_STORE_META, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () =>
        reject(
          new Error(
            req.error?.message || 'Gagal membuka penyimpanan gambar IndexedDB pada browser.'
          )
        );
      req.onblocked = () =>
        reject(
          new Error(
            'Penyimpanan IndexedDB sedang diblokir oleh tab lain. Muat ulang halaman lalu coba kembali.'
          )
        );
    } catch (err: any) {
      reject(new Error(err?.message || 'Gagal menginisialisasi IndexedDB.'));
    }
  });
}

/**
 * Saves an uploaded File or Blob as a self-contained binary `Blob` in IndexedDB,
 * linked to `newsId` with a unique `imageId`, and verifies the stored Blob before resolving.
 */
export async function saveDeputyNewsImageBlob(
  fileOrBlob: File | Blob,
  newsId: string,
  explicitImageId?: string
): Promise<StoredDeputyNewsImage> {
  const fileCheck = validateUploadedNewsImageFile(fileOrBlob);
  if (!fileCheck.isValid) {
    throw new Error(fileCheck.error || 'File gambar berita tidak valid.');
  }

  const imageId = explicitImageId?.trim() || generateUniqueImageId();
  const mimeType = (fileOrBlob.type || 'image/jpeg').toLowerCase();
  const fileName =
    typeof (fileOrBlob as File).name === 'string' && (fileOrBlob as File).name.trim()
      ? (fileOrBlob as File).name.trim()
      : `${imageId}.${mimeType.split('/')[1] || 'jpg'}`;

  // Materialize an independent ArrayBuffer-backed Blob so it persists across browser restarts
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const detachedBlob = new Blob([arrayBuffer], { type: mimeType });

  const record: StoredDeputyNewsImage = {
    id: imageId,
    newsId,
    blob: detachedBlob,
    mimeType,
    fileName,
    size: detachedBlob.size,
    createdAt: new Date().toISOString(),
  };

  const db = await openDeputyNewsIndexedDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_IMAGES], 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          new Error(
            tx.error?.message || 'Gagal menyimpan file gambar berita ke IndexedDB.'
          )
        );
      tx.onabort = () =>
        reject(
          new Error(
            tx.error?.message || 'Transaksi penyimpanan gambar ke IndexedDB dibatalkan.'
          )
        );
    });

    // Verify stored Blob can be read back accurately
    const verified = await new Promise<StoredDeputyNewsImage | undefined>((resolve, reject) => {
      const tx = db.transaction([STORE_IMAGES], 'readonly');
      const store = tx.objectStore(STORE_IMAGES);
      const getReq = store.get(imageId);
      getReq.onsuccess = () => resolve(getReq.result as StoredDeputyNewsImage | undefined);
      getReq.onerror = () => reject(new Error('Gagal memverifikasi gambar yang disimpan di IndexedDB.'));
    });

    if (!verified || !(verified.blob instanceof Blob) || verified.blob.size !== detachedBlob.size) {
      throw new Error('Verifikasi gagal: file gambar tidak tersimpan dengan utuh di IndexedDB.');
    }

    return verified;
  } finally {
    db.close();
  }
}

/**
 * Retrieves a single image `Blob` from IndexedDB by its `imageId`.
 */
export async function getDeputyNewsImageBlob(imageId: string): Promise<Blob | null> {
  if (!imageId || !imageId.trim()) return null;
  let db: IDBDatabase | null = null;
  try {
    db = await openDeputyNewsIndexedDb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db!.transaction([STORE_IMAGES], 'readonly');
      const store = tx.objectStore(STORE_IMAGES);
      const req = store.get(imageId.trim());
      req.onsuccess = () => {
        const rec = req.result as StoredDeputyNewsImage | undefined;
        resolve(rec?.blob instanceof Blob && rec.blob.size > 0 ? rec.blob : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Gagal mengambil gambar dari IndexedDB:', err);
    return null;
  } finally {
    db?.close();
  }
}

/**
 * Batch-loads image `Blob`s from IndexedDB for the requested `imageIds`.
 */
export async function getDeputyNewsImageBlobsByIds(
  imageIds: string[]
): Promise<Record<string, Blob>> {
  const uniqueIds = Array.from(
    new Set(imageIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );
  if (uniqueIds.length === 0) return {};

  let db: IDBDatabase | null = null;
  try {
    db = await openDeputyNewsIndexedDb();
    return await new Promise<Record<string, Blob>>((resolve) => {
      const result: Record<string, Blob> = {};
      const tx = db!.transaction([STORE_IMAGES], 'readonly');
      const store = tx.objectStore(STORE_IMAGES);

      for (const id of uniqueIds) {
        const req = store.get(id);
        req.onsuccess = () => {
          const rec = req.result as StoredDeputyNewsImage | undefined;
          if (rec?.blob instanceof Blob && rec.blob.size > 0) {
            result[id] = rec.blob;
          }
        };
      }

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(result);
    });
  } catch (err) {
    console.error('Gagal memuat daftar gambar berita dari IndexedDB:', err);
    return {};
  } finally {
    db?.close();
  }
}

/**
 * Deletes an image `Blob` by `imageId` and also removes any image records linked to `newsId`
 * so zero orphaned Blobs remain in IndexedDB after deleting or replacing a news item.
 */
export async function deleteDeputyNewsImages(options: {
  imageId?: string;
  newsId?: string;
}): Promise<void> {
  const { imageId, newsId } = options;
  if (!imageId && !newsId) return;

  let db: IDBDatabase | null = null;
  try {
    db = await openDeputyNewsIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction([STORE_IMAGES], 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);

      if (imageId && imageId.trim()) {
        store.delete(imageId.trim());
      }

      if (newsId && newsId.trim() && store.indexNames.contains('by_news_id')) {
        const idx = store.index('by_news_id');
        const keyReq = idx.getAllKeys(IDBKeyRange.only(newsId.trim()));
        keyReq.onsuccess = () => {
          const keys = keyReq.result || [];
          for (const key of keys) {
            store.delete(key);
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error(tx.error?.message || 'Gagal menghapus gambar berita dari IndexedDB.'));
    });
  } finally {
    db?.close();
  }
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(0, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = header.match(/data:([^;]+);base64/i);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  } catch {
    return null;
  }
}

/**
 * Reads all existing DeputyNews metadata from `localStorage`, seamlessly migrates any
 * legacy records (e.g. old `deputy_news` IndexedDB store or legacy base64 thumbnails -> IndexedDB `Blob`),
 * and loads all corresponding `Blob` images from `IndexedDB`.
 */
export async function loadAndHydrateDeputyNewsFromBrowserStorage(): Promise<{
  items: DeputyNews[];
  blobsByImageId: Record<string, Blob>;
}> {
  const deletedSet = readDeletedIdsSync();

  // 1. Read raw items from localStorage (preserving any legacy base64 temporarily for migration)
  let rawLocalItems: DeputyNews[] = [];
  let hadRawLocalKey = false;
  try {
    const rawStr = window.localStorage.getItem(DEPUTY_NEWS_STORAGE_KEY);
    if (rawStr !== null) {
      hadRawLocalKey = true;
      const parsed = JSON.parse(rawStr);
      if (Array.isArray(parsed)) {
        rawLocalItems = parsed
          .map((item) => sanitizeNewsMetadata(item, { preserveLegacyDataUrlForMigration: true }))
          .filter((item): item is DeputyNews => item !== null && !deletedSet.has(item.id));
      }
    }
  } catch (err) {
    console.error('Gagal mengurai localStorage Berita Deputi:', err);
  }

  // 2. Check legacy IndexedDB `deputy_news` store so any pre-existing local news is preserved
  let legacyIdbItems: DeputyNews[] = [];
  let db: IDBDatabase | null = null;
  try {
    db = await openDeputyNewsIndexedDb();
    if (db.objectStoreNames.contains(LEGACY_STORE_NEWS)) {
      legacyIdbItems = await new Promise<DeputyNews[]>((resolve) => {
        const tx = db!.transaction([LEGACY_STORE_NEWS], 'readonly');
        const store = tx.objectStore(LEGACY_STORE_NEWS);
        const req = store.getAll();
        req.onsuccess = () => {
          if (!Array.isArray(req.result)) {
            resolve([]);
            return;
          }
          resolve(
            req.result
              .map((item) =>
                sanitizeNewsMetadata(item, { preserveLegacyDataUrlForMigration: true })
              )
              .filter((item): item is DeputyNews => item !== null && !deletedSet.has(item.id))
          );
        };
        req.onerror = () => resolve([]);
      });
    }
  } catch {
    // Continue gracefully if IndexedDB is restricted
  } finally {
    db?.close();
  }

  // Merge without duplication (preferring newer updatedAt)
  const combinedMap = new Map<string, DeputyNews>();
  for (const item of [...legacyIdbItems, ...rawLocalItems]) {
    const existing = combinedMap.get(item.id);
    if (!existing || getTimestampMs(item.updatedAt) >= getTimestampMs(existing.updatedAt)) {
      combinedMap.set(item.id, item);
    }
  }

  let needsMetadataResave = !hadRawLocalKey && combinedMap.size > 0;
  const migratedItems: DeputyNews[] = [];

  // 3. Migrate any legacy base64 data URLs into real IndexedDB Blob records
  for (const item of combinedMap.values()) {
    if (!item.imageId && item.thumbnailUrl.startsWith('data:image/')) {
      const convertedBlob = dataUrlToBlob(item.thumbnailUrl);
      if (convertedBlob && convertedBlob.size > 0) {
        try {
          const storedImg = await saveDeputyNewsImageBlob(convertedBlob, item.id);
          migratedItems.push({
            ...item,
            imageId: storedImg.id,
            thumbnailUrl: '',
          });
          needsMetadataResave = true;
          continue;
        } catch (err) {
          console.warn('Gagal memigrasikan gambar lama ke IndexedDB:', err);
        }
      }
      migratedItems.push({
        ...item,
        thumbnailUrl: '',
      });
      needsMetadataResave = true;
    } else {
      migratedItems.push(item);
    }
  }

  const finalItems = deduplicateAndSortDeputyNews(migratedItems);

  if (needsMetadataResave) {
    try {
      saveDeputyNewsMetadataToLocalStorage(finalItems);
    } catch (err) {
      console.warn('Gagal menyimpan hasil migrasi metadata ke localStorage:', err);
    }
  }

  // 4. Load all referenced image Blobs from IndexedDB
  const imageIds = finalItems
    .map((item) => item.imageId)
    .filter((id): id is string => Boolean(id));
  const blobsByImageId = await getDeputyNewsImageBlobsByIds(imageIds);

  return { items: finalItems, blobsByImageId };
}
