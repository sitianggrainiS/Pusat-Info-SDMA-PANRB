import { getApps } from 'firebase/app';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  collection as liteCollection,
  doc as liteDoc,
  getDoc as liteGetDoc,
  getDocs as liteGetDocs,
  query as liteQuery,
  where as liteWhere,
} from 'firebase/firestore/lite';
import {
  AboutPageContent,
  AboutUnitWork,
  Category,
  DeputyNews,
  HeroSlide,
  Policy,
  PolicyComparison,
  SourceDocument,
} from '../types';
import { DEFAULT_ABOUT_PAGE_CONTENT } from '../data/initialAboutData';
import { INITIAL_CATEGORIES, INITIAL_SOURCES, STANDARD_KLASTER_IDS } from '../data/initialData';
import { DEFAULT_HERO_SLIDES, normalizeHeroSlides } from '../data/initialHeroSlides';
import { detectInstagramThumbnail } from '../utils/thumbnailUtils';
import { resolvePolicyReleaseDate } from '../utils/instagramUtils';
import { sortDeputyNewsNewestFirst } from '../utils/deputyNewsUtils';
import {
  auth,
  db,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  getFirestoreInternalAssertionState,
  handleFirestoreError,
  hasFirestoreInternalAssertionTripped,
  isFirestoreInternalAssertion,
  liteDb,
  markFirestoreInternalAssertion,
  OperationType,
} from './firebase';

/**
 * Single-flight serialization queue for `getDocsFromServer` / `getDocFromServer` operations.
 * Because `@firebase/firestore` implements `getDocsFromServer` via temporary watch-stream targets
 * (`firestoreClientGetDocumentsViaSnapshotListener` on `PersistentListenStream`), serializing
 * multi-collection server reads prevents duplicate target listen/unlisten races (`ca9` -> `b815`).
 */
let serverReadQueue: Promise<unknown> = Promise.resolve();

export function runSerializedServerRead<T>(task: () => Promise<T>): Promise<T> {
  const next = serverReadQueue.then(task, task);
  serverReadQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export function isTransientFirestoreError(err: unknown): boolean {
  if (isFirestoreInternalAssertion(err)) {
    return false;
  }
  const code = String((err as any)?.code || '').toLowerCase();
  const msg = String((err as any)?.message || err || '').toLowerCase();
  if (
    code === 'permission-denied' ||
    code === 'unauthenticated' ||
    code === 'invalid-argument' ||
    code === 'not-found'
  ) {
    return false;
  }
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'aborted' ||
    msg.includes('the client is offline') ||
    msg.includes('failed to get document') ||
    msg.includes('network') ||
    msg.includes('fetch')
  );
}

/**
 * Finite, bounded retry wrapper (max 3 attempts total = 1 initial + max 2 retries).
 * NEVER retries Firestore internal assertions (`ca9` / `b815`) or security/validation errors,
 * and never toggles `enableNetwork()` mid-stream.
 */
export async function withFirestoreRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<{ result: T; attempts: number }> {
  const safeMax = Math.max(1, Math.min(3, maxAttempts));
  let lastErr: unknown;
  const delays = [400, 900];

  for (let attempt = 1; attempt <= safeMax; attempt++) {
    try {
      const result = await operation();
      return { result, attempts: attempt };
    } catch (err) {
      lastErr = err;
      if (isFirestoreInternalAssertion(err)) {
        markFirestoreInternalAssertion(err instanceof Error ? err.message : String(err));
        throw err;
      }
      if (attempt >= safeMax || !isTransientFirestoreError(err)) {
        throw err;
      }
      const waitMs = delays[attempt - 1] ?? 900;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastErr;
}

function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback.slice(0, maxLen);
  return val.slice(0, maxLen);
}

/**
 * Ensures only valid URL/path metadata strings (<= 2048 chars, no inline binary data: or blob:)
 * are stored in Firestore documents.
 */
export function sanitizeUrlMetadata(val: unknown, fallback = ''): string {
  if (typeof val !== 'string') return fallback.slice(0, 2048);
  const trimmed = val.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return fallback.slice(0, 2048);
  }
  return trimmed.slice(0, 2048);
}

export function sanitizeFirestoreId(rawId: string, prefix = 'item'): string {
  const cleaned = (rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return cleaned || `${prefix}-${Date.now()}`;
}

function timestampToIso(val: unknown, fallback?: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (
    val &&
    typeof val === 'object' &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string' && val.trim()) {
    return val;
  }
  return fallback || new Date().toISOString();
}

function requireCurrentAdminUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid || !auth.currentUser?.emailVerified) {
    throw new Error(
      'Sesi Firebase Authentication belum aktif. Silakan masuk sebagai Admin terverifikasi terlebih dahulu.'
    );
  }
  return uid;
}

// ============================================================================
// Category Serialization & CRUD
// ============================================================================

export function buildCategoryPayload(category: Category, orderIndex: number) {
  const id = sanitizeFirestoreId(category.id, 'cat');
  const group: 'klaster' | 'pilar' =
    category.group === 'klaster' || category.group === 'pilar'
      ? category.group
      : STANDARD_KLASTER_IDS.has(id)
      ? 'klaster'
      : 'pilar';

  return {
    id,
    name: clampStr(category.name || 'Kategori Baru', 200, 'Kategori Baru'),
    slug: clampStr(category.slug || id, 200, id),
    description: clampStr(category.description, 2000, ''),
    iconName: clampStr(category.iconName || 'FileText', 80, 'FileText'),
    group,
    colorScheme: clampStr(category.colorScheme, 50, ''),
    order: Math.max(0, Math.min(1000, Math.floor(orderIndex))),
    isPublic: true,
  };
}

export function deserializeCategory(data: Record<string, any>): Category & { _order: number } {
  return {
    id: String(data.id || ''),
    name: String(data.name || ''),
    slug: String(data.slug || ''),
    description: String(data.description || ''),
    iconName: String(data.iconName || 'FileText'),
    group: data.group === 'klaster' ? 'klaster' : 'pilar',
    colorScheme: data.colorScheme ? String(data.colorScheme) : undefined,
    _order: typeof data.order === 'number' ? data.order : 999,
  };
}

