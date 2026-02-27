import "server-only";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type {
  Property,
  PropertyQueryFilters,
  PropertySort,
  PropertyWriteInput
} from "@/features/properties/types/property";
import { extractImageUrls, extractVideoEntries } from "@/features/properties/utils/extract-image-urls";

const COLLECTION_NAME = "properties";

const clampLimit = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const toNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapTimestamp = (value: unknown): number | undefined => {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof value === "object" && "seconds" in value) {
    const withSeconds = value as { seconds?: number };
    if (typeof withSeconds.seconds === "number") return withSeconds.seconds * 1000;
  }
  return undefined;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  return undefined;
};

const toOptionalStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
};

function mapProperty(docId: string, data: Record<string, unknown>): Property {
  const imageUrls = extractImageUrls(data);
  const videoEntries = extractVideoEntries(data);
  const beds = Number(data.beds ?? data.bedrooms ?? 0);
  const baths = Number(data.baths ?? data.bathrooms ?? 0);
  const lat = toNumber(data.lat ?? data.latitude);
  const lng = toNumber(data.lng ?? data.longitude);
  const featuredUntil = mapTimestamp(data.featuredUntil ?? data.featured_until);
  const boostExpiresAt = mapTimestamp(data.boostExpiresAt ?? data.boost_expires_at ?? data.expiresAt);
  const views = toNumber(data.views) ?? 0;
  const saves = toNumber(data.saves) ?? 0;
  const messagesStarted = toNumber(data.messagesStarted ?? data.messages_started) ?? 0;

  return {
    id: docId,
    title: String(data.title ?? ""),
    location: String(data.location ?? data.city ?? data.addressLine1 ?? ""),
    price: Number(data.price ?? 0),
    beds: Number.isFinite(beds) ? beds : 0,
    baths: Number.isFinite(baths) ? baths : 0,
    propertyType: String(data.propertyType ?? data.type ?? "").trim() || undefined,
    description: toOptionalString(data.description),
    coverUrl: imageUrls[0],
    imageUrls,
    videoEntries,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    ownerId: String(data.ownerId ?? ""),
    ownerName: toOptionalString(data.ownerName),
    ownerEmail: toOptionalString(data.ownerEmail),
    isVerified: toOptionalBoolean(data.isVerified ?? data.verified),
    isFeatured: toOptionalBoolean(data.isFeatured ?? data.featured),
    featuredUntil,
    boostExpiresAt,
    // Legacy alias retained for existing UI paths that still read expiresAt.
    expiresAt: boostExpiresAt,
    views,
    saves,
    messagesStarted,
    createdAt: mapTimestamp(data.createdAt ?? data.created_at),
    updatedAt: mapTimestamp(data.updatedAt ?? data.updated_at)
  };
}


type NormalizedFilters = {
  max: number;
  ownerId?: string;
  cursorCreatedAt?: number;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  sort: PropertySort;
  onlyVerified: boolean;
  onlyFeatured: boolean;
  ids?: string[];
};
function normalizeSort(sort?: PropertySort): PropertySort {
  if (sort === "price_asc" || sort === "price_desc") return sort;
  return "newest";
}

function normalizeFilters(filters: PropertyQueryFilters): NormalizedFilters {
  return {
    max: clampLimit(filters.max ?? 24, 1, 60),
    ownerId: toOptionalString(filters.ownerId),
    cursorCreatedAt: toNumber(filters.cursorCreatedAt),
    minPrice: toNumber(filters.minPrice),
    maxPrice: toNumber(filters.maxPrice),
    bedrooms: toNumber(filters.bedrooms),
    bathrooms: toNumber(filters.bathrooms),
    propertyType: toOptionalString(filters.propertyType)?.toLowerCase(),
    sort: normalizeSort(filters.sort),
    onlyVerified: filters.onlyVerified === true,
    onlyFeatured: filters.onlyFeatured === true,
    ids: filters.ids?.map((id) => id.trim()).filter((id) => id.length > 0)
  };
}

function isActiveFeatured(item: Property, now: number): boolean {
  return item.isFeatured === true && typeof item.featuredUntil === "number" && item.featuredUntil > now;
}

function isActiveBoost(item: Property, now: number): boolean {
  return typeof item.boostExpiresAt === "number" && item.boostExpiresAt > now;
}

