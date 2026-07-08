import type { Card } from "@/assets/data/cards";
import { getCardMediaForSide } from "@/src/lib/cardMedia";
import {
  getClozePartsFromCard,
  isClozeLearnable,
  normalizeCardType,
  parseCardExtra,
} from "@/src/lib/cardModel";

export type ColumnEntry<T> = { item: T; index: number };

/** Gap between tiles in a column (`deck-detail` `cardsColumn.gap`). */
export const CARD_TILE_COLUMN_GAP = 10;

/** Assign each item to the shortest column by estimated height (masonry-style balance). */
export function splitIntoBalancedColumns<T>(
  items: T[],
  columnCount: number,
  estimateHeight: (item: T, index: number) => number,
): ColumnEntry<T>[][] {
  if (columnCount <= 1) {
    return [items.map((item, index) => ({ item, index }))];
  }

  const cols: ColumnEntry<T>[][] = Array.from({ length: columnCount }, () => []);
  const colHeights = Array.from({ length: columnCount }, () => 0);

  items.forEach((item, index) => {
    let targetCol = 0;
    for (let c = 1; c < columnCount; c += 1) {
      if (colHeights[c] < colHeights[targetCol]) targetCol = c;
    }

    cols[targetCol].push({ item, index });
    const tileHeight = estimateHeight(item, index);
    colHeights[targetCol] +=
      tileHeight + (cols[targetCol].length > 1 ? CARD_TILE_COLUMN_GAP : 0);
  });

  return cols;
}

const TILE_BASE = 132;
const LINE_H = 24;
const CHARS_PER_LINE = 34;
const DIVIDER = 44;
const NOTES_BLOCK = 36;
const ACTIONS_ROW = 48;

function textLines(text: string): number {
  const len = text.trim().length;
  if (len === 0) return 0;
  return Math.max(1, Math.ceil(len / CHARS_PER_LINE));
}

function mediaBlockHeight(type: string): number {
  if (type === "image") return 292;
  if (type === "video") return 176;
  return 88;
}

/** Rough height for balancing two columns in the deck card list. */
export function estimateCardTileHeight(card: Card): number {
  const ctype = normalizeCardType(card.card_type);
  const clozeParts = getClozePartsFromCard(card);
  const frontText =
    ctype === "cloze" && clozeParts && isClozeLearnable(clozeParts)
      ? `${clozeParts.before}${clozeParts.gapFront.trim() || "…"}${clozeParts.after}`
      : (card.front_text ?? "");
  const backText =
    ctype === "cloze" && clozeParts && isClozeLearnable(clozeParts)
      ? `${clozeParts.before}${clozeParts.hidden}${clozeParts.after}`
      : ctype === "cloze" && clozeParts?.hidden?.trim()
        ? clozeParts.hidden.trim()
        : (card.back_text?.trim() ?? "");

  const frontMedia = getCardMediaForSide(card, "front");
  const backMedia = getCardMediaForSide(card, "back");
  const showBack = backText.length > 0 || backMedia.length > 0;

  let h = TILE_BASE + textLines(frontText) * LINE_H;
  h += frontMedia.reduce((sum, m) => sum + mediaBlockHeight(m.media_type), 0);

  if (showBack) {
    h += DIVIDER + textLines(backText) * LINE_H;
    h += backMedia.reduce((sum, m) => sum + mediaBlockHeight(m.media_type), 0);
  }

  if (card.notes?.trim()) {
    h += NOTES_BLOCK + textLines(card.notes) * 18;
  }

  h += ACTIONS_ROW;

  return Math.max(140, h);
}

/** Same min height for forward/reverse cards that share a `pairId`. */
export function computePairedTileHeights(cards: Card[]): Map<string, number> {
  return new Map<string, number>();
}

export function getCardTileHeight(
  card: Card,
  pairedHeights: Map<string, number>,
): number {
  return pairedHeights.get(card.card_id) ?? estimateCardTileHeight(card);
}
