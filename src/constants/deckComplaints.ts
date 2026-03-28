export const DECK_COMPLAINT_ISSUE_KEYS = [
  'spam_scam',
  'hate_harassment',
  'sexual_violence',
  'copyright',
  'misleading',
  'other',
] as const;

export type DeckComplaintIssueKey = (typeof DECK_COMPLAINT_ISSUE_KEYS)[number];
