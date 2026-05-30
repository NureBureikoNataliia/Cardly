import Feather from "@expo/vector-icons/Feather";
import { Audio, ResizeMode, Video } from "expo-av";
import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { useLanguage } from "@/src/contexts/LanguageContext";
import { useAppColors } from "@/src/contexts/ThemeContext";
import type { MediaKind } from "@/src/lib/cardModel";
import { getCardAudioPlaybackUri } from "@/src/lib/cardAudioCache";
import {
  canPlayMediaUrl,
  extractGoogleDriveFileId,
  extractVideoEmbedUrl,
  googleDrivePreviewEmbedUrl,
  resolveMediaPlaybackUrl,
} from "@/src/lib/resolveMediaPlaybackUrl";

type Layout = "default" | "list";

type Props = {
  url: string;
  kind: MediaKind;
  /** `list` — height follows media/content (deck card list). */
  layout?: Layout;
};

const LIST_IMAGE_MAX_HEIGHT = 280;
const STUDY_IMAGE_MAX_HEIGHT = 360;
const IMAGE_LOADING_HEIGHT = 72;
const LIST_VIDEO_HEIGHT = 160;
const DEFAULT_VIDEO_HEIGHT = 180;

function normalizeMediaUrl(url: string): string {
  return url.trim();
}

function CardVideoEmbed({
  embedSrc,
  title,
  height,
  boxStyle,
}: {
  embedSrc: string;
  title: string;
  height: number;
  boxStyle: object[];
}) {
  if (Platform.OS === "web") {
    return (
      <View style={[boxStyle, { height: Math.max(height, 200) }]}>
        {createElement("iframe", {
          key: embedSrc,
          src: embedSrc,
          title,
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowFullScreen: true,
          style: {
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: 10,
            display: "block",
          },
        })}
      </View>
    );
  }

  return (
    <View style={[boxStyle, { height: Math.max(height, 200) }]}>
      <WebView
        source={{ uri: embedSrc }}
        style={styles.video}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction
        javaScriptEnabled
      />
    </View>
  );
}

function MediaUrlWarning({ message }: { message: string }) {
  const C = useAppColors();
  return (
    <View
      style={[
        styles.warnBox,
        {
          backgroundColor: C.isDark ? "rgba(239,68,68,0.12)" : "#fef2f2",
          borderColor: C.isDark ? "rgba(239,68,68,0.35)" : "#fecaca",
        },
      ]}
    >
      <Feather name="alert-circle" size={16} color="#ef4444" />
      <Text style={[styles.warnTxt, { color: C.isDark ? "#fca5a5" : "#b91c1c" }]}>{message}</Text>
    </View>
  );
}

export function CardSideMedia({ url, kind, layout = "default" }: Props) {
  const mediaUrl = normalizeMediaUrl(url);
  if (!mediaUrl) return null;

  const playbackUrl = resolveMediaPlaybackUrl(mediaUrl, kind);

  if (kind === "image") {
    const maxHeight = layout === "list" ? LIST_IMAGE_MAX_HEIGHT : STUDY_IMAGE_MAX_HEIGHT;
    const marginBottom = layout === "list" ? 8 : 12;
    return <AdaptiveImage url={playbackUrl} maxHeight={maxHeight} marginBottom={marginBottom} />;
  }

  if (!canPlayMediaUrl(mediaUrl, kind)) {
    return <MediaUrlUnsupported />;
  }

  if (kind === "video") {
    return <CardVideo url={mediaUrl} playbackUrl={playbackUrl} layout={layout} />;
  }

  return <CardAudio url={mediaUrl} compact={layout === "list"} />;
}

function MediaUrlUnsupported() {
  const { t } = useLanguage();
  return <MediaUrlWarning message={t("cardMediaDirectUrlHint")} />;
}

