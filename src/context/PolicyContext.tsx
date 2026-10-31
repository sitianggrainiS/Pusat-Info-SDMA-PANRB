import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
} from '../data/initialData';
import { DEFAULT_HERO_SLIDES, normalizeHeroSlides } from '../data/initialHeroSlides';
import { DEFAULT_ABOUT_PAGE_CONTENT } from '../data/initialAboutData';
import { detectInstagramThumbnail } from '../utils/thumbnailUtils';
import { sortDeputyNewsNewestFirst } from '../utils/deputyNewsUtils';
import { AUTHORIZED_ADMIN_USERS, AuthorizedAccount } from '../data/adminUsers';

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
  authorizedUsers: AuthorizedAccount[];
  currentRoute: AppRoute;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  navigateTo: (route: AppRoute) => void;
  loginAsAdmin: (email?: string, password?: string) => { success: boolean; errorType?: 'email' | 'password'; error?: string };
  logoutAdmin: () => void;
  // Policy CRUD
  createPolicy: (policyData: Partial<Policy>) => Policy;
  updatePolicy: (id: string, updates: Partial<Policy>) => void;
  updatePolicyThumbnail: (id: string, newThumbnail: string, isCustom?: boolean) => void;
  deletePolicy: (id: string) => void;
  setPolicyStatus: (id: string, status: PolicyStatus) => void;
  // Deputy News CRUD (connected to backend database)
  refreshDeputyNews: () => Promise<void>;
  createDeputyNews: (input: DeputyNewsInput) => Promise<DeputyNews>;
  updateDeputyNews: (id: string, input: DeputyNewsInput) => Promise<DeputyNews>;
  setDeputyNewsStatus: (id: string, status: DeputyNewsStatus) => Promise<DeputyNews>;
  deleteDeputyNews: (id: string) => Promise<void>;
  // Hero Slides CRUD (connected to backend database)
  refreshHeroSlides: () => Promise<void>;
  saveHeroSlides: (slides: HeroSlide[]) => Promise<HeroSlide[]>;
  resetHeroSlides: () => Promise<HeroSlide[]>;
  // About Page CRUD & Persistent Image Management
  refreshAboutPage: () => Promise<void>;
  uploadAboutProfileImage: (file: File) => Promise<string>;
  saveAboutPage: (content: AboutPageContent) => Promise<AboutPageContent>;
  deleteAboutProfileImage: () => Promise<AboutPageContent>;
  resetAboutPageContent: (keepImage?: boolean) => Promise<AboutPageContent>;
  // Category CRUD
  createCategory: (categoryData: Partial<Category>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string, reassignToId?: string) => void;
  resetCategoriesToDefault: () => void;
  // Source CRUD
  createSource: (sourceData: Partial<SourceDocument>) => SourceDocument;
  updateSource: (id: string, updates: Partial<SourceDocument>) => void;
  deleteSource: (id: string) => void;
  // Helpers
  getPolicyBySlug: (slug: string) => Policy | undefined;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryBySlug: (slug: string) => Category | undefined;
  resetToDemoData: () => void;
}

const PolicyContext = createContext<PolicyContextType | undefined>(undefined);

const STORAGE_KEYS = {
  POLICIES: 'sdm_aparatur_policies_v7',
  CATEGORIES: 'sdm_aparatur_categories_v8klaster',
  CATEGORIES_SEKDIN_SEEDED: 'sdm_aparatur_cat_sekdin_v1',
  SOURCES: 'sdm_aparatur_sources_v4',
  AUTH: 'sdm_aparatur_auth_v4',
  AUTH_TOKEN: 'sdm_aparatur_auth_token_v1',
  DEPUTY_NEWS_CACHE: 'sdm_aparatur_deputy_news_cache_v1',
  HERO_SLIDES_CACHE: 'sdm_aparatur_hero_slides_cache_v1',
};

