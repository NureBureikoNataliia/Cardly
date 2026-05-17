import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import type { TextStyle } from "react-native";

import { Deck } from "@/assets/data/decks";
import ConfirmModal from "@/src/components/ConfirmModal";
import { CardSideMedia } from "@/src/components/CardSideMedia";
import { useAuth } from "@/src/contexts/AuthContext";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { supabase } from "@/src/lib/supabase";
import type { Card } from "@/assets/data/cards";
import type { CardExtra, CardTypeName, ClozeParts } from "@/src/lib/cardModel";
import {
  buildClozeFrontText,
  getClozePartsFromCard,
  isClozeGapComplete,
  newPairId,
  normalizeCardType,
  parseCardExtra,
} from "@/src/lib/cardModel";
import {
  cardMediaRowsToForm,
  emptyCardMediaForm,
  hasMediaFormChanges,
  replaceCardMedia,
  swapCardMediaFormSides,
} from "@/src/lib/cardMedia";
import { useAppColors } from "@/src/contexts/ThemeContext";
import { generateCardBack, generateCardImageUrl } from "@/src/lib/gemini";

/** Web: hide browser default focus outline on TextInput (RN typings omit outlineStyle "none"). */
const webTextInputNoOutline: TextStyle | undefined =
  Platform.OS === "web"
    ? ({ outlineWidth: 0, outlineStyle: "none" } as unknown as TextStyle)
    : undefined;

const addCardStudyClozeStyles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  gap: {
    color: "#9ca3af",
    letterSpacing: 3,
    textDecorationLine: "underline",
  },
  gapHint: {
    color: "#4b5563",
    fontStyle: "italic",
    fontWeight: "500",
  },
  answer: {
    fontWeight: "800",
    color: "#059669",
  },
});

function AddCardStudyClozeFront({ parts }: { parts: ClozeParts }) {
  const gap =
    parts.gapFront.trim().length > 0 ? (
      <Text style={addCardStudyClozeStyles.gapHint}> {parts.gapFront.trim()} </Text>
    ) : (
      <Text style={addCardStudyClozeStyles.gap}> ▯▯▯ </Text>
    );
  return (
    <Text style={addCardStudyClozeStyles.title}>
      {parts.before}
      {gap}
      {parts.after}
    </Text>
  );
}

function AddCardStudyClozeBack({ parts }: { parts: ClozeParts }) {
  return (
    <Text style={addCardStudyClozeStyles.title}>
      {parts.before}
      <Text style={addCardStudyClozeStyles.answer}>{parts.hidden}</Text>
      {parts.after}
    </Text>
  );
}

