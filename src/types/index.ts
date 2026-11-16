export type PolicyStatus = 'draft' | 'review' | 'published';

export interface SourceDocument {
  id: string;
  title: string;
  regulationType: string; // e.g., 'Peraturan Menteri PANRB', 'Keputusan Menteri PANRB', 'Undang-Undang'
  regulationNumber: string; // e.g., 'Nomor 1 Tahun 2023'
  year: string; // e.g., '2023'
  articles?: string; // e.g., 'Pasal 24 - 28'
  fileUrl?: string; // Link to official PDF/portal
  description?: string;
  isVerified: boolean;
}

export interface PolicyFAQ {
  question: string;
  answer: string;
}

export interface PolicyComparison {
  titleA: string;
  titleB: string;
  rows: {
    attribute: string;
    itemA: string;
    itemB: string;
  }[];
}

export interface Policy {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  summary: string;
  
  // Structured Educational Content Sections
  contextHeader?: string; // Header Latar Belakang (opsional, dicetak tebal saat ditampilkan)
  contextExplanation: string; // Latar Belakang
  conceptA?: {
    title: string;
    description: string;
    keyPoints: string[];
  };
  conceptB?: {
    title: string;
    description: string;
    keyPoints: string[];
  };
  comparison?: PolicyComparison;
  simultaneousExplanation?: string; // "Bagaimana Jika Keduanya Diperoleh Bersamaan?"
  generalContent?: string; // For general single-topic policies
  classifications?: {
    name: string;
    description: string;
    examples: string[];
    criteria?: string;
  }[];
  
  requirementsHeader?: string; // Header Persyaratan (opsional, dicetak tebal saat ditampilkan)
  requirements?: string[];
  processStepsHeader?: string; // Header Alur Pengurusan (opsional, dicetak tebal saat ditampilkan)
  processSteps?: string[];
  faqs?: PolicyFAQ[];

  // Media & Instagram connection
  thumbnail: string;
  instagramPostUrl: string;
  instagramThumbnail?: string;
  isCustomThumbnail?: boolean; // Flag if admin has manually chosen/uploaded a thumbnail
  customThumbnail?: string; // Stored custom thumbnail URL or base64
  autoThumbnail?: string; // Detected Instagram thumbnail
  instagramDate: string;
  instagramAccountHandle: string; // e.g., '@sdmanparb'

  // Metadata & Sources
  status: PolicyStatus;
  sources: SourceDocument[];
  relatedPolicyIds?: string[];
  publicationDate: string;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
  aiAssisted?: boolean;

  // AI-generated Content Summary (3-4 sentences, requires admin approval)
  aiSummary?: string;
  isAiSummaryApproved?: boolean;
  aiSummaryGeneratedAt?: string;
  instagramCaption?: string; // Authorized manual/pasted caption & slide text provided by admin
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  group?: 'klaster' | 'pilar';
  colorScheme?: string;
}

export type AdminRole = 'superadmin' | 'content_manager' | 'legal_reviewer' | 'editor';

export interface AdminPermissions {
  canManageUsers: boolean;
  canPublishPolicies: boolean;
  canEditCategories: boolean;
  canManageSources: boolean;
  canUseAI: boolean;
}

export interface AdminUser {
  uid?: string;
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  roleTitle?: string;
  department?: string;
  permissions?: AdminPermissions;
  isActive?: boolean;
}

export interface AIAnalysisResult {
  summary: string;
  definition: string;
  keyPoints: string[];
  importantProvisions: string[];
  requirements: string[];
  processSteps: string[];
  legalBasis: {
    regulationTitle: string;
    regulationNumber: string;
    year: string;
    articles?: string;
  };
  faqs: {
    question: string;
    answer: string;
  }[];
  suggestedPublicExplanation: string;
  comparisonNote?: string;
}

export type DeputyNewsStatus = 'draft' | 'published';

export interface DeputyNews {
  id: string;
  title: string;
  articleUrl: string;
  imageId?: string;
  thumbnailUrl: string;
  publicationDate: string; // YYYY-MM-DD
  summary: string;
  category: string;
  status: DeputyNewsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DeputyNewsInput {
  title: string;
  articleUrl: string;
  imageFile?: File | Blob | null;
  imageId?: string;
  thumbnailUrl: string;
  publicationDate: string;
  summary: string;
  category: string;
  status: DeputyNewsStatus;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  title: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface HeroSlideInput {
  imageUrl: string;
  title: string;
  isActive?: boolean;
}

export type AboutUnitIconName =
  | 'Building2'
  | 'UserPlus'
  | 'GraduationCap'
  | 'Award'
  | 'TrendingUp'
  | 'ShieldCheck';

export interface AboutUnitSubSection {
  name: string;
  description: string;
}

export interface AboutUnitWork {
  id: string;
  name: string;
  orgChartLabel: string;
  iconName: AboutUnitIconName;
  mainTask: string;
  detailedTasks: string[];
  subUnit?: AboutUnitSubSection;
}

export interface AboutPageContent {
  heading: string;
  subheading: string;
  description: string;
  profileImageUrl: string;
  profileImageUpdatedAt?: string | null;
  orgSectionTitle: string;
  orgTopLevelTitle: string;
  unitSectionTitle: string;
  unitSectionSubtitle: string;
  units: AboutUnitWork[];
  updatedAt: string;
}


