import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Category,
  Policy,
  SourceDocument,
  AdminUser,
  PolicyStatus,
  DeputyNews,
  DeputyNewsInput,
  DeputyNewsStatus,
  HeroSlide,
  AboutPageContent,
} from '../types';
import { INITIAL_CATEGORIES, INITIAL_POLICIES, INITIAL_SOURCES } from '../data/initialData';
import { DEFAULT_HERO_SLIDES, normalizeHeroSlides } from '../data/initialHeroSlides';
import { DEFAULT_ABOUT_PAGE_CONTENT } from '../data/initialAboutData';
import { detectInstagramThumbnail } from '../utils/thumbnailUtils';
import { extractInstagramDateFromUrl } from '../components/common/InstagramEmbed';
import { sortDeputyNewsNewestFirst } from '../utils/deputyNewsUtils';
import { AUTHORIZED_ADMIN_USERS, AuthorizedAccount } from '../data/adminUsers';
import {
  auth,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  PROVISIONED_DATABASE_ID,
  googleProvider,
  resolveAuthorizedAdminFromFirebaseUser,
  subscribeInternalAssertionTripped,
} from '../lib/firebase';
import {
  ConnectionStabilityReport,
  deleteCategoryFromFirestore,
  deleteDeputyNewsFromFirestore,
  deletePolicyFromFirestore,
  deleteSourceFromFirestore,
  fetchAboutPageFromFirestoreServer,
  fetchDeputyNewsFromFirestoreServer,
  fetchHeroSlidesFromFirestoreServer,
  FirestoreAuditReport,
  FirestoreDocumentCounts,
  hydrateAllFromFirestoreWithRetry,
  runConnectionStabilityVerification,
  runReadOnlyFirestoreAudit,
  runSafeAdminReadWriteTest,
  SafeReadWriteTestResult,
  sanitizeUrlMetadata,
  saveAboutPageToFirestore,
  saveCategoryToFirestore,
  saveDeputyNewsToFirestore,
  saveHeroSlidesToFirestore,
  savePolicyToFirestore,
  saveSourceToFirestore,
  syncInitialDataToFirestoreIfEmpty,
} from '../lib/firestoreService';
import {
  deleteImageAssetIfManaged,
  isFirebaseStorageEnabled,
  uploadImageAsset,
} from '../lib/storageService';

export type AppRoute =
  | { name: 'home' }
  | { name: 'policies'; categoryFilter?: string }
  | { name: 'policy-detail'; slug: string }
  | { name: 'categories' }
  | { name: 'category-detail'; slug: string }
  | { name: 'search'; query?: string }
  | { name: 'about' }
  | { name: 'admin-login' }
  | { name: 'admin-dashboard' }
  | { name: 'admin-content'; initialTab?: 'instagram' | 'deputy-news' | 'hero-slides' }
  | { name: 'admin-editor'; policyId?: string }
  | { name: 'admin-ai-assistant' }
  | { name: 'admin-categories' }
  | { name: 'admin-sources' }
  | { name: 'admin-about' };

function formatReadableFirestoreError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
      if (parsed.error.includes('Missing or insufficient permissions')) {
        return `Akses ditolak oleh Firestore Security Rules pada path "${parsed.path || '-'}". Pastikan Anda masuk dengan akun Google Admin terverifikasi.`;
      }
      return parsed.error;
    }
  } catch {
    // Plain error message
  }
  return raw || 'Terjadi kesalahan saat berkomunikasi dengan Cloud Firestore.';
}

