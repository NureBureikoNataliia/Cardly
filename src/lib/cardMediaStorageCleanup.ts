import type { CardMedia } from "@/assets/data/cards";
import type { CardMediaForm } from "@/src/lib/cardMedia";
import { supabase } from "@/src/lib/supabase";

const CARD_MEDIA_STORAGE_PATH =
  /\/storage\/v1\/object\/(?:public|sign)\/card-media\/(.+)$/i;

/** Public/signed Supabase URL → object path inside `card-media` bucket. */
export function parseCardMediaStoragePath(publicUrl: string): string | null {
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;
  try {
    const match = CARD_MEDIA_STORAGE_PATH.exec(new URL(trimmed).pathname);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function isCardMediaBucketUrl(url: string): boolean {
  return parseCardMediaStoragePath(url) !== null;
}

function collectStorageUrlsFromStrings(urls: Iterable<string>): string[] {
  const out: string[] = [];
  for (const url of urls) {
    const trimmed = url.trim();
    if (trimmed && isCardMediaBucketUrl(trimmed)) out.push(trimmed);
  }
  return out;
}

export function collectStorageUrlsFromCardMediaForm(form: CardMediaForm): string[] {
  const urls: string[] = [];
  for (const side of ["front", "back"] as const) {
    for (const mediaUrl of Object.values(form[side].urls)) {
      urls.push(mediaUrl);
    }
  }
  return collectStorageUrlsFromStrings(urls);
}

export function collectStorageUrlsFromCardMediaRows(rows: CardMedia[]): string[] {
  return collectStorageUrlsFromStrings(rows.map((row) => row.url));
}

export async function isCardMediaStorageUrlReferenced(url: string): Promise<boolean> {
  const trimmed = url.trim();
  if (!trimmed) return true;

  const [mediaRes, deckRes] = await Promise.all([
    supabase.from("card_media").select("media_id").eq("url", trimmed).limit(1),
    supabase.from("decks").select("deck_id").eq("cover_image_url", trimmed).limit(1),
  ]);

  if (mediaRes.error) {
    console.warn("[cardMediaStorage] card_media lookup failed:", mediaRes.error.message);
    return true;
  }
  if (deckRes.error) {
    console.warn("[cardMediaStorage] decks lookup failed:", deckRes.error.message);
    return true;
  }

  return (mediaRes.data?.length ?? 0) > 0 || (deckRes.data?.length ?? 0) > 0;
}

export async function deleteCardMediaStorageUrlIfUnreferenced(url: string): Promise<void> {
  const path = parseCardMediaStoragePath(url);
  if (!path) return;
  if (await isCardMediaStorageUrlReferenced(url)) return;

  const { error } = await supabase.storage.from(CARD_MEDIA_BUCKET).remove([path]);
  if (error) {
    console.warn("[cardMediaStorage] delete failed:", path, error.message);
  }
}

export async function deleteCardMediaStorageUrlsIfUnreferenced(
  urls: Iterable<string>,
): Promise<void> {
  const seen = new Set<string>();
  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    await deleteCardMediaStorageUrlIfUnreferenced(trimmed);
  }
}

export async function fetchCardMediaStorageUrlsForCard(cardId: string): Promise<string[]> {
  const { data, error } = await supabase.from("card_media").select("url").eq("card_id", cardId);
  if (error) {
    console.warn("[cardMediaStorage] fetch card media failed:", error.message);
    return [];
  }
  return collectStorageUrlsFromStrings((data ?? []).map((row) => row.url));
}

export async function fetchDeckMediaStorageUrls(deckId: string): Promise<string[]> {
  const urls: string[] = [];

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("cover_image_url")
    .eq("deck_id", deckId)
    .maybeSingle();
  if (deckError) {
    console.warn("[cardMediaStorage] fetch deck cover failed:", deckError.message);
  } else if (deck?.cover_image_url) {
    urls.push(deck.cover_image_url);
  }

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("card_id")
    .eq("deck_id", deckId);
  if (cardsError) {
    console.warn("[cardMediaStorage] fetch deck cards failed:", cardsError.message);
    return collectStorageUrlsFromStrings(urls);
  }

  const cardIds = (cards ?? []).map((row) => row.card_id);
  if (cardIds.length === 0) {
    return collectStorageUrlsFromStrings(urls);
  }

  const { data: media, error: mediaError } = await supabase
    .from("card_media")
    .select("url")
    .in("card_id", cardIds);
  if (mediaError) {
    console.warn("[cardMediaStorage] fetch deck card media failed:", mediaError.message);
    return collectStorageUrlsFromStrings(urls);
  }

  for (const row of media ?? []) {
    urls.push(row.url);
  }
  return collectStorageUrlsFromStrings(urls);
}

export async function deleteCardWithMediaStorageCleanup(
  cardId: string,
): Promise<{ error: { message: string } | null }> {
  const urls = await fetchCardMediaStorageUrlsForCard(cardId);
  const { error } = await supabase.from("cards").delete().eq("card_id", cardId);
  if (!error) {
    await deleteCardMediaStorageUrlsIfUnreferenced(urls);
  }
  return { error };
}

export async function deleteDeckWithMediaStorageCleanup(
  deckId: string,
): Promise<{ error: { message: string } | null }> {
  const urls = await fetchDeckMediaStorageUrls(deckId);
  await supabase.from("cards").delete().eq("deck_id", deckId);
  const { error } = await supabase.from("decks").delete().eq("deck_id", deckId);
  if (!error) {
    await deleteCardMediaStorageUrlsIfUnreferenced(urls);
  }
  return { error };
}
