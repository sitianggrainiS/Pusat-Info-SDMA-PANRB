import { Policy } from '../types';

export const INDONESIAN_MONTH_LABELS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const INDONESIAN_MONTH_MAP: Record<string, number> = {
  januari: 0,
  january: 0,
  jan: 0,
  februari: 1,
  pebruari: 1,
  february: 1,
  feb: 1,
  maret: 2,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  may: 4,
  juni: 5,
  june: 5,
  jun: 5,
  juli: 6,
  july: 6,
  jul: 6,
  agustus: 7,
  august: 7,
  agu: 7,
  ags: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  oktober: 9,
  october: 9,
  okt: 9,
  oct: 9,
  november: 10,
  nopember: 10,
  nov: 10,
  desember: 11,
  december: 11,
  des: 11,
  dec: 11,
};

/**
 * Parses an inputted date string (Indonesian "1 Oktober 2026", ISO "2026-10-01",
 * slash/dash "01/10/2026", or ISO timestamp) into a Date at local noon without timezone drift.
 */
export function parseContentDate(raw?: string | null): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/^[a-zA-ZÀ-ÿ]+\s*,\s*/, '');
  if (!cleaned) return null;

  // 1. Format: "1 Oktober 2026" or "01 Okt 2026"
  const indoMatch = cleaned.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (indoMatch) {
    const day = Number(indoMatch[1]);
    const monthIdx = INDONESIAN_MONTH_MAP[indoMatch[2].toLowerCase()];
    const year = Number(indoMatch[3]);
    if (monthIdx !== undefined && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const candidate = new Date(year, monthIdx, day, 12, 0, 0, 0);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === monthIdx &&
        candidate.getDate() === day
      ) {
        return candidate;
      }
    }
  }

  // 2. Format: "YYYY-MM-DD"
  const isoDayMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDayMatch) {
    const year = Number(isoDayMatch[1]);
    const monthIdx = Number(isoDayMatch[2]) - 1;
    const day = Number(isoDayMatch[3]);
    if (monthIdx >= 0 && monthIdx <= 11 && day >= 1 && day <= 31) {
      const candidate = new Date(year, monthIdx, day, 12, 0, 0, 0);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === monthIdx &&
        candidate.getDate() === day
      ) {
        return candidate;
      }
    }
  }

  // 3. Format: "DD/MM/YYYY" or "DD-MM-YYYY"
  const slashMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const monthIdx = Number(slashMatch[2]) - 1;
    const year = Number(slashMatch[3]);
    if (monthIdx >= 0 && monthIdx <= 11 && day >= 1 && day <= 31) {
      const candidate = new Date(year, monthIdx, day, 12, 0, 0, 0);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === monthIdx &&
        candidate.getDate() === day
      ) {
        return candidate;
      }
    }
  }

  // 4. Full ISO timestamp fallback (extract Asia/Jakarta calendar day)
  const parsedTs = Date.parse(cleaned);
  if (!Number.isNaN(parsedTs)) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date(parsedTs));
      const y = Number(parts.find((p) => p.type === 'year')?.value);
      const m = Number(parts.find((p) => p.type === 'month')?.value);
      const d = Number(parts.find((p) => p.type === 'day')?.value);
      if (y && m && d) {
        return new Date(y, m - 1, d, 12, 0, 0, 0);
      }
    } catch {
      const d = new Date(parsedTs);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    }
  }

  return null;
}

/**
 * Formats a Date object into canonical Indonesian format: "1 Oktober 2026".
 */
export function formatDateToIndonesian(date: Date): string {
  const day = date.getDate();
  const month = INDONESIAN_MONTH_LABELS[date.getMonth()] || '';
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Converts a parsed date to "YYYY-MM-DD" for HTML <input type="date"> sync without timezone shift.
 */
export function formatDateToIsoInput(raw?: string | null): string {
  const parsed = parseContentDate(raw);
  if (!parsed) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats any inputted date string ("2026-10-01", "1 Oktober 2026", "01/10/2026")
 * into consistent Indonesian display format ("1 Oktober 2026") without altering the chosen day.
 */
export function formatContentDate(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const parsed = parseContentDate(trimmed);
  if (parsed) {
    return formatDateToIndonesian(parsed);
  }
  return trimmed;
}

/**
 * Returns today's date in Asia/Jakarta formatted in Indonesian ("2 November 2026").
 */
export function getTodayIndonesianDate(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = Number(parts.find((p) => p.type === 'year')?.value);
    const m = Number(parts.find((p) => p.type === 'month')?.value);
    const d = Number(parts.find((p) => p.type === 'day')?.value);
    if (y && m && d) {
      return formatDateToIndonesian(new Date(y, m - 1, d, 12, 0, 0, 0));
    }
  } catch {
    // fallback below
  }
  return formatDateToIndonesian(new Date());
}

/**
 * Returns the exact inputted date of a Policy item for both Admin and Public interfaces.
 * Never overrides an inputted date with an Instagram URL shortcode timestamp.
 */
export function getPolicyDisplayDate(policy: {
  instagramDate?: string;
  publicationDate?: string;
}): string {
  const rawInputted = policy.instagramDate?.trim() || policy.publicationDate?.trim() || '';
  if (!rawInputted) return '-';
  return formatContentDate(rawInputted) || '-';
}

/**
 * Gets the parsed Date object for a Policy item prioritizing its inputted date.
 */
export function getPolicyParsedDate(policy: {
  instagramDate?: string;
  publicationDate?: string;
  createdAt?: string;
  updatedAt?: string;
}): Date | null {
  return (
    parseContentDate(policy.instagramDate) ||
    parseContentDate(policy.publicationDate) ||
    parseContentDate(policy.createdAt) ||
    parseContentDate(policy.updatedAt)
  );
}

/**
 * Sorts Policy items chronologically by their inputted date (newest or oldest first),
 * breaking ties deterministically by createdAt and title.
 */
export function sortPoliciesByInputDate(
  items: Policy[],
  order: 'newest' | 'oldest' = 'newest'
): Policy[] {
  return [...items].sort((a, b) => {
    const timeA = getPolicyParsedDate(a)?.getTime() ?? 0;
    const timeB = getPolicyParsedDate(b)?.getTime() ?? 0;
    if (timeA !== timeB) {
      return order === 'newest' ? timeB - timeA : timeA - timeB;
    }
    const createdA = Date.parse(a.createdAt || '') || 0;
    const createdB = Date.parse(b.createdAt || '') || 0;
    if (createdA !== createdB) {
      return order === 'newest' ? createdB - createdA : createdA - createdB;
    }
    return a.title.localeCompare(b.title, 'id');
  });
}
