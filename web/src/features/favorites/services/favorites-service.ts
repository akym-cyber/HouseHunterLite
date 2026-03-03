import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Favorite } from "@/features/favorites/types/favorite";
import { extractImageUrls, extractVideoEntries } from "@/features/properties/utils/extract-image-urls";

const MAX_FAVORITES_PAGE = 50;

function mapTimestamp(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof value === "object" && "seconds" in value) {
    const withSeconds = value as { seconds?: number };
    if (typeof withSeconds.seconds === "number") return withSeconds.seconds * 1000;
  }
  return undefined;
}

function mapPropertyLocation(data: Record<string, unknown>): string | undefined {
  if (typeof data.location === "string" && data.location.trim()) return data.location.trim();
  if (typeof data.city === "string" && data.city.trim()) return data.city.trim();
  if (typeof data.addressLine1 === "string" && data.addressLine1.trim()) return data.addressLine1.trim();
  return undefined;
}

function favoritesCollection(userId: string) {
  return collection(db, "users", userId, "favorites");
}

type FavoriteDoc = {
  propertyId: string;
  savedAt?: number;
};

function mapFavoriteDoc(docId: string, data: Record<string, unknown>): FavoriteDoc {
  return {
    propertyId: String(data.propertyId ?? data.property_id ?? docId),
    savedAt: mapTimestamp(data.savedAt ?? data.created_at)
  };
}

async function hydrateFavorites(userId: string, items: FavoriteDoc[]): Promise<Favorite[]> {
  const dedupedByProperty = new Map<string, FavoriteDoc>();
  for (const item of items) {
    const existing = dedupedByProperty.get(item.propertyId);
    if (!existing || (item.savedAt ?? 0) > (existing.savedAt ?? 0)) {
      dedupedByProperty.set(item.propertyId, item);
    }
  }

  const hydrated = await Promise.all(
    Array.from(dedupedByProperty.values()).map<Promise<Favorite | null>>(async (item) => {
      try {
        const propertySnap = await getDoc(doc(db, "properties", item.propertyId));
        if (!propertySnap.exists()) {
          // Auto-prune stale favorite refs pointing to deleted properties.
          await deleteDoc(doc(db, "users", userId, "favorites", item.propertyId)).catch(() => undefined);
          return null;
        }

        const propertyData = propertySnap.data() as Record<string, unknown>;
        const imageUrls = extractImageUrls(propertyData);
        const videoEntries = extractVideoEntries(propertyData);
        const priceRaw = Number(propertyData.price ?? NaN);
        const bedsRaw = Number(propertyData.beds ?? propertyData.bedrooms ?? NaN);
        const bathsRaw = Number(propertyData.baths ?? propertyData.bathrooms ?? NaN);
        const propertyTypeRaw =
          typeof propertyData.propertyType === "string" && propertyData.propertyType.trim()
            ? propertyData.propertyType.trim()
            : typeof propertyData.type === "string" && propertyData.type.trim()
              ? propertyData.type.trim()
              : undefined;
        const isVerifiedRaw = propertyData.isVerified ?? propertyData.verified;
        const isFeaturedRaw = propertyData.isFeatured ?? propertyData.featured;
        const featuredUntil = mapTimestamp(propertyData.featuredUntil ?? propertyData.featured_until);
        const boostExpiresAt = mapTimestamp(
          propertyData.boostExpiresAt ?? propertyData.boost_expires_at ?? propertyData.expiresAt
        );

        return {
          id: item.propertyId,
          propertyId: item.propertyId,
          title: typeof propertyData.title === "string" ? propertyData.title : undefined,
          location: mapPropertyLocation(propertyData),
          coverUrl: imageUrls[0],
          imageUrls,
          videoEntries,
          propertyType: propertyTypeRaw,
          beds: Number.isFinite(bedsRaw) ? bedsRaw : undefined,
          baths: Number.isFinite(bathsRaw) ? bathsRaw : undefined,
          isVerified: typeof isVerifiedRaw === "boolean" ? isVerifiedRaw : undefined,
          isFeatured: typeof isFeaturedRaw === "boolean" ? isFeaturedRaw : undefined,
          featuredUntil,
          boostExpiresAt,
          price: Number.isFinite(priceRaw) ? priceRaw : undefined,
          savedAt: item.savedAt
        };
      } catch {
        return null;
      }
    })
  );

  return hydrated
    .filter((item): item is Favorite => item !== null)
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

export function subscribeToFavorites(
  userId: string,
  callback: (favorites: Favorite[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(favoritesCollection(userId), limit(MAX_FAVORITES_PAGE));

  return onSnapshot(
    q,
    (snapshot) => {
      const mapped = snapshot.docs.map((docSnap) =>
        mapFavoriteDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      void hydrateFavorites(userId, mapped)
        .then((items) => callback(items))
        .catch(() => callback([]));
    },
    (error) => {
      onError?.(error);
    }
  );
}

type FavoritePayload = {
  propertyId: string;
  title?: string;
  location?: string;
  coverUrl?: string;
  imageUrls?: string[];
  price?: number;
};

export async function addFavorite(userId: string, payload: FavoritePayload) {
  if (!payload.propertyId) throw new Error("propertyId is required");
  const docRef = doc(db, "users", userId, "favorites", payload.propertyId);
  await setDoc(
    docRef,
    {
      propertyId: payload.propertyId,
      savedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function removeFavorite(userId: string, propertyId: string) {
  if (!propertyId) throw new Error("propertyId is required");
  const docRef = doc(db, "users", userId, "favorites", propertyId);
  await deleteDoc(docRef);
}