interface PolicyContextType {
  policies: Policy[];
  categories: Category[];
  sources: SourceDocument[];
  deputyNews: DeputyNews[];
  isDeputyNewsLoading: boolean;
  heroSlides: HeroSlide[];
  isHeroSlidesLoading: boolean;
  aboutPage: AboutPageContent;
  isAboutPageLoading: boolean;
  aboutPageError: string | null;
  adminUser: AdminUser | null;
  isAuthReady: boolean;
  isFirebaseAuthConnected: boolean;
  isStorageEnabled: boolean;
  firebaseProjectId: string;
  firestoreDatabaseId: string;
  provisionedDatabaseId: string;
  isDataStale: boolean;
  syncStatusMessage: string | null;
  isRetryingFirestore: boolean;
  lastSyncedAt: string | null;
  lastKnownCounts: FirestoreDocumentCounts | null;
  retryFirestoreConnection: () => Promise<boolean>;
  lastFirestoreError: string | null;
  clearFirestoreError: () => void;
  authorizedUsers: AuthorizedAccount[];
  currentRoute: AppRoute;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  navigateTo: (route: AppRoute) => void;
  loginAsAdmin: (
    email?: string,
    password?: string
  ) => Promise<{ success: boolean; errorType?: 'email' | 'password'; error?: string }>;
  loginWithGoogleFirebase: () => Promise<{ success: boolean; error?: string }>;
  auditFirestoreConnection: () => Promise<FirestoreAuditReport>;
  verifyConnectionStability: () => Promise<ConnectionStabilityReport>;
  executeSafeReadWriteTest: (cleanupAfterVerify: boolean) => Promise<SafeReadWriteTestResult>;
  seedInitialDataManually: () => Promise<void>;
  logoutAdmin: () => void;
  // Policy CRUD (Server-verified on Cloud Firestore)
  createPolicy: (policyData: Partial<Policy>) => Promise<Policy>;
  updatePolicy: (id: string, updates: Partial<Policy>) => Promise<void>;
  updatePolicyThumbnail: (id: string, newThumbnail: string, isCustom?: boolean) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
  setPolicyStatus: (id: string, status: PolicyStatus) => Promise<void>;
  // Deputy News CRUD
  refreshDeputyNews: () => Promise<void>;
  createDeputyNews: (input: DeputyNewsInput) => Promise<DeputyNews>;
  updateDeputyNews: (id: string, input: DeputyNewsInput) => Promise<DeputyNews>;
  setDeputyNewsStatus: (id: string, status: DeputyNewsStatus) => Promise<DeputyNews>;
  deleteDeputyNews: (id: string) => Promise<void>;
  // Hero Slides CRUD
  refreshHeroSlides: () => Promise<void>;
  saveHeroSlides: (slides: HeroSlide[]) => Promise<HeroSlide[]>;
  resetHeroSlides: () => Promise<HeroSlide[]>;
  // About Page CRUD & Optional Cloud Storage Image Management
  refreshAboutPage: () => Promise<void>;
  uploadAboutProfileImage: (file: File) => Promise<string>;
  saveAboutPage: (content: AboutPageContent) => Promise<AboutPageContent>;
  deleteAboutProfileImage: () => Promise<AboutPageContent>;
  resetAboutPageContent: (keepImage?: boolean) => Promise<AboutPageContent>;
  // Category CRUD (Server-verified on Cloud Firestore)
  createCategory: (categoryData: Partial<Category>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string, reassignToId?: string) => Promise<void>;
  resetCategoriesToDefault: () => Promise<void>;
  // Source CRUD (Server-verified on Cloud Firestore)
  createSource: (sourceData: Partial<SourceDocument>) => Promise<SourceDocument>;
  updateSource: (id: string, updates: Partial<SourceDocument>) => Promise<void>;
  deleteSource: (id: string) => Promise<void>;
  // Helpers
  getPolicyBySlug: (slug: string) => Policy | undefined;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryBySlug: (slug: string) => Category | undefined;
  resetToDemoData: () => Promise<void>;
}

const PolicyContext = createContext<PolicyContextType | undefined>(undefined);

