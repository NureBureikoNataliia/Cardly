import Feather from "@expo/vector-icons/Feather";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text } from "react-native";

import { useLanguage } from "@/src/contexts/LanguageContext";
import type { MediaKind } from "@/src/lib/cardModel";

type Props = {
  url: string;
  kind: MediaKind;
};

export function CardSideMedia({ url, kind }: Props) {
  if (kind === "image") {
    return <Image source={{ uri: url }} style={styles.media} resizeMode="contain" />;
  }
  return <CardAudioButton uri={url} />;
}

function CardAudioButton({ uri }: { uri: string }) {
  const { t } = useLanguage();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [label, setLabel] = useState<"idle" | "playing" | "error">("idle");

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [uri]);

  const onPress = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (st) => {
            if (st.isLoaded && st.didJustFinish) setLabel("idle");
          },
        );
        soundRef.current = sound;
        setLabel("playing");
      } else {
        const st = await soundRef.current.getStatusAsync();
        if (st.isLoaded) {
          if (st.isPlaying) {
            await soundRef.current.pauseAsync();
            setLabel("idle");
          } else {
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.playAsync();
            setLabel("playing");
          }
        }
      }
    } catch {
      setLabel("error");
    }
  }, [uri]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.audioBox, pressed && styles.audioBoxPressed]}
    >
      <Feather name="volume-2" size={28} color="#4255ff" />
      <Text style={styles.audioHint}>
        {label === "error"
          ? t("cardAudioError")
          : label === "playing"
            ? t("cardAudioPlaying")
            : t("cardAudioTap")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  media: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: "#f3f4f6",
  },
  audioBox: {
    width: "100%",
    minHeight: 100,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#eff1ff",
    borderWidth: 1.5,
    borderColor: "#c7d2fe",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  audioBoxPressed: {
    opacity: 0.88,
  },
  audioHint: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4255ff",
  },
});
