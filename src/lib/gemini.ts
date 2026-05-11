/**
 * Gemini AI helpers for Cardly.
 * Requires EXPO_PUBLIC_GEMINI_API_KEY in .env
 */

import { geminiGenerateText } from '@/src/lib/geminiRequest';

async function callGemini(prompt: string, maxTokens = 512): Promise<string | null> {
  const r = await geminiGenerateText(prompt, { maxOutputTokens: maxTokens, temperature: 0.4 });
  return r.ok ? r.text : null;
}

/**
 * Polish or generate a deck description.
 * If userText is provided → improves/expands it.
 * If userText is empty → generates a description from the title.
 */
export async function generateDeckDescription(
  title: string,
  userText?: string,
): Promise<string | null> {
  const hasText = userText && userText.trim().length > 0;

  const prompt = hasText
    ? `You are a writing assistant. Improve the following short description for a flashcard deck titled "${title}".
Make it clear, engaging and natural (1–3 sentences). Keep the original meaning. Match the language of the input text. Do not use quotes or markdown.

Original text: "${userText!.trim()}"`
    : `Write a short, engaging description (1–2 sentences) for a flashcard deck titled "${title}".
Match the language of the title. Be informative and natural. Do not use quotes or markdown.`;

  return callGemini(prompt, 200);
}

/**
 * Auto-fill the back side of a flashcard.
 * Uses deck title + description for full context.
 * Supports: translations, definitions, term explanations.
 */
export async function generateCardBack(
  frontText: string,
  deckTitle: string,
  deckDescription?: string | null,
): Promise<string | null> {
  const context = [
    `Deck title: "${deckTitle}"`,
    deckDescription?.trim() ? `Deck description: "${deckDescription.trim()}"` : null,
    `Front text: "${frontText}"`,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `You are a flashcard assistant. Based on the deck context below, write the back side of a flashcard.

${context}

Rules:
- If the deck is about language learning or vocabulary: write the translation in the target language suggested by the deck context
- If the deck is about terminology or science: write a concise definition or explanation (1–3 sentences)
- If the deck is about facts or geography: write the answer directly
- Keep it short and clear
- Do not add meta text like "Translation:" or "Definition:" — just the answer
- Do not wrap in quotes`;

  return callGemini(prompt, 300);
}

/**
 * Find a relevant stock photo URL for a flashcard using Pixabay.
 * Requires EXPO_PUBLIC_PIXABAY_API_KEY in .env (free at pixabay.com/api/docs/).
 *
 * Flow: try Gemini → English keywords; fall back to raw front text if Gemini is unavailable.
 * Then query Pixabay → return first image URL.
 */
export async function generateCardImageUrl(
  frontText: string,
  deckTitle: string,
  deckDescription?: string | null,
  side: 'front' | 'back' = 'front',
): Promise<string | null> {
  const pixabayKey = process.env.EXPO_PUBLIC_PIXABAY_API_KEY?.trim();
  console.log('[AI image] Pixabay key present:', Boolean(pixabayKey));
  if (!pixabayKey) return null;

  // Try to get refined keywords from Gemini; fall back to the card text itself
  let query: string | null = null;

  const context = [
    `Deck title: "${deckTitle}"`,
    deckDescription?.trim() ? `Deck description: "${deckDescription.trim()}"` : null,
    `Card ${side} text: "${frontText}"`,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `You help pick stock photo search terms for flashcards.
Reply with 2–3 simple English keywords for an image search that visually represents the concept below. Separate with spaces only. No explanations.

${context}`;

  const raw = await callGemini(prompt, 20);
  if (raw) {
    const cleaned = raw
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join('+');
    if (cleaned) query = cleaned;
  }

  // Fallback: prefer deck title (usually English) over front text (may be non-ASCII)
  if (!query) {
    const titleWords = deckTitle
      .replace(/[^\x00-\x7F]/g, ' ')
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 3)
      .join('+');

    const frontWords = frontText
      .replace(/[^\x00-\x7F]/g, ' ')
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 2)
      .join('+');

    // Use title if it has meaningful English words, otherwise fall back to front
    query = titleWords || frontWords || 'nature';
  }

  try {
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(pixabayKey)}&q=${query}&image_type=photo&safesearch=true&per_page=3&orientation=horizontal`;
    console.log('[AI image] Pixabay query:', query);
    const res = await fetch(url);
    console.log('[AI image] Pixabay status:', res.status);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      hits?: { webformatURL?: string }[];
    };
    const imgUrl = data.hits?.[0]?.webformatURL ?? null;
    console.log('[AI image] Result URL:', imgUrl);
    return imgUrl;
  } catch (e) {
    console.warn('[AI image] Pixabay error:', e);
    return null;
  }
}

export interface GeneratedCard {
  front: string;
  back: string;
}

export type GenerateCardsError = 'no_api_key' | 'service_error' | 'bad_output';

/**
 * Generate a list of flashcard pairs.
 * Uses deck title + description as context so cards match the deck's purpose.
 * Supports vocabulary (with translation), terminology (with definitions), facts, etc.
 *
 * @param userPrompt  What the user typed (topic, extra instructions, or just context)
 * @param count       Number of cards to generate (5–20)
 * @param locale      'en' or 'uk' — UI language (fallback if deck context doesn't imply a language)
 * @param deckTitle   Deck title for context
 * @param deckDesc    Deck description for context
 */
export async function generateCards(
  userPrompt: string,
  count: number,
  locale: 'en' | 'uk',
  deckTitle?: string,
  deckDesc?: string | null,
): Promise<{ cards: GeneratedCard[]; error?: GenerateCardsError }> {
  const uiLang = locale === 'uk' ? 'Ukrainian' : 'English';

  const deckContext = [
    deckTitle?.trim() ? `Deck title: "${deckTitle.trim()}"` : null,
    deckDesc?.trim() ? `Deck description: "${deckDesc.trim()}"` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `You are a flashcard generator. Create exactly ${count} flashcard pairs.

${deckContext ? `Deck context:\n${deckContext}\n` : ''}User request: "${userPrompt}"

Instructions:
- Infer the card format from the deck context:
  • If it's a language/vocabulary deck (e.g. "Chinese trees", "Italian food") → front: word/term in source language, back: translation in target language
  • If it's a terminology/science deck → front: term or concept, back: concise definition or explanation
  • If it's a facts/geography/history deck → front: question or name, back: answer or description
- Use the language implied by the deck context. If unclear, use ${uiLang}.
- Make cards diverse and genuinely useful for studying the deck topic.
- Keep each side concise (max 2 sentences).

Return ONLY a valid JSON array, no markdown, no extra text:
[{"front":"...","back":"..."},...]`;

  const ai = await geminiGenerateText(prompt, { maxOutputTokens: Math.min(8192, count * 180), temperature: 0.4 });
  if (!ai.ok) {
    if (ai.noApiKey) {
      return { cards: [], error: 'no_api_key' };
    }
    return { cards: [], error: 'service_error' };
  }

  const raw = ai.text;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      return { cards: [], error: 'bad_output' };
    }
    const cards = parsed
      .filter((item): item is GeneratedCard =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.front === 'string' &&
        typeof item.back === 'string' &&
        item.front.trim().length > 0 &&
        item.back.trim().length > 0,
      )
      .slice(0, count);
    if (cards.length === 0) {
      return { cards: [], error: 'bad_output' };
    }
    return { cards };
  } catch {
    return { cards: [], error: 'bad_output' };
  }
}
