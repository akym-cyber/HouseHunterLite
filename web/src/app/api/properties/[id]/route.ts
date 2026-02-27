import { NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth/session";
import {
  deletePropertyServer,
  updatePropertyServer
} from "@/features/properties/services/property-server-service";
import type { PropertyWriteInput } from "@/features/properties/types/property";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await verifySessionCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = (await request.json()) as Partial<PropertyWriteInput>;

    const updated = await updatePropertyServer(id, session.uid, {
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

    return NextResponse.json({ property: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update property";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await verifySessionCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deletePropertyServer(id, session.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete property";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
