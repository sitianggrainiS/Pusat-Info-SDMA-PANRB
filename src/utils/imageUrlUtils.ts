import { Policy } from '../types';
import { DEFAULT_FALLBACK_IMAGE_PATH, normalizeStaticImageUrl } from '../data/staticImages';
import { detectInstagramThumbnail } from './thumbnailUtils';

const IG_POST_OR_REEL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:([a-zA-Z0-9._]+)\/)?(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i;

/**
 * Returns true ONLY if the URL points to an actual embeddable Instagram post, carousel, Reel, or IGTV
 * (e.g. https://www.instagram.com/p/ABC123/ or /reel/ABC123/).
 * Bare profile URLs (e.g. https://www.instagram.com/sdmapanrb) and direct image URLs return false.
 */
export function isInstagramPostOrReelUrl(rawUrl?: string | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  return IG_POST_OR_REEL_REGEX.test(rawUrl.trim());
}

/**
 * Returns true if the URL is an Instagram webpage URL (post, reel, profile, stories, instagr.am)
 * rather than a direct image file or CDN asset (such as cdninstagram.com or fbcdn.net).
 * Used to ensure Instagram post URLs are NEVER mistakenly treated as direct <img> files.
 */
export function isInstagramWebPageUrl(rawUrl?: string | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    // Note: Instagram's actual raw image CDNs use *.cdninstagram.com or *.fbcdn.net, NOT instagram.com
    return (
      host === 'instagram.com' ||
      host === 'www.instagram.com' ||
      host === 'm.instagram.com' ||
      host === 'instagr.am' ||
      host === 'www.instagr.am'
    );
  } catch {
    return /^(?:www\.)?instagram\.com\//i.test(trimmed);
  }
}

export interface DirectImageValidationResult {
  isValid: boolean;
  cleanUrl: string;
  error?: string;
  isInstagramPostPage?: boolean;
}

/**
 * Validates a direct image URL or permanent project asset path (/images/...).
 * Strictly rejects temporary `blob:` URLs and warns clearly if an Instagram post webpage URL
 * is pasted into a direct image field.
 */
export function validateDirectImageUrl(
  rawInput?: string | null,
  options?: { allowEmpty?: boolean; allowDataUrl?: boolean }
): DirectImageValidationResult {
  const allowEmpty = Boolean(options?.allowEmpty);
  const allowDataUrl = options?.allowDataUrl !== false;
  const rawTrimmed = typeof rawInput === 'string' ? rawInput.trim() : '';

  if (!rawTrimmed) {
    if (allowEmpty) {
      return { isValid: true, cleanUrl: '' };
    }
    return {
      isValid: false,
      cleanUrl: '',
      error: 'URL gambar wajib diisi (gunakan /images/... atau https://...).',
    };
  }

  if (rawTrimmed.startsWith('blob:')) {
    return {
      isValid: false,
      cleanUrl: '',
      error:
        'URL blob: sementara tidak diizinkan untuk penyimpanan permanen. Gunakan URL gambar langsung (https://...) atau aset proyek (/images/...).',
    };
  }

  const normalized = normalizeStaticImageUrl(rawTrimmed);

  if (normalized.startsWith('data:image/')) {
    if (!allowDataUrl) {
      return {
        isValid: false,
        cleanUrl: '',
        error:
          'Format data: sementara tidak diizinkan pada kolom ini. Gunakan URL gambar langsung (https://...) atau aset proyek (/images/...).',
      };
    }
    return { isValid: true, cleanUrl: normalized };
  }

  if (normalized.length > 2048) {
    return {
      isValid: false,
      cleanUrl: '',
      error: 'Panjang URL gambar melebihi batas maksimum (2048 karakter).',
    };
  }

  if (
    normalized.startsWith('/images/') ||
    normalized.startsWith('/assets/') ||
    normalized.startsWith('/api/uploads/')
  ) {
    return { isValid: true, cleanUrl: normalized };
  }

  if (normalized.startsWith('/')) {
    return {
      isValid: false,
      cleanUrl: '',
      error:
        'Path gambar lokal harus berada di folder aset statis publik seperti /images/nama-gambar.jpg.',
    };
  }

  if (isInstagramWebPageUrl(normalized)) {
    return {
      isValid: false,
      cleanUrl: '',
      isInstagramPostPage: true,
      error:
        'URL ini adalah tautan halaman/postingan Instagram, bukan URL file gambar langsung. Gunakan kolom URL Postingan Instagram untuk embed, atau masukkan URL file gambar langsung (.jpg, .png, .webp).',
    };
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        isValid: false,
        cleanUrl: '',
        error: 'URL gambar wajib diawali protokol https:// atau http://.',
      };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return {
        isValid: false,
        cleanUrl: '',
        error: 'Nama domain pada URL gambar tidak valid.',
      };
    }
    return { isValid: true, cleanUrl: parsed.toString() };
  } catch {
    return {
      isValid: false,
      cleanUrl: '',
      error:
        'Format URL gambar tidak valid. Masukkan tautan lengkap https://... atau path aset /images/nama-gambar.jpg.',
    };
  }
}

