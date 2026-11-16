import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithEmailPassword,
  signInWithGooglePopup,
  signOutFirebaseUser,
} from '../lib/firebase';
import {
  subscribePolicies,
  subscribeDeputyNews,
  subscribeHeroSlides,
  subscribeCategories,
  subscribeSources,
  subscribeAboutPage,
  upsertPolicyInFirestore,
  updatePolicyInFirestore,
  deletePolicyInFirestore,
  upsertDeputyNewsInFirestore,
  updateDeputyNewsStatusInFirestore,
  deleteDeputyNewsInFirestore,
  saveHeroSlidesToFirestore,
  upsertCategoryInFirestore,
  updateCategoryInFirestore,
  deleteCategoryInFirestore,
  replaceCategoriesInFirestore,
  upsertSourceInFirestore,
  updateSourceInFirestore,
  deleteSourceInFirestore,
  saveAboutPageToFirestore,
  fetchAdminAuthorizationByUid,
  syncAllStoresToFirestore,
  fetchAllStoresFromFirestore,
} from '../lib/firestoreSync';
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
import {
  INITIAL_CATEGORIES,
  INITIAL_POLICIES,
  INITIAL_SOURCES,
  STANDARD_KLASTER_IDS,
  isRemovedSubstansiCategory,
} from '../data/initialData';
import { DEFAULT_HERO_SLIDES, normalizeHeroSlides } from '../data/initialHeroSlides';
import { DEFAULT_ABOUT_PAGE_CONTENT } from '../data/initialAboutData';
import { normalizeStaticImageUrl } from '../data/staticImages';
import {
  detectInstagramThumbnail,
  compressImageForFirestore,
} from '../utils/thumbnailUtils';
import {
  validateMenpanArticleUrl,
  validateNewsThumbnail,
  validateUploadedNewsImageFile,
} from '../utils/deputyNewsUtils';
import { formatContentDate, getTodayIndonesianDate } from '../utils/dateUtils';
import { ADMIN_USER_PROFILES, AdminUserProfile } from '../data/adminUsers';

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

interface PolicyContextType {
  policies: Policy[];
  isPoliciesLoading: boolean;
  categories: Category[];
  isCategoriesLoading: boolean;
  sources: SourceDocument[];
  isSourcesLoading: boolean;
  deputyNews: DeputyNews[];
  deputyNewsImageUrls: Record<string, string>;
  isDeputyNewsLoading: boolean;
  heroSlides: HeroSlide[];
  isHeroSlidesLoading: boolean;
  aboutPage: AboutPageContent;
  isAboutPageLoading: boolean;
  aboutPageError: string | null;
  adminUser: AdminUser | null;
  authorizedUsers: AdminUserProfile[];
  isAuthLoading: boolean;
  currentRoute: AppRoute;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  navigateTo: (route: AppRoute) => void;
  loginAsAdmin: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; errorType?: 'email' | 'password' | 'auth'; error?: string }>;
  logoutAdmin: () => Promise<void>;
  // Firebase Auth
  firebaseUser: User | null;
  isFirebaseVerifiedAdmin: boolean;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logoutFirebase: () => Promise<void>;
  // Policy CRUD (Cloud Firestore)
  refreshPolicies: () => Promise<void>;
  createPolicy: (policyData: Partial<Policy>) => Promise<Policy>;
  updatePolicy: (id: string, updates: Partial<Policy>) => Promise<void>;
  updatePolicyThumbnail: (id: string, newThumbnail: string, isCustom?: boolean) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
  setPolicyStatus: (id: string, status: PolicyStatus) => Promise<void>;
  // Deputy News CRUD (Cloud Firestore)
  refreshDeputyNews: () => Promise<void>;
  createDeputyNews: (input: DeputyNewsInput) => Promise<DeputyNews>;
  updateDeputyNews: (id: string, input: DeputyNewsInput) => Promise<DeputyNews>;
  setDeputyNewsStatus: (id: string, status: DeputyNewsStatus) => Promise<DeputyNews>;
  deleteDeputyNews: (id: string) => Promise<void>;
  // Hero Slides CRUD (Cloud Firestore)
  refreshHeroSlides: () => Promise<void>;
  saveHeroSlides: (slides: HeroSlide[]) => Promise<HeroSlide[]>;
  resetHeroSlides: () => Promise<HeroSlide[]>;
  // About Page CRUD & Persistent Image Management (Cloud Firestore)
  refreshAboutPage: () => Promise<void>;
  uploadAboutProfileImage: (file: File) => Promise<string>;
  saveAboutPage: (content: AboutPageContent) => Promise<AboutPageContent>;
  deleteAboutProfileImage: () => Promise<AboutPageContent>;
  resetAboutPageContent: (keepImage?: boolean) => Promise<AboutPageContent>;
  // Category CRUD (Cloud Firestore)
  refreshCategories: () => Promise<void>;
  createCategory: (categoryData: Partial<Category>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string, reassignToId?: string) => Promise<void>;
  resetCategoriesToDefault: () => Promise<void>;
  // Source CRUD (Cloud Firestore)
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

