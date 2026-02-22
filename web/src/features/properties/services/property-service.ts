import {
  DocumentData,
  QueryDocumentSnapshot,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Property } from "@/features/properties/types/property";
import { extractImageUrls } from "@/features/properties/utils/extract-image-urls";

const COLLECTION_NAME = "properties";
const MAX_PAGE_SIZE = 50;

function mapTimestamp(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value) {
    const withToMillis = value as { toMillis: () => number };
    return withToMillis.toMillis();
  }
  if (value && typeof value === "object" && "seconds" in value) {
    const withSeconds = value as { seconds?: number };
    if (typeof withSeconds.seconds === "number") {
      return withSeconds.seconds * 1000;
    }
  }
  return undefined;
}

function mapProperty(docId: string, data: Record<string, unknown>): Property {
  const imageUrls = extractImageUrls(data);

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
    createdAt: mapTimestamp(data.createdAt)
  };
}

const clampLimit = (max: number): number => Math.max(1, Math.min(MAX_PAGE_SIZE, max));

export type PaginatedProperties = {
  properties: Property[];
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
};

export async function getLatestProperties(
  max = 24,
  afterDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedProperties> {
  const pageSize = clampLimit(max);
  const propertiesRef = collection(db, COLLECTION_NAME);
  const q = afterDoc
    ? query(propertiesRef, orderBy("createdAt", "desc"), startAfter(afterDoc), limit(pageSize))
    : query(propertiesRef, orderBy("createdAt", "desc"), limit(pageSize));
  const snapshot = await getDocs(q);
  return {
    properties: snapshot.docs.map((docSnap) =>
      mapProperty(docSnap.id, docSnap.data() as Record<string, unknown>)
    ),
    lastDoc: snapshot.docs[snapshot.docs.length - 1]
  };
}

export async function getPropertiesByOwner(
  ownerId: string,
  max = 24,
  afterDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedProperties> {
  if (!ownerId) {
    throw new Error("ownerId is required");
  }

  const pageSize = clampLimit(max);
  const propertiesRef = collection(db, COLLECTION_NAME);
  const baseQuery = query(propertiesRef, where("ownerId", "==", ownerId), orderBy("createdAt", "desc"));
  const q = afterDoc ? query(baseQuery, startAfter(afterDoc), limit(pageSize)) : query(baseQuery, limit(pageSize));
  const snapshot = await getDocs(q);
  return {
    properties: snapshot.docs.map((docSnap) =>
      mapProperty(docSnap.id, docSnap.data() as Record<string, unknown>)
    ),
    lastDoc: snapshot.docs[snapshot.docs.length - 1]
  };
}
