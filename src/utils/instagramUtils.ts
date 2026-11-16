const INSTAGRAM_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const INSTAGRAM_EPOCH_MS = 1314220021721n;
const MIN_VALID_IG_MS = Date.UTC(2010, 9, 6); // Oct 6, 2010
const RESERVED_IG_SEGMENTS = new Set([
  'p',
  'reel',
  'reels',
  'tv',
  'stories',
  'explore',
  'share',
  'accounts',
]);

export function formatDateIndonesianWib(date: Date): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date);
  } catch {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}

/**
 * Decodes an Instagram 11-char Snowflake shortcode into its publication date (id-ID, WIB).
 */
export function extractInstagramDateFromShortcode(shortcode?: string): string | null {
  if (!shortcode || typeof shortcode !== 'string') return null;
  const clean = shortcode.trim();
  if (clean.length < 10 || clean.length > 12) return null;

  let mediaId = 0n;
  for (const ch of clean.slice(0, 11)) {
    const idx = INSTAGRAM_ALPHABET.indexOf(ch);
    if (idx === -1) return null;
    mediaId = (mediaId << 6n) | BigInt(idx);
  }

  const timestampMs = Number((mediaId >> 23n) + INSTAGRAM_EPOCH_MS);
  const maxValidMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(timestampMs) || timestampMs < MIN_VALID_IG_MS || timestampMs > maxValidMs) {
    return null;
  }

  return formatDateIndonesianWib(new Date(timestampMs));
}

/**
 * Extracts and cleans Instagram post / reel / carousel URL, shortcode, handle, and post date.
 */
export function extractInstagramInfo(rawUrl: string, captioned: boolean = true) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      cleanUrl: '',
      shortcode: '',
      accountHandle: '',
      detectedDate: null as string | null,
      type: 'post' as const,
      embedUrl: '',
    };
  }

  const trimmed = rawUrl.trim();
  // Regex to match posts, reels, or tv: /[handle]/p/:code, /reel/:code, /tv/:code
  const regex = /instagram\.com\/(?:([a-zA-Z0-9._]+)\/)?(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i;
  const match = trimmed.match(regex);
  const embedSuffix = captioned ? 'embed/captioned/' : 'embed/';

  if (match) {
    const candidateHandle = (match[1] || '').trim();
    const accountHandle =
      candidateHandle && !RESERVED_IG_SEGMENTS.has(candidateHandle.toLowerCase())
        ? `@${candidateHandle.replace(/^@+/, '')}`
        : '';
    const rawKind = match[2].toLowerCase();
    const canonicalKind = rawKind === 'reels' ? 'reel' : rawKind;
    const mediaType = canonicalKind === 'reel' ? ('reel' as const) : ('post' as const);
    const shortcode = match[3];
    const cleanUrl = `https://www.instagram.com/${canonicalKind}/${shortcode}/`;
    return {
      isValid: true,
      cleanUrl,
      shortcode,
      accountHandle,
      detectedDate: extractInstagramDateFromShortcode(shortcode),
      type: mediaType,
      embedUrl: `https://www.instagram.com/${canonicalKind}/${shortcode}/${embedSuffix}`,
    };
  }

  return {
    isValid: false,
    cleanUrl: trimmed,
    shortcode: '',
    accountHandle: '',
    detectedDate: null as string | null,
    type: 'post' as const,
    embedUrl: '',
  };
}

export function extractInstagramDateFromUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  return extractInstagramInfo(rawUrl).detectedDate;
}

import { formatContentDate } from './dateUtils';

/**
 * Resolves the release date for a policy item:
 * - Strictly honors the inputted/stored date (instagramDate or publicationDate) without overriding it.
 * - Only falls back to Instagram shortcode date if no date was inputted at all.
 */
export function resolvePolicyReleaseDate(policy: {
  instagramDate?: string;
  publicationDate?: string;
  instagramPostUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}): string {
  const storedDate = policy.instagramDate?.trim() || policy.publicationDate?.trim() || '';
  if (storedDate) {
    return formatContentDate(storedDate) || storedDate;
  }

  const urlDate = extractInstagramDateFromUrl(policy.instagramPostUrl);
  return urlDate || '-';
}
