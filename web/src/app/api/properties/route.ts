import { NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth/session";
import {
  createPropertyServer,
  getPropertiesServer
} from "@/features/properties/services/property-server-service";
import type { PropertyQueryFilters, PropertyWriteInput, PropertySort } from "@/features/properties/types/property";

const parseNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBoolean = (value: string | null): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return undefined;
};

const parseSort = (value: string | null): PropertySort | undefined => {
  if (value === "price_asc" || value === "price_desc" || value === "newest") return value;
  return undefined;
};

function parseParams(url: string): PropertyQueryFilters {
  const { searchParams } = new URL(url);

  const idsRaw = searchParams.get("ids");
  const ids = idsRaw
    ? idsRaw
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : undefined;

  return {
    ownerId: searchParams.get("ownerId") ?? undefined,
    max: parseNumber(searchParams.get("limit") ?? searchParams.get("max")),
    cursorCreatedAt: parseNumber(searchParams.get("cursorCreatedAt")),
    minPrice: parseNumber(searchParams.get("minPrice")),
    maxPrice: parseNumber(searchParams.get("maxPrice")),
    bedrooms: parseNumber(searchParams.get("bedrooms")),
    bathrooms: parseNumber(searchParams.get("bathrooms")),
    propertyType: searchParams.get("propertyType") ?? undefined,
    sort: parseSort(searchParams.get("sort")),
    onlyVerified: parseBoolean(searchParams.get("verified")) === true,
    onlyFeatured: parseBoolean(searchParams.get("featured")) === true,
    ids
  };
}

export async function GET(request: Request) {
  try {
    const filters = parseParams(request.url);
    const properties = await getPropertiesServer(filters);
    return NextResponse.json({ properties });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch properties";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySessionCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<PropertyWriteInput>;

    const created = await createPropertyServer(session.uid, {
      title: String(payload.title ?? ""),
      location: String(payload.location ?? ""),
      price: Number(payload.price ?? 0),
      beds: Number(payload.beds ?? 0),
      baths: Number(payload.baths ?? 0),
      propertyType: payload.propertyType,
      description: payload.description,
      coverUrl: payload.coverUrl,
      imageUrls: payload.imageUrls,
      lat: payload.lat,
      lng: payload.lng,
      latitude: payload.latitude,
      longitude: payload.longitude,
      isVerified: payload.isVerified,
      isFeatured: payload.isFeatured,
      featuredUntil: payload.featuredUntil,
      boostExpiresAt: payload.boostExpiresAt,
      expiresAt: payload.expiresAt
    });

    return NextResponse.json({ property: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create property";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
