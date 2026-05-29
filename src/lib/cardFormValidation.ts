import type { CardTypeName, ClozeParts } from "@/src/lib/cardModel";
import type { CardMediaForm, CardMediaSide } from "@/src/lib/cardMedia";
import {
  hasMediaFormContent,
  hasValidMediaFormSideContent,
  isCardMediaFormUrlsValid,
} from "@/src/lib/cardMedia";

export type CardFormFields = {
  frontText: string;
  backText: string;
  notes: string;
  cloze: ClozeParts;
  mediaForm: CardMediaForm;
};

export type CardFormValidationOptions = {
  /** Reversed pair: require text on both basic sides (not media-only). */
  requireBasicBothSides?: boolean;
};

function basicSideHasContent(
  text: string,
  mediaForm: CardMediaForm,
  side: CardMediaSide,
  includeNotesOnFront: boolean,
  notes: string,
): boolean {
  if (side === "front" && includeNotesOnFront && notes.trim().length > 0) return true;
  return text.trim().length > 0 || hasValidMediaFormSideContent(mediaForm, side);
}

function clozeFrontSideHasContent(
  cloze: ClozeParts,
  mediaForm: CardMediaForm,
  notes: string,
): boolean {
  return (
    cloze.before.trim().length > 0 ||
    cloze.gapFront.trim().length > 0 ||
    cloze.after.trim().length > 0 ||
    notes.trim().length > 0 ||
    hasValidMediaFormSideContent(mediaForm, "front")
  );
}

function clozeBackSideHasContent(cloze: ClozeParts, mediaForm: CardMediaForm): boolean {
  return (
    cloze.hidden.trim().length > 0 || hasValidMediaFormSideContent(mediaForm, "back")
  );
}

export function hasAnyBasicFormContent(fields: CardFormFields): boolean {
  return (
    fields.frontText.trim().length > 0 ||
    fields.backText.trim().length > 0 ||
    fields.notes.trim().length > 0 ||
    hasMediaFormContent(fields.mediaForm)
  );
}

export function hasAnyClozeFormContent(fields: CardFormFields): boolean {
  return (
    clozeFrontSideHasContent(fields.cloze, fields.mediaForm, fields.notes) ||
    clozeBackSideHasContent(fields.cloze, fields.mediaForm)
  );
}

export function isCardFormValid(
  cardType: CardTypeName,
  fields: CardFormFields,
  options?: CardFormValidationOptions,
): boolean {
  if (!isCardMediaFormUrlsValid(fields.mediaForm)) return false;

  if (cardType === "cloze") {
    return (
      clozeFrontSideHasContent(fields.cloze, fields.mediaForm, fields.notes) &&
      clozeBackSideHasContent(fields.cloze, fields.mediaForm)
    );
  }

  if (options?.requireBasicBothSides) {
    return fields.frontText.trim().length > 0 && fields.backText.trim().length > 0;
  }

  return (
    basicSideHasContent(
      fields.frontText,
      fields.mediaForm,
      "front",
      true,
      fields.notes,
    ) && basicSideHasContent(fields.backText, fields.mediaForm, "back", false, fields.notes)
  );
}