function applyInMemoryFilters(properties: Property[], filters: NormalizedFilters): Property[] {
  const now = Date.now();

  return properties
    .filter((item) => {
      if (typeof filters.minPrice === "number" && item.price < filters.minPrice) return false;
      if (typeof filters.maxPrice === "number" && item.price > filters.maxPrice) return false;
      if (typeof filters.bedrooms === "number" && item.beds < filters.bedrooms) return false;
      if (typeof filters.bathrooms === "number" && item.baths < filters.bathrooms) return false;
      if (filters.propertyType && (item.propertyType ?? "").toLowerCase() !== filters.propertyType) return false;
      if (filters.onlyVerified && item.isVerified !== true) return false;
      if (filters.onlyFeatured) {
        if (!isActiveFeatured(item, now)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aFeatured = isActiveFeatured(a, now);
      const bFeatured = isActiveFeatured(b, now);
      if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;

      const aBoosted = isActiveBoost(a, now);
      const bBoosted = isActiveBoost(b, now);
      if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;

      if (filters.sort === "price_asc") return a.price - b.price;
      if (filters.sort === "price_desc") return b.price - a.price;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
}

async function fetchByIds(ids: string[]): Promise<Property[]> {
  if (ids.length === 0) return [];

  const adminDb = getAdminDb();
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10));
  }

  const docs = await Promise.all(
    chunks.map(async (chunk) => {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where(FieldPath.documentId(), "in", chunk)
        .get();
      return snapshot.docs;
    })
  );

  const mapped = docs
    .flat()
    .map((docSnap) => mapProperty(docSnap.id, docSnap.data() as Record<string, unknown>));

  const byId = new Map(mapped.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is Property => !!item);
}

export async function getPropertiesServer(rawFilters: PropertyQueryFilters = {}): Promise<Property[]> {
  const filters = normalizeFilters(rawFilters);

  if (filters.ids && filters.ids.length > 0) {
    const byIds = await fetchByIds(filters.ids.slice(0, 10));
    return applyInMemoryFilters(byIds, filters).slice(0, filters.max);
  }

  const adminDb = getAdminDb();
  const overFetch = clampLimit(filters.max * 2, filters.max, 100);

  if (filters.onlyFeatured) {
    try {
      let featuredQuery: FirebaseFirestore.Query = adminDb
        .collection(COLLECTION_NAME)
        .where("isFeatured", "==", true)
        .where("featuredUntil", ">", new Date());

      if (filters.ownerId) {
        featuredQuery = featuredQuery.where("ownerId", "==", filters.ownerId);
      }

      const featuredSnapshot = await featuredQuery.orderBy("featuredUntil", "desc").limit(overFetch).get();
      const featuredMapped = featuredSnapshot.docs.map((docSnap) =>
        mapProperty(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      return applyInMemoryFilters(featuredMapped, filters).slice(0, filters.max);
    } catch {
      // Fallback to generic query if strict featured query is missing an index.
    }
  }

  let queryRef: FirebaseFirestore.Query = adminDb.collection(COLLECTION_NAME);

  if (filters.ownerId) {
    queryRef = queryRef.where("ownerId", "==", filters.ownerId);
  }

  const sortField = filters.sort === "newest" ? "createdAt" : "price";
  const sortDirection = filters.sort === "price_asc" ? "asc" : "desc";

  if (typeof filters.minPrice === "number") {
    queryRef = queryRef.where("price", ">=", filters.minPrice);
  }

  if (typeof filters.maxPrice === "number") {
    queryRef = queryRef.where("price", "<=", filters.maxPrice);
  }

  if (typeof filters.cursorCreatedAt === "number" && filters.sort === "newest") {
    queryRef = queryRef.orderBy(sortField, sortDirection).startAfter(filters.cursorCreatedAt);
  } else {
    queryRef = queryRef.orderBy(sortField, sortDirection);
  }

  const snapshot = await queryRef.limit(overFetch).get();
  const mapped = snapshot.docs.map((docSnap) => mapProperty(docSnap.id, docSnap.data()));

  return applyInMemoryFilters(mapped, filters).slice(0, filters.max);
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

function validateWriteInput(input: PropertyWriteInput): PropertyWriteInput {
  const title = toOptionalString(input.title);
  const location = toOptionalString(input.location);
  const propertyType = toOptionalString(input.propertyType);
  const description = toOptionalString(input.description);
  const coverUrl = toOptionalString(input.coverUrl);
  const imageUrls = toOptionalStringArray(input.imageUrls);
  const latitude = toNumber(input.latitude);
  const longitude = toNumber(input.longitude);
  const lat = toNumber(input.lat);
  const lng = toNumber(input.lng);
  const featuredUntil = toNumber(input.featuredUntil);
  const boostExpiresAt = toNumber(input.boostExpiresAt ?? input.expiresAt);

  const price = toNumber(input.price);
  const beds = toNumber(input.beds);
  const baths = toNumber(input.baths);

  if (!title) throw new Error("Title is required.");
  if (!location) throw new Error("Location is required.");
  if (!Number.isFinite(price) || (price ?? 0) <= 0) throw new Error("Price must be greater than zero.");
  if (!Number.isFinite(beds) || (beds ?? -1) < 0) throw new Error("Beds must be zero or more.");
  if (!Number.isFinite(baths) || (baths ?? -1) < 0) throw new Error("Baths must be zero or more.");

  return {
    title,
    location,
    price: price!,
    beds: beds!,
    baths: baths!,
    propertyType,
    description,
    coverUrl,
    imageUrls,
    lat: lat ?? latitude,
    lng: lng ?? longitude,
    latitude: lat ?? latitude,
    longitude: lng ?? longitude,
    isVerified: input.isVerified === true,
    isFeatured: input.isFeatured === true,
    featuredUntil,
    boostExpiresAt,
    // Legacy alias retained for old callers.
    expiresAt: boostExpiresAt
  };
}

function buildWritePayload(valid: PropertyWriteInput): Record<string, unknown> {
  const featuredUntilDate = valid.featuredUntil ? new Date(valid.featuredUntil) : null;
  const boostExpiresAtDate = valid.boostExpiresAt ? new Date(valid.boostExpiresAt) : null;
  const payload: Record<string, unknown> = {
    title: valid.title,
    location: valid.location,
    price: valid.price,
    beds: valid.beds,
    baths: valid.baths,
    bedrooms: valid.beds,
    bathrooms: valid.baths,
    propertyType: valid.propertyType ?? null,
    description: valid.description ?? null,
    coverUrl: valid.coverUrl ?? null,
    imageUrls: valid.imageUrls ?? [],
    isVerified: valid.isVerified === true,
    isFeatured: valid.isFeatured === true,
    featuredUntil: featuredUntilDate,
    featured_until: featuredUntilDate,
    boostExpiresAt: boostExpiresAtDate,
    boost_expires_at: boostExpiresAtDate,
    // Legacy alias retained for old reads/writes.
    expiresAt: boostExpiresAtDate,
    lat: typeof valid.lat === "number" ? valid.lat : typeof valid.latitude === "number" ? valid.latitude : null,
    lng: typeof valid.lng === "number" ? valid.lng : typeof valid.longitude === "number" ? valid.longitude : null,
    latitude: typeof valid.latitude === "number" ? valid.latitude : typeof valid.lat === "number" ? valid.lat : null,
    longitude: typeof valid.longitude === "number" ? valid.longitude : typeof valid.lng === "number" ? valid.lng : null,
    updatedAt: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  };

  return payload;
}

export async function createPropertyServer(ownerId: string, input: PropertyWriteInput): Promise<Property> {
  if (!ownerId) throw new Error("ownerId is required");

  const valid = validateWriteInput(input);
  const adminDb = getAdminDb();

  const payload = {
    ...buildWritePayload(valid),
    ownerId,
    views: typeof valid.views === "number" ? valid.views : 0,
    saves: typeof valid.saves === "number" ? valid.saves : 0,
    messagesStarted: typeof valid.messagesStarted === "number" ? valid.messagesStarted : 0,
    createdAt: FieldValue.serverTimestamp(),
    created_at: FieldValue.serverTimestamp()
  };

  const docRef = await adminDb.collection(COLLECTION_NAME).add(payload);
  const created = await docRef.get();

  return mapProperty(created.id, created.data() as Record<string, unknown>);
}

async function assertOwner(propertyId: string, ownerId: string): Promise<FirebaseFirestore.DocumentSnapshot> {
  const adminDb = getAdminDb();
  const docRef = adminDb.collection(COLLECTION_NAME).doc(propertyId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new Error("Property not found.");
  }

  const data = snapshot.data() as Record<string, unknown>;
  if (String(data.ownerId ?? "") !== ownerId) {
    throw new Error("You can only manage your own listings.");
  }

  return snapshot;
}

export async function updatePropertyServer(
  propertyId: string,
  ownerId: string,
  input: PropertyWriteInput
): Promise<Property> {
  if (!propertyId) throw new Error("propertyId is required");
  if (!ownerId) throw new Error("ownerId is required");

  await assertOwner(propertyId, ownerId);

  const valid = validateWriteInput(input);
  const adminDb = getAdminDb();
  const docRef = adminDb.collection(COLLECTION_NAME).doc(propertyId);

  await docRef.set(buildWritePayload(valid), { merge: true });
  const updated = await docRef.get();

  return mapProperty(updated.id, updated.data() as Record<string, unknown>);
}

export async function deletePropertyServer(propertyId: string, ownerId: string): Promise<void> {
  if (!propertyId) throw new Error("propertyId is required");
  if (!ownerId) throw new Error("ownerId is required");

  await assertOwner(propertyId, ownerId);
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION_NAME).doc(propertyId).delete();
}

export async function incrementPropertyViewsServer(propertyId: string): Promise<void> {
  if (!propertyId) throw new Error("propertyId is required");
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION_NAME).doc(propertyId).set(
    {
      views: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function incrementPropertySavesServer(propertyId: string): Promise<void> {
  if (!propertyId) throw new Error("propertyId is required");
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION_NAME).doc(propertyId).set(
    {
      saves: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function incrementPropertyMessagesStartedServer(propertyId: string): Promise<void> {
  if (!propertyId) throw new Error("propertyId is required");
  const adminDb = getAdminDb();
  await adminDb.collection(COLLECTION_NAME).doc(propertyId).set(
    {
      messagesStarted: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

