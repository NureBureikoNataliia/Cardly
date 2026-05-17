import type { Card, CardMedia, CardMediaSide, CardMediaType } from "@/assets/data/cards";
import { supabase } from "@/src/lib/supabase";

export type { CardMedia, CardMediaSide, CardMediaType };

export const CARD_MEDIA_TYPES: CardMediaType[] = ["image", "audio", "video"];
export const CARD_MEDIA_POSITIONS: Record<CardMediaType, number> = {
  image: 1,
  audio: 2,
  video: 3,
};

export type CardMediaForm = Record<CardMediaSide, Record<CardMediaType, string>>;

export function emptyCardMediaForm(): CardMediaForm {
  return {
    front: { image: "", audio: "", video: "" },
    back: { image: "", audio: "", video: "" },
  };
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

export function cardMediaRowsToForm(rows: unknown): CardMediaForm {
  const form = emptyCardMediaForm();
  for (const item of normalizeCardMediaRows(rows)) {
    form[item.side][item.media_type] = item.url;
  }
  return form;
}

export function hasMediaFormChanges(a: CardMediaForm, b: CardMediaForm): boolean {
  return CARD_MEDIA_TYPES.some(
    (type) => a.front[type] !== b.front[type] || a.back[type] !== b.back[type],
  );
}

export function mediaFormToInsertRows(
  cardId: string,
  form: CardMediaForm,
): Array<Pick<CardMedia, "card_id" | "side" | "media_type" | "url" | "position">> {
  return (["front", "back"] as CardMediaSide[]).flatMap((side) =>
    CARD_MEDIA_TYPES.flatMap((mediaType) => {
      const url = form[side][mediaType].trim();
      if (!url) return [];
      return [{
        card_id: cardId,
        side,
        media_type: mediaType,
        url,
        position: CARD_MEDIA_POSITIONS[mediaType],
      }];
    }),
  );
}

export function swapCardMediaFormSides(form: CardMediaForm): CardMediaForm {
  return {
    front: { ...form.back },
    back: { ...form.front },
  };
}

export async function replaceCardMedia(cardId: string, form: CardMediaForm): Promise<void> {
  const { error: deleteError } = await supabase.from("card_media").delete().eq("card_id", cardId);
  if (deleteError) throw deleteError;

  const rows = mediaFormToInsertRows(cardId, form);
  if (!rows.length) return;

  const { error: insertError } = await supabase.from("card_media").insert(rows);
  if (insertError) throw insertError;
}

