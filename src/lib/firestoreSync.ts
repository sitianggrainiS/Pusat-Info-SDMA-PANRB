import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { buildAuthorizedAdminFromFirestore } from '../data/adminUsers';
import {
  Policy,
  PolicyStatus,
  DeputyNews,
  DeputyNewsStatus,
  HeroSlide,
  Category,
  SourceDocument,
  AboutPageContent,
  AdminUser,
} from '../types';

export interface FirestoreSyncResult {
  success: boolean;
  message: string;
  counts: {
    policies: number;
    deputyNews: number;
    heroSlides: number;
    categories: number;
    sources: number;
    aboutPage: boolean;
  };
  syncedAt: string;
}

/**
 * Recursively removes undefined values from objects and arrays before writing to Cloud Firestore,
 * while preserving null (when explicitly expected) and primitive values.
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out as T;
  }
  return value;
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS (onSnapshot)
// ============================================================================

export function subscribePolicies(
  isVerifiedAdmin: boolean,
  onData: (items: Policy[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'policies');
  const targetQuery = isVerifiedAdmin
    ? colRef
    : query(colRef, where('status', '==', 'published'));

  return onSnapshot(
    targetQuery,
    (snapshot) => {
      const items: Policy[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Policy);
      });
      onData(items);
    },
    (error) => {
      console.error('Firestore subscribePolicies error:', error);
      onError?.(error);
    }
  );
}

export function subscribeDeputyNews(
  isVerifiedAdmin: boolean,
  onData: (items: DeputyNews[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'deputy_news');
  const targetQuery = isVerifiedAdmin
    ? colRef
    : query(colRef, where('status', '==', 'published'));

  return onSnapshot(
    targetQuery,
    (snapshot) => {
      const items: DeputyNews[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as DeputyNews);
      });
      onData(items);
    },
    (error) => {
      console.error('Firestore subscribeDeputyNews error:', error);
      onError?.(error);
    }
  );
}

export function subscribeHeroSlides(
  onData: (items: HeroSlide[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'hero_slides'),
    (snapshot) => {
      const items: HeroSlide[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as HeroSlide);
      });
      items.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      onData(items);
    },
    (error) => {
      console.error('Firestore subscribeHeroSlides error:', error);
      onError?.(error);
    }
  );
}

export function subscribeCategories(
  onData: (items: Category[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'categories'),
    (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Category);
      });
      onData(items);
    },
    (error) => {
      console.error('Firestore subscribeCategories error:', error);
      onError?.(error);
    }
  );
}

export function subscribeSources(
  onData: (items: SourceDocument[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'sources'),
    (snapshot) => {
      const items: SourceDocument[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as SourceDocument);
      });
      onData(items);
    },
    (error) => {
      console.error('Firestore subscribeSources error:', error);
      onError?.(error);
    }
  );
}

export function subscribeAboutPage(
  onData: (content: AboutPageContent | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'about_page', 'main'),
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as AboutPageContent);
      } else {
        onData(null);
      }
    },
    (error) => {
      console.error('Firestore subscribeAboutPage error:', error);
      onError?.(error);
    }
  );
}

// ============================================================================
// PER-COLLECTION FIRESTORE CRUD HELPERS
// ============================================================================

export function buildFirestorePolicyPayload(policy: Policy): Policy {
  const now = new Date().toISOString();
  return sanitizeForFirestore({
    ...policy,
    id: policy.id,
    title: policy.title || 'Kebijakan Baru',
    slug: policy.slug || policy.id,
    categoryId: policy.categoryId || '',
    status: (policy.status || 'published') as PolicyStatus,
    summary: policy.summary ?? '',
    contextExplanation: policy.contextExplanation ?? '',
    requirements: Array.isArray(policy.requirements) ? policy.requirements : [],
    processSteps: Array.isArray(policy.processSteps) ? policy.processSteps : [],
    faqs: Array.isArray(policy.faqs) ? policy.faqs : [],
    sources: Array.isArray(policy.sources) ? policy.sources : [],
    relatedPolicyIds: Array.isArray(policy.relatedPolicyIds) ? policy.relatedPolicyIds : [],
    thumbnail: policy.thumbnail ?? '',
    instagramPostUrl: policy.instagramPostUrl ?? '',
    instagramThumbnail: policy.instagramThumbnail ?? '',
    isCustomThumbnail: Boolean(policy.isCustomThumbnail),
    ...(policy.customThumbnail ? { customThumbnail: policy.customThumbnail } : {}),
    autoThumbnail: policy.autoThumbnail ?? '',
    instagramDate: policy.instagramDate ?? '',
    instagramAccountHandle: policy.instagramAccountHandle ?? '@sdmapanrb',
    publicationDate: policy.publicationDate ?? '',
    isFeatured: Boolean(policy.isFeatured),
    aiAssisted: Boolean(policy.aiAssisted),
    aiSummary: policy.aiSummary ?? '',
    isAiSummaryApproved: Boolean(policy.isAiSummaryApproved),
    aiSummaryGeneratedAt: policy.aiSummaryGeneratedAt ?? '',
    instagramCaption: policy.instagramCaption ?? '',
    createdAt: policy.createdAt || now,
    updatedAt: policy.updatedAt || now,
  });
}

export async function upsertPolicyInFirestore(policy: Policy): Promise<void> {
  const path = `policies/${policy.id}`;
  try {
    const payload = buildFirestorePolicyPayload(policy);
    await setDoc(doc(db, 'policies', policy.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updatePolicyInFirestore(
  id: string,
  updates: Partial<Policy>,
  fullPolicy?: Policy
): Promise<void> {
  const path = `policies/${id}`;
  try {
    if (fullPolicy) {
      const payload = buildFirestorePolicyPayload({
        ...fullPolicy,
        ...updates,
        id,
        updatedAt: updates.updatedAt || new Date().toISOString(),
      });
      await setDoc(doc(db, 'policies', id), payload);
    } else {
      const cleaned = sanitizeForFirestore({
        ...updates,
        updatedAt: updates.updatedAt || new Date().toISOString(),
      });
      await updateDoc(doc(db, 'policies', id), cleaned as Record<string, any>);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deletePolicyInFirestore(id: string): Promise<void> {
  const path = `policies/${id}`;
  try {
    await deleteDoc(doc(db, 'policies', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function buildFirestoreDeputyNewsPayload(news: DeputyNews): DeputyNews {
  const now = new Date().toISOString();
  return sanitizeForFirestore({
    id: news.id,
    title: news.title || '',
    articleUrl: news.articleUrl || '',
    thumbnailUrl: news.thumbnailUrl || '',
    ...(news.imageId ? { imageId: news.imageId } : {}),
    publicationDate: news.publicationDate || '',
    summary: news.summary || '',
    category: news.category || 'Kebijakan SDM Aparatur',
    status: (news.status || 'published') as DeputyNewsStatus,
    createdAt: news.createdAt || now,
    updatedAt: news.updatedAt || now,
  });
}

export async function upsertDeputyNewsInFirestore(news: DeputyNews): Promise<void> {
  const path = `deputy_news/${news.id}`;
  try {
    await setDoc(doc(db, 'deputy_news', news.id), buildFirestoreDeputyNewsPayload(news));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateDeputyNewsStatusInFirestore(
  id: string,
  status: DeputyNewsStatus,
  updatedAt?: string
): Promise<void> {
  const path = `deputy_news/${id}`;
  try {
    await updateDoc(doc(db, 'deputy_news', id), {
      status,
      updatedAt: updatedAt || new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteDeputyNewsInFirestore(id: string): Promise<void> {
  const path = `deputy_news/${id}`;
  try {
    await deleteDoc(doc(db, 'deputy_news', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveHeroSlidesToFirestore(
  slides: HeroSlide[],
  previousIds: string[] = []
): Promise<void> {
  const path = 'hero_slides';
  try {
    const batch = writeBatch(db);
    const nextIdSet = new Set(slides.map((s) => s.id).filter(Boolean));
    for (const prevId of previousIds) {
      if (prevId && !nextIdSet.has(prevId)) {
        batch.delete(doc(db, 'hero_slides', prevId));
      }
    }
    const now = new Date().toISOString();
    for (const slide of slides) {
      if (!slide.id) continue;
      batch.set(
        doc(db, 'hero_slides', slide.id),
        sanitizeForFirestore({
          id: slide.id,
          title: slide.title || '',
          imageUrl: slide.imageUrl || '',
          order: Number(slide.order) || 0,
          isActive: Boolean(slide.isActive),
          createdAt: slide.createdAt || now,
          updatedAt: slide.updatedAt || now,
        })
      );
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function buildFirestoreCategoryPayload(cat: Category): Category {
  return sanitizeForFirestore({
    id: cat.id,
    name: cat.name || '',
    slug: cat.slug || cat.id,
    description: cat.description ?? '',
    iconName: cat.iconName || 'FileText',
    group: cat.group || 'klaster',
    colorScheme: cat.colorScheme ?? '',
  });
}

export async function upsertCategoryInFirestore(cat: Category): Promise<void> {
  const path = `categories/${cat.id}`;
  try {
    await setDoc(doc(db, 'categories', cat.id), buildFirestoreCategoryPayload(cat));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateCategoryInFirestore(
  id: string,
  updates: Partial<Category>
): Promise<void> {
  const path = `categories/${id}`;
  try {
    await updateDoc(doc(db, 'categories', id), sanitizeForFirestore(updates) as Record<string, any>);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteCategoryInFirestore(id: string): Promise<void> {
  const path = `categories/${id}`;
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function replaceCategoriesInFirestore(
  nextCategories: Category[],
  previousIds: string[] = []
): Promise<void> {
  const path = 'categories';
  try {
    const batch = writeBatch(db);
    const nextIds = new Set(nextCategories.map((c) => c.id));
    for (const prevId of previousIds) {
      if (prevId && !nextIds.has(prevId)) {
        batch.delete(doc(db, 'categories', prevId));
      }
    }
    for (const cat of nextCategories) {
      if (!cat.id) continue;
      batch.set(doc(db, 'categories', cat.id), buildFirestoreCategoryPayload(cat));
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function buildFirestoreSourcePayload(src: SourceDocument): SourceDocument {
  return sanitizeForFirestore({
    id: src.id,
    title: src.title || '',
    regulationType: src.regulationType || '',
    regulationNumber: src.regulationNumber || '',
    year: src.year || '',
    articles: src.articles ?? '',
    fileUrl: src.fileUrl ?? '',
    description: src.description ?? '',
    isVerified: Boolean(src.isVerified),
  });
}

export async function upsertSourceInFirestore(src: SourceDocument): Promise<void> {
  const path = `sources/${src.id}`;
  try {
    await setDoc(doc(db, 'sources', src.id), buildFirestoreSourcePayload(src));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateSourceInFirestore(
  id: string,
  updates: Partial<SourceDocument>
): Promise<void> {
  const path = `sources/${id}`;
  try {
    await updateDoc(doc(db, 'sources', id), sanitizeForFirestore(updates) as Record<string, any>);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteSourceInFirestore(id: string): Promise<void> {
  const path = `sources/${id}`;
  try {
    await deleteDoc(doc(db, 'sources', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveAboutPageToFirestore(content: AboutPageContent): Promise<void> {
  const path = 'about_page/main';
  try {
    const payload = sanitizeForFirestore({
      heading: content.heading || '',
      subheading: content.subheading || '',
      description: content.description || '',
      profileImageUrl: content.profileImageUrl || '',
      profileImageUpdatedAt: content.profileImageUpdatedAt ?? null,
      orgSectionTitle: content.orgSectionTitle || '',
      orgTopLevelTitle: content.orgTopLevelTitle || '',
      unitSectionTitle: content.unitSectionTitle || '',
      unitSectionSubtitle: content.unitSectionSubtitle || '',
      units: Array.isArray(content.units) ? content.units : [],
      updatedAt: content.updatedAt || new Date().toISOString(),
    });
    await setDoc(doc(db, 'about_page', 'main'), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Memeriksa apakah UID Firebase Authentication memiliki dokumen otorisasi aktif di koleksi `admins/{uid}`.
 * Tidak pernah membuat hak admin secara otomatis bagi pengguna baru.
 */
