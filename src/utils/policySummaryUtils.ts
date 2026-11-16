import { Policy } from '../types';

export const DEFAULT_POLICY_PLACEHOLDER_SUMMARY =
  'Materi edukasi kebijakan SDM Aparatur yang bersumber dari media sosial resmi KemenPANRB.';

export interface ResolvedPolicyAboutDescription {
  text: string;
  isAiSummary: boolean;
}

/**
 * Resolves the description text to display in "Tentang Konten" (and card summaries):
 * 1. Approved AI Summary (`isAiSummaryApproved && aiSummary`)
 * 2. Custom manual summary entered by admin (when not equal to generic default placeholder)
 * 3. Unflagged AI Summary if present when manual summary is empty/placeholder
 * 4. Manual summary / default institutional fallback
 */
export function getPolicyAboutDescription(
  policy: Partial<Policy> | null | undefined
): ResolvedPolicyAboutDescription {
  if (!policy) {
    return {
      text: DEFAULT_POLICY_PLACEHOLDER_SUMMARY,
      isAiSummary: false,
    };
  }

  const cleanAi = typeof policy.aiSummary === 'string' ? policy.aiSummary.trim() : '';
  const cleanManual = typeof policy.summary === 'string' ? policy.summary.trim() : '';
  const hasCustomManual =
    Boolean(cleanManual) && cleanManual !== DEFAULT_POLICY_PLACEHOLDER_SUMMARY;

  if (policy.isAiSummaryApproved && cleanAi) {
    return {
      text: cleanAi,
      isAiSummary: true,
    };
  }

  if (hasCustomManual) {
    return {
      text: cleanManual,
      isAiSummary: false,
    };
  }

  if (cleanAi) {
    return {
      text: cleanAi,
      isAiSummary: true,
    };
  }

  return {
    text: cleanManual || DEFAULT_POLICY_PLACEHOLDER_SUMMARY,
    isAiSummary: false,
  };
}