function mapFirebaseAuthError(err: any): {
  errorType: 'email' | 'password' | 'auth';
  error: string;
} {
  const code = String(err?.code || '');
  switch (code) {
    case 'auth/invalid-email':
      return { errorType: 'email', error: 'Format alamat email tidak valid.' };
    case 'auth/user-not-found':
      return {
        errorType: 'email',
        error: 'Akun dengan email ini tidak ditemukan di Firebase Authentication.',
      };
    case 'auth/wrong-password':
      return { errorType: 'password', error: 'Password yang Anda masukkan salah.' };
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return {
        errorType: 'password',
        error: 'Email atau password tidak valid pada Firebase Authentication.',
      };
    case 'auth/user-disabled':
      return {
        errorType: 'auth',
        error: 'Akun Firebase ini telah dinonaktifkan oleh administrator.',
      };
    case 'auth/too-many-requests':
      return {
        errorType: 'auth',
        error: 'Terlalu banyak percobaan masuk yang gagal. Silakan tunggu beberapa saat lagi.',
      };
    case 'auth/operation-not-allowed':
      return {
        errorType: 'auth',
        error:
          'Autentikasi Email & Password belum diaktifkan di Firebase Console (Authentication -> Sign-in method).',
      };
    default:
      return {
        errorType: 'auth',
        error: err?.message || 'Gagal melakukan autentikasi dengan Firebase Authentication.',
      };
  }
}

function normalizeAboutPageContent(content?: Partial<AboutPageContent> | null): AboutPageContent {
  if (!content) {
    return {
      ...DEFAULT_ABOUT_PAGE_CONTENT,
      units: DEFAULT_ABOUT_PAGE_CONTENT.units.map((u) => ({
        ...u,
        detailedTasks: [...u.detailedTasks],
        subUnit: u.subUnit ? { ...u.subUnit } : undefined,
      })),
    };
  }

  return {
    heading: content.heading?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.heading,
    subheading: content.subheading?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.subheading,
    description: content.description?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.description,
    profileImageUrl: normalizeStaticImageUrl(content.profileImageUrl),
    profileImageUpdatedAt: content.profileImageUpdatedAt ?? null,
    orgSectionTitle:
      content.orgSectionTitle?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.orgSectionTitle,
    orgTopLevelTitle:
      content.orgTopLevelTitle?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.orgTopLevelTitle,
    unitSectionTitle:
      content.unitSectionTitle?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.unitSectionTitle,
    unitSectionSubtitle:
      content.unitSectionSubtitle?.trim() || DEFAULT_ABOUT_PAGE_CONTENT.unitSectionSubtitle,
    units:
      Array.isArray(content.units) && content.units.length > 0
        ? content.units
        : DEFAULT_ABOUT_PAGE_CONTENT.units.map((u) => ({
            ...u,
            detailedTasks: [...u.detailedTasks],
            subUnit: u.subUnit ? { ...u.subUnit } : undefined,
          })),
    updatedAt: content.updatedAt || DEFAULT_ABOUT_PAGE_CONTENT.updatedAt,
  };
}

const normalizePolicyRecord = (item: Policy): Policy => {
  const updated: Policy = { ...item };
  const syncedDate = formatContentDate(
    updated.instagramDate?.trim() || updated.publicationDate?.trim() || ''
  );
  if (syncedDate) {
    updated.instagramDate = syncedDate;
    updated.publicationDate = syncedDate;
  }

  const normalizedThumb = normalizeStaticImageUrl(updated.thumbnail);
  const normalizedCustom = normalizeStaticImageUrl(updated.customThumbnail);
  const normalizedAuto = normalizeStaticImageUrl(updated.autoThumbnail);
  const normalizedIg = normalizeStaticImageUrl(updated.instagramThumbnail);

  updated.thumbnail = normalizedThumb;
  if (updated.customThumbnail !== undefined) {
    updated.customThumbnail = normalizedCustom || undefined;
  }
  if (updated.autoThumbnail !== undefined) {
    updated.autoThumbnail = normalizedAuto || undefined;
  }
  if (updated.instagramThumbnail !== undefined) {
    updated.instagramThumbnail = normalizedIg || undefined;
  }

  if (!updated.isCustomThumbnail) {
    if (!updated.thumbnail) {
      const detected = detectInstagramThumbnail(updated);
      updated.thumbnail = detected;
      updated.instagramThumbnail = detected;
    }
  } else if (updated.customThumbnail) {
    updated.thumbnail = updated.customThumbnail;
  } else if (!updated.thumbnail) {
    const detected = detectInstagramThumbnail(updated);
    updated.thumbnail = detected;
    updated.instagramThumbnail = detected;
    updated.isCustomThumbnail = false;
  }

  return updated;
};

const CANONICAL_CATEGORY_ORDER = new Map<string, number>(
  INITIAL_CATEGORIES.map((c, idx) => [c.id, idx])
);

