import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { TextStyle } from "react-native";

import { useAppColors } from "@/src/contexts/ThemeContext";
import type { CardMediaForm, CardMediaSide, CardMediaType } from "@/src/lib/cardMedia";

const webTextInputNoOutline: TextStyle | undefined =
  Platform.OS === "web"
    ? ({ outlineWidth: 0, outlineStyle: "none" } as unknown as TextStyle)
    : undefined;

const MEDIA_META: Record<
  CardMediaType,
  { icon: keyof typeof Feather.glyphMap; labelKey: string; focusSuffix: string }
> = {
  image: { icon: "image", labelKey: "frontImageUrl", focusSuffix: "Image" },
  audio: { icon: "volume-2", labelKey: "frontAudioUrl", focusSuffix: "Audio" },
  video: { icon: "video", labelKey: "frontVideoUrl", focusSuffix: "Video" },
};

const LABEL_KEYS: Record<CardMediaSide, Record<CardMediaType, string>> = {
  front: {
    image: "frontImageUrl",
    audio: "frontAudioUrl",
    video: "frontVideoUrl",
  },
  back: {
    image: "backImageUrl",
    audio: "backAudioUrl",
    video: "backVideoUrl",
  },
};

type Props = {
  side: CardMediaSide;
  mediaForm: CardMediaForm;
  onUrlChange: (side: CardMediaSide, mediaType: CardMediaType, value: string) => void;
  onMove: (side: CardMediaSide, mediaType: CardMediaType, direction: -1 | 1) => void;
  focusedField: string | null;
  onFocusField: (key: string | null) => void;
  t: (key: string) => string;
  imageLabelRight?: ReactNode;
};

export function CardMediaFormFields({
  side,
  mediaForm,
  onUrlChange,
  onMove,
  focusedField,
  onFocusField,
  t,
  imageLabelRight,
}: Props) {
  const C = useAppColors();
  const sideForm = mediaForm[side];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.orderHint, { color: C.textSub }]}>{t("mediaOrderHint")}</Text>
      {sideForm.order.map((kind, index) => {
        const focusKey = `${side}${MEDIA_META[kind].focusSuffix}`;
        const canMoveUp = index > 0;
        const canMoveDown = index < sideForm.order.length - 1;
        return (
          <View key={kind} style={styles.mediaBlock}>
            <View style={styles.orderBtns}>
              <Pressable
                onPress={() => onMove(side, kind, -1)}
                disabled={!canMoveUp}
                style={[styles.orderBtn, !canMoveUp && styles.orderBtnOff]}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t("mediaMoveUp")}
              >
                <Feather name="chevron-up" size={18} color={canMoveUp ? C.tint : C.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => onMove(side, kind, 1)}
                disabled={!canMoveDown}
                style={[styles.orderBtn, !canMoveDown && styles.orderBtnOff]}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t("mediaMoveDown")}
              >
                <Feather name="chevron-down" size={18} color={canMoveDown ? C.tint : C.textMuted} />
              </Pressable>
            </View>
            <View style={styles.mediaFieldCol}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: C.textSub }]}>
                  {t(LABEL_KEYS[side][kind])}
                </Text>
                {kind === "image" ? imageLabelRight : null}
              </View>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                  focusedField === focusKey && [
                    styles.inputRowFocused,
                    C.isDark && { backgroundColor: C.surface, borderColor: "#6366f1" },
                  ],
                ]}
              >
                <Feather
                  name={MEDIA_META[kind].icon}
                  size={16}
                  color={focusedField === focusKey ? C.tint : C.textMuted}
                />
                <TextInput
                  style={[styles.input, webTextInputNoOutline, { color: C.text }]}
                  placeholder="https://..."
                  placeholderTextColor={C.placeholder}
                  value={sideForm.urls[kind]}
                  onChangeText={(value) => onUrlChange(side, kind, value)}
                  onFocus={() => onFocusField(focusKey)}
                  onBlur={() => onFocusField(null)}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                {sideForm.urls[kind].length > 0 ? (
                  <Pressable onPress={() => onUrlChange(side, kind, "")} hitSlop={8}>
                    <Feather name="x-circle" size={16} color={C.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  orderHint: { fontSize: 12, lineHeight: 17, marginBottom: 2 },
  mediaBlock: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  orderBtns: { paddingTop: 26, gap: 2 },
  orderBtn: {
    width: 32,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  orderBtnOff: { opacity: 0.35, backgroundColor: "transparent" },
  mediaFieldCol: { flex: 1, minWidth: 0, gap: 7 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 13,
    paddingVertical: 11,
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
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
});