export interface ResolvedPolicyMedia {
  /** Direct image URL to display when rendering an <img> element */
  imageUrl: string;
  /** True when Admin explicitly supplied an image URL (customThumbnail/thumbnail or direct image in media URL) */
  hasExplicitAdminImage: boolean;
  /** True when policy.instagramPostUrl is an embeddable Instagram post/reel/tv URL */
  hasEmbeddableInstagramPost: boolean;
  /** External source or Instagram link for "Buka Tautan / Buka di Instagram" button */
  externalSourceUrl: string;
  /** True if externalSourceUrl points to Instagram */
  isInstagramSource: boolean;
}

/**
 * Resolves how a Policy / Instagram / Artikel item should render its visual media on public pages:
 * - Never substitutes a dummy/placeholder image when an actual admin image URL exists.
 * - Strictly separates direct image URLs (rendered via <img>) from Instagram post URLs (rendered via embed).
 */
export function resolvePolicyMedia(policy: Partial<Policy>): ResolvedPolicyMedia {
  const rawPostUrl = (policy.instagramPostUrl || '').trim();
  const hasEmbeddableInstagramPost = isInstagramPostOrReelUrl(rawPostUrl);

  // Check if someone entered a direct image URL into instagramPostUrl
  const postUrlAsImage =
    rawPostUrl && !isInstagramWebPageUrl(rawPostUrl)
      ? validateDirectImageUrl(rawPostUrl)
      : { isValid: false, cleanUrl: '' };
  const looksLikeDirectImageExt = /\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(rawPostUrl);
  const isPostFieldDirectImage = postUrlAsImage.isValid && looksLikeDirectImageExt;

  const candidateCustom = normalizeStaticImageUrl(policy.customThumbnail || '');
  const candidateThumb = normalizeStaticImageUrl(policy.thumbnail || '');
  const autoDetected = detectInstagramThumbnail(policy);

  let explicitAdminImage = '';

  if (policy.isCustomThumbnail) {
    const chosen = candidateCustom || candidateThumb;
    if (chosen && validateDirectImageUrl(chosen).isValid) {
      explicitAdminImage = chosen;
    }
  } else if (
    candidateThumb &&
    candidateThumb !== DEFAULT_FALLBACK_IMAGE_PATH &&
    candidateThumb !== autoDetected &&
    validateDirectImageUrl(candidateThumb).isValid
  ) {
    // Also honor any non-default image URL saved in `thumbnail` even if `isCustomThumbnail` flag was omitted
    explicitAdminImage = candidateThumb;
  } else if (isPostFieldDirectImage) {
    explicitAdminImage = postUrlAsImage.cleanUrl;
  }

  const fallbackImage =
    candidateThumb && validateDirectImageUrl(candidateThumb).isValid
      ? candidateThumb
      : autoDetected || DEFAULT_FALLBACK_IMAGE_PATH;

  const finalImageUrl = explicitAdminImage || fallbackImage;

  const cleanExternalUrl =
    rawPostUrl && !isPostFieldDirectImage ? rawPostUrl : '';

  return {
    imageUrl: finalImageUrl,
    hasExplicitAdminImage: Boolean(explicitAdminImage),
    hasEmbeddableInstagramPost,
    externalSourceUrl: cleanExternalUrl,
    isInstagramSource: isInstagramWebPageUrl(cleanExternalUrl),
  };
}
