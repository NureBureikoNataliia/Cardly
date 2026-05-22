import type { MediaKind } from "@/src/lib/cardModel";

const BLOCKED_HOSTS = ["youtube.com", "youtu.be", "vimeo.com"];

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

function isSupabaseStoragePublicUrl(url: string): boolean {
  return /supabase\.co\/storage\/v1\/object\/public\//i.test(url);
}

function hasDirectExtension(url: string, kind: MediaKind): boolean {
  const path = url.toLowerCase().split("?")[0];
  if (kind === "audio") {
    return /\.(mp3|m4a|wav|ogg|aac|flac|opus|webm)$/i.test(path);
  }
  if (kind === "video") {
    return /\.(mp4|mov|m4v|webm|mkv)$/i.test(path);
  }
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(path);
}

export function canPlayMediaUrl(url: string, kind: MediaKind): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const host = new URL(trimmed).hostname.replace(/^www\./, "");
    if (BLOCKED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return false;
    }
  } catch {
    return false;
  }

  if (isSupabaseStoragePublicUrl(trimmed)) return true;
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
