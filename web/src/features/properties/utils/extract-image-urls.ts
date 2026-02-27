const IMAGE_KEYS = [
  "coverUrl",
  "primaryImageUrl",
  "imageUrl",
  "image_url",
  "thumbnailUrl",
  "thumbnail_url"
] as const;

const VIDEO_KEYS = [
  "videoUrl",
  "video_url"
] as const;

export type PropertyVideoEntry = {
  url: string;
  thumbnailUrl?: string;
};

function normalizeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed;
}

function extractFromList(list: unknown[], fromMedia = false): string[] {
  const urls: string[] = [];

  for (const item of list) {
    if (typeof item === "string") {
      const asUrl = normalizeUrl(item);
      if (asUrl) urls.push(asUrl);
      continue;
    }

    if (!item || typeof item !== "object") continue;
    const typed = item as Record<string, unknown>;
    const typeValue = typeof typed.type === "string" ? typed.type.toLowerCase() : "";
    if (fromMedia && typeValue && typeValue !== "image") continue;

    const directUrl = normalizeUrl(typed.url);
    if (directUrl) {
      urls.push(directUrl);
      continue;
    }

    const nestedImageUrl = normalizeUrl(typed.imageUrl ?? typed.image_url);
    if (nestedImageUrl) urls.push(nestedImageUrl);
  }

  return urls;
}

export function extractImageUrls(data: Record<string, unknown>): string[] {
  const urls: string[] = [];

  for (const key of IMAGE_KEYS) {
    const url = normalizeUrl(data[key]);
    if (url) urls.push(url);
  }

  if (Array.isArray(data.media)) {
    urls.push(...extractFromList(data.media, true));
  }

  if (Array.isArray(data.images)) {
    urls.push(...extractFromList(data.images, false));
  }

  return Array.from(new Set(urls));
}

export function extractVideoEntries(data: Record<string, unknown>): PropertyVideoEntry[] {
  const items: PropertyVideoEntry[] = [];
  const pushVideo = (urlValue: unknown, thumbnailValue?: unknown) => {
    const url = normalizeUrl(urlValue);
    if (!url) return;
    const thumbnailUrl = normalizeUrl(thumbnailValue);
    items.push({ url, thumbnailUrl });
  };

  for (const key of VIDEO_KEYS) {
    pushVideo(data[key]);
  }

  const videos = data.videos;
  if (Array.isArray(videos)) {
    for (const row of videos) {
      if (typeof row === "string") {
        pushVideo(row);
        continue;
      }
      if (!row || typeof row !== "object") continue;
      const typed = row as Record<string, unknown>;
      pushVideo(typed.url ?? typed.videoUrl ?? typed.video_url, typed.thumbnailUrl ?? typed.thumbnail_url);
    }
  }

  if (Array.isArray(data.media)) {
    for (const row of data.media) {
      if (!row || typeof row !== "object") continue;
      const typed = row as Record<string, unknown>;
      const mediaType = typeof typed.type === "string" ? typed.type.toLowerCase() : "";
      if (mediaType !== "video") continue;
      pushVideo(typed.url ?? typed.videoUrl ?? typed.video_url, typed.thumbnailUrl ?? typed.thumbnail_url);
    }
  }

  const deduped = new Map<string, PropertyVideoEntry>();
  for (const item of items) {
    if (!deduped.has(item.url)) {
      deduped.set(item.url, item);
      continue;
    }
    const existing = deduped.get(item.url)!;
    if (!existing.thumbnailUrl && item.thumbnailUrl) {
      deduped.set(item.url, item);
    }
  }

  return Array.from(deduped.values());
}