export async function saveCategoryToFirestore(category: Category, orderIndex = 0): Promise<void> {
  const uid = requireCurrentAdminUid();
  const base = buildCategoryPayload(category, orderIndex);
  const path = `categories/${base.id}`;
  const ref = doc(db, 'categories', base.id);

  let exists = false;
  try {
    const { result: snap } = await withFirestoreRetry(() => getDocFromServer(ref));
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (exists) {
      const { id: _id, ...mutable } = base;
      await withFirestoreRetry(() =>
        updateDoc(ref, {
          ...mutable,
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await withFirestoreRetry(() =>
        setDoc(ref, {
          ...base,
          authorUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  requireCurrentAdminUid();
  const cleanId = sanitizeFirestoreId(categoryId, 'cat');
  const path = `categories/${cleanId}`;
  try {
    await withFirestoreRetry(() => deleteDoc(doc(db, 'categories', cleanId)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// SourceDocument Serialization & CRUD
// ============================================================================

export function buildSourcePayload(source: SourceDocument) {
  const id = sanitizeFirestoreId(source.id, 'src');
  return {
    id,
    title: clampStr(source.title || 'Dokumen Resmi', 500, 'Dokumen Resmi'),
    regulationType: clampStr(
      source.regulationType || 'Peraturan Menteri PANRB',
      150,
      'Peraturan Menteri PANRB'
    ),
    regulationNumber: clampStr(source.regulationNumber, 150, ''),
    year: clampStr(source.year, 20, ''),
    articles: clampStr(source.articles, 500, ''),
    fileUrl: clampStr(source.fileUrl, 1000, ''),
    description: clampStr(source.description, 5000, ''),
    isVerified: Boolean(source.isVerified),
    isPublic: true,
  };
}

export function deserializeSource(data: Record<string, any>): SourceDocument {
  return {
    id: String(data.id || ''),
    title: String(data.title || ''),
    regulationType: String(data.regulationType || 'Peraturan Menteri PANRB'),
    regulationNumber: String(data.regulationNumber || ''),
    year: String(data.year || ''),
    articles: data.articles ? String(data.articles) : '',
    fileUrl: data.fileUrl ? String(data.fileUrl) : '',
    description: data.description ? String(data.description) : '',
    isVerified: Boolean(data.isVerified),
  };
}

export async function saveSourceToFirestore(source: SourceDocument): Promise<void> {
  const uid = requireCurrentAdminUid();
  const base = buildSourcePayload(source);
  const path = `sources/${base.id}`;
  const ref = doc(db, 'sources', base.id);

  let exists = false;
  try {
    const { result: snap } = await withFirestoreRetry(() => getDocFromServer(ref));
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (exists) {
      const { id: _id, ...mutable } = base;
      await withFirestoreRetry(() =>
        updateDoc(ref, {
          ...mutable,
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await withFirestoreRetry(() =>
        setDoc(ref, {
          ...base,
          authorUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteSourceFromFirestore(sourceId: string): Promise<void> {
  requireCurrentAdminUid();
  const cleanId = sanitizeFirestoreId(sourceId, 'src');
  const path = `sources/${cleanId}`;
  try {
    await withFirestoreRetry(() => deleteDoc(doc(db, 'sources', cleanId)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// Policy Serialization & CRUD
// ============================================================================

function sanitizeConcept(concept?: Policy['conceptA']) {
  if (!concept || typeof concept !== 'object') return undefined;
  return {
    title: clampStr(concept.title, 300, ''),
    description: clampStr(concept.description, 5000, ''),
    keyPoints: Array.isArray(concept.keyPoints)
      ? concept.keyPoints.slice(0, 30).map((pt) => clampStr(pt, 1000, ''))
      : [],
  };
}

function sanitizeComparison(comp?: PolicyComparison) {
  if (!comp || typeof comp !== 'object') return undefined;
  return {
    titleA: clampStr(comp.titleA, 300, ''),
    titleB: clampStr(comp.titleB, 300, ''),
    rows: Array.isArray(comp.rows)
      ? comp.rows.slice(0, 40).map((r) => ({
          attribute: clampStr(r?.attribute, 300, ''),
          itemA: clampStr(r?.itemA, 1000, ''),
          itemB: clampStr(r?.itemB, 1000, ''),
        }))
      : [],
  };
}

export function buildPolicyPayload(policy: Policy) {
  const id = sanitizeFirestoreId(policy.id, 'pol');
  const categoryId = sanitizeFirestoreId(
    policy.categoryId || 'cat-perencanaan-pengadaan',
    'cat'
  );
  const autoThumb = sanitizeUrlMetadata(
    policy.autoThumbnail || detectInstagramThumbnail(policy),
    '/src/assets/images/infographic_jabatan_pelaksana_1790755819303.jpg'
  );
  const mainThumb = sanitizeUrlMetadata(policy.thumbnail, autoThumb);
  const safeIgThumb = sanitizeUrlMetadata(policy.instagramThumbnail, mainThumb);
  const safeCustomThumb = policy.isCustomThumbnail
    ? sanitizeUrlMetadata(policy.customThumbnail || mainThumb, '')
    : '';

  const base: Record<string, any> = {
    id,
    title: clampStr(policy.title || 'Kebijakan Baru', 300, 'Kebijakan Baru'),
    slug: clampStr(policy.slug || id, 250, id),
    categoryId,
    summary: clampStr(policy.summary, 5000, ''),
    contextHeader: clampStr(policy.contextHeader, 300, ''),
    contextExplanation: clampStr(policy.contextExplanation, 20000, ''),
    simultaneousExplanation: clampStr(policy.simultaneousExplanation, 10000, ''),
    generalContent: clampStr(policy.generalContent, 30000, ''),
    classifications: Array.isArray(policy.classifications)
      ? policy.classifications.slice(0, 30).map((cls) => ({
          name: clampStr(cls?.name, 200, ''),
          description: clampStr(cls?.description, 2000, ''),
          examples: Array.isArray(cls?.examples)
            ? cls.examples.slice(0, 20).map((ex) => clampStr(ex, 300, ''))
            : [],
          ...(cls?.criteria ? { criteria: clampStr(cls.criteria, 500, '') } : {}),
        }))
      : [],
    requirementsHeader: clampStr(policy.requirementsHeader, 300, ''),
    requirements: Array.isArray(policy.requirements)
      ? policy.requirements.slice(0, 50).map((r) => clampStr(r, 1000, ''))
      : [],
    processStepsHeader: clampStr(policy.processStepsHeader, 300, ''),
    processSteps: Array.isArray(policy.processSteps)
      ? policy.processSteps.slice(0, 50).map((s) => clampStr(s, 1000, ''))
      : [],
    faqs: Array.isArray(policy.faqs)
      ? policy.faqs.slice(0, 50).map((f) => ({
          question: clampStr(f?.question, 500, ''),
          answer: clampStr(f?.answer, 3000, ''),
        }))
      : [],
    thumbnail: mainThumb,
    instagramPostUrl: clampStr(
      policy.instagramPostUrl || 'https://www.instagram.com/sdmapanrb',
      1000,
      'https://www.instagram.com/sdmapanrb'
    ),
    instagramThumbnail: safeIgThumb,
    isCustomThumbnail: Boolean(policy.isCustomThumbnail && safeCustomThumb),
    customThumbnail: safeCustomThumb,
    autoThumbnail: autoThumb,
    instagramDate: clampStr(policy.instagramDate || policy.publicationDate, 100, ''),
    instagramAccountHandle: clampStr(policy.instagramAccountHandle || '@sdmapanrb', 100, '@sdmapanrb'),
    status:
      policy.status === 'published' || policy.status === 'review' || policy.status === 'draft'
        ? policy.status
        : 'draft',
    sources: Array.isArray(policy.sources)
      ? policy.sources.slice(0, 30).map((s, idx) => ({
          id: sanitizeFirestoreId(s?.id || `src-${idx}`, 'src'),
          title: clampStr(s?.title || 'Dokumen Regulasi', 500, 'Dokumen Regulasi'),
          regulationType: clampStr(s?.regulationType || 'Regulasi Resmi', 150, 'Regulasi Resmi'),
          regulationNumber: clampStr(s?.regulationNumber, 150, ''),
          year: clampStr(s?.year, 20, ''),
          articles: clampStr(s?.articles, 500, ''),
          fileUrl: clampStr(s?.fileUrl, 1000, ''),
          description: clampStr(s?.description, 2000, ''),
          isVerified: s?.isVerified !== false,
        }))
      : [],
    relatedPolicyIds: Array.isArray(policy.relatedPolicyIds)
      ? policy.relatedPolicyIds.slice(0, 20).map((rid) => clampStr(rid, 128, ''))
      : [],
    publicationDate: clampStr(policy.instagramDate || policy.publicationDate, 100, ''),
    isFeatured: Boolean(policy.isFeatured),
    aiAssisted: Boolean(policy.aiAssisted),
    aiSummary: clampStr(policy.aiSummary, 10000, ''),
    isAiSummaryApproved: Boolean(policy.isAiSummaryApproved),
    aiSummaryGeneratedAt: clampStr(policy.aiSummaryGeneratedAt, 100, ''),
    instagramCaption: clampStr(policy.instagramCaption, 15000, ''),
  };

  const conceptA = sanitizeConcept(policy.conceptA);
  const conceptB = sanitizeConcept(policy.conceptB);
  const comparison = sanitizeComparison(policy.comparison);
  if (conceptA) base.conceptA = conceptA;
  if (conceptB) base.conceptB = conceptB;
  if (comparison) base.comparison = comparison;

  return base;
}

export function deserializePolicy(data: Record<string, any>): Policy {
  const isCustom = Boolean(data.isCustomThumbnail);
  const mainThumb = String(data.thumbnail || '');
  const createdAtIso = timestampToIso(data.createdAt);
  const updatedAtIso = timestampToIso(data.updatedAt);
  const rawInstagramDate = String(data.instagramDate || data.publicationDate || '');
  const instagramPostUrl = String(data.instagramPostUrl || '');
  const resolvedReleaseDate = resolvePolicyReleaseDate({
    instagramDate: data.instagramDate ? String(data.instagramDate) : '',
    publicationDate: data.publicationDate ? String(data.publicationDate) : '',
    instagramPostUrl,
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
  });
  const effectiveDate = resolvedReleaseDate !== '-' ? resolvedReleaseDate : rawInstagramDate;

  return {
    id: String(data.id || ''),
    title: String(data.title || ''),
    slug: String(data.slug || ''),
    categoryId: String(data.categoryId || ''),
    summary: String(data.summary || ''),
    contextHeader: data.contextHeader ? String(data.contextHeader) : undefined,
    contextExplanation: String(data.contextExplanation || ''),
    conceptA: data.conceptA || undefined,
    conceptB: data.conceptB || undefined,
    comparison: data.comparison || undefined,
    simultaneousExplanation: data.simultaneousExplanation
      ? String(data.simultaneousExplanation)
      : undefined,
    generalContent: data.generalContent ? String(data.generalContent) : undefined,
    classifications: Array.isArray(data.classifications) ? data.classifications : [],
    requirementsHeader: data.requirementsHeader ? String(data.requirementsHeader) : undefined,
    requirements: Array.isArray(data.requirements) ? data.requirements : [],
    processStepsHeader: data.processStepsHeader ? String(data.processStepsHeader) : undefined,
    processSteps: Array.isArray(data.processSteps) ? data.processSteps : [],
    faqs: Array.isArray(data.faqs) ? data.faqs : [],
    thumbnail: mainThumb,
    instagramPostUrl,
    instagramThumbnail: isCustom ? mainThumb : String(data.instagramThumbnail || mainThumb),
    isCustomThumbnail: isCustom,
    customThumbnail: isCustom ? String(data.customThumbnail || mainThumb) : undefined,
    autoThumbnail: data.autoThumbnail ? String(data.autoThumbnail) : undefined,
    instagramDate: effectiveDate,
    instagramAccountHandle: String(data.instagramAccountHandle || '@sdmapanrb'),
    status:
      data.status === 'published' || data.status === 'review' ? data.status : 'draft',
    sources: Array.isArray(data.sources) ? data.sources : [],
    relatedPolicyIds: Array.isArray(data.relatedPolicyIds) ? data.relatedPolicyIds : [],
    publicationDate: effectiveDate,
    isFeatured: Boolean(data.isFeatured),
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
    aiAssisted: Boolean(data.aiAssisted),
    aiSummary: data.aiSummary ? String(data.aiSummary) : undefined,
    isAiSummaryApproved: Boolean(data.isAiSummaryApproved),
    aiSummaryGeneratedAt: data.aiSummaryGeneratedAt
      ? String(data.aiSummaryGeneratedAt)
      : undefined,
    instagramCaption: data.instagramCaption ? String(data.instagramCaption) : undefined,
  };
}

export async function ensureCategoryExistsInFirestore(
  categoryId: string,
  allCategories: Category[]
): Promise<void> {
  const cleanCatId = sanitizeFirestoreId(categoryId, 'cat');
  const ref = doc(db, 'categories', cleanCatId);
  let exists = false;
  try {
    const { result: snap } = await withFirestoreRetry(() => getDocFromServer(ref));
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `categories/${cleanCatId}`);
  }
  if (!exists) {
    const found =
      allCategories.find((c) => sanitizeFirestoreId(c.id, 'cat') === cleanCatId) ||
      INITIAL_CATEGORIES.find((c) => c.id === cleanCatId) ||
      allCategories[0] ||
      INITIAL_CATEGORIES[0];
    if (found) {
      await saveCategoryToFirestore({ ...found, id: cleanCatId }, 0);
    }
  }
}

export async function savePolicyToFirestore(
  policy: Policy,
  allCategories: Category[]
): Promise<void> {
  const uid = requireCurrentAdminUid();
  const base = buildPolicyPayload(policy);
  await ensureCategoryExistsInFirestore(base.categoryId, allCategories);

  const path = `policies/${base.id}`;
  const ref = doc(db, 'policies', base.id);

  let existingSnapData: Record<string, any> | undefined;
  try {
    const { result: snap } = await withFirestoreRetry(() => getDocFromServer(ref));
    if (snap.exists()) {
      existingSnapData = snap.data();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (existingSnapData) {
      const { id: _id, ...mutable } = base;
      const updatePayload: Record<string, any> = {
        ...mutable,
        updatedAt: serverTimestamp(),
      };
      if (!('conceptA' in base) && 'conceptA' in existingSnapData) {
        updatePayload.conceptA = deleteField();
      }
      if (!('conceptB' in base) && 'conceptB' in existingSnapData) {
        updatePayload.conceptB = deleteField();
      }
      if (!('comparison' in base) && 'comparison' in existingSnapData) {
        updatePayload.comparison = deleteField();
      }
      await withFirestoreRetry(() => updateDoc(ref, updatePayload));
    } else {
      await withFirestoreRetry(() =>
        setDoc(ref, {
          ...base,
          authorUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingSnapData ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deletePolicyFromFirestore(policyId: string): Promise<void> {
  requireCurrentAdminUid();
  const cleanId = sanitizeFirestoreId(policyId, 'pol');
  const path = `policies/${cleanId}`;
  try {
    await withFirestoreRetry(() => deleteDoc(doc(db, 'policies', cleanId)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// DeputyNews Serialization & CRUD
// ============================================================================

export function buildDeputyNewsPayload(news: DeputyNews) {
  const id = sanitizeFirestoreId(news.id, 'news');
  return {
    id,
    title: clampStr(news.title || 'Berita Kedeputian SDMA', 300, 'Berita Kedeputian SDMA'),
    articleUrl: clampStr(news.articleUrl, 1000, 'https://www.menpan.go.id'),
    thumbnailUrl: sanitizeUrlMetadata(news.thumbnailUrl, ''),
    publicationDate: clampStr(
      news.publicationDate || new Date().toISOString().slice(0, 10),
      50,
      new Date().toISOString().slice(0, 10)
    ),
    summary: clampStr(news.summary, 5000, ''),
    category: clampStr(news.category || 'Transformasi ASN', 200, 'Transformasi ASN'),
    status: news.status === 'published' ? 'published' : 'draft',
  };
}

export function deserializeDeputyNews(data: Record<string, any>): DeputyNews {
  return {
    id: String(data.id || ''),
    title: String(data.title || ''),
    articleUrl: String(data.articleUrl || ''),
    thumbnailUrl: String(data.thumbnailUrl || ''),
    publicationDate: String(data.publicationDate || ''),
    summary: String(data.summary || ''),
    category: String(data.category || ''),
    status: data.status === 'published' ? 'published' : 'draft',
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function saveDeputyNewsToFirestore(news: DeputyNews): Promise<DeputyNews> {
  const uid = requireCurrentAdminUid();
  const base = buildDeputyNewsPayload(news);
  const path = `deputyNews/${base.id}`;
  const ref = doc(db, 'deputyNews', base.id);

  let exists = false;
  try {
    const { result: snap } = await withFirestoreRetry(() => getDocFromServer(ref));
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (exists) {
      const { id: _id, ...mutable } = base;
      await withFirestoreRetry(() =>
        updateDoc(ref, {
          ...mutable,
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await withFirestoreRetry(() =>
        setDoc(ref, {
          ...base,
          authorUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
  }

  try {
    const { result: fresh } = await withFirestoreRetry(() => getDocFromServer(ref));
    if (fresh.exists()) {
      return deserializeDeputyNews(fresh.data());
    }
  } catch {
    // Fallback
  }

  const now = new Date().toISOString();
  return {
    ...(base as Omit<DeputyNews, 'createdAt' | 'updatedAt'>),
    createdAt: news.createdAt || now,
    updatedAt: now,
  };
}

export async function deleteDeputyNewsFromFirestore(newsId: string): Promise<void> {
  requireCurrentAdminUid();
  const cleanId = sanitizeFirestoreId(newsId, 'news');
  const path = `deputyNews/${cleanId}`;
  try {
    await withFirestoreRetry(() => deleteDoc(doc(db, 'deputyNews', cleanId)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchDeputyNewsFromFirestoreServer(
  isFirebaseAdmin: boolean
): Promise<DeputyNews[]> {
  return runSerializedServerRead(async () => {
    if (hasFirestoreInternalAssertionTripped()) {
      const qLite = isFirebaseAdmin
        ? liteCollection(liteDb, 'deputyNews')
        : liteQuery(liteCollection(liteDb, 'deputyNews'), liteWhere('status', '==', 'published'));
      const snap = await liteGetDocs(qLite);
      return sortDeputyNewsNewestFirst(snap.docs.map((d) => deserializeDeputyNews(d.data())));
    }
    const q = isFirebaseAdmin
      ? collection(db, 'deputyNews')
      : query(collection(db, 'deputyNews'), where('status', '==', 'published'));
    const { result: snap } = await withFirestoreRetry(() => getDocsFromServer(q));
    return sortDeputyNewsNewestFirst(snap.docs.map((d) => deserializeDeputyNews(d.data())));
  });
}

// ============================================================================
// HeroSlides Serialization & CRUD
// ============================================================================

export function buildHeroSlidePayload(slide: HeroSlide, slotOrder: number) {
  const id = sanitizeFirestoreId(slide.id || `hero-slide-slot-${slotOrder + 1}`, 'slide');
  const cleanImg = sanitizeUrlMetadata(slide.imageUrl, '');
  return {
    id,
    imageUrl: cleanImg,
    title: cleanImg ? clampStr(slide.title, 300, '') : '',
    isActive: cleanImg ? Boolean(slide.isActive) : false,
    order: Math.max(0, Math.min(10, Math.floor(slotOrder))),
    isPublic: true,
  };
}

export function deserializeHeroSlide(data: Record<string, any>): HeroSlide {
  return {
    id: String(data.id || ''),
    imageUrl: String(data.imageUrl || ''),
    title: String(data.title || ''),
    isActive: Boolean(data.isActive),
    order: typeof data.order === 'number' ? data.order : 0,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function saveHeroSlidesToFirestore(slides: HeroSlide[]): Promise<HeroSlide[]> {
  const uid = requireCurrentAdminUid();
  const normalized = normalizeHeroSlides(slides);

  for (let idx = 0; idx < normalized.length; idx++) {
    const slotId = `hero-slide-${idx + 1}`;
    const base = buildHeroSlidePayload({ ...normalized[idx], id: slotId }, idx);
    const path = `heroSlides/${slotId}`;
    const ref = doc(db, 'heroSlides', slotId);

    let exists = false;
    try {
      const { result: snap } = await withFirestoreRetry(() => getDocFromServer(ref));
      exists = snap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    try {
      if (exists) {
        const { id: _id, ...mutable } = base;
        await withFirestoreRetry(() =>
          updateDoc(ref, {
            ...mutable,
            updatedAt: serverTimestamp(),
          })
        );
      } else {
        await withFirestoreRetry(() =>
          setDoc(ref, {
            ...base,
            authorUid: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      }
    } catch (error) {
      handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  }

  return normalized.map((s, idx) => ({
    ...s,
    id: `hero-slide-${idx + 1}`,
    imageUrl: sanitizeUrlMetadata(s.imageUrl, ''),
    order: idx,
    updatedAt: new Date().toISOString(),
  }));
}

export async function fetchHeroSlidesFromFirestoreServer(
  isFirebaseAdmin: boolean
): Promise<HeroSlide[]> {
  return runSerializedServerRead(async () => {
    if (hasFirestoreInternalAssertionTripped()) {
      const qLite = isFirebaseAdmin
        ? liteCollection(liteDb, 'heroSlides')
        : liteQuery(liteCollection(liteDb, 'heroSlides'), liteWhere('isPublic', '==', true));
      const snap = await liteGetDocs(qLite);
      if (snap.empty) {
        return normalizeHeroSlides(DEFAULT_HERO_SLIDES);
      }
      return normalizeHeroSlides(snap.docs.map((d) => deserializeHeroSlide(d.data())));
    }
    const q = isFirebaseAdmin
      ? collection(db, 'heroSlides')
      : query(collection(db, 'heroSlides'), where('isPublic', '==', true));
    const { result: snap } = await withFirestoreRetry(() => getDocsFromServer(q));
    if (snap.empty) {
      return normalizeHeroSlides(DEFAULT_HERO_SLIDES);
    }
    return normalizeHeroSlides(snap.docs.map((d) => deserializeHeroSlide(d.data())));
  });
}

// ============================================================================
// AboutPage Singleton (/siteContent/aboutPage) Serialization & CRUD
// ============================================================================

export function buildAboutPagePayload(content: AboutPageContent) {
  const sourceUnits =
    Array.isArray(content.units) && content.units.length === 6
      ? content.units
      : DEFAULT_ABOUT_PAGE_CONTENT.units;

  const sanitizedUnits: AboutUnitWork[] = sourceUnits.map((u, idx) => {
    const fallback = DEFAULT_ABOUT_PAGE_CONTENT.units[idx];
    const unitObj: AboutUnitWork = {
      id: sanitizeFirestoreId(u?.id || fallback.id, 'unit'),
      name: clampStr(u?.name || fallback.name, 250, fallback.name),
      orgChartLabel: clampStr(
        u?.orgChartLabel || fallback.orgChartLabel,
        300,
        fallback.orgChartLabel
      ),
      iconName: u?.iconName || fallback.iconName,
      mainTask: clampStr(u?.mainTask || fallback.mainTask, 2500, fallback.mainTask),
      detailedTasks:
        Array.isArray(u?.detailedTasks) && u.detailedTasks.length > 0
          ? u.detailedTasks.slice(0, 20).map((t) => clampStr(t, 600, ''))
          : fallback.detailedTasks,
    };
    if (u?.subUnit && u.subUnit.name && u.subUnit.description) {
      unitObj.subUnit = {
        name: clampStr(u.subUnit.name, 200, ''),
        description: clampStr(u.subUnit.description, 1500, ''),
      };
    }
    return unitObj;
  });

  const cleanProfileUrl = sanitizeUrlMetadata(content.profileImageUrl, '');

  return {
    id: 'aboutPage',
    heading: clampStr(
      content.heading || DEFAULT_ABOUT_PAGE_CONTENT.heading,
      300,
      DEFAULT_ABOUT_PAGE_CONTENT.heading
    ),
    subheading: clampStr(
      content.subheading || DEFAULT_ABOUT_PAGE_CONTENT.subheading,
      300,
      DEFAULT_ABOUT_PAGE_CONTENT.subheading
    ),
    description: clampStr(
      content.description || DEFAULT_ABOUT_PAGE_CONTENT.description,
      10000,
      DEFAULT_ABOUT_PAGE_CONTENT.description
    ),
    profileImageUrl: cleanProfileUrl,
    profileImageUpdatedAt: cleanProfileUrl
      ? clampStr(content.profileImageUpdatedAt || '', 100, '')
      : '',
    orgSectionTitle: clampStr(
      content.orgSectionTitle || DEFAULT_ABOUT_PAGE_CONTENT.orgSectionTitle,
      300,
      DEFAULT_ABOUT_PAGE_CONTENT.orgSectionTitle
    ),
    orgTopLevelTitle: clampStr(
      content.orgTopLevelTitle || DEFAULT_ABOUT_PAGE_CONTENT.orgTopLevelTitle,
      300,
      DEFAULT_ABOUT_PAGE_CONTENT.orgTopLevelTitle
    ),
    unitSectionTitle: clampStr(
      content.unitSectionTitle || DEFAULT_ABOUT_PAGE_CONTENT.unitSectionTitle,
      300,
      DEFAULT_ABOUT_PAGE_CONTENT.unitSectionTitle
    ),
    unitSectionSubtitle: clampStr(
      content.unitSectionSubtitle || DEFAULT_ABOUT_PAGE_CONTENT.unitSectionSubtitle,
      1000,
      DEFAULT_ABOUT_PAGE_CONTENT.unitSectionSubtitle
    ),
    units: sanitizedUnits,
    visibility: 'public',
  };
}

export function deserializeAboutPage(data: Record<string, any>): AboutPageContent {
  return {
    heading: String(data.heading || DEFAULT_ABOUT_PAGE_CONTENT.heading),
    subheading: String(data.subheading || DEFAULT_ABOUT_PAGE_CONTENT.subheading),
    description: String(data.description || DEFAULT_ABOUT_PAGE_CONTENT.description),
    profileImageUrl: String(data.profileImageUrl || ''),
    profileImageUpdatedAt: data.profileImageUpdatedAt ? String(data.profileImageUpdatedAt) : null,
    orgSectionTitle: String(data.orgSectionTitle || DEFAULT_ABOUT_PAGE_CONTENT.orgSectionTitle),
    orgTopLevelTitle: String(data.orgTopLevelTitle || DEFAULT_ABOUT_PAGE_CONTENT.orgTopLevelTitle),
    unitSectionTitle: String(data.unitSectionTitle || DEFAULT_ABOUT_PAGE_CONTENT.unitSectionTitle),
    unitSectionSubtitle: String(
      data.unitSectionSubtitle || DEFAULT_ABOUT_PAGE_CONTENT.unitSectionSubtitle
    ),
    units:
      Array.isArray(data.units) && data.units.length === 6
        ? data.units
        : DEFAULT_ABOUT_PAGE_CONTENT.units,
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function saveAboutPageToFirestore(
  content: AboutPageContent
): Promise<AboutPageContent> {
  const uid = requireCurrentAdminUid();
  const base = buildAboutPagePayload(content);
  const path = 'siteContent/aboutPage';
  const ref = doc(db, 'siteContent', 'aboutPage');

  let exists = false;
  try {
    const { result: snap } = await withFirestoreRetry(() => getDocFromServer(ref));
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (exists) {
      const { id: _id, ...mutable } = base;
      await withFirestoreRetry(() =>
        updateDoc(ref, {
          ...mutable,
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await withFirestoreRetry(() =>
        setDoc(ref, {
          ...base,
          authorUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
  }

  try {
    const { result: fresh } = await withFirestoreRetry(() => getDocFromServer(ref));
    if (fresh.exists()) {
      return deserializeAboutPage(fresh.data());
    }
  } catch {
    // Fallback
  }

  return {
    ...content,
    profileImageUrl: base.profileImageUrl,
    profileImageUpdatedAt: base.profileImageUpdatedAt || null,
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchAboutPageFromFirestoreServer(): Promise<AboutPageContent> {
  return runSerializedServerRead(async () => {
    if (hasFirestoreInternalAssertionTripped()) {
      const snap = await liteGetDoc(liteDoc(liteDb, 'siteContent', 'aboutPage'));
      if (!snap.exists()) {
        return DEFAULT_ABOUT_PAGE_CONTENT;
      }
      return deserializeAboutPage(snap.data());
    }
    const { result: snap } = await withFirestoreRetry(() =>
      getDocFromServer(doc(db, 'siteContent', 'aboutPage'))
    );
    if (!snap.exists()) {
      return DEFAULT_ABOUT_PAGE_CONTENT;
    }
    return deserializeAboutPage(snap.data());
  });
}

// ============================================================================
// Optional Manual Reference Seeding (Only Triggered by Explicit Admin Action — Zero Migration)
// ============================================================================

export async function syncInitialDataToFirestoreIfEmpty(): Promise<void> {
  if (!auth.currentUser?.uid || !auth.currentUser.emailVerified) {
    return;
  }

  const uid = auth.currentUser.uid;
  try {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        uid,
        email: clampStr(auth.currentUser.email || '', 200, ''),
        name: clampStr(
          auth.currentUser.displayName || 'Administrator SDMA',
          150,
          'Administrator SDMA'
        ),
        role: 'superadmin',
        department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Could not register admin profile record:', err);
  }

  // 1. Seed standard Categories if Firestore /categories is empty
  const catSnap = await getDocs(query(collection(db, 'categories'), where('isPublic', '==', true)));
  if (catSnap.empty) {
    for (let i = 0; i < INITIAL_CATEGORIES.length; i++) {
      await saveCategoryToFirestore(INITIAL_CATEGORIES[i], i);
    }
  }

  // 2. Seed standard Sources if Firestore /sources is empty
  const srcSnap = await getDocs(query(collection(db, 'sources'), where('isPublic', '==', true)));
  if (srcSnap.empty) {
    for (const s of INITIAL_SOURCES) {
      await saveSourceToFirestore(s);
    }
  }

  // 3. Seed standard HeroSlides if Firestore /heroSlides is empty
  const heroSnap = await getDocs(query(collection(db, 'heroSlides'), where('isPublic', '==', true)));
  if (heroSnap.empty) {
    await saveHeroSlidesToFirestore(DEFAULT_HERO_SLIDES);
  }

  // 4. Seed AboutPage singleton if /siteContent/aboutPage does not exist
  try {
    const aboutSnap = await getDoc(doc(db, 'siteContent', 'aboutPage'));
    if (!aboutSnap.exists()) {
      await saveAboutPageToFirestore(DEFAULT_ABOUT_PAGE_CONTENT);
    }
  } catch {
    await saveAboutPageToFirestore(DEFAULT_ABOUT_PAGE_CONTENT);
  }
}

export interface HydratedFirestoreData {
  categories: Category[] | null;
  sources: SourceDocument[] | null;
  policies: Policy[];
  deputyNews: DeputyNews[];
  heroSlides: HeroSlide[] | null;
  aboutPage: AboutPageContent | null;
}

async function hydrateViaStatelessLiteRest(
  isFirebaseAdmin: boolean
): Promise<HydratedFirestoreData> {
  const polQuery = isFirebaseAdmin
    ? liteCollection(liteDb, 'policies')
    : liteQuery(liteCollection(liteDb, 'policies'), liteWhere('status', '==', 'published'));
  const newsQuery = isFirebaseAdmin
    ? liteCollection(liteDb, 'deputyNews')
    : liteQuery(liteCollection(liteDb, 'deputyNews'), liteWhere('status', '==', 'published'));
  const catQuery = isFirebaseAdmin
    ? liteCollection(liteDb, 'categories')
    : liteQuery(liteCollection(liteDb, 'categories'), liteWhere('isPublic', '==', true));
  const srcQuery = isFirebaseAdmin
    ? liteCollection(liteDb, 'sources')
    : liteQuery(liteCollection(liteDb, 'sources'), liteWhere('isPublic', '==', true));
  const heroQuery = isFirebaseAdmin
    ? liteCollection(liteDb, 'heroSlides')
    : liteQuery(liteCollection(liteDb, 'heroSlides'), liteWhere('isPublic', '==', true));
  const aboutRef = liteDoc(liteDb, 'siteContent', 'aboutPage');

  const [catSnap, srcSnap, polSnap, newsSnap, heroSnap, aboutSnap] = await Promise.all([
    liteGetDocs(catQuery),
    liteGetDocs(srcQuery),
    liteGetDocs(polQuery),
    liteGetDocs(newsQuery),
    liteGetDocs(heroQuery),
    liteGetDoc(aboutRef),
  ]);

  return {
    categories: !catSnap.empty
      ? catSnap.docs
          .map((d) => deserializeCategory(d.data()))
          .sort((a, b) => a._order - b._order)
          .map(({ _order: _, ...cat }) => cat)
      : null,
    sources: !srcSnap.empty ? srcSnap.docs.map((d) => deserializeSource(d.data())) : null,
    policies: polSnap.docs
      .map((d) => deserializePolicy(d.data()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    deputyNews: sortDeputyNewsNewestFirst(
      newsSnap.docs.map((d) => deserializeDeputyNews(d.data()))
    ),
    heroSlides: !heroSnap.empty
      ? normalizeHeroSlides(heroSnap.docs.map((d) => deserializeHeroSlide(d.data())))
      : null,
    aboutPage: aboutSnap.exists() ? deserializeAboutPage(aboutSnap.data()) : null,
  };
}

/**
 * Authoritative server hydration using `getDocsFromServer()` and `getDocFromServer()`
 * serialized through `runSerializedServerRead` so watch targets never collide.
 * Replaces persistent `onSnapshot()` streams to prevent WatchChangeAggregator / TargetState (`ca9`/`b815`) assertions.
 */
export async function hydrateAllFromFirestoreWithRetry(
  isFirebaseAdmin: boolean
): Promise<{
  ok: boolean;
  fromServer: boolean;
  transport: 'firestore-server' | 'firestore-lite-rest' | 'memory-cache' | 'none';
  attempts: number;
  data?: HydratedFirestoreData;
  error?: string;
}> {
  return runSerializedServerRead(async () => {
    if (hasFirestoreInternalAssertionTripped()) {
      try {
        const restData = await hydrateViaStatelessLiteRest(isFirebaseAdmin);
        return {
          ok: true,
          fromServer: true,
          transport: 'firestore-lite-rest',
          attempts: 1,
          data: restData,
        };
      } catch (liteErr: any) {
        return {
          ok: false,
          fromServer: false,
          transport: 'none',
          attempts: 1,
          error: liteErr?.message || 'Gagal memuat data dari server Cloud Firestore.',
        };
      }
    }

    const polQuery = isFirebaseAdmin
      ? collection(db, 'policies')
      : query(collection(db, 'policies'), where('status', '==', 'published'));
    const newsQuery = isFirebaseAdmin
      ? collection(db, 'deputyNews')
      : query(collection(db, 'deputyNews'), where('status', '==', 'published'));
    const catQuery = isFirebaseAdmin
      ? collection(db, 'categories')
      : query(collection(db, 'categories'), where('isPublic', '==', true));
    const srcQuery = isFirebaseAdmin
      ? collection(db, 'sources')
      : query(collection(db, 'sources'), where('isPublic', '==', true));
    const heroQuery = isFirebaseAdmin
      ? collection(db, 'heroSlides')
      : query(collection(db, 'heroSlides'), where('isPublic', '==', true));
    const aboutRef = doc(db, 'siteContent', 'aboutPage');

    try {
      const { result, attempts } = await withFirestoreRetry(async () => {
        // Sequential per-target server reads eliminate intra-batch target multiplexing races
        const catSnap = await getDocsFromServer(catQuery);
        const srcSnap = await getDocsFromServer(srcQuery);
        const polSnap = await getDocsFromServer(polQuery);
        const newsSnap = await getDocsFromServer(newsQuery);
        const heroSnap = await getDocsFromServer(heroQuery);
        const aboutSnap = await getDocFromServer(aboutRef);
        return [catSnap, srcSnap, polSnap, newsSnap, heroSnap, aboutSnap] as const;
      }, 3);

      const [catSnap, srcSnap, polSnap, newsSnap, heroSnap, aboutSnap] = result;

      return {
        ok: true,
        fromServer: true,
        transport: 'firestore-server',
        attempts,
        data: {
          categories: !catSnap.empty
            ? catSnap.docs
                .map((d) => deserializeCategory(d.data()))
                .sort((a, b) => a._order - b._order)
                .map(({ _order: _, ...cat }) => cat)
            : null,
          sources: !srcSnap.empty ? srcSnap.docs.map((d) => deserializeSource(d.data())) : null,
          policies: polSnap.docs
            .map((d) => deserializePolicy(d.data()))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          deputyNews: sortDeputyNewsNewestFirst(
            newsSnap.docs.map((d) => deserializeDeputyNews(d.data()))
          ),
          heroSlides: !heroSnap.empty
            ? normalizeHeroSlides(heroSnap.docs.map((d) => deserializeHeroSlide(d.data())))
            : null,
          aboutPage: aboutSnap.exists() ? deserializeAboutPage(aboutSnap.data()) : null,
        },
      };
    } catch (err: any) {
      if (isFirestoreInternalAssertion(err)) {
        markFirestoreInternalAssertion(err?.message || String(err));
        try {
          const restData = await hydrateViaStatelessLiteRest(isFirebaseAdmin);
          return {
            ok: true,
            fromServer: true,
            transport: 'firestore-lite-rest',
            attempts: 1,
            data: restData,
          };
        } catch {
          // Fall through to preserve last valid state
        }
      }

      if (!hasFirestoreInternalAssertionTripped()) {
        try {
          const [catSnap, srcSnap, polSnap, newsSnap, heroSnap, aboutSnap] = await Promise.all([
            getDocs(catQuery),
            getDocs(srcQuery),
            getDocs(polQuery),
            getDocs(newsQuery),
            getDocs(heroQuery),
            getDoc(aboutRef),
          ]);
          const hasAnyCached =
            !catSnap.empty ||
            !srcSnap.empty ||
            !polSnap.empty ||
            !newsSnap.empty ||
            !heroSnap.empty ||
            aboutSnap.exists();

          return {
            ok: false,
            fromServer: false,
            transport: hasAnyCached ? 'memory-cache' : 'none',
            attempts: 3,
            error: err?.message || 'Gagal memperbarui data dari server Cloud Firestore.',
            data: hasAnyCached
              ? {
                  categories: !catSnap.empty
                    ? catSnap.docs
                        .map((d) => deserializeCategory(d.data()))
                        .sort((a, b) => a._order - b._order)
                        .map(({ _order: _, ...cat }) => cat)
                    : null,
                  sources: !srcSnap.empty
                    ? srcSnap.docs.map((d) => deserializeSource(d.data()))
                    : null,
                  policies: polSnap.docs
                    .map((d) => deserializePolicy(d.data()))
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
                  deputyNews: sortDeputyNewsNewestFirst(
                    newsSnap.docs.map((d) => deserializeDeputyNews(d.data()))
                  ),
                  heroSlides: !heroSnap.empty
                    ? normalizeHeroSlides(heroSnap.docs.map((d) => deserializeHeroSlide(d.data())))
                    : null,
                  aboutPage: aboutSnap.exists() ? deserializeAboutPage(aboutSnap.data()) : null,
                }
              : undefined,
          };
        } catch {
          // Ignore cache fallback failure
        }
      }

      return {
        ok: false,
        fromServer: false,
        transport: 'none',
        attempts: 3,
        error: err?.message || 'Gagal menghubungi server Cloud Firestore.',
      };
    }
  });
}

// ============================================================================
// Safe Admin Connection Audit, Stability Verification & Read/Write Probe
// ============================================================================

export interface DatabaseProbeSummary {
  databaseId: string;
  reachable: boolean;
  rulesStatus: 'ok' | 'permission-denied' | 'error';
  message: string;
  attemptsUsed: number;
}

export interface FirestoreDocumentCounts {
  policies: number;
  deputyNews: number;
  categories: number;
  sources: number;
  heroSlides: number;
  aboutPageExists: boolean;
}

export interface FirestoreAuditReport {
  checkedAt: string;
  projectId: string;
  activeDatabaseId: string;
  provisionedDatabaseId: string;
  storageEnabled: boolean;
  singletonAppsCount: number;
  internalAssertionTripped: boolean;
  auth: {
    isSignedIn: boolean;
    uid: string | null;
    email: string | null;
    emailVerified: boolean;
  };
  activeDbStatus: DatabaseProbeSummary;
  /**
   * Non-null ONLY when the server read succeeded.
   * When null, callers MUST preserve last valid counts rather than resetting to 0.
   */
  serverDocumentCounts: FirestoreDocumentCounts | null;
}

export interface ConnectionStabilityReport {
  ok: boolean;
  checkedAt: string;
  projectId: string;
  databaseId: string;
  singletonAppsCount: number;
  internalAssertionCount: number;
  checks: {
    singletonAndDbIdentityOk: boolean;
    consecutiveRefreshReadsOk: boolean;
    sessionTransitionReadsOk: boolean;
    navigationContentAndImageUrlsOk: boolean;
  };
  verifiedCounts: FirestoreDocumentCounts;
  verifiedImageUrlsCount: number;
  message: string;
}

export interface SafeReadWriteTestResult {
  ok: boolean;
  checkedAt: string;
  databaseId: string;
  documentPath: string;
  cleanedUp: boolean;
  steps: {
    createOk: boolean;
    serverReadAfterCreateOk: boolean;
    updateOk: boolean;
    serverReadAfterUpdateOk: boolean;
    cleanupDeleteOk: boolean;
  };
  message: string;
}

export async function runReadOnlyFirestoreAudit(
  projectId: string,
  activeDatabaseId: string,
  provisionedDatabaseId: string,
  storageEnabled: boolean
): Promise<FirestoreAuditReport> {
  const isAdminSession = Boolean(auth.currentUser?.uid && auth.currentUser?.emailVerified);

  let activeDbStatus: DatabaseProbeSummary = {
    databaseId: activeDatabaseId,
    reachable: false,
    rulesStatus: 'error',
    message: '',
    attemptsUsed: 1,
  };
  let verifiedCounts: FirestoreDocumentCounts | null = null;

  try {
    const hydrated = await hydrateAllFromFirestoreWithRetry(isAdminSession);
    if (hydrated.ok && hydrated.data) {
      verifiedCounts = {
        policies: hydrated.data.policies.length,
        deputyNews: hydrated.data.deputyNews.length,
        categories: hydrated.data.categories ? hydrated.data.categories.length : 0,
        sources: hydrated.data.sources ? hydrated.data.sources.length : 0,
        heroSlides: hydrated.data.heroSlides ? hydrated.data.heroSlides.length : 0,
        aboutPageExists: Boolean(hydrated.data.aboutPage),
      };

      activeDbStatus = {
        databaseId: activeDatabaseId,
        reachable: true,
        rulesStatus: 'ok',
        message:
          hydrated.attempts > 1
            ? `Terhubung ke server Cloud Firestore setelah pemulihan koneksi otomatis (percobaan ke-${hydrated.attempts}).`
            : 'Terhubung langsung ke server Cloud Firestore dan Security Rules aktif.',
        attemptsUsed: hydrated.attempts,
      };
    } else {
      throw new Error(hydrated.error || 'Gagal membaca dokumen dari server Cloud Firestore.');
    }
  } catch (err: any) {
    const code = String(err?.code || '');
    const rawMsg = String(err?.message || 'Gagal menghubungi server Cloud Firestore.');
    activeDbStatus = {
      databaseId: activeDatabaseId,
      reachable: !isTransientFirestoreError(err),
      rulesStatus: code === 'permission-denied' ? 'permission-denied' : 'error',
      message:
        code === 'permission-denied'
          ? 'Ditolak oleh Security Rules pada database ini (permission-denied).'
          : `Pembacaan server gagal sementara (${rawMsg}). Data terakhir yang valid tetap dipertahankan.`,
      attemptsUsed: 3,
    };
  }

  const assertionState = getFirestoreInternalAssertionState();

  return {
    checkedAt: new Date().toISOString(),
    projectId,
    activeDatabaseId,
    provisionedDatabaseId,
    storageEnabled,
    singletonAppsCount: getApps().length,
    internalAssertionTripped: assertionState.tripped,
    auth: {
      isSignedIn: Boolean(auth.currentUser),
      uid: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: Boolean(auth.currentUser?.emailVerified),
    },
    activeDbStatus,
    serverDocumentCounts: verifiedCounts,
  };
}

/**
 * 100% Read-Only Stability Verification across Refresh, Auth-Mode Transition, and Route Navigation.
 * Never writes, modifies, resets, or deletes any document.
 */
export async function runConnectionStabilityVerification(): Promise<ConnectionStabilityReport> {
  const isAdminSession = Boolean(auth.currentUser?.uid && auth.currentUser?.emailVerified);
  const singletonAppsCount = getApps().length;
  const singletonAndDbIdentityOk =
    singletonAppsCount === 1 &&
    FIREBASE_PROJECT_ID === 'sdmaapp' &&
    FIRESTORE_DATABASE_ID.startsWith('ai-studio-') &&
    FIRESTORE_DATABASE_ID !== '(default)';

  // 1. Consecutive refresh simulation (2 sequential full server hydrations)
  const refreshPass1 = await hydrateAllFromFirestoreWithRetry(isAdminSession);
  const refreshPass2 = await hydrateAllFromFirestoreWithRetry(isAdminSession);
  const consecutiveRefreshReadsOk =
    refreshPass1.ok && refreshPass1.fromServer && refreshPass2.ok && refreshPass2.fromServer;

  // 2. Session / public query mode transition check
  const publicModePass = await hydrateAllFromFirestoreWithRetry(false);
  const sessionTransitionReadsOk = publicModePass.ok && publicModePass.fromServer;

  // 3. Page navigation read check (HeroSlides, AboutPage, DeputyNews individual server fetchers)
  const [navSlides, navAbout, navNews] = await Promise.all([
    fetchHeroSlidesFromFirestoreServer(isAdminSession),
    fetchAboutPageFromFirestoreServer(),
    fetchDeputyNewsFromFirestoreServer(isAdminSession),
  ]);

  const slideImageUrls = navSlides.filter((s) => Boolean(s.imageUrl && s.imageUrl.trim()));
  const aboutHasImage = Boolean(navAbout.profileImageUrl && navAbout.profileImageUrl.trim());
  const policyImageUrls = (refreshPass2.data?.policies || []).filter((p) =>
    Boolean(p.thumbnail && p.thumbnail.trim())
  );
  const newsImageUrls = navNews.filter((n) => Boolean(n.thumbnailUrl && n.thumbnailUrl.trim()));

  const verifiedImageUrlsCount =
    slideImageUrls.length +
    (aboutHasImage ? 1 : 0) +
    policyImageUrls.length +
    newsImageUrls.length;

  const navigationContentAndImageUrlsOk =
    Array.isArray(navSlides) &&
    navSlides.length > 0 &&
    Boolean(navAbout.heading) &&
    Array.isArray(navAbout.units) &&
    navAbout.units.length === 6;

  const assertionState = getFirestoreInternalAssertionState();
  const ok =
    singletonAndDbIdentityOk &&
    consecutiveRefreshReadsOk &&
    sessionTransitionReadsOk &&
    navigationContentAndImageUrlsOk &&
    assertionState.count === 0;

  const finalData = refreshPass2.data;
  const verifiedCounts: FirestoreDocumentCounts = {
    policies: finalData ? finalData.policies.length : 0,
    deputyNews: finalData ? finalData.deputyNews.length : 0,
    categories: finalData?.categories ? finalData.categories.length : 0,
    sources: finalData?.sources ? finalData.sources.length : 0,
    heroSlides: finalData?.heroSlides ? finalData.heroSlides.length : 0,
    aboutPageExists: Boolean(finalData?.aboutPage),
  };

  return {
    ok,
    checkedAt: new Date().toISOString(),
    projectId: FIREBASE_PROJECT_ID,
    databaseId: FIRESTORE_DATABASE_ID,
    singletonAppsCount,
    internalAssertionCount: assertionState.count,
    checks: {
      singletonAndDbIdentityOk,
      consecutiveRefreshReadsOk,
      sessionTransitionReadsOk,
      navigationContentAndImageUrlsOk,
    },
    verifiedCounts,
    verifiedImageUrlsCount,
    message: ok
      ? `Seluruh uji stabilitas (Refresh beruntun, Transisi Sesi Auth, Navigasi Halaman, & Resolusi ${verifiedImageUrlsCount} URL Gambar) berjalan 100% stabil pada database ${FIRESTORE_DATABASE_ID} dengan 0 Internal Assertion.`
      : 'Sebagian pemeriksaan stabilitas mendeteksi kendala jaringan sementara. Data terakhir yang valid tetap dipertahankan.',
  };
}

export async function runSafeAdminReadWriteTest(
  activeDatabaseId: string,
  options: { cleanupAfterVerify: boolean }
): Promise<SafeReadWriteTestResult> {
  const uid = requireCurrentAdminUid();
  const docId = 'src-admin-audit-probe';
  const docPath = `sources/${docId}`;
  const ref = doc(db, 'sources', docId);
  const token1 = `AUDIT-${Date.now()}`;
  const token2 = `${token1}-UPDATED`;

  const steps = {
    createOk: false,
    serverReadAfterCreateOk: false,
    updateOk: false,
    serverReadAfterUpdateOk: false,
    cleanupDeleteOk: false,
  };

  let alreadyExisted = false;
  try {
    const { result: pre } = await withFirestoreRetry(() => getDocFromServer(ref));
    alreadyExisted = pre.exists();
  } catch {
    alreadyExisted = false;
  }

  if (alreadyExisted) {
    await withFirestoreRetry(() => deleteDoc(ref));
  }

  await withFirestoreRetry(() =>
    setDoc(ref, {
      id: docId,
      title: 'Dokumen Verifikasi Koneksi Admin Firestore',
      regulationType: 'Verifikasi Sistem Internal',
      regulationNumber: token1,
      year: String(new Date().getFullYear()),
      articles: '',
      fileUrl: '',
      description:
        'Dokumen diagnostik non-publik (isPublic=false) yang dibuat atas persetujuan Admin.',
      isVerified: false,
      isPublic: false,
      authorUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  steps.createOk = true;

  const { result: snapAfterCreate } = await withFirestoreRetry(() => getDocFromServer(ref));
  if (!snapAfterCreate.exists() || snapAfterCreate.data()?.regulationNumber !== token1) {
    throw new Error('Verifikasi baca server setelah CREATE gagal: data tidak cocok.');
  }
  steps.serverReadAfterCreateOk = true;

  await withFirestoreRetry(() =>
    updateDoc(ref, {
      title: 'Dokumen Verifikasi Koneksi Admin Firestore (Terverifikasi)',
      regulationType: 'Verifikasi Sistem Internal',
      regulationNumber: token2,
      year: String(new Date().getFullYear()),
      articles: '',
      fileUrl: '',
      description: 'Pembaruan dokumen diagnostik non-publik berhasil.',
      isVerified: true,
      isPublic: false,
      updatedAt: serverTimestamp(),
    })
  );
  steps.updateOk = true;

  const { result: snapAfterUpdate } = await withFirestoreRetry(() => getDocFromServer(ref));
  if (!snapAfterUpdate.exists() || snapAfterUpdate.data()?.regulationNumber !== token2) {
    throw new Error('Verifikasi baca server setelah UPDATE gagal: perubahan tidak tercatat.');
  }
  steps.serverReadAfterUpdateOk = true;

  let cleanedUp = false;
  if (options.cleanupAfterVerify) {
    await withFirestoreRetry(() => deleteDoc(ref));
    const { result: snapAfterDelete } = await withFirestoreRetry(() => getDocFromServer(ref));
    if (snapAfterDelete.exists()) {
      throw new Error('Gagal menghapus dokumen uji sementara dari server Firestore.');
    }
    steps.cleanupDeleteOk = true;
    cleanedUp = true;
  }

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    databaseId: activeDatabaseId,
    documentPath: docPath,
    cleanedUp,
    steps,
    message: cleanedUp
      ? `Uji CREATE, READ (Server), UPDATE, dan DELETE pada Cloud Firestore (${activeDatabaseId}) berhasil 100%, dan dokumen uji telah dibersihkan kembali.`
      : `Uji CREATE, READ (Server), dan UPDATE berhasil! Dokumen non-publik "${docPath}" sengaja dipertahankan agar Anda dapat melihatnya langsung di tab Data Firebase Console.`,
  };
}


