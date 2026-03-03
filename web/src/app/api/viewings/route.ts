import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifySessionCookie } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

type CreateViewingBody = {
  propertyId?: string;
  scheduledAt?: string;
  timeSlot?: string;
  viewingType?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
};

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const allowedViewingTypes = new Set(["in_person", "virtual", "self_guided"]);

export async function POST(request: Request) {
  try {
    const session = await verifySessionCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateViewingBody;
    const propertyId = asString(body.propertyId);
    const scheduledAtRaw = asString(body.scheduledAt);
    const timeSlot = asString(body.timeSlot);
    const viewingType = asString(body.viewingType) ?? "in_person";
    const contactName = asString(body.contactName);
    const contactEmail = asString(body.contactEmail);
    const contactPhone = asString(body.contactPhone);
    const notes = asString(body.notes);

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }
    if (!scheduledAtRaw) {
      return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
    }
    if (!timeSlot) {
      return NextResponse.json({ error: "timeSlot is required" }, { status: 400 });
    }
    if (!contactName) {
      return NextResponse.json({ error: "contactName is required" }, { status: 400 });
    }
    if (!contactEmail) {
      return NextResponse.json({ error: "contactEmail is required" }, { status: 400 });
    }
    if (!allowedViewingTypes.has(viewingType)) {
      return NextResponse.json({ error: "Invalid viewingType" }, { status: 400 });
    }

    const scheduledAtMs = Date.parse(scheduledAtRaw);
    if (!Number.isFinite(scheduledAtMs)) {
      return NextResponse.json({ error: "Invalid scheduledAt date" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const propertySnap = await adminDb.collection("properties").doc(propertyId).get();
    if (!propertySnap.exists) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const propertyData = propertySnap.data() as Record<string, unknown>;
    const ownerId = asString(propertyData.ownerId) ?? asString(propertyData.owner_id);
    if (!ownerId) {
      return NextResponse.json({ error: "Property owner is missing" }, { status: 400 });
    }

    if (ownerId === session.uid) {
      return NextResponse.json({ error: "You cannot schedule a tour for your own property" }, { status: 400 });
    }

    const docRef = await adminDb.collection("viewings").add({
      propertyId,
      tenantId: session.uid,
      ownerId,
      scheduledAt: new Date(scheduledAtMs),
      timeSlot,
      viewingType,
      status: "pending",
      contactName,
      contactEmail,
      contactPhone: contactPhone ?? "",
      notes: notes ?? "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ ok: true, viewingId: docRef.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to schedule viewing";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

