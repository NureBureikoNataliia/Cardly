import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/src/components/Themed";
import { useAppColors } from "@/src/contexts/ThemeContext";
import { useLanguage } from "@/src/contexts/LanguageContext";

export type AudioUploadModalPhase = "reading" | "uploading" | "preparing" | "done";

type Props = {
  visible: boolean;
  phase: AudioUploadModalPhase;
  fileName?: string;
};

const PHASE_ORDER: AudioUploadModalPhase[] = ["reading", "uploading", "preparing", "done"];

export function AudioUploadModal({ visible, phase, fileName }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const phaseIndex = PHASE_ORDER.indexOf(phase);

  const phaseLabel = (key: AudioUploadModalPhase, active: boolean, done: boolean) => (
    <View key={key} style={styles.phaseRow}>
      {done ? (
        <Feather name="check-circle" size={18} color="#10b981" />
      ) : active ? (
        <ActivityIndicator size="small" color={C.tint} />
      ) : (
        <View style={[styles.phaseDot, { borderColor: C.border }]} />
      )}
      <Text
        style={[
          styles.phaseTxt,
          { color: done || active ? C.text : C.textMuted },
          active && { fontWeight: "600" },
        ]}
      >
        {t(`uploadAudioPhase_${key}`)}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <View style={[styles.iconWrap, { backgroundColor: C.isDark ? "rgba(99,102,241,0.15)" : "#eef0ff" }]}>
            <Feather name="upload-cloud" size={28} color={C.tint} />
          </View>
          <Text style={[styles.title, { color: C.text }]}>{t("uploadAudioDialogTitle")}</Text>
          {fileName ? (
            <Text style={[styles.fileName, { color: C.textSub }]} numberOfLines={2}>
              {fileName}
            </Text>
          ) : null}
          <View style={styles.phases}>
            {PHASE_ORDER.map((key, i) =>
              phaseLabel(key, phase === key, phaseIndex > i),
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  fileName: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 6,
  },
  phases: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  phaseDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  phaseTxt: {
    fontSize: 14,
    flex: 1,
  },
});
