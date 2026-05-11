/**
 * Optional Gemini summary for deck complaint moderation.
 * Set EXPO_PUBLIC_GEMINI_API_KEY in .env (see .env.example).
 * If missing or the request fails, the report is still saved without a summary.
 */

import { geminiGenerateText } from '@/src/lib/geminiRequest';

export async function summarizeComplaintForModeration(input: {
  deckTitle: string;
  issueKey: string;
  issueLabel: string;
  details: string | null;
}): Promise<string | null> {
  const userText = [
    `Deck title: ${input.deckTitle}`,
    `Report category (code): ${input.issueKey}`,
    `Report category (label): ${input.issueLabel}`,
    `User details: ${input.details?.trim() || '(none provided)'}`,
  ].join('\n');

  const prompt = `You help moderators review reports about user-created flashcard decks on a learning app.
Read the report below and respond with a concise neutral summary (2–4 sentences): what the reporter is alleging and any notable details. Do not invent facts. If details are empty, say so briefly.

${userText}`;

  const result = await geminiGenerateText(prompt, {
    maxOutputTokens: 400,
    temperature: 0.2,
  });
  if (!result.ok) {
    return null;
  }
  const trimmed = result.text.trim();
  if (!trimmed) return null;
  return trimmed.length > 4000 ? trimmed.slice(0, 4000) : trimmed;
}

/** Summary for reports about a review comment (pack_comments). */
export async function summarizeReviewComplaintForModeration(input: {
  deckTitle: string;
  commentExcerpt: string;
  issueKey: string;
  issueLabel: string;
  details: string | null;
}): Promise<string | null> {
  const excerpt =
    input.commentExcerpt.trim().length > 500
      ? `${input.commentExcerpt.trim().slice(0, 500)}…`
      : input.commentExcerpt.trim();

  const userText = [
    `Deck title: ${input.deckTitle}`,
    `Review/comment excerpt: ${excerpt || '(empty)'}`,
    `Report category (code): ${input.issueKey}`,
    `Report category (label): ${input.issueLabel}`,
    `Reporter additional details: ${input.details?.trim() || '(none provided)'}`,
  ].join('\n');

  const prompt = `You help moderators review reports about a user-written review comment on a shared flashcard deck.
Summarize in 2–4 neutral sentences what the reporter is alleging about the quoted review. Do not invent facts.

${userText}`;

  const gen = await geminiGenerateText(prompt, {
    maxOutputTokens: 400,
    temperature: 0.2,
  });
  if (!gen.ok) {
    return null;
  }
  const t2 = gen.text.trim();
  if (!t2) return null;
  return t2.length > 4000 ? t2.slice(0, 4000) : t2;
}