export const PolicyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Primary State — Cloud Firestore is the sole persistent data source
  const [policies, setPolicies] = useState<Policy[]>(INITIAL_POLICIES);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [sources, setSources] = useState<SourceDocument[]>(INITIAL_SOURCES);
  const [deputyNews, setDeputyNews] = useState<DeputyNews[]>([]);
  const [isDeputyNewsLoading, setIsDeputyNewsLoading] = useState<boolean>(true);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(() =>
    normalizeHeroSlides(DEFAULT_HERO_SLIDES)
  );
  const [isHeroSlidesLoading, setIsHeroSlidesLoading] = useState<boolean>(true);
  const [aboutPage, setAboutPage] = useState<AboutPageContent>(DEFAULT_ABOUT_PAGE_CONTENT);
  const [isAboutPageLoading, setIsAboutPageLoading] = useState<boolean>(true);
  const [aboutPageError, setAboutPageError] = useState<string | null>(null);
  const [lastFirestoreError, setLastFirestoreError] = useState<string | null>(null);
  const [isDataStale, setIsDataStale] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [isRetryingFirestore, setIsRetryingFirestore] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastKnownCounts, setLastKnownCounts] = useState<FirestoreDocumentCounts | null>(null);

  const hasSyncedFromServerRef = useRef<boolean>(false);
  const lastOnlineRetryAtRef = useRef<number>(0);

  // Admin Authentication State — strictly backed by Firebase Authentication
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isFirebaseAuthConnected, setIsFirebaseAuthConnected] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const isStorageEnabled = isFirebaseStorageEnabled();

  const latestStateRef = useRef({
    categories,
    sources,
    policies,
    deputyNews,
    heroSlides,
    aboutPage,
  });
  latestStateRef.current = {
    categories,
    sources,
    policies,
    deputyNews,
    heroSlides,
    aboutPage,
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [currentRoute, setCurrentRoute] = useState<AppRoute>({ name: 'home' });

  const clearFirestoreError = useCallback(() => {
    setLastFirestoreError(null);
  }, []);

  // Safe Server Hydration + Manual Refresh (bounded retry, never resets content counts to 0)
  const retryFirestoreConnection = useCallback(async (): Promise<boolean> => {
    setIsRetryingFirestore(true);
    try {
      const res = await hydrateAllFromFirestoreWithRetry(isFirebaseAuthConnected);
      if (res.ok && res.data) {
        hasSyncedFromServerRef.current = true;
        setCategories(
          res.data.categories && res.data.categories.length > 0
            ? res.data.categories
            : INITIAL_CATEGORIES
        );
        setSources(
          res.data.sources && res.data.sources.length > 0 ? res.data.sources : INITIAL_SOURCES
        );
        setPolicies(res.data.policies);
        setDeputyNews(res.data.deputyNews);
        setIsDeputyNewsLoading(false);
        setHeroSlides(
          res.data.heroSlides && res.data.heroSlides.length > 0
            ? res.data.heroSlides
            : normalizeHeroSlides(DEFAULT_HERO_SLIDES)
        );
        setIsHeroSlidesLoading(false);
        setAboutPage(res.data.aboutPage || DEFAULT_ABOUT_PAGE_CONTENT);
        setAboutPageError(null);
        setIsAboutPageLoading(false);

        setLastKnownCounts({
          policies: res.data.policies.length,
          deputyNews: res.data.deputyNews.length,
          categories: res.data.categories ? res.data.categories.length : 0,
          sources: res.data.sources ? res.data.sources.length : 0,
          heroSlides: res.data.heroSlides ? res.data.heroSlides.length : 0,
          aboutPageExists: Boolean(res.data.aboutPage),
        });
        setIsDataStale(false);
        setSyncStatusMessage(null);
        setLastSyncedAt(new Date().toISOString());
        return true;
      }

      // Server read failed — preserve last valid data (NEVER zero out counts or wipe state!)
      if (!hasSyncedFromServerRef.current && res.data) {
        if (res.data.categories && res.data.categories.length > 0) {
          setCategories(res.data.categories);
        }
        if (res.data.sources && res.data.sources.length > 0) {
          setSources(res.data.sources);
        }
        if (res.data.policies.length > 0) {
          setPolicies(res.data.policies);
        }
        if (res.data.deputyNews.length > 0) {
          setDeputyNews(res.data.deputyNews);
        }
        if (res.data.heroSlides && res.data.heroSlides.length > 0) {
          setHeroSlides(res.data.heroSlides);
        }
        if (res.data.aboutPage) {
          setAboutPage(res.data.aboutPage);
        }
      }
      setIsDeputyNewsLoading(false);
      setIsHeroSlidesLoading(false);
      setIsAboutPageLoading(false);
      setIsDataStale(true);
      setSyncStatusMessage(
        'Data belum berhasil disinkronkan dari server Cloud Firestore. Menampilkan data terakhir yang valid.'
      );
      return false;
    } finally {
      setIsRetryingFirestore(false);
    }
  }, [isFirebaseAuthConnected]);

  // Observe Firestore internal assertion circuit breaker (zero infinite retries / zero listener loops)
  useEffect(() => {
    const unsubAssertion = subscribeInternalAssertionTripped(() => {
      setIsDataStale(true);
      setSyncStatusMessage(
        'Terdeteksi gangguan stream internal SDK. Data terakhir yang valid tetap dipertahankan — klik Muat Ulang Data untuk menyinkronkan ulang.'
      );
    });
    return () => unsubAssertion();
  }, []);

  // Firebase Auth Listener with explicit unsubscribe AND error handler
  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (fbUser) => {
        const resolvedAdmin = resolveAuthorizedAdminFromFirebaseUser(fbUser);
        if (fbUser && resolvedAdmin) {
          setIsFirebaseAuthConnected(true);
          setAdminUser(resolvedAdmin);
        } else {
          setIsFirebaseAuthConnected(false);
          setAdminUser(null);
        }
        setIsAuthReady(true);
      },
      (authErr) => {
        console.warn('Firebase Auth listener warning:', authErr.message);
        setIsFirebaseAuthConnected(false);
        setAdminUser(null);
        setIsAuthReady(true);
      }
    );
    return () => unsub();
  }, []);

  // Authoritative Server Hydration via getDocsFromServer/getDocFromServer (no persistent onSnapshot race)
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;

    retryFirestoreConnection().catch(() => {});

    const handleBrowserOnline = () => {
      const now = Date.now();
      // Cooldown guard prevents rapid network flapping from spamming retries
      if (!cancelled && now - lastOnlineRetryAtRef.current >= 5000) {
        lastOnlineRetryAtRef.current = now;
        retryFirestoreConnection().catch(() => {});
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleBrowserOnline);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleBrowserOnline);
      }
    };
  }, [isAuthReady, isFirebaseAuthConnected, retryFirestoreConnection]);

  // Direct Server Refresh Helpers (preserve last valid data if server read fails)
  const refreshDeputyNews = useCallback(async () => {
    try {
      setIsDeputyNewsLoading(true);
      const items = await fetchDeputyNewsFromFirestoreServer(isFirebaseAuthConnected);
      setDeputyNews(items);
      setIsDataStale(false);
      setSyncStatusMessage(null);
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      console.warn('Firestore deputyNews refresh warning:', err);
      setIsDataStale(true);
      setSyncStatusMessage(
        'Gagal memperbarui Berita Kedeputian dari server. Menampilkan data terakhir yang valid.'
      );
    } finally {
      setIsDeputyNewsLoading(false);
    }
  }, [isFirebaseAuthConnected]);

  const refreshHeroSlides = useCallback(async () => {
    try {
      setIsHeroSlidesLoading(true);
      const slides = await fetchHeroSlidesFromFirestoreServer(isFirebaseAuthConnected);
      setHeroSlides(slides);
      setIsDataStale(false);
      setSyncStatusMessage(null);
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      console.warn('Firestore heroSlides refresh warning:', err);
      setIsDataStale(true);
      setSyncStatusMessage(
        'Gagal memperbarui Slide Banner dari server. Menampilkan data terakhir yang valid.'
      );
    } finally {
      setIsHeroSlidesLoading(false);
    }
  }, [isFirebaseAuthConnected]);

  const refreshAboutPage = useCallback(async () => {
    try {
      setIsAboutPageLoading(true);
      setAboutPageError(null);
      const content = await fetchAboutPageFromFirestoreServer();
      setAboutPage(content);
      setIsDataStale(false);
      setSyncStatusMessage(null);
      setLastSyncedAt(new Date().toISOString());
    } catch (err: any) {
      setAboutPageError(err?.message || 'Gagal memuat ulang Halaman Tentang dari Cloud Firestore.');
      setIsDataStale(true);
    } finally {
      setIsAboutPageLoading(false);
    }
  }, []);

  const navigateTo = (route: AppRoute) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentRoute(route);
  };

  const loginWithGoogleFirebase = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const resolvedAdmin = resolveAuthorizedAdminFromFirebaseUser(cred.user);
      if (!resolvedAdmin) {
        await signOut(auth);
        return {
          success: false,
          error: `Akun Google (${cred.user.email || 'tidak diketahui'}) tidak terdaftar sebagai Administrator resmi Kedeputian SDMA.`,
        };
      }
      setAdminUser(resolvedAdmin);
      setIsFirebaseAuthConnected(true);
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Jendela login Google ditutup sebelum selesai.' };
      }
      if (err?.code === 'auth/unauthorized-domain') {
        return {
          success: false,
          error:
            'Domain aplikasi ini belum ditambahkan ke Authorized Domains di Firebase Console (Authentication -> Settings -> Authorized domains).',
        };
      }
      return {
        success: false,
        error: err?.message || 'Gagal melakukan autentikasi dengan Firebase Google Sign-In.',
      };
    }
  };

  const loginAsAdmin = async (
    inputEmail: string = '',
    inputPassword?: string
  ): Promise<{ success: boolean; errorType?: 'email' | 'password'; error?: string }> => {
    const cleanEmail = (inputEmail || '').trim().toLowerCase();
    const cleanPass = inputPassword?.trim() || '';

    const matched = AUTHORIZED_ADMIN_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (!matched) {
      return {
        success: false,
        errorType: 'email',
        error: 'Email tidak terdaftar sebagai Administrator resmi Kedeputian SDMA.',
      };
    }

    if (!cleanPass) {
      return {
        success: false,
        errorType: 'password',
        error: 'Password wajib diisi.',
      };
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const resolvedAdmin = resolveAuthorizedAdminFromFirebaseUser(cred.user);
      if (!resolvedAdmin) {
        await signOut(auth);
        return {
          success: false,
          errorType: 'email',
          error:
            'Email pada akun Firebase Authentication ini belum terverifikasi (email_verified = false). Gunakan tombol Masuk dengan Google (Firebase Auth) atau verifikasi email terlebih dahulu.',
        };
      }
      setAdminUser(resolvedAdmin);
      setIsFirebaseAuthConnected(true);
      return { success: true };
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/operation-not-allowed') {
        return {
          success: false,
          errorType: 'email',
          error:
            'Provider Email/Password belum diaktifkan pada proyek Firebase "sdmaapp". Silakan masuk dengan tombol Google (Firebase Auth) di atas atau aktifkan Email/Password di Firebase Console.',
        };
      }
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        return {
          success: false,
          errorType: 'password',
          error:
            'Akun atau kata sandi belum sesuai di Firebase Authentication. Gunakan tombol Masuk dengan Google (Firebase Auth) atau pastikan akun kedinasan telah didaftarkan di Firebase Console.',
        };
      }
      return {
        success: false,
        errorType: 'password',
        error: err?.message || 'Gagal masuk melalui Firebase Authentication.',
      };
    }
  };

  const ensureFirebaseAdminForWrite = async (): Promise<void> => {
    if (auth.currentUser && auth.currentUser.emailVerified) {
      return;
    }
    const res = await loginWithGoogleFirebase();
    if (!res.success) {
      const msg =
        res.error ||
        'Diperlukan autentikasi Admin terverifikasi (Firebase Authentication) untuk menyimpan perubahan ke Cloud Firestore.';
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  // Explicit Admin Diagnostic Tools (No auto-writes!)
  const auditFirestoreConnection = useCallback(async (): Promise<FirestoreAuditReport> => {
    const report = await runReadOnlyFirestoreAudit(
      FIREBASE_PROJECT_ID,
      FIRESTORE_DATABASE_ID,
      PROVISIONED_DATABASE_ID,
      isStorageEnabled
    );
    if (report.serverDocumentCounts) {
      setLastKnownCounts(report.serverDocumentCounts);
      setIsDataStale(false);
      setSyncStatusMessage(null);
      setLastSyncedAt(report.checkedAt);
    } else {
      setIsDataStale(true);
      setSyncStatusMessage(
        'Pembacaan server gagal sementara. Menampilkan data terakhir yang valid (belum diperbarui dari server).'
      );
    }
    return report;
  }, [isStorageEnabled]);

  const verifyConnectionStability = useCallback(async (): Promise<ConnectionStabilityReport> => {
    const report = await runConnectionStabilityVerification();
    if (report.ok) {
      setLastKnownCounts(report.verifiedCounts);
      setIsDataStale(false);
      setSyncStatusMessage(null);
      setLastSyncedAt(report.checkedAt);
    }
    return report;
  }, []);

  const executeSafeReadWriteTest = useCallback(
    async (cleanupAfterVerify: boolean): Promise<SafeReadWriteTestResult> => {
      await ensureFirebaseAdminForWrite();
      return runSafeAdminReadWriteTest(FIRESTORE_DATABASE_ID, { cleanupAfterVerify });
    },
    []
  );

  const seedInitialDataManually = useCallback(async (): Promise<void> => {
    await ensureFirebaseAdminForWrite();
    await syncInitialDataToFirestoreIfEmpty();
  }, []);

  const logoutAdmin = () => {
    signOut(auth).catch(() => {});
    setIsFirebaseAuthConnected(false);
    setAdminUser(null);
    navigateTo({ name: 'home' });
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // =========================================================================
  // Policy CRUD (Server-verified directly against Cloud Firestore)
  // =========================================================================
  const createPolicy = async (policyData: Partial<Policy>): Promise<Policy> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    const title = policyData.title || 'Kebijakan Baru';
    const slug = policyData.slug || generateSlug(title);
    const detectedThumb = detectInstagramThumbnail({
      title,
      slug,
      instagramPostUrl: policyData.instagramPostUrl,
      categoryId: policyData.categoryId,
    });
    const finalThumb = sanitizeUrlMetadata(policyData.thumbnail, detectedThumb);

    const newPolicy: Policy = {
      id: `pol-${Date.now()}`,
      title,
      slug,
      categoryId: policyData.categoryId || categories[0]?.id || 'cat-perencanaan-pengadaan',
      summary: policyData.summary || '',
      contextHeader: policyData.contextHeader,
      contextExplanation: policyData.contextExplanation || '',
      conceptA: policyData.conceptA,
      conceptB: policyData.conceptB,
      comparison: policyData.comparison,
      simultaneousExplanation: policyData.simultaneousExplanation,
      generalContent: policyData.generalContent,
      classifications: policyData.classifications,
      requirementsHeader: policyData.requirementsHeader,
      requirements: policyData.requirements || [],
      processStepsHeader: policyData.processStepsHeader,
      processSteps: policyData.processSteps || [],
      faqs: policyData.faqs || [],
      thumbnail: finalThumb,
      instagramPostUrl: policyData.instagramPostUrl || 'https://www.instagram.com/sdmapanrb',
      instagramThumbnail: sanitizeUrlMetadata(policyData.instagramThumbnail, finalThumb),
      isCustomThumbnail: Boolean(policyData.isCustomThumbnail && finalThumb),
      customThumbnail: policyData.isCustomThumbnail ? finalThumb : undefined,
      autoThumbnail: detectedThumb,
      instagramDate:
        policyData.instagramDate?.trim() ||
        policyData.publicationDate?.trim() ||
        extractInstagramDateFromUrl(policyData.instagramPostUrl) ||
        new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      instagramAccountHandle: policyData.instagramAccountHandle || '@sdmapanrb',
      status: policyData.status || 'draft',
      sources: policyData.sources || [],
      relatedPolicyIds: policyData.relatedPolicyIds || [],
      publicationDate:
        policyData.instagramDate?.trim() ||
        policyData.publicationDate?.trim() ||
        extractInstagramDateFromUrl(policyData.instagramPostUrl) ||
        new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      isFeatured: Boolean(policyData.isFeatured),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiAssisted: Boolean(policyData.aiAssisted),
      aiSummary: policyData.aiSummary,
      isAiSummaryApproved: Boolean(policyData.isAiSummaryApproved),
      aiSummaryGeneratedAt: policyData.aiSummaryGeneratedAt,
      instagramCaption: policyData.instagramCaption,
    };

    try {
      await savePolicyToFirestore(newPolicy, latestStateRef.current.categories);
      setPolicies((prev) => [newPolicy, ...prev.filter((p) => p.id !== newPolicy.id)]);
      return newPolicy;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const updatePolicy = async (id: string, updates: Partial<Policy>): Promise<void> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    const target = latestStateRef.current.policies.find((p) => p.id === id);
    if (!target) {
      throw new Error('Data kebijakan tidak ditemukan.');
    }
    const merged: Policy = {
      ...target,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      await savePolicyToFirestore(merged, latestStateRef.current.categories);
      setPolicies((prev) => prev.map((item) => (item.id === id ? merged : item)));
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const updatePolicyThumbnail = async (
    id: string,
    newThumbnail: string,
    isCustom = true
  ): Promise<void> => {
    const cleanThumb = sanitizeUrlMetadata(newThumbnail, '');
    if (!cleanThumb) {
      throw new Error('URL thumbnail tidak valid.');
    }
    await updatePolicy(id, {
      thumbnail: cleanThumb,
      instagramThumbnail: cleanThumb,
      customThumbnail: isCustom ? cleanThumb : undefined,
      isCustomThumbnail: isCustom,
    });
  };

  const deletePolicy = async (id: string): Promise<void> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    const existing = policies.find((p) => p.id === id);
    try {
      await deletePolicyFromFirestore(id);
      if (existing?.thumbnail) {
        await deleteImageAssetIfManaged(existing.thumbnail);
      }
      setPolicies((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const setPolicyStatus = async (id: string, status: PolicyStatus): Promise<void> => {
    await updatePolicy(id, { status });
  };

  // =========================================================================
  // Category CRUD (Server-verified directly against Cloud Firestore)
  // =========================================================================
  const createCategory = async (categoryData: Partial<Category>): Promise<Category> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    const name = categoryData.name || 'Kategori Baru';
    const nextOrder = categories.length;
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      slug: categoryData.slug || generateSlug(name),
      description: categoryData.description || '',
      iconName: categoryData.iconName || 'FileText',
      group: categoryData.group || 'pilar',
      colorScheme: categoryData.colorScheme || 'blue',
    };

    try {
      await saveCategoryToFirestore(newCategory, nextOrder);
      setCategories((prev) => [...prev.filter((c) => c.id !== newCategory.id), newCategory]);
      return newCategory;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    const idx = categories.findIndex((c) => c.id === id);
    const current = idx >= 0 ? categories[idx] : undefined;
    if (!current) {
      throw new Error('Kategori tidak ditemukan.');
    }

    const merged: Category = { ...current, ...updates };
    try {
      await saveCategoryToFirestore(merged, idx >= 0 ? idx : 0);
      setCategories((prev) => prev.map((item) => (item.id === id ? merged : item)));
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const deleteCategory = async (id: string, reassignToId?: string): Promise<void> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    const targetCatId =
      reassignToId ||
      categories.find((c) => c.id !== id)?.id ||
      INITIAL_CATEGORIES[0].id;

    const affectedPolicies = policies.filter((p) => p.categoryId === id);

    try {
      for (const pol of affectedPolicies) {
        await savePolicyToFirestore(
          { ...pol, categoryId: targetCatId, updatedAt: new Date().toISOString() },
          latestStateRef.current.categories
        );
      }
      await deleteCategoryFromFirestore(id);

      setPolicies((prev) =>
        prev.map((item) =>
          item.categoryId === id
            ? { ...item, categoryId: targetCatId, updatedAt: new Date().toISOString() }
            : item
        )
      );
      setCategories((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const resetCategoriesToDefault = async (): Promise<void> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    try {
      for (let i = 0; i < INITIAL_CATEGORIES.length; i++) {
        await saveCategoryToFirestore(INITIAL_CATEGORIES[i], i);
      }
      setCategories(INITIAL_CATEGORIES);
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  // =========================================================================
  // SourceDocument CRUD (Server-verified directly against Cloud Firestore)
  // =========================================================================
  const createSource = async (sourceData: Partial<SourceDocument>): Promise<SourceDocument> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    const newSource: SourceDocument = {
      id: `src-${Date.now()}`,
      title: sourceData.title || 'Dokumen Resmi Baru',
      regulationType: sourceData.regulationType || 'Peraturan Menteri PANRB',
      regulationNumber: sourceData.regulationNumber || 'Nomor XX Tahun XXXX',
      year: sourceData.year || new Date().getFullYear().toString(),
      articles: sourceData.articles || '',
      fileUrl: sourceData.fileUrl || '',
      description: sourceData.description || '',
      isVerified: true,
    };

    try {
      await saveSourceToFirestore(newSource);
      setSources((prev) => [newSource, ...prev.filter((s) => s.id !== newSource.id)]);
      return newSource;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const updateSource = async (id: string, updates: Partial<SourceDocument>): Promise<void> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    const current = sources.find((s) => s.id === id);
    if (!current) {
      throw new Error('Dokumen regulasi tidak ditemukan.');
    }

    const merged: SourceDocument = { ...current, ...updates };
    try {
      await saveSourceToFirestore(merged);
      setSources((prev) => prev.map((item) => (item.id === id ? merged : item)));
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const deleteSource = async (id: string): Promise<void> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();

    try {
      await deleteSourceFromFirestore(id);
      setSources((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const getPolicyBySlug = (slug: string) => {
    return policies.find((p) => p.slug === slug);
  };

  const getCategoryById = (id: string) => {
    return categories.find((c) => c.id === id);
  };

  const getCategoryBySlug = (slug: string) => {
    return categories.find((c) => c.slug === slug);
  };

  // =========================================================================
  // Deputy News CRUD (Persisted permanently to Cloud Firestore)
  // =========================================================================
  const createDeputyNews = async (input: DeputyNewsInput): Promise<DeputyNews> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();
    const now = new Date().toISOString();
    const candidate: DeputyNews = {
      id: `news-${Date.now()}`,
      title: input.title.trim(),
      articleUrl: input.articleUrl.trim(),
      thumbnailUrl: sanitizeUrlMetadata(input.thumbnailUrl, ''),
      publicationDate: input.publicationDate.trim(),
      summary: input.summary.trim(),
      category: input.category.trim(),
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const created = await saveDeputyNewsToFirestore(candidate);
      setDeputyNews((prev) =>
        sortDeputyNewsNewestFirst([
          created,
          ...prev.filter((item) => item.id !== created.id),
        ])
      );
      return created;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const updateDeputyNews = async (id: string, input: DeputyNewsInput): Promise<DeputyNews> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();
    const existing = deputyNews.find((item) => item.id === id);
    const now = new Date().toISOString();
    const candidate: DeputyNews = {
      id,
      title: input.title.trim(),
      articleUrl: input.articleUrl.trim(),
      thumbnailUrl: sanitizeUrlMetadata(input.thumbnailUrl, ''),
      publicationDate: input.publicationDate.trim(),
      summary: input.summary.trim(),
      category: input.category.trim(),
      status: input.status,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    try {
      const updated = await saveDeputyNewsToFirestore(candidate);
      setDeputyNews((prev) =>
        sortDeputyNewsNewestFirst(prev.map((item) => (item.id === id ? updated : item)))
      );
      return updated;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const setDeputyNewsStatus = async (
    id: string,
    status: DeputyNewsStatus
  ): Promise<DeputyNews> => {
    const existing = deputyNews.find((item) => item.id === id);
    if (!existing) {
      throw new Error('Berita tidak ditemukan.');
    }
    return updateDeputyNews(id, {
      title: existing.title,
      articleUrl: existing.articleUrl,
      thumbnailUrl: existing.thumbnailUrl,
      publicationDate: existing.publicationDate,
      summary: existing.summary,
      category: existing.category,
      status,
    });
  };

  const deleteDeputyNews = async (id: string): Promise<void> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();
    const existing = deputyNews.find((item) => item.id === id);
    try {
      await deleteDeputyNewsFromFirestore(id);
      if (existing?.thumbnailUrl) {
        await deleteImageAssetIfManaged(existing.thumbnailUrl);
      }
      setDeputyNews((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  // =========================================================================
  // Hero Slides CRUD (Persisted permanently to Cloud Firestore)
  // =========================================================================
  const saveHeroSlides = async (nextSlides: HeroSlide[]): Promise<HeroSlide[]> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();
    const normalized = normalizeHeroSlides(
      nextSlides.map((s, idx) => ({
        ...s,
        id: `hero-slide-${idx + 1}`,
        order: idx,
        updatedAt: new Date().toISOString(),
      }))
    );

    try {
      const saved = await saveHeroSlidesToFirestore(normalized);
      setHeroSlides(saved);
      return saved;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const resetHeroSlides = async (): Promise<HeroSlide[]> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();
    const defaults = normalizeHeroSlides(DEFAULT_HERO_SLIDES);
    try {
      const saved = await saveHeroSlidesToFirestore(defaults);
      setHeroSlides(saved);
      return saved;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  // =========================================================================
  // About Page CRUD & Optional Cloud Storage Image Management
  // =========================================================================
  const uploadAboutProfileImage = async (file: File): Promise<string> => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt =
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp');

    if (!allowedMimeTypes.includes(file.type.toLowerCase()) || !hasValidExt) {
      throw new Error(
        'Format file tidak didukung. Gunakan gambar berformat JPG, JPEG, PNG, atau WebP.'
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Ukuran file melebihi batas maksimal 5 MB.');
    }

    await ensureFirebaseAdminForWrite();
    const uploaded = await uploadImageAsset(file, 'about', 1100, 0.82);
    return uploaded.url;
  };

  const saveAboutPage = async (nextContent: AboutPageContent): Promise<AboutPageContent> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();
    const cleanProfileUrl = sanitizeUrlMetadata(nextContent.profileImageUrl, '');
    const updatedPayload: AboutPageContent = {
      ...nextContent,
      profileImageUrl: cleanProfileUrl,
      profileImageUpdatedAt: cleanProfileUrl
        ? cleanProfileUrl === aboutPage.profileImageUrl && aboutPage.profileImageUpdatedAt
          ? aboutPage.profileImageUpdatedAt
          : new Date().toISOString()
        : null,
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = await saveAboutPageToFirestore(updatedPayload);
      setAboutPage(saved);
      setAboutPageError(null);
      return saved;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const deleteAboutProfileImage = async (): Promise<AboutPageContent> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();
    if (aboutPage.profileImageUrl) {
      await deleteImageAssetIfManaged(aboutPage.profileImageUrl);
    }
    const cleared: AboutPageContent = {
      ...aboutPage,
      profileImageUrl: '',
      profileImageUpdatedAt: null,
      updatedAt: new Date().toISOString(),
    };
    try {
      const saved = await saveAboutPageToFirestore(cleared);
      setAboutPage(saved);
      setAboutPageError(null);
      return saved;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const resetAboutPageContent = async (keepImage = true): Promise<AboutPageContent> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();
    const resetTarget: AboutPageContent = {
      ...DEFAULT_ABOUT_PAGE_CONTENT,
      profileImageUrl: keepImage ? sanitizeUrlMetadata(aboutPage.profileImageUrl, '') : '',
      profileImageUpdatedAt: keepImage ? aboutPage.profileImageUpdatedAt : null,
      updatedAt: new Date().toISOString(),
    };
    try {
      const saved = await saveAboutPageToFirestore(resetTarget);
      setAboutPage(saved);
      setAboutPageError(null);
      return saved;
    } catch (err) {
      const msg = formatReadableFirestoreError(err);
      setLastFirestoreError(msg);
      throw new Error(msg);
    }
  };

  const resetToDemoData = async (): Promise<void> => {
    setLastFirestoreError(null);
    await ensureFirebaseAdminForWrite();
    await resetCategoriesToDefault();
    await resetHeroSlides();
    for (const src of INITIAL_SOURCES) {
      await saveSourceToFirestore(src);
    }
    setSources(INITIAL_SOURCES);
  };

  return (
    <PolicyContext.Provider
      value={{
        policies,
        categories,
        sources,
        deputyNews,
        isDeputyNewsLoading,
        heroSlides,
        isHeroSlidesLoading,
        aboutPage,
        isAboutPageLoading,
        aboutPageError,
        adminUser,
        isAuthReady,
        isFirebaseAuthConnected,
        isStorageEnabled,
        firebaseProjectId: FIREBASE_PROJECT_ID,
        firestoreDatabaseId: FIRESTORE_DATABASE_ID,
        provisionedDatabaseId: PROVISIONED_DATABASE_ID,
        isDataStale,
        syncStatusMessage,
        isRetryingFirestore,
        lastSyncedAt,
        lastKnownCounts,
        retryFirestoreConnection,
        lastFirestoreError,
        clearFirestoreError,
        authorizedUsers: AUTHORIZED_ADMIN_USERS,
        currentRoute,
        searchQuery,
        setSearchQuery,
        navigateTo,
        loginAsAdmin,
        loginWithGoogleFirebase,
        auditFirestoreConnection,
        verifyConnectionStability,
        executeSafeReadWriteTest,
        seedInitialDataManually,
        logoutAdmin,
        createPolicy,
        updatePolicy,
        updatePolicyThumbnail,
        deletePolicy,
        setPolicyStatus,
        refreshDeputyNews,
        createDeputyNews,
        updateDeputyNews,
        setDeputyNewsStatus,
        deleteDeputyNews,
        refreshHeroSlides,
        saveHeroSlides,
        resetHeroSlides,
        refreshAboutPage,
        uploadAboutProfileImage,
        saveAboutPage,
        deleteAboutProfileImage,
        resetAboutPageContent,
        createCategory,
        updateCategory,
        deleteCategory,
        resetCategoriesToDefault,
        createSource,
        updateSource,
        deleteSource,
        getPolicyBySlug,
        getCategoryById,
        getCategoryBySlug,
        resetToDemoData,
      }}
    >
      {children}
    </PolicyContext.Provider>
  );
};

export const usePolicy = () => {
  const context = useContext(PolicyContext);
  if (!context) {
    throw new Error('usePolicy must be used within a PolicyProvider');
  }
  return context;
};
