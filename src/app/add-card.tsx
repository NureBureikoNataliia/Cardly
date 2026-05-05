import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
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
import { useAuth } from "@/src/contexts/AuthContext";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { supabase } from "@/src/lib/supabase";
import { useAppColors } from "@/src/contexts/ThemeContext";
import { generateCardBack, generateCardImageUrl } from "@/src/lib/gemini";

/** Web: hide browser default focus outline on TextInput (RN typings omit outlineStyle "none"). */
const webTextInputNoOutline: TextStyle | undefined =
  Platform.OS === "web"
    ? ({ outlineWidth: 0, outlineStyle: "none" } as unknown as TextStyle)
    : undefined;

export default function AddCardScreen() {
  const router = useRouter();
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

  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [frontImageUrl, setFrontImageUrl] = useState("");
  const [backImageUrl, setBackImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [initialFront, setInitialFront] = useState("");
  const [initialBack, setInitialBack] = useState("");
  const [initialFrontImage, setInitialFrontImage] = useState("");
  const [initialBackImage, setInitialBackImage] = useState("");
  const [initialNotes, setInitialNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isAiBack, setIsAiBack] = useState(false);
  const [isAiFrontImg, setIsAiFrontImg] = useState(false);
  const [isAiBackImg, setIsAiBackImg] = useState(false);

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
          ? supabase.from("cards").select("*").eq("card_id", cardId).single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (deckError || cardError) {
        setError(t("failedToLoadData"));
      } else {
        setDeck(deckData as Deck);
        const front = cardData?.front_text ?? "";
        const back = cardData?.back_text ?? "";
        const frontImg = cardData?.front_media_url ?? "";
        const backImg = cardData?.back_media_url ?? "";
        const notesVal = cardData?.notes ?? "";
        setFrontText(front);
        setBackText(back);
        setFrontImageUrl(frontImg);
        setBackImageUrl(backImg);
        setNotes(notesVal);
        setInitialFront(front);
        setInitialBack(back);
        setInitialFrontImage(frontImg);
        setInitialBackImage(backImg);
        setInitialNotes(notesVal);
      }
      setIsLoading(false);
    };

    loadDeckAndCard();
  }, [deckId, cardId, t]);

  const handleSave = async () => {
    if (!frontText.trim() || !backText.trim()) return;
    if (!cardId && !deckId) {
      setError(t("deckNotFound"));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const frontMedia = frontImageUrl.trim() || null;
      const backMedia = backImageUrl.trim() || null;
      const { error: upsertError } = cardId
        ? await supabase
            .from("cards")
            .update({
              front_text: frontText.trim(),
              back_text: backText.trim(),
              front_media_url: frontMedia,
              back_media_url: backMedia,
              notes: notes.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("card_id", cardId)
        : await supabase.from("cards").insert({
            deck_id: deckId,
            card_type: "basic",
            front_text: frontText.trim(),
            back_text: backText.trim(),
            front_media_url: frontMedia,
            back_media_url: backMedia,
            notes: notes.trim() || null,
            created_by: user?.id ?? null,
          });

      if (upsertError) {
        const msg = upsertError.message || t("failedToSaveCard");
        setError(msg);
        setIsSaving(false);
        setErrorModal(msg);
        return;
      }

      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("unexpectedError");
      setError(msg);
      setIsSaving(false);
      setErrorModal(msg);
    }
  };

  const isValid = frontText.trim().length > 0 && backText.trim().length > 0;
  const hasChanges =
    frontText !== initialFront ||
    backText !== initialBack ||
    frontImageUrl !== initialFrontImage ||
    backImageUrl !== initialBackImage ||
    notes !== initialNotes;
  const isEdit = Boolean(cardId);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color="#4255ff" />
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
              <View style={styles.heroBadge}>
                <Feather
                  name={isEdit ? "edit-3" : "credit-card"}
                  size={20}
                  color="#4255ff"
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
              {/* FRONT TEXT */}
              <Field label={t("front")} required>
                <InputRow
                  icon="align-left"
                  focused={focusedField === "front"}
                  onFocus={() => setFocusedField("front")}
                  onBlur={() => setFocusedField(null)}
                  multiline
                >
                  <TextInput
                    style={[styles.input, styles.inputMulti, webTextInputNoOutline, { color: C.text }]}
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
                      <Feather name="x-circle" size={16} color="#d1d5db" />
                    </Pressable>
                  )}
                </InputRow>
              </Field>

              {/* FRONT IMAGE URL */}
              <Field
                label={t("frontImageUrl")}
                labelRight={
                  <TouchableOpacity
                    style={[styles.aiBtn, { backgroundColor: C.isDark ? 'rgba(165,180,252,0.12)' : 'rgba(66,85,255,0.08)', borderColor: C.isDark ? 'rgba(165,180,252,0.3)' : 'rgba(66,85,255,0.2)' }]}
                    disabled={!frontText.trim() || isAiFrontImg}
                    activeOpacity={0.7}
                    onPress={async () => {
                      if (!frontText.trim() || !deck) return;
                      setIsAiFrontImg(true);
                      const url = await generateCardImageUrl(frontText.trim(), deck.title ?? '', deck.description, 'front');
                      setIsAiFrontImg(false);
                      if (url) setFrontImageUrl(url);
                      else setErrorModal(t('aiError'));
                    }}
                  >
                    {isAiFrontImg ? (
                      <ActivityIndicator size="small" color={C.tint} />
                    ) : (
                      <Feather name="image" size={12} color={C.tint} />
                    )}
                    <Text style={[styles.aiBtnTxt, { color: C.tint }]}>
                      {isAiFrontImg ? t('aiGenerateImageLoading') : t('aiGenerateImage')}
                    </Text>
                  </TouchableOpacity>
                }
              >
                <InputRow
                  icon="link-2"
                  focused={focusedField === "frontImg"}
                  onFocus={() => setFocusedField("frontImg")}
                  onBlur={() => setFocusedField(null)}
                >
                  <TextInput
                    style={[styles.input, webTextInputNoOutline, { color: C.text }]}
                    placeholder="https://..."
                    placeholderTextColor={C.placeholder}
                    value={frontImageUrl}
                    onChangeText={setFrontImageUrl}
                    onFocus={() => setFocusedField("frontImg")}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {frontImageUrl.length > 0 && (
                    <Pressable onPress={() => setFrontImageUrl("")} hitSlop={8}>
                      <Feather name="x-circle" size={16} color="#d1d5db" />
                    </Pressable>
                  )}
                </InputRow>
              </Field>

              {/* DIVIDER */}
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

              {/* BACK TEXT */}
              <Field
                label={t("back")}
                required
                labelRight={
                  <TouchableOpacity
                    style={[styles.aiBtn, { backgroundColor: C.isDark ? 'rgba(165,180,252,0.12)' : 'rgba(66,85,255,0.08)', borderColor: C.isDark ? 'rgba(165,180,252,0.3)' : 'rgba(66,85,255,0.2)' }]}
                    disabled={!frontText.trim() || isAiBack}
                    activeOpacity={0.7}
                    onPress={async () => {
                      if (!frontText.trim() || !deck) return;
                      setIsAiBack(true);
                      const result = await generateCardBack(frontText.trim(), deck.title ?? '', deck.description);
                      setIsAiBack(false);
                      if (result) setBackText(result);
                    }}
                  >
                    {isAiBack ? (
                      <ActivityIndicator size="small" color={C.tint} />
                    ) : (
                      <Feather name="zap" size={12} color={C.tint} />
                    )}
                    <Text style={[styles.aiBtnTxt, { color: C.tint }]}>
                      {isAiBack ? t('aiGenerateBackLoading') : t('aiGenerateBack')}
                    </Text>
                  </TouchableOpacity>
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
                    style={[styles.input, styles.inputMulti, webTextInputNoOutline, { color: C.text }]}
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
                      <Feather name="x-circle" size={16} color="#d1d5db" />
                    </Pressable>
                  )}
                </InputRow>
              </Field>

              {/* BACK IMAGE URL */}
              <Field
                label={t("backImageUrl")}
                labelRight={
                  <TouchableOpacity
                    style={[styles.aiBtn, { backgroundColor: C.isDark ? 'rgba(165,180,252,0.12)' : 'rgba(66,85,255,0.08)', borderColor: C.isDark ? 'rgba(165,180,252,0.3)' : 'rgba(66,85,255,0.2)' }]}
                    disabled={!backText.trim() || isAiBackImg}
                    activeOpacity={0.7}
                    onPress={async () => {
                      if (!backText.trim() || !deck) return;
                      setIsAiBackImg(true);
                      const url = await generateCardImageUrl(backText.trim(), deck.title ?? '', deck.description, 'back');
                      setIsAiBackImg(false);
                      if (url) setBackImageUrl(url);
                      else setErrorModal(t('aiError'));
                    }}
                  >
                    {isAiBackImg ? (
                      <ActivityIndicator size="small" color={C.tint} />
                    ) : (
                      <Feather name="image" size={12} color={C.tint} />
                    )}
                    <Text style={[styles.aiBtnTxt, { color: C.tint }]}>
                      {isAiBackImg ? t('aiGenerateImageLoading') : t('aiGenerateImage')}
                    </Text>
                  </TouchableOpacity>
                }
              >
                <InputRow
                  icon="link-2"
                  focused={focusedField === "backImg"}
                  onFocus={() => setFocusedField("backImg")}
                  onBlur={() => setFocusedField(null)}
                >
                  <TextInput
                    style={[styles.input, webTextInputNoOutline, { color: C.text }]}
                    placeholder="https://..."
                    placeholderTextColor={C.placeholder}
                    value={backImageUrl}
                    onChangeText={setBackImageUrl}
                    onFocus={() => setFocusedField("backImg")}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {backImageUrl.length > 0 && (
                    <Pressable onPress={() => setBackImageUrl("")} hitSlop={8}>
                      <Feather name="x-circle" size={16} color="#d1d5db" />
                    </Pressable>
                  )}
                </InputRow>
              </Field>

              {/* DIVIDER */}
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
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={15} color="#dc2626" />
                  <Text style={styles.errorTxt}>{error}</Text>
                </View>
              ) : null}
            </View>

            {/* ── BUTTONS ── */}
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
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.fieldLabel}>
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
        color={focused ? C.tint : "#b0b8c8"}
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

  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  aiBtnTxt: {
    fontSize: 11,
    fontWeight: '600',
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
});