export default function AddCardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const deckId = Array.isArray(params.deckId)
    ? params.deckId[0]
    : typeof params.deckId === "string"
      ? params.deckId
      : null;
  const cardId = Array.isArray(params.cardId)
    ? params.cardId[0]
    : typeof params.cardId === "string"
      ? params.cardId
      : null;
  const { t } = useLanguage();
  const { user } = useAuth();
  const C = useAppColors();

  const isEdit = Boolean(cardId);
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? t("editCard") : t("addCard"),
    });
  }, [navigation, isEdit, t]);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [mediaForm, setMediaForm] = useState(emptyCardMediaForm);
  const [notes, setNotes] = useState("");
  const [initialFront, setInitialFront] = useState("");
  const [initialBack, setInitialBack] = useState("");
  const [initialMediaForm, setInitialMediaForm] = useState(emptyCardMediaForm);
  const [initialNotes, setInitialNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [studyPreviewOpen, setStudyPreviewOpen] = useState(false);
  const [studyPreviewShowBack, setStudyPreviewShowBack] = useState(false);
  /** When creating a reversed pair, which of the two future cards to preview (1 = forward, 2 = reverse). */
  const [studyPreviewPairSlot, setStudyPreviewPairSlot] = useState<1 | 2>(1);

  const [cardType, setCardType] = useState<CardTypeName>("basic");
  const [initialCardType, setInitialCardType] = useState<CardTypeName>("basic");
  /** Optional second card with swapped sides when creating a new basic card. */
  const [createReversedPair, setCreateReversedPair] = useState(false);
  const [initialCreateReversed, setInitialCreateReversed] = useState(false);
  /** Preserve reversible link when editing. */
  const [pairMeta, setPairMeta] = useState<{
    pairId?: string;
    pairRole?: "forward" | "reverse";
  }>({});

  const [clozeBefore, setClozeBefore] = useState("");
  const [clozeGapFront, setClozeGapFront] = useState("");
  const [clozeHidden, setClozeHidden] = useState("");
  const [clozeAfter, setClozeAfter] = useState("");
  const [initialClozeBefore, setInitialClozeBefore] = useState("");
  const [initialClozeGapFront, setInitialClozeGapFront] = useState("");
  const [initialClozeHidden, setInitialClozeHidden] = useState("");
  const [initialClozeAfter, setInitialClozeAfter] = useState("");

  const setMediaUrl = (
    side: "front" | "back",
    mediaType: "image" | "audio" | "video",
    value: string,
  ) => {
    setMediaForm((current) => ({
      ...current,
      [side]: {
        ...current[side],
        [mediaType]: value,
      },
    }));
  };

  const [aiBackBusy, setAiBackBusy] = useState(false);
  const [aiFrontImgBusy, setAiFrontImgBusy] = useState(false);
  const [aiBackImgBusy, setAiBackImgBusy] = useState(false);

  const handleAiFillBack = useCallback(async () => {
    if (!deck || cardType !== "basic" || !frontText.trim()) {
      setErrorModal(t("aiFillBackNeedFront"));
      return;
    }
    setAiBackBusy(true);
    const back = await generateCardBack(
      frontText.trim(),
      deck.title ?? "",
      deck.description,
    );
    setAiBackBusy(false);
    if (back) setBackText(back);
    else setErrorModal(t("aiError"));
  }, [cardType, deck, frontText, t]);

  const handleAiFrontImage = useCallback(async () => {
    if (!deck || cardType !== "basic" || !frontText.trim()) {
      setErrorModal(t("aiFillImageNeedText"));
      return;
    }
    setAiFrontImgBusy(true);
    const url = await generateCardImageUrl(
      frontText.trim(),
      deck.title ?? "",
      deck.description,
      "front",
    );
    setAiFrontImgBusy(false);
    if (url) setMediaUrl("front", "image", url);
    else setErrorModal(t("aiError"));
  }, [cardType, deck, frontText, t]);

  const handleAiBackImage = useCallback(async () => {
    if (!deck || cardType !== "basic") return;
    const cue = backText.trim() || frontText.trim();
    if (!cue) {
      setErrorModal(t("aiFillImageNeedText"));
      return;
    }
    setAiBackImgBusy(true);
    const url = await generateCardImageUrl(
      cue,
      deck.title ?? "",
      deck.description,
      "back",
    );
    setAiBackImgBusy(false);
    if (url) setMediaUrl("back", "image", url);
    else setErrorModal(t("aiError"));
  }, [backText, cardType, deck, frontText, t]);

  useEffect(() => {
    if (!deckId) {
      setError(t("deckNotFound"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const loadDeckAndCard = async () => {
      const [
        { data: deckData, error: deckError },
        { data: cardData, error: cardError },
      ] = await Promise.all([
        supabase.from("decks").select("*").eq("deck_id", deckId).single(),
        cardId
          ? supabase.from("cards").select("*, card_media(*)").eq("card_id", cardId).single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (deckError || cardError) {
        setError(t("failedToLoadData"));
      } else {
        setDeck(deckData as Deck);
        const front = cardData?.front_text ?? "";
        const back = cardData?.back_text ?? "";
        const loadedMediaForm = cardMediaRowsToForm(cardData?.card_media);
        const notesVal = cardData?.notes ?? "";
        setFrontText(front);
        setBackText(normalizeCardType(cardData?.card_type) === "cloze" ? "" : back);
        setMediaForm(loadedMediaForm);
        setNotes(notesVal);
        setInitialFront(front);
        setInitialBack(normalizeCardType(cardData?.card_type) === "cloze" ? "" : back);
        setInitialMediaForm(loadedMediaForm);
        setInitialNotes(notesVal);

        const ct = normalizeCardType(cardData?.card_type);
        setCardType(ct);
        setInitialCardType(ct);
        const extra = parseCardExtra(cardData?.card_extra);
        setPairMeta(
          extra.pairId
            ? { pairId: extra.pairId, pairRole: extra.pairRole }
            : {},
        );
        setCreateReversedPair(false);
        setInitialCreateReversed(false);

        if (ct === "cloze" && cardData) {
          const cp = getClozePartsFromCard(cardData as Card);
          if (cp) {
            setClozeBefore(cp.before);
            setClozeGapFront(cp.gapFront);
            setClozeHidden(cp.hidden);
            setClozeAfter(cp.after);
            setInitialClozeBefore(cp.before);
            setInitialClozeGapFront(cp.gapFront);
            setInitialClozeHidden(cp.hidden);
            setInitialClozeAfter(cp.after);
          } else {
            setClozeBefore("");
            setClozeGapFront("");
            setClozeHidden("");
            setClozeAfter("");
            setInitialClozeBefore("");
            setInitialClozeGapFront("");
            setInitialClozeHidden("");
            setInitialClozeAfter("");
          }
        } else {
          setClozeBefore("");
          setClozeGapFront("");
          setClozeHidden("");
          setClozeAfter("");
          setInitialClozeBefore("");
          setInitialClozeGapFront("");
          setInitialClozeHidden("");
          setInitialClozeAfter("");
        }
      }
      setIsLoading(false);
    };

    loadDeckAndCard();
  }, [deckId, cardId, t]);

  const handleSave = async () => {
    if (!cardId && !deckId) {
      setError(t("deckNotFound"));
      return;
    }

    const validBasic = frontText.trim().length > 0 && backText.trim().length > 0;
    const validCloze =
      clozeHidden.trim().length > 0 && clozeGapFront.trim().length > 0;
    const ok = cardType === "cloze" ? validCloze : validBasic;
    if (!ok) return;

    setIsSaving(true);
    setError(null);

    try {
      const notesVal = notes.trim() || null;

      const clozeParts: ClozeParts = {
        before: clozeBefore,
        gapFront: clozeGapFront.trim(),
        hidden: clozeHidden.trim(),
        after: clozeAfter,
      };
      const outFront =
        cardType === "cloze" ? buildClozeFrontText(clozeParts) : frontText.trim();
      const outBack = cardType === "cloze" ? "" : backText.trim();

      if (cardId) {
        const extraPayload: CardExtra = {
          ...(pairMeta.pairId
            ? { pairId: pairMeta.pairId, pairRole: pairMeta.pairRole }
            : {}),
          ...(cardType === "cloze" ? { cloze: clozeParts } : {}),
        };
        const { error: upsertError } = await supabase
          .from("cards")
          .update({
            card_type: cardType,
            card_extra: extraPayload,
            front_text: outFront,
            back_text: outBack,
            notes: notesVal,
            updated_at: new Date().toISOString(),
          })
          .eq("card_id", cardId);

        if (upsertError) {
          const msg = upsertError.message || t("failedToSaveCard");
          setError(msg);
          setIsSaving(false);
          setErrorModal(msg);
          return;
        }
        await replaceCardMedia(cardId, mediaForm);
        router.back();
        return;
      }

      if (!deckId) {
        setError(t("deckNotFound"));
        setIsSaving(false);
        return;
      }

      if (cardType === "basic" && createReversedPair) {
        const pairId = newPairId();
        const forwardExtra: CardExtra = {
          pairId,
          pairRole: "forward",
        };
        const reverseExtra: CardExtra = {
          pairId,
          pairRole: "reverse",
        };

        const { data: firstRow, error: e1 } = await supabase
          .from("cards")
          .insert({
            deck_id: deckId,
            card_type: "basic",
            card_extra: forwardExtra,
            front_text: outFront,
            back_text: outBack,
            notes: notesVal,
            created_by: user?.id ?? null,
          })
          .select("card_id")
          .single();
        if (e1 || !firstRow?.card_id) {
          const msg = e1?.message || t("failedToSaveCard");
          setError(msg);
          setIsSaving(false);
          setErrorModal(msg);
          return;
        }
        await replaceCardMedia(firstRow.card_id, mediaForm);

        const { data: secondRow, error: e2 } = await supabase.from("cards").insert({
          deck_id: deckId,
          card_type: "basic",
          card_extra: reverseExtra,
          front_text: outBack,
          back_text: outFront,
          notes: notesVal,
          created_by: user?.id ?? null,
        }).select("card_id").single();
        if (e2 || !secondRow?.card_id) {
          await supabase.from("cards").delete().eq("card_id", firstRow.card_id);
          const msg = e2?.message || t("failedToSaveCard");
          setError(msg);
          setIsSaving(false);
          setErrorModal(msg);
          return;
        }
        await replaceCardMedia(secondRow.card_id, swapCardMediaFormSides(mediaForm));
        router.back();
        return;
      }

      const extraPayload: CardExtra = {
        ...(cardType === "cloze" ? { cloze: clozeParts } : {}),
      };
      const { data: insertedCard, error: upsertError } = await supabase.from("cards").insert({
        deck_id: deckId,
        card_type: cardType,
        card_extra: extraPayload,
        front_text: outFront,
        back_text: outBack,
        notes: notesVal,
        created_by: user?.id ?? null,
      }).select("card_id").single();

      if (upsertError || !insertedCard?.card_id) {
        const msg = upsertError?.message || t("failedToSaveCard");
        setError(msg);
        setIsSaving(false);
        setErrorModal(msg);
        return;
      }
      await replaceCardMedia(insertedCard.card_id, mediaForm);

      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("unexpectedError");
      setError(msg);
      setIsSaving(false);
      setErrorModal(msg);
    }
  };

  const isValid =
    cardType === "cloze"
      ? isClozeGapComplete({
          before: clozeBefore,
          gapFront: clozeGapFront,
          hidden: clozeHidden,
          after: clozeAfter,
        })
      : frontText.trim().length > 0 && backText.trim().length > 0;
  const hasChanges =
    cardType !== initialCardType ||
    hasMediaFormChanges(mediaForm, initialMediaForm) ||
    createReversedPair !== initialCreateReversed ||
    clozeBefore !== initialClozeBefore ||
    clozeGapFront !== initialClozeGapFront ||
    clozeHidden !== initialClozeHidden ||
    clozeAfter !== initialClozeAfter ||
    frontText !== initialFront ||
    backText !== initialBack ||
    notes !== initialNotes;
  const showPairStudySwitcher =
    cardType === "basic" && createReversedPair && !isEdit;
  const clozePartsPreview: ClozeParts = {
    before: clozeBefore,
    gapFront: clozeGapFront.trim(),
    hidden: clozeHidden.trim(),
    after: clozeAfter,
  };
  const frontPreviewMedia = (["image", "audio", "video"] as const)
    .map((kind) => ({ kind, url: mediaForm.front[kind].trim() }))
    .filter((item) => item.url.length > 0);
  const backPreviewMedia = (["image", "audio", "video"] as const)
    .map((kind) => ({ kind, url: mediaForm.back[kind].trim() }))
    .filter((item) => item.url.length > 0);
  const renderPreviewMedia = (items: typeof frontPreviewMedia) =>
    items.map((item) => (
      <CardSideMedia key={`${item.kind}-${item.url}`} url={item.url} kind={item.kind} />
    ));

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  /* ── Deck not found ── */
  if (!deck) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: C.bg }]}>
        <Text style={{ color: C.textSub, marginBottom: 16 }}>
          {error ?? t("deckNotFound")}
        </Text>
        <TouchableOpacity
          style={[styles.btnCancel, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.btnCancelTxt, { color: C.textSub }]}>{t("goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: C.bg }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollOuter}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
          <View style={styles.formContainer}>
            {/* ── HERO HEADER ── */}
            <View style={styles.hero}>
              <View style={[styles.heroBadge, { backgroundColor: C.isDark ? 'rgba(99,102,241,0.18)' : '#eff1ff' }]}>
                <Feather
                  name={isEdit ? "edit-3" : "credit-card"}
                  size={20}
                  color={C.tint}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroTitle, { color: C.text }]}>
                  {isEdit ? t("editCard") : t("addCard")}
                </Text>
                <Text style={[styles.heroSub, { color: C.textSub }]} numberOfLines={1}>
                  {deck.title}
                </Text>
              </View>
            </View>

            {/* ── FORM CARD ── */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <Field label={t("cardTypeLabel")}>
                <View style={styles.typeRow}>
                  {(
                    [
                      ["basic", "cardTypeBasic"],
                      ["cloze", "cardTypeCloze"],
                    ] as const
                  ).map(([id, lk]) => (
                    <Pressable
                      key={id}
                      onPress={() => setCardType(id)}
                      style={[
                        styles.typeChip,
                        { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                        cardType === id && {
                          borderColor: C.tint,
                          backgroundColor: C.isDark ? 'rgba(99,102,241,0.15)' : '#eff1ff',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipTxt,
                          { color: C.textSub },
                          cardType === id && { color: C.tint, fontWeight: '700' as const },
                        ]}
                      >
                        {t(lk)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              {cardType === "cloze" ? (
                <>
                  <Text style={[styles.clozeIntro, { color: C.textSub }]}>{t("clozeIntro")}</Text>
                  <Field label={t("clozeFieldBefore")}>
                    <InputRow
                      icon="align-left"
                      focused={focusedField === "cBefore"}
                      onFocus={() => setFocusedField("cBefore")}
                      onBlur={() => setFocusedField(null)}
                      multiline
                    >
                      <TextInput
                        style={[styles.input, styles.inputMulti, webTextInputNoOutline]}
                        placeholder={t("clozePlaceholderBefore")}
                        placeholderTextColor={C.placeholder}
                        value={clozeBefore}
                        onChangeText={setClozeBefore}
                        onFocus={() => setFocusedField("cBefore")}
                        onBlur={() => setFocusedField(null)}
                        multiline
                        textAlignVertical="top"
                      />
                    </InputRow>
                  </Field>
                  <Field label={t("clozeFieldGapFront")} required>
                    <InputRow
                      icon="book-open"
                      focused={focusedField === "cGap"}
                      onFocus={() => setFocusedField("cGap")}
                      onBlur={() => setFocusedField(null)}
                      multiline
                    >
                      <TextInput
                        style={[styles.input, styles.inputMulti, styles.inputClozeGapHint, webTextInputNoOutline]}
                        placeholder={t("clozePlaceholderGapFront")}
                        placeholderTextColor={C.placeholder}
                        value={clozeGapFront}
                        onChangeText={setClozeGapFront}
                        onFocus={() => setFocusedField("cGap")}
                        onBlur={() => setFocusedField(null)}
                        multiline
                        textAlignVertical="top"
                      />
                      {clozeGapFront.length > 0 && (
                        <Pressable
                          onPress={() => setClozeGapFront("")}
                          hitSlop={8}
                          style={{ marginTop: 2 }}
                        >
                          <Feather name="x-circle" size={16} color={C.textMuted} />
                        </Pressable>
                      )}
                    </InputRow>
                  </Field>
                  <Field label={t("clozeFieldHidden")} required>
                    <InputRow
                      icon="target"
                      focused={focusedField === "cHidden"}
                      onFocus={() => setFocusedField("cHidden")}
                      onBlur={() => setFocusedField(null)}
                      multiline
                    >
                      <TextInput
                        style={[styles.input, styles.inputMulti, styles.inputClozeHidden, webTextInputNoOutline]}
                        placeholder={t("clozePlaceholderHidden")}
                        placeholderTextColor={C.placeholder}
                        value={clozeHidden}
                        onChangeText={setClozeHidden}
                        onFocus={() => setFocusedField("cHidden")}
                        onBlur={() => setFocusedField(null)}
                        multiline
                        textAlignVertical="top"
                      />
                      {clozeHidden.length > 0 && (
                        <Pressable
                          onPress={() => setClozeHidden("")}
                          hitSlop={8}
                          style={{ marginTop: 2 }}
                        >
                          <Feather name="x-circle" size={16} color={C.textMuted} />
                        </Pressable>
                      )}
                    </InputRow>
                  </Field>
                  <Field label={t("clozeFieldAfter")}>
                    <InputRow
                      icon="align-right"
                      focused={focusedField === "cAfter"}
                      onFocus={() => setFocusedField("cAfter")}
                      onBlur={() => setFocusedField(null)}
                      multiline
                    >
                      <TextInput
                        style={[styles.input, styles.inputMulti, webTextInputNoOutline]}
                        placeholder={t("clozePlaceholderAfter")}
                        placeholderTextColor={C.placeholder}
                        value={clozeAfter}
                        onChangeText={setClozeAfter}
                        onFocus={() => setFocusedField("cAfter")}
                        onBlur={() => setFocusedField(null)}
                        multiline
                        textAlignVertical="top"
                      />
                    </InputRow>
                  </Field>
                </>
              ) : (
                <>
                  <Field label={t("front")} required>
                    <InputRow
                      icon="align-left"
                      focused={focusedField === "front"}
                      onFocus={() => setFocusedField("front")}
                      onBlur={() => setFocusedField(null)}
                      multiline
                    >
                      <TextInput
                        style={[styles.input, styles.inputMulti, webTextInputNoOutline]}
                        placeholder={t("frontPlaceholder")}
                        placeholderTextColor={C.placeholder}
                        value={frontText}
                        onChangeText={setFrontText}
                        onFocus={() => setFocusedField("front")}
                        onBlur={() => setFocusedField(null)}
                        multiline
                        textAlignVertical="top"
                      />
                      {frontText.length > 0 && (
                        <Pressable
                          onPress={() => setFrontText("")}
                          hitSlop={8}
                          style={{ marginTop: 2 }}
                        >
                          <Feather name="x-circle" size={16} color={C.textMuted} />
                        </Pressable>
                      )}
                    </InputRow>
                  </Field>
                  <Field
                    label={t("back")}
                    required
                    labelRight={
                      cardType === "basic" ? (
                        <TouchableOpacity
                          style={[
                            styles.aiLabelBtn,
                            {
                              borderColor: C.tint,
                              backgroundColor: C.isDark ? "rgba(99,102,241,0.12)" : "#eef0ff",
                              opacity: !frontText.trim() || aiBackBusy ? 0.5 : 1,
                            },
                          ]}
                          onPress={handleAiFillBack}
                          disabled={aiBackBusy || !frontText.trim()}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityLabel={t("aiGenerateBack")}
                        >
                          {aiBackBusy ? (
                            <ActivityIndicator size="small" color={C.tint} />
                          ) : (
                            <Feather name="zap" size={14} color={C.tint} />
                          )}
                          <Text style={[styles.aiLabelBtnTxt, { color: C.tint }]}>
                            {aiBackBusy ? t("aiGenerateBackLoading") : t("aiGenerateBack")}
                          </Text>
                        </TouchableOpacity>
                      ) : undefined
                    }
                  >
                    <InputRow
                      icon="align-right"
                      focused={focusedField === "back"}
                      onFocus={() => setFocusedField("back")}
                      onBlur={() => setFocusedField(null)}
                      multiline
                    >
                      <TextInput
                        style={[styles.input, styles.inputMulti, webTextInputNoOutline]}
                        placeholder={t("backPlaceholder")}
                        placeholderTextColor={C.placeholder}
                        value={backText}
                        onChangeText={setBackText}
                        onFocus={() => setFocusedField("back")}
                        onBlur={() => setFocusedField(null)}
                        multiline
                        textAlignVertical="top"
                      />
                      {backText.length > 0 && (
                        <Pressable
                          onPress={() => setBackText("")}
                          hitSlop={8}
                          style={{ marginTop: 2 }}
                        >
                          <Feather name="x-circle" size={16} color={C.textMuted} />
                        </Pressable>
                      )}
                    </InputRow>
                  </Field>
                  {!isEdit ? (
                    <Pressable
                      style={styles.revToggle}
                      onPress={() => setCreateReversedPair((v) => !v)}
                    >
                      <Feather
                        name={createReversedPair ? "check-square" : "square"}
                        size={20}
                        color={createReversedPair ? C.tint : C.textMuted}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.revToggleTitle, { color: C.text }]}>
                          {t("cardCreateReversedPair")}
                        </Text>
                        <Text style={[styles.revToggleHint, { color: C.textSub }]}>
                          {t("cardCreateReversedHint")}
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}
                  {isEdit && pairMeta.pairId ? (
                    <Text style={[styles.revEditHint, { color: C.textSub }]}>
                      {t("cardReversiblePairEditNote")}
                    </Text>
                  ) : null}
                </>
              )}

              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

              <Field
                label={t("frontImageUrl")}
                labelRight={
                  cardType === "basic" ? (
                    <TouchableOpacity
                      style={[
                        styles.aiLabelBtn,
                        {
                          borderColor: C.tint,
                          backgroundColor: C.isDark ? "rgba(99,102,241,0.12)" : "#eef0ff",
                          opacity: !frontText.trim() || aiFrontImgBusy ? 0.5 : 1,
                        },
                      ]}
                      onPress={handleAiFrontImage}
                      disabled={aiFrontImgBusy || !frontText.trim()}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={t("aiGenerateImage")}
                    >
                      {aiFrontImgBusy ? (
                        <ActivityIndicator size="small" color={C.tint} />
                      ) : (
                        <Feather name="image" size={14} color={C.tint} />
                      )}
                      <Text style={[styles.aiLabelBtnTxt, { color: C.tint }]}>
                        {aiFrontImgBusy ? t("aiGenerateImageLoading") : t("aiGenerateImage")}
                      </Text>
                    </TouchableOpacity>
                  ) : undefined
                }
              >
                <InputRow icon="image" focused={focusedField === "frontImage"} onFocus={() => setFocusedField("frontImage")} onBlur={() => setFocusedField(null)}>
                  <TextInput style={[styles.input, webTextInputNoOutline, { color: C.text }]} placeholder="https://..." placeholderTextColor={C.placeholder} value={mediaForm.front.image} onChangeText={(value) => setMediaUrl("front", "image", value)} onFocus={() => setFocusedField("frontImage")} onBlur={() => setFocusedField(null)} autoCapitalize="none" keyboardType="url" />
                  {mediaForm.front.image.length > 0 && <Pressable onPress={() => setMediaUrl("front", "image", "")} hitSlop={8}><Feather name="x-circle" size={16} color={C.textMuted} /></Pressable>}
                </InputRow>
              </Field>
              <Field label={t("frontAudioUrl")}>
                <InputRow icon="volume-2" focused={focusedField === "frontAudio"} onFocus={() => setFocusedField("frontAudio")} onBlur={() => setFocusedField(null)}>
                  <TextInput style={[styles.input, webTextInputNoOutline, { color: C.text }]} placeholder="https://..." placeholderTextColor={C.placeholder} value={mediaForm.front.audio} onChangeText={(value) => setMediaUrl("front", "audio", value)} onFocus={() => setFocusedField("frontAudio")} onBlur={() => setFocusedField(null)} autoCapitalize="none" keyboardType="url" />
                  {mediaForm.front.audio.length > 0 && <Pressable onPress={() => setMediaUrl("front", "audio", "")} hitSlop={8}><Feather name="x-circle" size={16} color={C.textMuted} /></Pressable>}
                </InputRow>
              </Field>
              <Field label={t("frontVideoUrl")}>
                <InputRow icon="video" focused={focusedField === "frontVideo"} onFocus={() => setFocusedField("frontVideo")} onBlur={() => setFocusedField(null)}>
                  <TextInput style={[styles.input, webTextInputNoOutline, { color: C.text }]} placeholder="https://..." placeholderTextColor={C.placeholder} value={mediaForm.front.video} onChangeText={(value) => setMediaUrl("front", "video", value)} onFocus={() => setFocusedField("frontVideo")} onBlur={() => setFocusedField(null)} autoCapitalize="none" keyboardType="url" />
                  {mediaForm.front.video.length > 0 && <Pressable onPress={() => setMediaUrl("front", "video", "")} hitSlop={8}><Feather name="x-circle" size={16} color={C.textMuted} /></Pressable>}
                </InputRow>
              </Field>

              <Field
                label={t("backImageUrl")}
                labelRight={
                  cardType === "basic" ? (
                    <TouchableOpacity
                      style={[
                        styles.aiLabelBtn,
                        {
                          borderColor: C.tint,
                          backgroundColor: C.isDark ? "rgba(99,102,241,0.12)" : "#eef0ff",
                          opacity:
                            (!frontText.trim() && !backText.trim()) || aiBackImgBusy ? 0.5 : 1,
                        },
                      ]}
                      onPress={handleAiBackImage}
                      disabled={
                        aiBackImgBusy || (!frontText.trim() && !backText.trim())
                      }
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={t("aiGenerateImage")}
                    >
                      {aiBackImgBusy ? (
                        <ActivityIndicator size="small" color={C.tint} />
                      ) : (
                        <Feather name="image" size={14} color={C.tint} />
                      )}
                      <Text style={[styles.aiLabelBtnTxt, { color: C.tint }]}>
                        {aiBackImgBusy ? t("aiGenerateImageLoading") : t("aiGenerateImage")}
                      </Text>
                    </TouchableOpacity>
                  ) : undefined
                }
              >
                <InputRow icon="image" focused={focusedField === "backImage"} onFocus={() => setFocusedField("backImage")} onBlur={() => setFocusedField(null)}>
                  <TextInput style={[styles.input, webTextInputNoOutline, { color: C.text }]} placeholder="https://..." placeholderTextColor={C.placeholder} value={mediaForm.back.image} onChangeText={(value) => setMediaUrl("back", "image", value)} onFocus={() => setFocusedField("backImage")} onBlur={() => setFocusedField(null)} autoCapitalize="none" keyboardType="url" />
                  {mediaForm.back.image.length > 0 && <Pressable onPress={() => setMediaUrl("back", "image", "")} hitSlop={8}><Feather name="x-circle" size={16} color={C.textMuted} /></Pressable>}
                </InputRow>
              </Field>
              <Field label={t("backAudioUrl")}>
                <InputRow icon="volume-2" focused={focusedField === "backAudio"} onFocus={() => setFocusedField("backAudio")} onBlur={() => setFocusedField(null)}>
                  <TextInput style={[styles.input, webTextInputNoOutline, { color: C.text }]} placeholder="https://..." placeholderTextColor={C.placeholder} value={mediaForm.back.audio} onChangeText={(value) => setMediaUrl("back", "audio", value)} onFocus={() => setFocusedField("backAudio")} onBlur={() => setFocusedField(null)} autoCapitalize="none" keyboardType="url" />
                  {mediaForm.back.audio.length > 0 && <Pressable onPress={() => setMediaUrl("back", "audio", "")} hitSlop={8}><Feather name="x-circle" size={16} color={C.textMuted} /></Pressable>}
                </InputRow>
              </Field>
              <Field label={t("backVideoUrl")}>
                <InputRow icon="video" focused={focusedField === "backVideo"} onFocus={() => setFocusedField("backVideo")} onBlur={() => setFocusedField(null)}>
                  <TextInput style={[styles.input, webTextInputNoOutline, { color: C.text }]} placeholder="https://..." placeholderTextColor={C.placeholder} value={mediaForm.back.video} onChangeText={(value) => setMediaUrl("back", "video", value)} onFocus={() => setFocusedField("backVideo")} onBlur={() => setFocusedField(null)} autoCapitalize="none" keyboardType="url" />
                  {mediaForm.back.video.length > 0 && <Pressable onPress={() => setMediaUrl("back", "video", "")} hitSlop={8}><Feather name="x-circle" size={16} color={C.textMuted} /></Pressable>}
                </InputRow>
              </Field>

              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

              {/* NOTES */}
              <Field label={t("notes")}>
                <InputRow
                  icon="file-text"
                  focused={focusedField === "notes"}
                  onFocus={() => setFocusedField("notes")}
                  onBlur={() => setFocusedField(null)}
                  multiline
                >
                  <TextInput
                    style={[styles.input, styles.inputNotes, webTextInputNoOutline, { color: C.text }]}
                    placeholder={t("notesPlaceholder")}
                    placeholderTextColor={C.placeholder}
                    value={notes}
                    onChangeText={setNotes}
                    onFocus={() => setFocusedField("notes")}
                    onBlur={() => setFocusedField(null)}
                    multiline
                    textAlignVertical="top"
                  />
                </InputRow>
              </Field>

              {/* ERROR */}
              {error ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor: C.isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2',
                      borderColor: C.isDark ? 'rgba(248,113,113,0.35)' : '#fecaca',
                    },
                  ]}
                >
                  <Feather name="alert-circle" size={15} color="#dc2626" />
                  <Text style={styles.errorTxt}>{error}</Text>
                </View>
              ) : null}
            </View>

            {/* ── BUTTONS ── */}
            <View style={styles.previewActionWrap}>
              <TouchableOpacity
                style={[
                  styles.btnPreviewStudy,
                  {
                    backgroundColor: C.surface,
                    borderColor: isValid ? C.tint : C.border,
                  },
                  !isValid && styles.btnPreviewStudyOff,
                ]}
                onPress={() => {
                  setStudyPreviewPairSlot(1);
                  setStudyPreviewShowBack(false);
                  setStudyPreviewOpen(true);
                }}
                disabled={!isValid}
                activeOpacity={0.85}
              >
                <Feather
                  name="eye"
                  size={18}
                  color={isValid ? C.tint : C.placeholder}
                />
                <Text
                  style={[
                    styles.btnPreviewStudyTxt,
                    { color: isValid ? C.tint : C.placeholder },
                  ]}
                >
                  {t("addCardPreviewStudy")}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.btnCancel, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnCancelTxt, { color: C.textSub }]}>{t("cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnSave,
                  (!isValid || isSaving) && styles.btnSaveOff,
                  isValid && hasChanges && styles.btnSaveActive,
                ]}
                onPress={handleSave}
                disabled={!isValid || isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#fff" />
                    <Text style={styles.btnSaveTxt}>
                      {isEdit ? t("update") : t("save")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={studyPreviewOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setStudyPreviewOpen(false)}
      >
        <View style={styles.studyPreviewRoot}>
          <TouchableOpacity
            style={styles.studyPreviewBackdrop}
            activeOpacity={1}
            onPress={() => setStudyPreviewOpen(false)}
          />
          <View style={styles.studyPreviewCenter}>
            <View style={[styles.studyPreviewSheet, { backgroundColor: C.surface }]}>
            <View style={[styles.studyPreviewHeader, { borderBottomColor: C.borderLight }]}>
              <Text style={[styles.studyPreviewTitle, { color: C.text }]}>{t("addCardPreviewTitle")}</Text>
              <Pressable
                hitSlop={12}
                onPress={() => setStudyPreviewOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={t("addCardPreviewClose")}
              >
                <Feather name="x" size={22} color={C.textSub} />
              </Pressable>
            </View>
            {showPairStudySwitcher ? (
              <View style={styles.studyPreviewPairRow}>
                <Pressable
                  onPress={() => {
                    setStudyPreviewPairSlot(1);
                    setStudyPreviewShowBack(false);
                  }}
                  style={[
                    styles.studyPreviewPairChip,
                    { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                    studyPreviewPairSlot === 1 && {
                      borderColor: C.tint,
                      backgroundColor: C.isDark ? 'rgba(99,102,241,0.15)' : '#eff1ff',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.studyPreviewPairChipTxt,
                      { color: C.textSub },
                      studyPreviewPairSlot === 1 && { color: C.tint, fontWeight: '700' as const },
                    ]}
                  >
                    {t("addCardPreviewPair1")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStudyPreviewPairSlot(2);
                    setStudyPreviewShowBack(false);
                  }}
                  style={[
                    styles.studyPreviewPairChip,
                    { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                    studyPreviewPairSlot === 2 && {
                      borderColor: C.tint,
                      backgroundColor: C.isDark ? 'rgba(99,102,241,0.15)' : '#eff1ff',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.studyPreviewPairChipTxt,
                      { color: C.textSub },
                      studyPreviewPairSlot === 2 && { color: C.tint, fontWeight: '700' as const },
                    ]}
                  >
                    {t("addCardPreviewPair2")}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.studyPreviewScrollInner}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={[
                  styles.studyPreviewCard,
                  {
                    backgroundColor: C.isDark ? C.surfaceAlt : '#fff',
                    borderWidth: C.isDark ? 1 : 0,
                    borderColor: C.border,
                  },
                ]}
                onPress={() => setStudyPreviewShowBack((v) => !v)}
              >
                <View style={styles.studyPreviewCardInner}>
                  {cardType === "cloze" && isClozeGapComplete(clozePartsPreview) ? (
                    <>
                      {renderPreviewMedia(studyPreviewShowBack ? backPreviewMedia : frontPreviewMedia)}
                      {!studyPreviewShowBack ? (
                        <AddCardStudyClozeFront parts={clozePartsPreview} />
                      ) : (
                        <AddCardStudyClozeBack parts={clozePartsPreview} />
                      )}
                    </>
                  ) : cardType === "basic" ? (
                    <>
                      {studyPreviewPairSlot === 1 ? (
                        <>
                          {renderPreviewMedia(studyPreviewShowBack ? backPreviewMedia : frontPreviewMedia)}
                          <Text style={styles.studyPreviewCardTitle}>
                            {studyPreviewShowBack ? backText.trim() : frontText.trim()}
                          </Text>
                        </>
                      ) : (
                        <>
                          {renderPreviewMedia(studyPreviewShowBack ? frontPreviewMedia : backPreviewMedia)}
                          <Text style={styles.studyPreviewCardTitle}>
                            {studyPreviewShowBack
                              ? frontText.trim()
                              : backText.trim()}
                          </Text>
                        </>
                      )}
                    </>
                  ) : (
                    <Text style={styles.studyPreviewCardTitle}>
                      {t("addCardPreviewIncomplete")}
                    </Text>
                  )}
                  {studyPreviewShowBack && notes.trim() ? (
                    <Text style={styles.studyPreviewNotes}>{notes.trim()}</Text>
                  ) : null}
                  {!studyPreviewShowBack ? (
                    <Text style={styles.studyPreviewTapHint}>{t("showAnswer")}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={Boolean(errorModal)}
        title={t("error")}
        message={errorModal ?? ""}
        confirmText={t("ok")}
        cancelText={null}
        onConfirm={() => setErrorModal(null)}
        onCancel={() => setErrorModal(null)}
      />
    </>
  );
}

/* ─── HELPER SUB-COMPONENTS ─── */
function Field({
  label,
  required,
  labelRight,
  children,
}: {
  label: string;
  required?: boolean;
  labelRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const C = useAppColors();
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[styles.fieldLabel, { color: C.textSub }]}>
          {label}
          {required && <Text style={{ color: "#ef4444" }}> *</Text>}
        </Text>
        {labelRight}
      </View>
      {children}
    </View>
  );
}

function InputRow({
  icon,
  focused,
  onFocus,
  onBlur,
  multiline,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  multiline?: boolean;
  children: React.ReactNode;
}) {
  const C = useAppColors();
  return (
    <View
      style={[
        styles.inputRow,
        { backgroundColor: C.inputBg, borderColor: C.inputBorder },
        multiline && styles.inputRowMulti,
        focused && [styles.inputRowFocused, C.isDark && { backgroundColor: C.surface, borderColor: '#6366f1' }],
      ]}
    >
      <Feather
        name={icon}
        size={16}
        color={focused ? C.tint : C.textMuted}
        style={multiline ? { marginTop: 3 } : undefined}
      />
      {children}
    </View>
  );
}

/* ─── STYLES ─── */
const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollOuter: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingBottom: 36,
  },
  formContainer: {
    width: "100%",
    maxWidth: 860,
    paddingHorizontal: 16,
    gap: 14,
  },
  scroll: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },

  /* HERO */
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#eff1ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111827",
  },
  heroSub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  /* CARD */
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: "#4255ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },

  /* DIVIDER */
  divider: {
    height: 1,
    backgroundColor: "#f0f1f5",
    marginVertical: 2,
  },

  /* FIELD */
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  aiLabelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: "58%",
    flexShrink: 1,
  },
  aiLabelBtnTxt: {
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },

  /* INPUT ROW */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f7f8fb",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e8eaee",
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  inputRowMulti: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  inputRowFocused: {
    borderColor: "#1a1a1a",
    backgroundColor: "#fff",
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 0,
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputNotes: {
    minHeight: 60,
    textAlignVertical: "top",
  },

  /* ERROR */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorTxt: {
    flex: 1,
    color: "#dc2626",
    fontSize: 13,
  },

  /* BUTTONS */
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  btnCancel: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e4ec",
  },
  btnCancelTxt: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  btnSave: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#64B5F6",
    opacity: 0.6,
    elevation: 0,
  },
  btnSaveActive: {
    backgroundColor: "#4255ff",
    opacity: 1,
    shadowColor: "#4255ff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  btnSaveOff: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnSaveTxt: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  previewActionWrap: {
    width: "100%",
    marginTop: 4,
  },
  btnPreviewStudy: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#4255ff",
  },
  btnPreviewStudyOff: {
    borderColor: "#e2e4ec",
    opacity: 0.85,
  },
  btnPreviewStudyTxt: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4255ff",
  },
  btnPreviewStudyTxtOff: {
    color: "#c4cbd8",
  },
  studyPreviewRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
  studyPreviewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  studyPreviewCenter: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    zIndex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  studyPreviewSheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "88%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  studyPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  studyPreviewTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  studyPreviewPairRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  studyPreviewPairChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f7f8fb",
    borderWidth: 1.5,
    borderColor: "#e8eaee",
    alignItems: "center",
  },
  studyPreviewPairChipOn: {
    borderColor: "#4255ff",
    backgroundColor: "#eff1ff",
  },
  studyPreviewPairChipTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
  },
  studyPreviewPairChipTxtOn: {
    color: "#4255ff",
  },
  studyPreviewScrollInner: {
    padding: 16,
    paddingBottom: 24,
  },
  studyPreviewCard: {
    width: "100%",
    minHeight: 200,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 6,
    borderLeftColor: "#66BB6A",
  },
  studyPreviewCardInner: {
    alignItems: "center",
    width: "100%",
  },
  studyPreviewCardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  studyPreviewNotes: {
    fontSize: 15,
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  studyPreviewTapHint: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 16,
  },

  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#f7f8fb",
    borderWidth: 1.5,
    borderColor: "#e8eaee",
  },
  typeChipOn: {
    borderColor: "#4255ff",
    backgroundColor: "#eff1ff",
  },
  typeChipTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  typeChipTxtOn: {
    color: "#4255ff",
  },
  clozeIntro: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 8,
  },
  inputClozeGapHint: {
    minHeight: 56,
    fontStyle: "italic",
    fontWeight: "500",
    color: "#4b5563",
    textAlignVertical: "top",
  },
  inputClozeHidden: {
    minHeight: 56,
    fontWeight: "600",
    color: "#111827",
    textAlignVertical: "top",
  },
  revToggle: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  revToggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  revToggleHint: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 17,
  },
  revEditHint: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
    marginTop: 4,
  },
});