function CardVideo({
  url,
  playbackUrl,
  layout,
}: {
  url: string;
  playbackUrl: string;
  layout: Layout;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const driveId = extractGoogleDriveFileId(url);
  const embedSrc = extractVideoEmbedUrl(url);
  const height = layout === "list" ? LIST_VIDEO_HEIGHT : DEFAULT_VIDEO_HEIGHT;
  const boxStyle = [
    styles.videoBox,
    layout === "list" && styles.videoBoxList,
    { height, backgroundColor: C.isDark ? "#0f172a" : "#111827" },
  ];

  if (embedSrc) {
    return (
      <CardVideoEmbed
        embedSrc={embedSrc}
        title="Embedded video"
        height={height}
        boxStyle={boxStyle}
      />
    );
  }

  if (driveId && Platform.OS === "web") {
    return (
      <View style={[boxStyle, { height: Math.max(height, 200) }]}>
        {createElement("iframe", {
          key: driveId,
          src: googleDrivePreviewEmbedUrl(driveId),
          title: "Google Drive video",
          allow: "autoplay; fullscreen",
          style: {
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: 10,
            display: "block",
          },
        })}
      </View>
    );
  }

  if (failed) {
    return <MediaUrlWarning message={t("cardVideoError")} />;
  }

  if (Platform.OS === "web") {
    return (
      <View style={boxStyle}>
        {createElement("video", {
          key: playbackUrl,
          src: playbackUrl,
          controls: true,
          playsInline: true,
          preload: "metadata",
          style: {
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            backgroundColor: "#000",
          },
          onError: () => setFailed(true),
        })}
      </View>
    );
  }

  return (
    <View style={boxStyle}>
      <Video
        key={playbackUrl}
        source={{ uri: playbackUrl }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

type AudioUiState = "preparing" | "loading" | "ready" | "playing" | "error";

function audioShellColors(C: ReturnType<typeof useAppColors>) {
  return {
    bg: C.isDark ? "rgba(99,102,241,0.1)" : "#f5f6ff",
    border: C.isDark ? "rgba(165,180,252,0.28)" : "#d4d9ff",
    btn: C.isDark ? "#6366f1" : "#4255ff",
    btnPressed: C.isDark ? "#4f46e5" : "#3544e8",
  };
}

function AudioPlayerShell({
  compact,
  children,
  footer,
}: {
  compact?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const C = useAppColors();
  const palette = audioShellColors(C);
  return (
    <View
      style={[
        styles.audioShell,
        { backgroundColor: palette.bg, borderColor: palette.border },
        compact && styles.audioShellCompact,
      ]}
    >
      {children}
      {footer}
    </View>
  );
}

function AudioPlayButton({
  state,
  onPress,
  compact,
  disabled,
}: {
  state: AudioUiState;
  onPress: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const C = useAppColors();
  const palette = audioShellColors(C);
  const size = compact ? 40 : 46;
  const iconSize = compact ? 18 : 20;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || state === "preparing" || state === "loading" || state === "error"}
      style={({ pressed }) => [
        styles.audioPlayBtn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: pressed ? palette.btnPressed : palette.btn,
          opacity:
            disabled || state === "preparing" || state === "loading" || state === "error"
              ? 0.55
              : 1,
        },
      ]}
      accessibilityRole="button"
    >
      {state === "preparing" || state === "loading" ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Feather
          name={state === "playing" ? "pause" : "play"}
          size={iconSize}
          color="#fff"
          style={state === "playing" ? undefined : { marginLeft: 2 }}
        />
      )}
    </Pressable>
  );
}

function AudioMeta({ state, compact }: { state: AudioUiState; compact?: boolean }) {
  const { t } = useLanguage();
  const C = useAppColors();
  const subtitle =
    state === "preparing"
      ? t("cardAudioPreparing")
      : state === "loading"
        ? t("cardAudioLoading")
        : state === "playing"
          ? t("cardAudioPlaying")
          : state === "error"
            ? t("cardAudioError")
            : t("cardAudioTap");

  return (
    <View style={styles.audioMeta}>
      <View style={styles.audioMetaTitleRow}>
        <Feather name="music" size={compact ? 14 : 15} color={C.tint} />
        <Text style={[styles.audioMetaTitle, { color: C.text }, compact && styles.audioMetaTitleCompact]}>
          {t("mediaKindAudio")}
        </Text>
      </View>
      <Text
        style={[styles.audioMetaSub, { color: state === "error" ? "#ef4444" : C.textSub }]}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function CardAudio({ url, compact }: { url: string; compact?: boolean }) {
  const { t } = useLanguage();
  const playbackUri = getCardAudioPlaybackUri(url);
  const soundRef = useRef<Audio.Sound | null>(null);
  const loadGenRef = useRef(0);
  const [state, setState] = useState<AudioUiState>("preparing");

  const onPlaybackStatus = useCallback((st: Audio.AVPlaybackStatus) => {
    if (!st.isLoaded) return;
    if (st.didJustFinish) {
      setState("ready");
      return;
    }
    if (st.isPlaying) setState("playing");
    else if (st.isBuffering) setState((s) => (s === "playing" ? "playing" : "loading"));
    else setState("ready");
  }, []);

  useEffect(() => {
    if (!playbackUri) {
      setState("preparing");
      return;
    }

    const gen = ++loadGenRef.current;
    setState("preparing");
    let cancelled = false;

    void (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        await soundRef.current?.unloadAsync();
        soundRef.current = null;

        const { sound } = await Audio.Sound.createAsync(
          { uri: playbackUri },
          { shouldPlay: false, progressUpdateIntervalMillis: 200 },
          onPlaybackStatus,
          false,
        );

        if (cancelled || gen !== loadGenRef.current) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        const st = await sound.getStatusAsync();
        if (st.isLoaded) setState("ready");
      } catch {
        if (!cancelled && gen === loadGenRef.current) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [playbackUri, onPlaybackStatus]);

  const onPress = useCallback(async () => {
    if (state === "error" || state === "preparing" || !playbackUri) return;
    const sound = soundRef.current;
    if (!sound) {
      setState("loading");
      return;
    }
    try {
      const st = await sound.getStatusAsync();
      if (!st.isLoaded) return;
      if (st.isPlaying) {
        await sound.pauseAsync();
        setState("ready");
      } else {
        setState("loading");
        await sound.playAsync();
        setState("playing");
      }
    } catch {
      setState("error");
    }
  }, [state, playbackUri]);

  if (state === "error") {
    return <MediaUrlWarning message={t("cardAudioError")} />;
  }

  if (!playbackUri || state === "preparing") {
    return (
      <AudioPlayerShell compact={compact}>
        <View style={styles.audioRow}>
          <AudioPlayButton state="preparing" onPress={() => {}} compact={compact} disabled />
          <AudioMeta state="preparing" compact={compact} />
        </View>
      </AudioPlayerShell>
    );
  }

  return (
    <AudioPlayerShell compact={compact}>
      <View style={styles.audioRow}>
        <AudioPlayButton state={state} onPress={onPress} compact={compact} />
        <AudioMeta state={state} compact={compact} />
      </View>
    </AudioPlayerShell>
  );
}

function AdaptiveImage({
  url,
  maxHeight,
  marginBottom,
}: {
  url: string;
  maxHeight: number;
  marginBottom: number;
}) {
  const C = useAppColors();
  const [ratio, setRatio] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const applyDimensions = useCallback((w: number, h: number) => {
    if (w > 0 && h > 0) setRatio(h / w);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      url,
      (w, h) => {
        if (!cancelled) applyDimensions(w, h);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [url, applyDimensions]);

  const bg = C.isDark ? C.surfaceAlt : "#f3f4f6";

  let imageWidth = containerWidth;
  let imageHeight = IMAGE_LOADING_HEIGHT;

  if (containerWidth > 0 && ratio != null) {
    const naturalHeight = containerWidth * ratio;
    if (naturalHeight > maxHeight) {
      imageHeight = maxHeight;
      imageWidth = maxHeight / ratio;
    } else {
      imageHeight = naturalHeight;
      imageWidth = containerWidth;
    }
  }

  return (
    <View
      style={[styles.adaptiveImageRow, { marginBottom }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Image
        source={{ uri: url }}
        style={{
          width: containerWidth > 0 ? imageWidth : "100%",
          height: imageHeight,
          borderRadius: 10,
          backgroundColor: bg,
        }}
        resizeMode="contain"
        onLoad={(e) => {
          const source = e.nativeEvent.source;
          if (source?.width && source?.height) {
            applyDimensions(source.width, source.height);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  videoBox: {
    width: "100%",
    height: DEFAULT_VIDEO_HEIGHT,
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  audioShell: {
    width: "100%",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  audioShellCompact: {
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  audioPlayBtn: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  audioMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  audioMetaTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  audioMetaTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  audioMetaTitleCompact: {
    fontSize: 14,
  },
  audioMetaSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  warnTxt: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  adaptiveImageRow: {
    width: "100%",
    alignItems: "center",
  },
  videoBoxList: {
    height: LIST_VIDEO_HEIGHT,
    marginBottom: 8,
  },
});