export async function fetchAdminAuthorizationByUid(
  uid: string,
  authEmail?: string | null,
  displayName?: string | null
): Promise<AdminUser | null> {
  if (!uid) return null;
  const path = `admins/${uid}`;
  const docRef = doc(db, 'admins', uid);
  try {
    let snap;
    try {
      snap = await getDocFromServer(docRef);
    } catch {
      snap = await getDoc(docRef);
    }
    if (!snap.exists()) {
      return null;
    }
    return buildAuthorizedAdminFromFirestore(uid, snap.data(), authEmail, displayName);
  } catch (err: any) {
    const msg = err?.message || '';
    if (
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('PERMISSION_DENIED')
    ) {
      return null;
    }
    console.warn(`Gagal memeriksa otorisasi admin pada ${path}:`, err);
    return null;
  }
}

// ============================================================================
// BULK SYNC / FETCH HELPERS (FOR ADMIN DATA STORAGE MANAGER / SEEDING)
// ============================================================================

export async function syncAllStoresToFirestore(data: {
  policies: Policy[];
  deputyNews: DeputyNews[];
  heroSlides: HeroSlide[];
  categories: Category[];
  sources: SourceDocument[];
  aboutPage: AboutPageContent;
}): Promise<FirestoreSyncResult> {
  const counts = {
    policies: 0,
    deputyNews: 0,
    heroSlides: 0,
    categories: 0,
    sources: 0,
    aboutPage: false,
  };

  try {
    for (const policy of data.policies) {
      if (!policy.id) continue;
      await setDoc(doc(db, 'policies', policy.id), buildFirestorePolicyPayload(policy));
      counts.policies++;
    }

    for (const news of data.deputyNews) {
      if (!news.id) continue;
      await setDoc(doc(db, 'deputy_news', news.id), buildFirestoreDeputyNewsPayload(news));
      counts.deputyNews++;
    }

    for (const slide of data.heroSlides) {
      if (!slide.id) continue;
      const now = new Date().toISOString();
      await setDoc(
        doc(db, 'hero_slides', slide.id),
        sanitizeForFirestore({
          id: slide.id,
          title: slide.title || '',
          imageUrl: slide.imageUrl || '',
          order: Number(slide.order) || 0,
          isActive: Boolean(slide.isActive),
          createdAt: slide.createdAt || now,
          updatedAt: slide.updatedAt || now,
        })
      );
      counts.heroSlides++;
    }

    for (const cat of data.categories) {
      if (!cat.id) continue;
      await setDoc(doc(db, 'categories', cat.id), buildFirestoreCategoryPayload(cat));
      counts.categories++;
    }

    for (const src of data.sources) {
      if (!src.id) continue;
      await setDoc(doc(db, 'sources', src.id), buildFirestoreSourcePayload(src));
      counts.sources++;
    }

    await saveAboutPageToFirestore(data.aboutPage);
    counts.aboutPage = true;

    return {
      success: true,
      message: 'Seluruh data berhasil disinkronkan ke Cloud Firestore.',
      counts,
      syncedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, 'all_collections');
  }
}