function normalizeAndOrderCategories(firestoreItems: Category[]): Category[] {
  const byId = new Map<string, Category>();

  for (const baseCat of INITIAL_CATEGORIES) {
    byId.set(baseCat.id, { ...baseCat });
  }

  for (const rawCat of firestoreItems) {
    if (!rawCat?.id || isRemovedSubstansiCategory(rawCat)) continue;
    const baseCat = byId.get(rawCat.id);
    const resolvedGroup =
      rawCat.group ||
      baseCat?.group ||
      (STANDARD_KLASTER_IDS.has(rawCat.id) ? 'klaster' : 'pilar');
    byId.set(rawCat.id, {
      ...baseCat,
      ...rawCat,
      group: resolvedGroup,
    });
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aIsKlaster = a.group === 'klaster' ? 0 : 1;
    const bIsKlaster = b.group === 'klaster' ? 0 : 1;
    if (aIsKlaster !== bIsKlaster) return aIsKlaster - bIsKlaster;

    const aOrder = CANONICAL_CATEGORY_ORDER.get(a.id);
    const bOrder = CANONICAL_CATEGORY_ORDER.get(b.id);
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;

    return a.name.localeCompare(b.name, 'id');
  });
}

export const PolicyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Primary Application Data States (Populated exclusively from Cloud Firestore)
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isPoliciesLoading, setIsPoliciesLoading] = useState<boolean>(true);
  const policiesRef = useRef<Policy[]>(policies);
  useEffect(() => {
    policiesRef.current = policies;
  }, [policies]);

  const [categories, setCategories] = useState<Category[]>(() => normalizeAndOrderCategories([]));
  const [isCategoriesLoading, setIsCategoriesLoading] = useState<boolean>(true);
  const categoriesRef = useRef<Category[]>(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [isSourcesLoading, setIsSourcesLoading] = useState<boolean>(true);
  const sourcesRef = useRef<SourceDocument[]>(sources);
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  const [deputyNews, setDeputyNews] = useState<DeputyNews[]>([]);
  const [deputyNewsImageUrls] = useState<Record<string, string>>({});
  const [isDeputyNewsLoading, setIsDeputyNewsLoading] = useState<boolean>(true);
  const deputyNewsRef = useRef<DeputyNews[]>(deputyNews);
  useEffect(() => {
    deputyNewsRef.current = deputyNews;
  }, [deputyNews]);

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [isHeroSlidesLoading, setIsHeroSlidesLoading] = useState<boolean>(true);
  const heroSlidesRef = useRef<HeroSlide[]>(heroSlides);
  useEffect(() => {
    heroSlidesRef.current = heroSlides;
  }, [heroSlides]);

  const [aboutPage, setAboutPage] = useState<AboutPageContent>(() =>
    normalizeAboutPageContent(null)
  );
  const [isAboutPageLoading, setIsAboutPageLoading] = useState<boolean>(true);
  const [aboutPageError, setAboutPageError] = useState<string | null>(null);
  const aboutPageRef = useRef<AboutPageContent>(aboutPage);
  useEffect(() => {
    aboutPageRef.current = aboutPage;
  }, [aboutPage]);

  // Authenticated Admin State (verified solely via Firebase Auth + Firestore admins/{uid})
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const explicitAuthFlowRef = useRef<boolean>(false);

  const isFirebaseVerifiedAdmin = Boolean(
    firebaseUser && adminUser && adminUser.uid && adminUser.uid === firebaseUser.uid
  );

  // Global search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [currentRoute, setCurrentRoute] = useState<AppRoute>({ name: 'home' });

  // Subscribe to Firebase Auth state changes and verify UID authorization in Firestore
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (!user) {
        setFirebaseUser(null);
        setAdminUser(null);
        setIsAuthLoading(false);
        return;
      }

      // Skip duplicate background check while loginAsAdmin/loginWithGoogle is explicitly verifying
      if (explicitAuthFlowRef.current) {
        return;
      }

      try {
        const authorizedProfile = await fetchAdminAuthorizationByUid(
          user.uid,
          user.email,
          user.displayName
        );
        if (!active) return;

        if (authorizedProfile) {
          setFirebaseUser(user);
          setAdminUser(authorizedProfile);
        } else {
          await signOutFirebaseUser().catch(() => {});
          if (!active) return;
          setFirebaseUser(null);
          setAdminUser(null);
        }
      } catch {
        if (!active) return;
        setFirebaseUser(null);
        setAdminUser(null);
      } finally {
        if (active) {
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Real-time Firestore Subscriptions for public/static collections
  useEffect(() => {
    setIsCategoriesLoading(true);
    const unsubCategories = subscribeCategories(
      (items) => {
        setCategories(normalizeAndOrderCategories(items));
        setIsCategoriesLoading(false);
      },
      () => {
        setCategories((prev) =>
          prev.length > 0 ? prev : normalizeAndOrderCategories([])
        );
        setIsCategoriesLoading(false);
      }
    );

    setIsSourcesLoading(true);
    const unsubSources = subscribeSources(
      (items) => {
        setSources(items);
        setIsSourcesLoading(false);
      },
      () => {
        setIsSourcesLoading(false);
      }
    );

    setIsHeroSlidesLoading(true);
    const unsubHeroSlides = subscribeHeroSlides(
      (items) => {
        setHeroSlides(items.length > 0 ? normalizeHeroSlides(items) : []);
        setIsHeroSlidesLoading(false);
      },
      () => {
        setIsHeroSlidesLoading(false);
      }
    );

    setIsAboutPageLoading(true);
    const unsubAboutPage = subscribeAboutPage(
      (content) => {
        setAboutPage(normalizeAboutPageContent(content));
        setAboutPageError(null);
        setIsAboutPageLoading(false);
      },
      (err) => {
        setAboutPageError(err?.message || 'Gagal memuat data Halaman Tentang dari Firestore.');
        setIsAboutPageLoading(false);
      }
    );

    return () => {
      unsubCategories();
      unsubSources();
      unsubHeroSlides();
      unsubAboutPage();
    };
  }, []);

  // Real-time Firestore Subscriptions for status-scoped collections (policies & deputy_news)
  useEffect(() => {
    setIsPoliciesLoading(true);
    const unsubPolicies = subscribePolicies(
      isFirebaseVerifiedAdmin,
      (items) => {
        setPolicies(items.map(normalizePolicyRecord));
        setIsPoliciesLoading(false);
      },
      () => {
        setIsPoliciesLoading(false);
      }
    );

    setIsDeputyNewsLoading(true);
    const unsubDeputyNews = subscribeDeputyNews(
      isFirebaseVerifiedAdmin,
      (items) => {
        setDeputyNews(items);
        setIsDeputyNewsLoading(false);
      },
      () => {
        setIsDeputyNewsLoading(false);
      }
    );

    return () => {
      unsubPolicies();
      unsubDeputyNews();
    };
  }, [isFirebaseVerifiedAdmin]);

  // Explicit Refresh Helpers (fetch directly from Firestore)
  const refreshPolicies = useCallback(async () => {
    setIsPoliciesLoading(true);
    try {
      const data = await fetchAllStoresFromFirestore(isFirebaseVerifiedAdmin);
      setPolicies(data.policies.map(normalizePolicyRecord));
    } finally {
      setIsPoliciesLoading(false);
    }
  }, [isFirebaseVerifiedAdmin]);

  const refreshDeputyNews = useCallback(async () => {
    setIsDeputyNewsLoading(true);
    try {
      const data = await fetchAllStoresFromFirestore(isFirebaseVerifiedAdmin);
      setDeputyNews(data.deputyNews);
    } finally {
      setIsDeputyNewsLoading(false);
    }
  }, [isFirebaseVerifiedAdmin]);

  const refreshHeroSlides = useCallback(async () => {
    setIsHeroSlidesLoading(true);
    try {
      const data = await fetchAllStoresFromFirestore(isFirebaseVerifiedAdmin);
      setHeroSlides(data.heroSlides.length > 0 ? normalizeHeroSlides(data.heroSlides) : []);
    } finally {
      setIsHeroSlidesLoading(false);
    }
  }, [isFirebaseVerifiedAdmin]);

  const refreshAboutPage = useCallback(async () => {
    setIsAboutPageLoading(true);
    setAboutPageError(null);
    try {
      const data = await fetchAllStoresFromFirestore(isFirebaseVerifiedAdmin);
      setAboutPage(normalizeAboutPageContent(data.aboutPage));
    } catch (err: any) {
      setAboutPageError(err?.message || 'Gagal memuat data Halaman Tentang dari Cloud Firestore.');
    } finally {
      setIsAboutPageLoading(false);
    }
  }, [isFirebaseVerifiedAdmin]);

  const refreshCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    try {
      const data = await fetchAllStoresFromFirestore(isFirebaseVerifiedAdmin);
      setCategories(normalizeAndOrderCategories(data.categories));
    } finally {
      setIsCategoriesLoading(false);
    }
  }, [isFirebaseVerifiedAdmin]);

  // Handle smooth navigation
  const navigateTo = (route: AppRoute) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentRoute(route);
  };

  const loginAsAdmin = async (
    inputEmail: string = '',
    inputPassword: string = ''
  ): Promise<{ success: boolean; errorType?: 'email' | 'password' | 'auth'; error?: string }> => {
    const cleanEmail = (inputEmail || '').trim();
    if (!cleanEmail) {
      return { success: false, errorType: 'email', error: 'Email wajib diisi.' };
    }
    if (!inputPassword) {
      return { success: false, errorType: 'password', error: 'Password wajib diisi.' };
    }

    explicitAuthFlowRef.current = true;
    try {
      const user = await signInWithEmailPassword(cleanEmail, inputPassword);
      const authorizedProfile = await fetchAdminAuthorizationByUid(
        user.uid,
        user.email,
        user.displayName
      );

      if (!authorizedProfile) {
        await signOutFirebaseUser().catch(() => {});
        setFirebaseUser(null);
        setAdminUser(null);
        return {
          success: false,
          errorType: 'auth',
          error: `Akses ditolak: Akun (${user.email || cleanEmail}) tidak memiliki otorisasi admin aktif pada koleksi Firestore admins/${user.uid}.`,
        };
      }

      setFirebaseUser(user);
      setAdminUser(authorizedProfile);
      setIsAuthLoading(false);
      return { success: true };
    } catch (err: any) {
      await signOutFirebaseUser().catch(() => {});
      setFirebaseUser(null);
      setAdminUser(null);
      const mapped = mapFirebaseAuthError(err);
      return { success: false, ...mapped };
    } finally {
      explicitAuthFlowRef.current = false;
    }
  };

  const logoutAdmin = async () => {
    try {
      await signOutFirebaseUser();
    } catch (err) {
      console.warn('Sign-out error:', err);
    }
    setFirebaseUser(null);
    setAdminUser(null);
    navigateTo({ name: 'home' });
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    explicitAuthFlowRef.current = true;
    try {
      const user = await signInWithGooglePopup();
      const authorizedProfile = await fetchAdminAuthorizationByUid(
        user.uid,
        user.email,
        user.displayName
      );

      if (!authorizedProfile) {
        await signOutFirebaseUser().catch(() => {});
        setFirebaseUser(null);
        setAdminUser(null);
        return {
          success: false,
          error: `Akses ditolak: Akun Google ${user.email || ''} (UID: ${user.uid}) belum terdaftar sebagai Administrator terotorisasi pada koleksi Firestore admins/${user.uid}.`,
        };
      }

      setFirebaseUser(user);
      setAdminUser(authorizedProfile);
      setIsAuthLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      return { success: false, error: err?.message || 'Login dengan Google gagal' };
    } finally {
      explicitAuthFlowRef.current = false;
    }
  };

  const logoutFirebase = async () => {
    await logoutAdmin();
  };

  // Helper generators
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // ============================================================================
  // POLICY CRUD (CLOUD FIRESTORE)
  // ============================================================================
  const createPolicy = async (policyData: Partial<Policy>): Promise<Policy> => {
    const title = policyData.title || 'Kebijakan Baru';
    const slug = policyData.slug || generateSlug(title);
    const detectedThumb = detectInstagramThumbnail({
      title,
      slug,
      instagramPostUrl: policyData.instagramPostUrl,
      categoryId: policyData.categoryId,
    });
    const normalizedCustom = normalizeStaticImageUrl(policyData.customThumbnail);
    const normalizedInputThumb = normalizeStaticImageUrl(policyData.thumbnail);
    const isCustom = Boolean(
      policyData.isCustomThumbnail && (normalizedCustom || normalizedInputThumb)
    );
    const finalThumb = isCustom
      ? normalizedCustom || normalizedInputThumb
      : normalizedInputThumb || detectedThumb;

    const nowIso = new Date().toISOString();
    const newPolicy: Policy = {
      id: `pol-${Date.now()}`,
      title,
      slug,
      categoryId:
        policyData.categoryId || categoriesRef.current[0]?.id || 'cat-perencanaan-pengadaan',
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
      instagramPostUrl: (policyData.instagramPostUrl || '').trim(),
      instagramThumbnail: normalizeStaticImageUrl(policyData.instagramThumbnail) || finalThumb,
      isCustomThumbnail: isCustom,
      customThumbnail: isCustom ? finalThumb : undefined,
      autoThumbnail: detectedThumb,
      instagramDate:
        formatContentDate(policyData.instagramDate?.trim() || policyData.publicationDate?.trim()) ||
        getTodayIndonesianDate(),
      instagramAccountHandle: policyData.instagramAccountHandle || '@sdmapanrb',
      status: policyData.status || 'draft',
      sources: policyData.sources || [],
      relatedPolicyIds: policyData.relatedPolicyIds || [],
      publicationDate:
        formatContentDate(policyData.instagramDate?.trim() || policyData.publicationDate?.trim()) ||
        getTodayIndonesianDate(),
      isFeatured: Boolean(policyData.isFeatured),
      createdAt: nowIso,
      updatedAt: nowIso,
      aiAssisted: Boolean(policyData.aiAssisted),
      aiSummary: policyData.aiSummary || '',
      isAiSummaryApproved: Boolean(policyData.isAiSummaryApproved),
      aiSummaryGeneratedAt: policyData.aiSummaryGeneratedAt || '',
      instagramCaption: policyData.instagramCaption || '',
    };

    await upsertPolicyInFirestore(newPolicy);
    return newPolicy;
  };

  const updatePolicy = async (id: string, updates: Partial<Policy>): Promise<void> => {
    const cleanedUpdates = { ...updates };
    if (cleanedUpdates.thumbnail !== undefined) {
      cleanedUpdates.thumbnail = normalizeStaticImageUrl(cleanedUpdates.thumbnail);
    }
    if (cleanedUpdates.instagramThumbnail !== undefined) {
      cleanedUpdates.instagramThumbnail = normalizeStaticImageUrl(
        cleanedUpdates.instagramThumbnail
      );
    }
    if (cleanedUpdates.customThumbnail !== undefined) {
      cleanedUpdates.customThumbnail =
        normalizeStaticImageUrl(cleanedUpdates.customThumbnail) || undefined;
    }
    if (
      cleanedUpdates.instagramDate !== undefined ||
      cleanedUpdates.publicationDate !== undefined
    ) {
      const nextRawDate =
        cleanedUpdates.instagramDate?.trim() || cleanedUpdates.publicationDate?.trim() || '';
      if (nextRawDate) {
        const formatted = formatContentDate(nextRawDate);
        cleanedUpdates.instagramDate = formatted;
        cleanedUpdates.publicationDate = formatted;
      }
    }

    const existingItem = policiesRef.current.find((item) => item.id === id);
    await updatePolicyInFirestore(
      id,
      {
        ...cleanedUpdates,
        updatedAt: new Date().toISOString(),
      },
      existingItem
    );
  };

  const updatePolicyThumbnail = async (
    id: string,
    newThumbnail: string,
    isCustom = true
  ): Promise<void> => {
    const cleanThumb = normalizeStaticImageUrl(newThumbnail);
    const existingItem = policiesRef.current.find((item) => item.id === id);
    await updatePolicyInFirestore(
      id,
      {
        thumbnail: cleanThumb,
        instagramThumbnail: cleanThumb,
        customThumbnail: isCustom ? cleanThumb : '',
        isCustomThumbnail: isCustom,
        updatedAt: new Date().toISOString(),
      },
      existingItem
    );
  };

  const deletePolicy = async (id: string): Promise<void> => {
    await deletePolicyInFirestore(id);
  };

  const setPolicyStatus = async (id: string, status: PolicyStatus): Promise<void> => {
    const existingItem = policiesRef.current.find((item) => item.id === id);
    await updatePolicyInFirestore(
      id,
      {
        status,
        updatedAt: new Date().toISOString(),
      },
      existingItem
    );
  };

  // ============================================================================
  // CATEGORY CRUD (CLOUD FIRESTORE)
  // ============================================================================
  const createCategory = async (categoryData: Partial<Category>): Promise<Category> => {
    const name = categoryData.name || 'Kategori Baru';
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      slug: categoryData.slug || generateSlug(name),
      description: categoryData.description || '',
      iconName: categoryData.iconName || 'FileText',
      group: categoryData.group || 'pilar',
      colorScheme: categoryData.colorScheme || 'blue',
    };
    await upsertCategoryInFirestore(newCategory);
    return newCategory;
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
    const existing = categoriesRef.current.find((c) => c.id === id);
    if (existing) {
      await upsertCategoryInFirestore({
        ...existing,
        ...updates,
        id,
      });
    } else {
      await updateCategoryInFirestore(id, updates);
    }
  };

  const deleteCategory = async (id: string, reassignToId?: string): Promise<void> => {
    const targetCatId =
      reassignToId ||
      categoriesRef.current.find((c) => c.id !== id)?.id ||
      INITIAL_CATEGORIES[0].id;

    const affectedPolicies = policiesRef.current.filter((p) => p.categoryId === id);
    for (const pol of affectedPolicies) {
      await updatePolicyInFirestore(
        pol.id,
        {
          categoryId: targetCatId,
          updatedAt: new Date().toISOString(),
        },
        pol
      );
    }

    await deleteCategoryInFirestore(id);
  };

  const resetCategoriesToDefault = async (): Promise<void> => {
    const prevIds = categoriesRef.current.map((c) => c.id);
    await replaceCategoriesInFirestore(INITIAL_CATEGORIES, prevIds);
  };

  // ============================================================================
  // SOURCE CRUD (CLOUD FIRESTORE)
  // ============================================================================
  const createSource = async (sourceData: Partial<SourceDocument>): Promise<SourceDocument> => {
    const newSource: SourceDocument = {
      id: `src-${Date.now()}`,
      title: sourceData.title || 'Dokumen Resmi Baru',
      regulationType: sourceData.regulationType || 'Peraturan Menteri PANRB',
      regulationNumber: sourceData.regulationNumber || 'Nomor XX Tahun XXXX',
      year: sourceData.year || new Date().getFullYear().toString(),
      articles: sourceData.articles || '',
      fileUrl: sourceData.fileUrl || '',
      description: sourceData.description || '',
      isVerified: sourceData.isVerified !== undefined ? sourceData.isVerified : true,
    };
    await upsertSourceInFirestore(newSource);
    return newSource;
  };

  const updateSource = async (id: string, updates: Partial<SourceDocument>): Promise<void> => {
    await updateSourceInFirestore(id, updates);
  };

  const deleteSource = async (id: string): Promise<void> => {
    await deleteSourceInFirestore(id);
  };

  // ============================================================================
  // HELPERS
  // ============================================================================
  const getPolicyBySlug = (slug: string) => policies.find((p) => p.slug === slug);
  const getCategoryById = (id: string) => categories.find((c) => c.id === id);
  const getCategoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);

  // ============================================================================
  // DEPUTY NEWS CRUD (CLOUD FIRESTORE)
  // ============================================================================
  const validateDeputyNewsCoreFields = (input: DeputyNewsInput) => {
    const cleanTitle = (input.title || '').trim();
    if (!cleanTitle || cleanTitle.length < 5) {
      throw new Error('Judul berita wajib diisi (minimal 5 karakter).');
    }

    const urlCheck = validateMenpanArticleUrl(input.articleUrl);
    if (!urlCheck.isValid) {
      throw new Error(urlCheck.error || 'Link artikel resmi Kementerian PANRB tidak valid.');
    }

    const cleanDate = (input.publicationDate || '').trim();
    if (!cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      throw new Error('Tanggal publikasi wajib dipilih dengan format yang valid.');
    }

    const cleanSummary = (input.summary || '').trim();
    if (!cleanSummary || cleanSummary.length < 10) {
      throw new Error('Ringkasan berita wajib diisi (minimal 10 karakter).');
    }

    const cleanCategory = (input.category || '').trim() || 'Kebijakan SDM Aparatur';
    const cleanStatus: DeputyNewsStatus = input.status === 'published' ? 'published' : 'draft';

    return {
      cleanTitle,
      cleanArticleUrl: urlCheck.cleanUrl,
      cleanDate,
      cleanSummary,
      cleanCategory,
      cleanStatus,
    };
  };

  const createDeputyNews = async (input: DeputyNewsInput): Promise<DeputyNews> => {
    const {
      cleanTitle,
      cleanArticleUrl,
      cleanDate,
      cleanSummary,
      cleanCategory,
      cleanStatus,
    } = validateDeputyNewsCoreFields(input);

    const nowMs = Date.now();
    const recentDuplicate = deputyNewsRef.current.find(
      (item) =>
        item.title.toLowerCase() === cleanTitle.toLowerCase() &&
        item.articleUrl.toLowerCase() === cleanArticleUrl.toLowerCase() &&
        item.publicationDate === cleanDate &&
        nowMs - Date.parse(item.createdAt) < 4000
    );
    if (recentDuplicate) {
      throw new Error('Berita dengan judul dan tautan yang sama baru saja disimpan.');
    }

    let finalThumbnailUrl = '';
    if (input.imageFile) {
      const fileCheck = validateUploadedNewsImageFile(input.imageFile);
      if (!fileCheck.isValid) {
        throw new Error(fileCheck.error || 'File gambar berita tidak valid.');
      }
      finalThumbnailUrl = await compressImageForFirestore(input.imageFile);
    } else {
      const thumbCheck = validateNewsThumbnail(input.thumbnailUrl);
      if (!thumbCheck.isValid) {
        throw new Error(
          thumbCheck.error || 'Silakan unggah file gambar berita terlebih dahulu.'
        );
      }
      finalThumbnailUrl = thumbCheck.cleanThumbnail;
    }

    const nowIso = new Date().toISOString();
    const createdItem: DeputyNews = {
      id: `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: cleanTitle,
      articleUrl: cleanArticleUrl,
      thumbnailUrl: finalThumbnailUrl,
      publicationDate: cleanDate,
      summary: cleanSummary,
      category: cleanCategory,
      status: cleanStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await upsertDeputyNewsInFirestore(createdItem);
    return createdItem;
  };

  const updateDeputyNews = async (id: string, input: DeputyNewsInput): Promise<DeputyNews> => {
    const existing = deputyNewsRef.current.find((item) => item.id === id);
    if (!existing) {
      throw new Error('Data berita yang akan diedit tidak ditemukan di Cloud Firestore.');
    }

    const {
      cleanTitle,
      cleanArticleUrl,
      cleanDate,
      cleanSummary,
      cleanCategory,
      cleanStatus,
    } = validateDeputyNewsCoreFields(input);

    let nextThumbnailUrl = '';
    if (input.imageFile) {
      const fileCheck = validateUploadedNewsImageFile(input.imageFile);
      if (!fileCheck.isValid) {
        throw new Error(fileCheck.error || 'File gambar berita tidak valid.');
      }
      nextThumbnailUrl = await compressImageForFirestore(input.imageFile);
    } else if (input.thumbnailUrl && input.thumbnailUrl.trim()) {
      const thumbCheck = validateNewsThumbnail(input.thumbnailUrl);
      if (!thumbCheck.isValid) {
        throw new Error(
          thumbCheck.error || 'Silakan unggah file gambar berita atau masukkan URL gambar yang valid.'
        );
      }
      nextThumbnailUrl = thumbCheck.cleanThumbnail;
    } else if (existing.thumbnailUrl && !existing.thumbnailUrl.startsWith('blob:')) {
      nextThumbnailUrl = existing.thumbnailUrl;
    } else {
      throw new Error('Silakan pilih file gambar berita atau masukkan URL gambar yang valid.');
    }

    const updatedItem: DeputyNews = {
      id,
      title: cleanTitle,
      articleUrl: cleanArticleUrl,
      thumbnailUrl: nextThumbnailUrl,
      publicationDate: cleanDate,
      summary: cleanSummary,
      category: cleanCategory,
      status: cleanStatus,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await upsertDeputyNewsInFirestore(updatedItem);
    return updatedItem;
  };

  const setDeputyNewsStatus = async (
    id: string,
    status: DeputyNewsStatus
  ): Promise<DeputyNews> => {
    const existing = deputyNewsRef.current.find((item) => item.id === id);
    if (!existing) {
      throw new Error('Data berita tidak ditemukan di Cloud Firestore.');
    }

    if (status === 'published') {
      validateDeputyNewsCoreFields({
        title: existing.title,
        articleUrl: existing.articleUrl,
        thumbnailUrl: existing.thumbnailUrl,
        publicationDate: existing.publicationDate,
        summary: existing.summary,
        category: existing.category,
        status: 'published',
      });
      const thumbCheck = validateNewsThumbnail(existing.thumbnailUrl);
      if (!thumbCheck.isValid) {
        throw new Error(
          thumbCheck.error || 'Gambar berita belum lengkap untuk dipublikasikan.'
        );
      }
    }

    const updatedAt = new Date().toISOString();
    await updateDeputyNewsStatusInFirestore(id, status, updatedAt);
    return { ...existing, status, updatedAt };
  };

  const deleteDeputyNews = async (id: string): Promise<void> => {
    await deleteDeputyNewsInFirestore(id);
  };

  // ============================================================================
  // HERO SLIDES CRUD (CLOUD FIRESTORE)
  // ============================================================================
  const saveHeroSlides = async (nextSlides: HeroSlide[]): Promise<HeroSlide[]> => {
    const normalized = normalizeHeroSlides(
      nextSlides.map((s, idx) => ({
        ...s,
        order: idx,
        updatedAt: new Date().toISOString(),
      }))
    );
    const prevIds = heroSlidesRef.current.map((s) => s.id);
    await saveHeroSlidesToFirestore(normalized, prevIds);
    return normalized;
  };

  const resetHeroSlides = async (): Promise<HeroSlide[]> => {
    const defaults = normalizeHeroSlides(DEFAULT_HERO_SLIDES);
    const prevIds = heroSlidesRef.current.map((s) => s.id);
    await saveHeroSlidesToFirestore(defaults, prevIds);
    return defaults;
  };

  // ============================================================================
  // ABOUT PAGE CRUD (CLOUD FIRESTORE)
  // ============================================================================
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

    return compressImageForFirestore(file);
  };

  const saveAboutPage = async (nextContent: AboutPageContent): Promise<AboutPageContent> => {
    const nowIso = new Date().toISOString();
    const prevImg = aboutPageRef.current.profileImageUrl;
    const nextImg = normalizeStaticImageUrl(nextContent.profileImageUrl);
    const payload: AboutPageContent = {
      ...nextContent,
      profileImageUrl: nextImg,
      profileImageUpdatedAt:
        nextImg && nextImg !== prevImg
          ? nowIso
          : nextImg
          ? nextContent.profileImageUpdatedAt ?? aboutPageRef.current.profileImageUpdatedAt ?? nowIso
          : null,
      updatedAt: nowIso,
    };

    await saveAboutPageToFirestore(payload);
    setAboutPage(payload);
    setAboutPageError(null);
    return payload;
  };

  const deleteAboutProfileImage = async (): Promise<AboutPageContent> => {
    const payload: AboutPageContent = {
      ...aboutPageRef.current,
      profileImageUrl: '',
      profileImageUpdatedAt: null,
      updatedAt: new Date().toISOString(),
    };
    await saveAboutPageToFirestore(payload);
    setAboutPage(payload);
    setAboutPageError(null);
    return payload;
  };

  const resetAboutPageContent = async (keepImage = true): Promise<AboutPageContent> => {
    const nowIso = new Date().toISOString();
    const payload: AboutPageContent = {
      ...DEFAULT_ABOUT_PAGE_CONTENT,
      profileImageUrl: keepImage ? aboutPageRef.current.profileImageUrl : '',
      profileImageUpdatedAt: keepImage ? aboutPageRef.current.profileImageUpdatedAt : null,
      updatedAt: nowIso,
    };
    await saveAboutPageToFirestore(payload);
    setAboutPage(payload);
    setAboutPageError(null);
    return payload;
  };

  // Explicit Admin Seed / Demo Reset to Cloud Firestore
  const resetToDemoData = async (): Promise<void> => {
    await syncAllStoresToFirestore({
      policies: INITIAL_POLICIES,
      deputyNews: deputyNewsRef.current,
      heroSlides: normalizeHeroSlides(DEFAULT_HERO_SLIDES),
      categories: INITIAL_CATEGORIES,
      sources: INITIAL_SOURCES,
      aboutPage: DEFAULT_ABOUT_PAGE_CONTENT,
    });
  };

  return (
    <PolicyContext.Provider
      value={{
        policies,
        isPoliciesLoading,
        categories,
        isCategoriesLoading,
        sources,
        isSourcesLoading,
        deputyNews,
        deputyNewsImageUrls,
        isDeputyNewsLoading,
        heroSlides,
        isHeroSlidesLoading,
        aboutPage,
        isAboutPageLoading,
        aboutPageError,
        adminUser,
        authorizedUsers: ADMIN_USER_PROFILES,
        isAuthLoading,
        currentRoute,
        searchQuery,
        setSearchQuery,
        navigateTo,
        loginAsAdmin,
        logoutAdmin,
        firebaseUser,
        isFirebaseVerifiedAdmin,
        loginWithGoogle,
        logoutFirebase,
        refreshPolicies,
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
        refreshCategories,
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
