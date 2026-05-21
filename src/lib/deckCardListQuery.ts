import type { Card } from "@/assets/data/cards";
import { getCardMediaForSide } from "@/src/lib/cardMedia";
import {
  getClozePartsFromCard,
  isClozeGapComplete,
  isReversiblePairCard,
  normalizeCardType,
  parseCardExtra,
} from "@/src/lib/cardModel";
import { getNextSrsDayBoundary } from "@/src/lib/srsDayBoundary";
import type { UserCardProgress } from "@/src/lib/userCardProgress";

export type CardListFilter =
  | "all"
  | "basic"
  | "cloze"
  | "reversible"
  | "withMedia"
  | "withNotes"
  | "dueToday"
  | "new"
  | "learned";

export type CardListSort =
  | "newest"
  | "oldest"
  | "frontAsc"
  | "frontDesc"
  | "updatedDesc";

export type DeckCardQueryOptions = {
  search: string;
  filter: CardListFilter;
  sort: CardListSort;
  progressMap: Map<string, UserCardProgress>;
  srsDayStartHour: number;
  now?: Date;
};

export function getCardSearchableText(card: Card): string {
  const parts = [card.front_text ?? "", card.back_text ?? "", card.notes ?? ""];
  const cloze = getClozePartsFromCard(card);
  if (cloze) {
    parts.push(cloze.before, cloze.gapFront, cloze.hidden, cloze.after);
  }
  return parts.join(" ").toLowerCase();
}

function sortableFrontText(card: Card): string {
  const cloze = getClozePartsFromCard(card);
  if (cloze && isClozeGapComplete(cloze)) {
    return `${cloze.before} ${cloze.gapFront} ${cloze.after}`.trim();
  }
  return (card.front_text ?? "").trim();
}

export function matchesCardFilter(
  card: Card,
  filter: CardListFilter,
  progressMap: Map<string, UserCardProgress>,
  srsDayStartHour: number,
  now: Date = new Date(),
): boolean {
  if (filter === "all") return true;

  const ctype = normalizeCardType(card.card_type);
  const extra = parseCardExtra(card.card_extra);
  const progress = progressMap.get(card.card_id);
  const endOfSrsDay = getNextSrsDayBoundary(now, srsDayStartHour);

  switch (filter) {
    case "basic":
      return ctype === "basic";
    case "cloze":
      return ctype === "cloze";
    case "reversible":
      return isReversiblePairCard(extra);
    case "withMedia":
      return (
        getCardMediaForSide(card, "front").length > 0 ||
        getCardMediaForSide(card, "back").length > 0
      );
    case "withNotes":
      return Boolean(card.notes?.trim());
    case "new":
      return !progress || progress.status === "new";
    case "dueToday":
      if (!progress) return true;
      if (progress.due_date == null) return true;
      return new Date(progress.due_date) <= endOfSrsDay;
    case "learned":
      if (!progress?.due_date) return false;
      return new Date(progress.due_date) > endOfSrsDay;
    default:
      return true;
  }
}

export function sortDeckCards(cards: Card[], sort: CardListSort): Card[] {
  const list = [...cards];
  list.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "frontAsc":
        return sortableFrontText(a).localeCompare(sortableFrontText(b), undefined, {
          sensitivity: "base",
        });
      case "frontDesc":
        return sortableFrontText(b).localeCompare(sortableFrontText(a), undefined, {
          sensitivity: "base",
        });
      case "updatedDesc":
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  return list;
}

export function queryDeckCards(cards: Card[], options: DeckCardQueryOptions): Card[] {
  const q = options.search.trim().toLowerCase();
  const now = options.now ?? new Date();

  let list = cards;
  if (q) {
    list = list.filter((card) => getCardSearchableText(card).includes(q));
  }
  if (options.filter !== "all") {
    list = list.filter((card) =>
      matchesCardFilter(
        card,
        options.filter,
        options.progressMap,
        options.srsDayStartHour,
        now,
      ),
    );
  }
  return sortDeckCards(list, options.sort);
}
