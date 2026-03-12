import { Text, View } from "@/src/components/Themed";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { useStudySettings } from "@/src/contexts/StudySettingsContext";
import { DEFAULT_STUDY_SETTINGS } from "@/src/lib/spacedRepetition";

export default function SettingsScreen() {
  const { t } = useLanguage();
  const { settings, updateSettings, resetToDefaults } = useStudySettings();
  const [resetting, setResetting] = useState(false);

  const handleChange = (key: keyof typeof settings, value: string) => {
    const num = parseFloat(value);
    if (!Number.isNaN(num)) {
      updateSettings({ [key]: num });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t("settings")}</Text>

      <Text style={styles.sectionTitle}>{t("studySettings")}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{t("againInterval")}</Text>
        <TextInput
          style={styles.input}
          value={String(settings.againIntervalMinutes)}
          keyboardType="numeric"
          onChangeText={(v) => handleChange("againIntervalMinutes", v)}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t("hardInterval")}</Text>
        <TextInput
          style={styles.input}
          value={String(settings.hardIntervalMinutes)}
          keyboardType="numeric"
          onChangeText={(v) => handleChange("hardIntervalMinutes", v)}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t("goodInterval")}</Text>
        <TextInput
          style={styles.input}
          value={String(settings.goodIntervalDays)}
          keyboardType="numeric"
          onChangeText={(v) => handleChange("goodIntervalDays", v)}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t("easyInterval")}</Text>
        <TextInput
          style={styles.input}
          value={String(settings.easyIntervalDays)}
          keyboardType="numeric"
          onChangeText={(v) => handleChange("easyIntervalDays", v)}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        {t("goodMultiplier")} / {t("hardMultiplier")} / {t("easyMultiplier")}
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>{t("hardMultiplier")}</Text>
        <TextInput
          style={styles.input}
          value={String(settings.hardMultiplier)}
          keyboardType="numeric"
          onChangeText={(v) => handleChange("hardMultiplier", v)}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t("goodMultiplier")}</Text>
        <TextInput
          style={styles.input}
          value={String(settings.goodMultiplier)}
          keyboardType="numeric"
          onChangeText={(v) => handleChange("goodMultiplier", v)}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t("easyMultiplier")}</Text>
        <TextInput
          style={styles.input}
          value={String(settings.easyMultiplier)}
          keyboardType="numeric"
          onChangeText={(v) => handleChange("easyMultiplier", v)}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("minEase")}</Text>
        <TextInput
          style={styles.input}
          value={String(settings.minEase)}
          keyboardType="numeric"
          onChangeText={(v) => handleChange("minEase", v)}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t("defaultEase")}</Text>
        <TextInput
          style={styles.input}
          value={String(settings.defaultEase)}
          keyboardType="numeric"
          onChangeText={(v) => handleChange("defaultEase", v)}
        />
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={async () => {
          setResetting(true);
          await resetToDefaults();
          setResetting(false);
        }}
        disabled={resetting}
      >
        <Text style={styles.resetButtonText}>{t("resetToDefaults")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "space-between",
  },
  label: {
    fontSize: 15,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minWidth: 80,
    textAlign: "right",
  },
  resetButton: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#4255ff",
    borderRadius: 12,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