export async function fetchAllStoresFromFirestore(isVerifiedAdmin = false): Promise<{
  policies: Policy[];
  deputyNews: DeputyNews[];
  heroSlides: HeroSlide[];
  categories: Category[];
  sources: SourceDocument[];
  aboutPage: AboutPageContent | null;
}> {
  try {
    const polQuery = isVerifiedAdmin
      ? collection(db, 'policies')
      : query(collection(db, 'policies'), where('status', '==', 'published'));
    const newsQuery = isVerifiedAdmin
      ? collection(db, 'deputy_news')
      : query(collection(db, 'deputy_news'), where('status', '==', 'published'));

    const [polSnap, newsSnap, slidesSnap, catSnap, srcSnap, aboutDoc] = await Promise.all([
      getDocs(polQuery),
      getDocs(newsQuery),
      getDocs(collection(db, 'hero_slides')),
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'sources')),
      getDoc(doc(db, 'about_page', 'main')),
    ]);

    const policies: Policy[] = [];
    polSnap.forEach((d) => policies.push(d.data() as Policy));

    const deputyNews: DeputyNews[] = [];
    newsSnap.forEach((d) => deputyNews.push(d.data() as DeputyNews));

    const heroSlides: HeroSlide[] = [];
    slidesSnap.forEach((d) => heroSlides.push(d.data() as HeroSlide));
    heroSlides.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    const categories: Category[] = [];
    catSnap.forEach((d) => categories.push(d.data() as Category));

    const sources: SourceDocument[] = [];
    srcSnap.forEach((d) => sources.push(d.data() as SourceDocument));

    const aboutPage = aboutDoc.exists() ? (aboutDoc.data() as AboutPageContent) : null;

    return {
      policies,
      deputyNews,
      heroSlides,
      categories,
      sources,
      aboutPage,
    };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.LIST, 'all_collections');
  }
}
