const IMAGE_KEYS = [
  "coverUrl",
  "primaryImageUrl",
  "imageUrl",
  "image_url",
  "thumbnailUrl",
  "thumbnail_url"
] as const;

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

