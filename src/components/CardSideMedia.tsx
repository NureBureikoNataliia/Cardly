import Feather from "@expo/vector-icons/Feather";
import { Audio, ResizeMode, Video } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useLanguage } from "@/src/contexts/LanguageContext";
import type { MediaKind } from "@/src/lib/cardModel";

type Layout = "default" | "list";

type Props = {
  url: string;
  kind: MediaKind;
  /** `list` — height follows media/content (deck card list). */
  layout?: Layout;
};

const LIST_IMAGE_MAX_HEIGHT = 280;
const LIST_IMAGE_MIN_HEIGHT = 56;
const LIST_VIDEO_HEIGHT = 160;

export function CardSideMedia({ url, kind, layout = "default" }: Props) {
  if (kind === "image") {
    if (layout === "list") {
      return <ListAdaptiveImage url={url} />;
    }
    return <Image source={{ uri: url }} style={styles.media} resizeMode="contain" />;
  }
  if (kind === "video") {
    return (
      <View style={[styles.videoBox, layout === "list" && styles.videoBoxList]}>
        <Video
          source={{ uri: url }}
          style={styles.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
        />
      </View>
    );
  }
  return <CardAudioButton uri={url} compact={layout === "list"} />;
}

function ListAdaptiveImage({ url }: { url: string }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      url,
      (w, h) => {
        if (!cancelled && w > 0) setRatio(h / w);
      },
      () => {
        if (!cancelled) setRatio(3 / 4);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  const height =
    width > 0 && ratio != null
      ? Math.min(LIST_IMAGE_MAX_HEIGHT, Math.max(LIST_IMAGE_MIN_HEIGHT, width * ratio))
      : LIST_IMAGE_MIN_HEIGHT;

  return (
    <View
      style={styles.listImageWrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Image
        source={{ uri: url }}
        style={[styles.listImage, { height }]}
        resizeMode="contain"
      />
    </View>
  );
}

function CardAudioButton({ uri, compact }: { uri: string; compact?: boolean }) {
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
      style={({ pressed }) => [
        styles.audioBox,
        compact && styles.audioBoxCompact,
        pressed && styles.audioBoxPressed,
      ]}
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
  videoBox: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  video: {
    width: "100%",
    height: "100%",
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
  listImageWrap: {
    width: "100%",
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  listImage: {
    width: "100%",
    backgroundColor: "#f3f4f6",
  },
  videoBoxList: {
    height: LIST_VIDEO_HEIGHT,
    marginBottom: 8,
  },
  audioBoxCompact: {
    minHeight: 72,
    marginBottom: 8,
    paddingVertical: 12,
  },
});
