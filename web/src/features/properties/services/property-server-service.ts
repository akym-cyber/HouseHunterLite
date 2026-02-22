import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Property } from "@/features/properties/types/property";
import { extractImageUrls } from "@/features/properties/utils/extract-image-urls";

const COLLECTION_NAME = "properties";

const clampLimit = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

function mapProperty(docId: string, data: Record<string, unknown>): Property {
  const createdAtRaw = data.createdAt as
    | { seconds?: number; toMillis?: () => number }
    | number
    | undefined;
  const imageUrls = extractImageUrls(data);

  let createdAt: number | undefined;
  if (typeof createdAtRaw === "number") {
    createdAt = createdAtRaw;
  } else if (createdAtRaw && typeof createdAtRaw.toMillis === "function") {
    createdAt = createdAtRaw.toMillis();
  } else if (createdAtRaw && typeof createdAtRaw.seconds === "number") {
    createdAt = createdAtRaw.seconds * 1000;
  }

  return {
    id: docId,
    title: String(data.title ?? ""),
    location: String(data.location ?? data.city ?? ""),
    price: Number(data.price ?? 0),
    beds: Number(data.beds ?? data.bedrooms ?? 0),
    baths: Number(data.baths ?? data.bathrooms ?? 0),
    coverUrl: imageUrls[0],
    imageUrls,
    ownerId: String(data.ownerId ?? ""),
    description: typeof data.description === "string" ? data.description : undefined,
    createdAt
  };
}

type GetPropertiesArgs = {
  max?: number;
  ownerId?: string;
  cursorCreatedAt?: number;
};

export async function getPropertiesServer({
  max = 24,
  ownerId,
  cursorCreatedAt
}: GetPropertiesArgs = {}): Promise<Property[]> {
  const pageSize = clampLimit(max, 1, 50);
  const adminDb = getAdminDb();
  let queryRef: FirebaseFirestore.Query = adminDb
    .collection(COLLECTION_NAME)
    .orderBy("createdAt", "desc");

  if (ownerId) {
    queryRef = queryRef.where("ownerId", "==", ownerId);
  }

  if (cursorCreatedAt) {
    queryRef = queryRef.startAfter(cursorCreatedAt);
  }

  const snapshot = await queryRef.limit(pageSize).get();
  return snapshot.docs.map((docSnap) => mapProperty(docSnap.id, docSnap.data()));
}

export async function getPropertyByIdServer(propertyId: string): Promise<Property | null> {
  if (!propertyId) return null;

  const adminDb = getAdminDb();
  const propertySnap = await adminDb.collection(COLLECTION_NAME).doc(propertyId).get();
  if (!propertySnap.exists) return null;

  const mapped = mapProperty(propertySnap.id, propertySnap.data() as Record<string, unknown>);
  if (!mapped.ownerId) return mapped;

  try {
    const ownerSnap = await adminDb.collection("users").doc(mapped.ownerId).get();
    if (!ownerSnap.exists) return mapped;
    const ownerData = ownerSnap.data() as Record<string, unknown>;
    const firstName = typeof ownerData.firstName === "string" ? ownerData.firstName.trim() : "";
    const lastName = typeof ownerData.lastName === "string" ? ownerData.lastName.trim() : "";
    const ownerName = `${firstName} ${lastName}`.trim();

    return {
      ...mapped,
      ownerName:
        ownerName ||
        (typeof ownerData.name === "string" && ownerData.name.trim() ? ownerData.name.trim() : undefined),
      ownerEmail:
        typeof ownerData.email === "string" && ownerData.email.trim() ? ownerData.email.trim() : undefined
    };
  } catch {
    return mapped;
  }
}