const OLD_TO_NEW_CAT_MAP: Record<string, string> = {
  'cat-jf': 'cat-talenta-karier',
  'cat-jp': 'cat-perencanaan-pengadaan',
  'cat-pengadaan': 'cat-perencanaan-pengadaan',
  'cat-karier': 'cat-talenta-karier',
  'cat-kinerja': 'cat-pengelolaan-kinerja',
  'cat-bangkom': 'cat-pengembangan-kompetensi',
  'cat-talenta': 'cat-sistem-merit',
  'cat-digital': 'cat-perencanaan-pengadaan',
  'cat-manajemen': 'cat-budaya-kerja',
};

const LEGACY_SEED_POLICY_IDS = new Set([
  'pol-naik-pangkat-vs-naik-jenjang',
  'pol-mengenal-jabatan-pelaksana',
  'pol-manajemen-talenta',
]);

export const PolicyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Policies State
  const [policies, setPolicies] = useState<Policy[]>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEYS.POLICIES) ||
        localStorage.getItem('sdm_aparatur_policies_v6') ||
        localStorage.getItem('sdm_aparatur_policies_v5');
      if (saved) {
        const parsed: Policy[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((p) => p && !LEGACY_SEED_POLICY_IDS.has(p.id))
            .map((p) => {
              const updated = { ...p };
              if (updated.categoryId && OLD_TO_NEW_CAT_MAP[updated.categoryId]) {
                updated.categoryId = OLD_TO_NEW_CAT_MAP[updated.categoryId];
              }

              if (updated.instagramDate && updated.instagramDate.trim()) {
                updated.publicationDate = updated.instagramDate.trim();
              }

              if (!updated.isCustomThumbnail) {
                if (!updated.thumbnail) {
                  const detected = detectInstagramThumbnail(updated);
                  updated.thumbnail = detected;
                  updated.instagramThumbnail = detected;
                }
              } else if (updated.customThumbnail) {
                updated.thumbnail = updated.customThumbnail;
              }

              return updated;
            });
        }
      }
    } catch (e) {
      console.error('Failed to load policies from localStorage', e);
    }
    return INITIAL_POLICIES;
  });

  // Categories State
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed: Category[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasLegacy = parsed.some((c) => c.id === 'cat-jf' || c.id === 'cat-jp');
          if (!hasLegacy) {
            const hydrated: Category[] = parsed.map((c) => ({
              ...c,
              group: c.group || (STANDARD_KLASTER_IDS.has(c.id) ? 'klaster' : 'pilar'),
            }));
            const alreadySeededSekdin = localStorage.getItem(STORAGE_KEYS.CATEGORIES_SEKDIN_SEEDED);
            if (!alreadySeededSekdin) {
              const hasSekdin = hydrated.some(
                (c) => c.id === 'cat-sekolah-kedinasan' || c.slug === 'sekolah-kedinasan'
              );
              const sekdinDefault = INITIAL_CATEGORIES.find(
                (c) => c.id === 'cat-sekolah-kedinasan'
              );
              localStorage.setItem(STORAGE_KEYS.CATEGORIES_SEKDIN_SEEDED, '1');
              if (!hasSekdin && sekdinDefault) {
                return [...hydrated, sekdinDefault];
              }
            }
            return hydrated;
          }
        }
      }
      localStorage.setItem(STORAGE_KEYS.CATEGORIES_SEKDIN_SEEDED, '1');
    } catch (e) {
      console.error('Failed to load categories from localStorage', e);
    }
    return INITIAL_CATEGORIES;
  });

  // Sources State
  const [sources, setSources] = useState<SourceDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOURCES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load sources from localStorage', e);
    }
    return INITIAL_SOURCES;
  });

  // Admin User State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load auth from localStorage', e);
    }
    return null;
  });

  // Deputy News State (authoritative backend store with local offline mirror)
  const [deputyNews, setDeputyNews] = useState<DeputyNews[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.DEPUTY_NEWS_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return sortDeputyNewsNewestFirst(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to read deputy news cache', e);
    }
    return [];
  });
  const [isDeputyNewsLoading, setIsDeputyNewsLoading] = useState<boolean>(true);

  // Hero Slides State (authoritative backend store with local offline mirror, 3 fixed slots)
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.HERO_SLIDES_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeHeroSlides(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to read hero slides cache', e);
    }
    return normalizeHeroSlides(DEFAULT_HERO_SLIDES);
  });
  const [isHeroSlidesLoading, setIsHeroSlidesLoading] = useState<boolean>(true);

  // About Page State (authoritative backend store; never hardcodes profile image)
  const [aboutPage, setAboutPage] = useState<AboutPageContent>(DEFAULT_ABOUT_PAGE_CONTENT);
  const [isAboutPageLoading, setIsAboutPageLoading] = useState<boolean>(true);
  const [aboutPageError, setAboutPageError] = useState<string | null>(null);

  // Admin Backend Session Token
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || null;
    } catch {
      return null;
    }
  });
  const pendingTokenPromiseRef = useRef<Promise<string | null> | null>(null);

  // Global search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [currentRoute, setCurrentRoute] = useState<AppRoute>({ name: 'home' });

  const syncDeputyNewsCache = useCallback((items: DeputyNews[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.DEPUTY_NEWS_CACHE, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to mirror deputy news cache', e);
    }
  }, []);

  const syncHeroSlidesCache = useCallback((items: HeroSlide[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.HERO_SLIDES_CACHE, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to mirror hero slides cache', e);
    }
  }, []);

  const refreshDeputyNews = useCallback(async () => {
    try {
      setIsDeputyNewsLoading(true);
      const res = await fetch('/api/deputy-news', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        const sorted = sortDeputyNewsNewestFirst(data.items);
        setDeputyNews(sorted);
        syncDeputyNewsCache(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch deputy news from backend API:', err);
    } finally {
      setIsDeputyNewsLoading(false);
    }
  }, [syncDeputyNewsCache]);

  const refreshHeroSlides = useCallback(async () => {
    try {
      setIsHeroSlidesLoading(true);
      const res = await fetch('/api/hero-slides', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data?.items) && data.items.length > 0) {
        const normalized = normalizeHeroSlides(data.items);
        setHeroSlides(normalized);
        syncHeroSlidesCache(normalized);
      }
    } catch (err) {
      console.error('Failed to fetch hero slides from backend API:', err);
    } finally {
      setIsHeroSlidesLoading(false);
    }
  }, [syncHeroSlidesCache]);

  const refreshAboutPage = useCallback(async () => {
    try {
      setIsAboutPageLoading(true);
      setAboutPageError(null);
      const res = await fetch('/api/about-page', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Gagal memuat data Halaman Tentang (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data?.content && typeof data.content === 'object') {
        setAboutPage(data.content);
      }
    } catch (err: any) {
      console.error('Failed to fetch about page from backend API:', err);
      setAboutPageError(err?.message || 'Gagal memuat data Halaman Tentang dari server.');
    } finally {
      setIsAboutPageLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDeputyNews();
    refreshHeroSlides();
    refreshAboutPage();
  }, [refreshDeputyNews, refreshHeroSlides, refreshAboutPage]);

  // Sync with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(policies));
    } catch (e) {
      console.error('Failed to save policies to localStorage', e);
    }
  }, [policies]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories to localStorage', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(sources));
    } catch (e) {
      console.error('Failed to save sources to localStorage', e);
    }
  }, [sources]);

  useEffect(() => {
    try {
      if (adminUser) {
        localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(adminUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH);
      }
    } catch (e) {
      console.error('Failed to save auth to localStorage', e);
    }
  }, [adminUser]);

  useEffect(() => {
    try {
      if (adminSessionToken) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, adminSessionToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      }
    } catch (e) {
      console.error('Failed to save auth token to localStorage', e);
    }
  }, [adminSessionToken]);

  const requestBackendAdminToken = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const res = await fetch('/api/admin/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (typeof data?.token === 'string' && data.token) {
          setAdminSessionToken(data.token);
          return data.token;
        }
        return null;
      } catch (err) {
        console.error('Failed to obtain backend admin session token:', err);
        return null;
      }
    },
    []
  );

  const ensureValidAdminToken = useCallback(async (): Promise<string> => {
    if (pendingTokenPromiseRef.current) {
      const awaited = await pendingTokenPromiseRef.current;
      if (awaited) return awaited;
    }

    if (adminSessionToken) {
      try {
        const verifyRes = await fetch('/api/admin/session/verify', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminSessionToken}` },
        });
        if (verifyRes.ok) {
          return adminSessionToken;
        }
      } catch {
        // Proceed to refresh if possible
      }
    }

    if (adminUser) {
      const matched = AUTHORIZED_ADMIN_USERS.find(
        (u) => u.id === adminUser.id && u.email.toLowerCase() === adminUser.email.toLowerCase()
      );
      if (matched) {
        const promise = requestBackendAdminToken(matched.email, matched.passwordHash);
        pendingTokenPromiseRef.current = promise;
        const token = await promise;
        pendingTokenPromiseRef.current = null;
        if (token) return token;
      }
    }

    throw new Error(
      'Sesi keamanan kedinasan tidak valid atau telah berakhir. Silakan keluar dan masuk kembali ke Portal Admin.'
    );
  }, [adminSessionToken, adminUser, requestBackendAdminToken]);

  useEffect(() => {
    if (adminUser && !adminSessionToken) {
      const matched = AUTHORIZED_ADMIN_USERS.find(
        (u) => u.id === adminUser.id && u.email.toLowerCase() === adminUser.email.toLowerCase()
      );
      if (matched) {
        const promise = requestBackendAdminToken(matched.email, matched.passwordHash);
        pendingTokenPromiseRef.current = promise;
        promise.finally(() => {
          pendingTokenPromiseRef.current = null;
        });
      }
    }
  }, [adminUser, adminSessionToken, requestBackendAdminToken]);

  // Handle browser back/forward and hash links smoothly
  const navigateTo = (route: AppRoute) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentRoute(route);
  };

  const loginAsAdmin = (
    inputEmail: string = '',
    inputPassword?: string
  ): { success: boolean; errorType?: 'email' | 'password'; error?: string } => {
    const cleanEmail = (inputEmail || '').trim().toLowerCase();
    const cleanPass = inputPassword?.trim() || '';

    const matched = AUTHORIZED_ADMIN_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (!matched) {
      return {
        success: false,
        errorType: 'email',
        error: 'Email Anda salah',
      };
    }

    if (matched.passwordHash !== cleanPass) {
      return {
        success: false,
        errorType: 'password',
        error: 'Password Anda salah',
      };
    }

    const { passwordHash: _, ...safeUser } = matched;
    setAdminUser(safeUser);

    const tokenPromise = requestBackendAdminToken(cleanEmail, cleanPass);
    pendingTokenPromiseRef.current = tokenPromise;
    tokenPromise.finally(() => {
      pendingTokenPromiseRef.current = null;
    });

    return { success: true };
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    setAdminSessionToken(null);
    navigateTo({ name: 'home' });
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

  const createPolicy = (policyData: Partial<Policy>): Policy => {
    const title = policyData.title || 'Kebijakan Baru';
    const slug = policyData.slug || generateSlug(title);
    const detectedThumb = detectInstagramThumbnail({
      title,
      slug,
      instagramPostUrl: policyData.instagramPostUrl,
      categoryId: policyData.categoryId,
    });
    const finalThumb = policyData.thumbnail || detectedThumb;

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
      instagramThumbnail: policyData.instagramThumbnail || finalThumb,
      isCustomThumbnail: Boolean(policyData.isCustomThumbnail),
      customThumbnail: policyData.isCustomThumbnail ? finalThumb : undefined,
      autoThumbnail: detectedThumb,
      instagramDate:
        policyData.instagramDate?.trim() ||
        policyData.publicationDate?.trim() ||
        new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      instagramAccountHandle: policyData.instagramAccountHandle || '@sdmapanrb',
      status: policyData.status || 'draft',
      sources: policyData.sources || [],
      relatedPolicyIds: policyData.relatedPolicyIds || [],
      publicationDate:
        policyData.instagramDate?.trim() ||
        policyData.publicationDate?.trim() ||
        new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      isFeatured: Boolean(policyData.isFeatured),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiAssisted: Boolean(policyData.aiAssisted),

      // AI Summary fields
      aiSummary: policyData.aiSummary,
      isAiSummaryApproved: Boolean(policyData.isAiSummaryApproved),
      aiSummaryGeneratedAt: policyData.aiSummaryGeneratedAt,
      instagramCaption: policyData.instagramCaption,
    };

    setPolicies((prev) => [newPolicy, ...prev]);
    return newPolicy;
  };

  const updatePolicy = (id: string, updates: Partial<Policy>) => {
    setPolicies((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const updatePolicyThumbnail = (id: string, newThumbnail: string, isCustom = true) => {
    updatePolicy(id, {
      thumbnail: newThumbnail,
      instagramThumbnail: newThumbnail,
      customThumbnail: isCustom ? newThumbnail : undefined,
      isCustomThumbnail: isCustom,
    });
  };

  const deletePolicy = (id: string) => {
    setPolicies((prev) => prev.filter((item) => item.id !== id));
  };

  const setPolicyStatus = (id: string, status: PolicyStatus) => {
    updatePolicy(id, { status });
  };

  // Category CRUD
  const createCategory = (categoryData: Partial<Category>): Category => {
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
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const deleteCategory = (id: string, reassignToId?: string) => {
    // Reassign any policies associated with this category
    const targetCatId =
      reassignToId ||
      categories.find((c) => c.id !== id)?.id ||
      INITIAL_CATEGORIES[0].id;

    setPolicies((prev) =>
      prev.map((item) =>
        item.categoryId === id
          ? { ...item, categoryId: targetCatId, updatedAt: new Date().toISOString() }
          : item
      )
    );
    setCategories((prev) => prev.filter((item) => item.id !== id));
  };

  const resetCategoriesToDefault = () => {
    setCategories(INITIAL_CATEGORIES);
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    } catch (e) {
      console.error('Failed to reset categories', e);
    }
  };

  // Source CRUD
  const createSource = (sourceData: Partial<SourceDocument>): SourceDocument => {
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
    setSources((prev) => [newSource, ...prev]);
    return newSource;
  };

  const updateSource = (id: string, updates: Partial<SourceDocument>) => {
    setSources((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const deleteSource = (id: string) => {
    setSources((prev) => prev.filter((item) => item.id !== id));
  };

  // Helpers
  const getPolicyBySlug = (slug: string) => {
    return policies.find((p) => p.slug === slug);
  };

  const getCategoryById = (id: string) => {
    return categories.find((c) => c.id === id);
  };

  const getCategoryBySlug = (slug: string) => {
    return categories.find((c) => c.slug === slug);
  };

  // Deputy News CRUD (connected to backend database)
  const createDeputyNews = async (input: DeputyNewsInput): Promise<DeputyNews> => {
    const res = await fetch('/api/deputy-news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Gagal menyimpan berita ke server.');
    }
    const created: DeputyNews = data.item;
    setDeputyNews((prev) => {
      const next = sortDeputyNewsNewestFirst([created, ...prev]);
      syncDeputyNewsCache(next);
      return next;
    });
    return created;
  };

  const updateDeputyNews = async (id: string, input: DeputyNewsInput): Promise<DeputyNews> => {
    const res = await fetch(`/api/deputy-news/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Gagal memperbarui berita di server.');
    }
    const updated: DeputyNews = data.item;
    setDeputyNews((prev) => {
      const next = sortDeputyNewsNewestFirst(
        prev.map((item) => (item.id === id ? updated : item))
      );
      syncDeputyNewsCache(next);
      return next;
    });
    return updated;
  };

  const setDeputyNewsStatus = async (
    id: string,
    status: DeputyNewsStatus
  ): Promise<DeputyNews> => {
    const res = await fetch(`/api/deputy-news/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Gagal memperbarui status publikasi berita.');
    }
    const updated: DeputyNews = data.item;
    setDeputyNews((prev) => {
      const next = sortDeputyNewsNewestFirst(
        prev.map((item) => (item.id === id ? updated : item))
      );
      syncDeputyNewsCache(next);
      return next;
    });
    return updated;
  };

  const deleteDeputyNews = async (id: string): Promise<void> => {
    const res = await fetch(`/api/deputy-news/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Gagal menghapus berita dari server.');
    }
    setDeputyNews((prev) => {
      const next = prev.filter((item) => item.id !== id);
      syncDeputyNewsCache(next);
      return next;
    });
  };

  // Hero Slides CRUD (connected to backend database with local mirror, 3 fixed slots)
  const saveHeroSlides = async (nextSlides: HeroSlide[]): Promise<HeroSlide[]> => {
    const normalized = normalizeHeroSlides(
      nextSlides.map((s, idx) => ({
        ...s,
        order: idx,
        updatedAt: new Date().toISOString(),
      }))
    );
    // Optimistically update UI & cache immediately
    setHeroSlides(normalized);
    syncHeroSlidesCache(normalized);

    try {
      const res = await fetch('/api/hero-slides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Gagal menyimpan slide ke server.');
      }
      if (Array.isArray(data?.items) && data.items.length > 0) {
        const synced = normalizeHeroSlides(data.items);
        setHeroSlides(synced);
        syncHeroSlidesCache(synced);
        return synced;
      }
    } catch (err) {
      console.error('Failed to sync hero slides to server, kept local cache:', err);
    }
    return normalized;
  };

  const resetHeroSlides = async (): Promise<HeroSlide[]> => {
    const defaults = normalizeHeroSlides(DEFAULT_HERO_SLIDES);
    setHeroSlides(defaults);
    syncHeroSlidesCache(defaults);
    try {
      const res = await fetch('/api/hero-slides/reset', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.items)) {
        const synced = normalizeHeroSlides(data.items);
        setHeroSlides(synced);
        syncHeroSlidesCache(synced);
        return synced;
      }
    } catch (err) {
      console.error('Failed to reset hero slides on server:', err);
    }
    return defaults;
  };

  // About Page CRUD & Persistent Binary Image Management
  const uploadAboutProfileImage = async (file: File): Promise<string> => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt =
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp');

    if (!allowedMimeTypes.includes(file.type.toLowerCase()) || !hasValidExt) {
      throw new Error('Format file tidak didukung. Gunakan gambar berformat JPG, JPEG, PNG, atau WebP.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Ukuran file melebihi batas maksimal 5 MB.');
    }

    const token = await ensureValidAdminToken();
    const res = await fetch('/api/about-page/image', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
      },
      body: file,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Gagal mengunggah gambar profil ke server.');
    }
    if (!data?.imageUrl || typeof data.imageUrl !== 'string') {
      throw new Error('Respons server tidak memuat URL gambar yang valid.');
    }
    return data.imageUrl;
  };

  const saveAboutPage = async (nextContent: AboutPageContent): Promise<AboutPageContent> => {
    const token = await ensureValidAdminToken();
    const res = await fetch('/api/about-page', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nextContent),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Gagal menyimpan perubahan Halaman Tentang ke server.');
    }
    if (data?.content) {
      setAboutPage(data.content);
      setAboutPageError(null);
      return data.content;
    }
    return nextContent;
  };

  const deleteAboutProfileImage = async (): Promise<AboutPageContent> => {
    const token = await ensureValidAdminToken();
    const res = await fetch('/api/about-page/image', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Gagal menghapus gambar profil dari server.');
    }
    if (data?.content) {
      setAboutPage(data.content);
      setAboutPageError(null);
      return data.content;
    }
    throw new Error('Respons penghapusan gambar tidak valid.');
  };

  const resetAboutPageContent = async (keepImage = true): Promise<AboutPageContent> => {
    const token = await ensureValidAdminToken();
    const res = await fetch('/api/about-page/reset', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keepImage }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Gagal mereset konten Halaman Tentang.');
    }
    if (data?.content) {
      setAboutPage(data.content);
      setAboutPageError(null);
      return data.content;
    }
    return DEFAULT_ABOUT_PAGE_CONTENT;
  };

  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEYS.POLICIES);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.SOURCES);
    setPolicies(INITIAL_POLICIES);
    setCategories(INITIAL_CATEGORIES);
    setSources(INITIAL_SOURCES);
    resetHeroSlides();
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
        authorizedUsers: AUTHORIZED_ADMIN_USERS,
        currentRoute,
        searchQuery,
        setSearchQuery,
        navigateTo,
        loginAsAdmin,
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
