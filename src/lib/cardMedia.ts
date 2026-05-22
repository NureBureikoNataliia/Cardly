import type { Card, CardMedia, CardMediaSide, CardMediaType } from "@/assets/data/cards";
import { canPlayMediaUrl } from "@/src/lib/resolveMediaPlaybackUrl";
import { supabase } from "@/src/lib/supabase";

export type { CardMedia, CardMediaSide, CardMediaType };

export const CARD_MEDIA_TYPES: CardMediaType[] = ["image", "audio", "video"];

const DEFAULT_MEDIA_ORDER: CardMediaType[] = ["image", "audio", "video"];

export type CardMediaSideForm = {
  /** Display order on this side (study, list, PDF). */
  order: CardMediaType[];
  urls: Record<CardMediaType, string>;
};

export type CardMediaForm = Record<CardMediaSide, CardMediaSideForm>;

export function emptyCardMediaForm(): CardMediaForm {
  const emptyUrls: Record<CardMediaType, string> = { image: "", audio: "", video: "" };
  const side = (): CardMediaSideForm => ({
    order: [...DEFAULT_MEDIA_ORDER],
    urls: { ...emptyUrls },
  });
  return { front: side(), back: side() };
}

export function normalizeCardMediaRows(rows: unknown): CardMedia[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is CardMedia => {
      if (!row || typeof row !== "object") return false;
      const r = row as Partial<CardMedia>;
      return (
        typeof r.media_id === "string" &&
        typeof r.card_id === "string" &&
        (r.side === "front" || r.side === "back") &&
        (r.media_type === "image" || r.media_type === "audio" || r.media_type === "video") &&
        typeof r.url === "string" &&
        typeof r.position === "number"
      );
    })
    .sort((a, b) => a.position - b.position);
}

export function getCardMediaForSide(
  card: Pick<Card, "card_media">,
  side: CardMediaSide,
): CardMedia[] {
  return normalizeCardMediaRows(card.card_media).filter((item) => item.side === side);
}

function sideFormFromRows(rows: CardMedia[], side: CardMediaSide): CardMediaSideForm {
  const items = rows.filter((r) => r.side === side).sort((a, b) => a.position - b.position);
  const urls: Record<CardMediaType, string> = { image: "", audio: "", video: "" };
  const orderFromDb = items.map((i) => i.media_type);
  for (const item of items) {
    urls[item.media_type] = item.url;
  }
  const order = [...orderFromDb];
  for (const type of CARD_MEDIA_TYPES) {
    if (!order.includes(type)) order.push(type);
  }
  return { order, urls };
}

export function cardMediaRowsToForm(rows: unknown): CardMediaForm {
  const list = normalizeCardMediaRows(rows);
  return {
    front: sideFormFromRows(list, "front"),
    back: sideFormFromRows(list, "back"),
  };
}

function sideFormsEqual(a: CardMediaSideForm, b: CardMediaSideForm): boolean {
  if (a.order.join() !== b.order.join()) return false;
  return CARD_MEDIA_TYPES.every((type) => a.urls[type] === b.urls[type]);
}

export function hasMediaFormChanges(a: CardMediaForm, b: CardMediaForm): boolean {
  return !sideFormsEqual(a.front, b.front) || !sideFormsEqual(a.back, b.back);
}

export function hasMediaFormContent(form: CardMediaForm): boolean {
  return hasMediaFormSideContent(form, "front") || hasMediaFormSideContent(form, "back");
}

export function hasMediaFormSideContent(
  form: CardMediaForm,
  side: CardMediaSide,
): boolean {
  return CARD_MEDIA_TYPES.some((type) => form[side].urls[type].trim().length > 0);
}

export type MediaUrlIssueReason = "invalid_format" | "unsupported";

export type MediaUrlIssue = {
  side: CardMediaSide;
  mediaType: CardMediaType;
  url: string;
  reason: MediaUrlIssueReason;
};

export function isValidHttpMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getMediaUrlValidationIssue(
  url: string,
  mediaType: CardMediaType,
): MediaUrlIssueReason | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (!isValidHttpMediaUrl(trimmed)) return "invalid_format";
  if (!canPlayMediaUrl(trimmed, mediaType)) return "unsupported";
  return null;
}

export function getCardMediaUrlIssues(form: CardMediaForm): MediaUrlIssue[] {
  const issues: MediaUrlIssue[] = [];
  for (const side of ["front", "back"] as const) {
    for (const mediaType of CARD_MEDIA_TYPES) {
      const url = form[side].urls[mediaType].trim();
      const reason = getMediaUrlValidationIssue(url, mediaType);
      if (reason) issues.push({ side, mediaType, url, reason });
    }
  }
  return issues;
}

export function isCardMediaFormUrlsValid(form: CardMediaForm): boolean {
  return getCardMediaUrlIssues(form).length === 0;
}

export function mediaUrlIssueMessageKey(issue: MediaUrlIssue): string {
  return issue.reason === "invalid_format"
    ? "mediaUrlInvalidFormat"
    : "mediaUrlUnsupported";
}

export function mediaFormToInsertRows(
  cardId: string,
  form: CardMediaForm,
): Array<Pick<CardMedia, "card_id" | "side" | "media_type" | "url" | "position">> {
  return (["front", "back"] as CardMediaSide[]).flatMap((side) => {
    const { order, urls } = form[side];
    let position = 1;
    return order.flatMap((mediaType) => {
      const url = urls[mediaType].trim();
      if (!url) return [];
      const row = {
        card_id: cardId,
        side,
        media_type: mediaType,
        url,
        position,
      };
      position += 1;
      return [row];
    });
  });
}

export function swapCardMediaFormSides(form: CardMediaForm): CardMediaForm {
  return {
    front: { order: [...form.back.order], urls: { ...form.back.urls } },
    back: { order: [...form.front.order], urls: { ...form.front.urls } },
  };
}

export function moveMediaInForm(
  form: CardMediaForm,
  side: CardMediaSide,
  mediaType: CardMediaType,
  direction: -1 | 1,
): CardMediaForm {
  const order = [...form[side].order];
  const idx = order.indexOf(mediaType);
  const swapIdx = idx + direction;
  if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return form;
  [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
  return {
    ...form,
    [side]: { ...form[side], order },
  };
}

/** Preview / study: filled media in display order. */
export function orderedMediaFromForm(
  form: CardMediaForm,
  side: CardMediaSide,
): { kind: CardMediaType; url: string }[] {
  return form[side].order
    .map((kind) => ({ kind, url: form[side].urls[kind].trim() }))
    .filter((item) => item.url.length > 0);
}

export async function replaceCardMedia(cardId: string, form: CardMediaForm): Promise<void> {
  const { error: deleteError } = await supabase.from("card_media").delete().eq("card_id", cardId);
  if (deleteError) throw deleteError;

  const rows = mediaFormToInsertRows(cardId, form);
  if (!rows.length) return;

  const { error: insertError } = await supabase.from("card_media").insert(rows);
  if (insertError) throw insertError;
}
