/**
 * Optional Gemini summary for deck complaint moderation.
 * Set EXPO_PUBLIC_GEMINI_API_KEY in .env (see .env.example).
 * If missing or the request fails, the report is still saved without a summary.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';

function getGeminiApiKey(): string | undefined {
  const k = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : undefined;
}

export async function summarizeComplaintForModeration(input: {
  deckTitle: string;
  issueKey: string;
  issueLabel: string;
  details: string | null;
}): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const userText = [
    `Deck title: ${input.deckTitle}`,
    `Report category (code): ${input.issueKey}`,
    `Report category (label): ${input.issueLabel}`,
    `User details: ${input.details?.trim() || '(none provided)'}`,
  ].join('\n');

  const prompt = `You help moderators review reports about user-created flashcard decks on a learning app.
Read the report below and respond with a concise neutral summary (2–4 sentences): what the reporter is alleging and any notable details. Do not invent facts. If details are empty, say so briefly.

${userText}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 400,
          temperature: 0.2,
        },
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    return trimmed.length > 4000 ? trimmed.slice(0, 4000) : trimmed;
  } catch {
    return null;
  }
}
