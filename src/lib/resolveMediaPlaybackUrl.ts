import type { MediaKind } from "@/src/lib/cardModel";

/** Hosts that only work via embed player, not as direct file URLs in expo-av. */
const EMBED_ONLY_HOSTS = ["youtube.com", "youtu.be", "m.youtube.com", "vimeo.com", "player.vimeo.com"];

export function extractGoogleDriveFileId(url: string): string | null {
  const u = url.trim();
  const filePath = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(u);
  if (filePath) return filePath[1];
  const queryId = /[?&]id=([a-zA-Z0-9_-]+)/.exec(u);
  if (queryId && u.includes("drive.google")) return queryId[1];
  return null;
}

export function googleDriveAudioStreamUrls(fileId: string): string[] {
  return [
    `https://docs.google.com/uc?export=download&id=${fileId}`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ];
}

export function googleDrivePreviewEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

const YOUTUBE_ID = /[a-zA-Z0-9_-]{11}/;

export function extractYouTubeVideoId(url: string): string | null {
  const u = url.trim();
  const short = /youtu\.be\/([a-zA-Z0-9_-]{11})/.exec(u);
  if (short) return short[1];
  const embed = /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/.exec(u);
  if (embed) return embed[1];
  const shorts = /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/.exec(u);
  if (shorts) return shorts[1];
  const watch = /[?&]v=([a-zA-Z0-9_-]{11})/.exec(u);
  if (watch && /youtube/i.test(u)) return watch[1];
  const pathWatch = /youtube\.com\/watch\/([a-zA-Z0-9_-]{11})/.exec(u);
  if (pathWatch) return pathWatch[1];
  return null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return YOUTUBE_ID.test(videoId)
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : "";
}

export function extractVimeoVideoId(url: string): string | null {
  const m = /vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/)?(\d+)/.exec(
    url.trim(),
  );
  return m ? m[1] : null;
}

export function vimeoEmbedUrl(videoId: string): string {
  return /^\d+$/.test(videoId) ? `https://player.vimeo.com/video/${videoId}` : "";
}

export function extractVideoEmbedUrl(url: string): string | null {
  const yt = extractYouTubeVideoId(url);
  if (yt) return youtubeEmbedUrl(yt) || null;
  const vimeo = extractVimeoVideoId(url);
  if (vimeo) return vimeoEmbedUrl(vimeo) || null;
  return null;
}

function isSupabaseStorageUrl(url: string): boolean {
  return /supabase\.co\/storage\/v1\/object\/(public|sign)\//i.test(url);
}

function hasDirectExtension(url: string, kind: MediaKind): boolean {
  const lower = url.toLowerCase();
  const path = lower.split("?")[0];
  if (kind === "audio") {
    return /\.(mp3|m4a|wav|ogg|aac|flac|opus|webm)(\?|$)/i.test(path);
  }
  if (kind === "video") {
    if (/\.(mp4|mov|m4v|webm|mkv)(\?|$)/i.test(path)) return true;
    return /[?&](format|type|ext)=([^&#]*\.)?(mp4|webm|mov|m4v|mkv)/i.test(lower);
  }
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(path);
}

function isEmbedOnlyHost(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./, "");
    return EMBED_ONLY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function canPlayMediaUrl(url: string, kind: MediaKind): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (kind === "video" && extractVideoEmbedUrl(trimmed)) return true;

  if (isEmbedOnlyHost(trimmed)) return false;

  try {
    new URL(trimmed);
  } catch {
    return false;
  }

  if (isSupabaseStorageUrl(trimmed)) return true;
  if (extractGoogleDriveFileId(trimmed)) return true;
  if (trimmed.toLowerCase().includes("dropbox.com")) return true;
  return hasDirectExtension(trimmed, kind);
}

export function resolveMediaPlaybackUrl(url: string, kind: MediaKind): string {
  const trimmed = url.trim();
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId && kind === "audio") {
    return googleDriveAudioStreamUrls(driveId)[0];
  }

  if (trimmed.includes("dropbox.com")) {
    let next = trimmed.replace("www.dropbox.com", "dl.dropboxusercontent.com");
    if (next.includes("?dl=0")) next = next.replace("?dl=0", "?dl=1");
    else if (!next.includes("dl=")) {
      next += next.includes("?") ? "&dl=1" : "?dl=1";
    }
    return next;
  }

  return trimmed;
}
