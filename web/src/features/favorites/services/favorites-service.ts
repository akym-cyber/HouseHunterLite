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
import { extractImageUrls } from "@/features/properties/utils/extract-image-urls";

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

async function hydrateFavorites(items: FavoriteDoc[]): Promise<Favorite[]> {
  const hydrated = await Promise.all(
    items.map<Promise<Favorite | null>>(async (item) => {
      try {
        const propertySnap = await getDoc(doc(db, "properties", item.propertyId));
        if (!propertySnap.exists()) {
          return null;
        }

        const propertyData = propertySnap.data() as Record<string, unknown>;
        const imageUrls = extractImageUrls(propertyData);
        const priceRaw = Number(propertyData.price ?? NaN);

        return {
          id: item.propertyId,
          propertyId: item.propertyId,
          title: typeof propertyData.title === "string" ? propertyData.title : undefined,
          location: mapPropertyLocation(propertyData),
          coverUrl: imageUrls[0],
          imageUrls,
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
      void hydrateFavorites(mapped)
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
