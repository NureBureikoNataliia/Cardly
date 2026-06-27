import {
  collectStorageUrlsFromCardMediaForm,
  isCardMediaBucketUrl,
  parseCardMediaStoragePath,
} from "../cardMediaStorageCleanup";
import { emptyCardMediaForm } from "../cardMedia";

describe("cardMediaStorageCleanup", () => {
  const publicUrl =
    "https://abc.supabase.co/storage/v1/object/public/card-media/user-1/deck-1/images/card/front.jpg";

  it("parses public card-media storage paths", () => {
    expect(parseCardMediaStoragePath(publicUrl)).toBe("user-1/deck-1/images/card/front.jpg");
    expect(isCardMediaBucketUrl(publicUrl)).toBe(true);
  });

  it("parses signed card-media storage paths", () => {
    const signed =
      "https://abc.supabase.co/storage/v1/object/sign/card-media/user/audio.mp3?token=xyz";
    expect(parseCardMediaStoragePath(signed)).toBe("user/audio.mp3");
  });

  it("ignores non-card-media URLs", () => {
    expect(parseCardMediaStoragePath("https://example.com/photo.jpg")).toBeNull();
    expect(isCardMediaBucketUrl("https://pixabay.com/get/abc")).toBe(false);
  });

  it("collects storage URLs from card media form", () => {
    const form = emptyCardMediaForm();
    form.front.urls.image = publicUrl;
    form.back.urls.audio =
      "https://abc.supabase.co/storage/v1/object/public/card-media/u/d/c/front-audio.mp3";
    form.back.urls.video = "https://youtube.com/watch?v=dQw4w9WgXcQ";

    expect(collectStorageUrlsFromCardMediaForm(form)).toEqual([
      publicUrl,
      "https://abc.supabase.co/storage/v1/object/public/card-media/u/d/c/front-audio.mp3",
    ]);
  });
});
