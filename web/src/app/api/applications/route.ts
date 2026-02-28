import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifySessionCookie } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

type CreateApplicationBody = {
  propertyId?: string;
  message?: string;
};

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    const session = await verifySessionCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateApplicationBody;
    const propertyId = asString(body.propertyId);
    const message = asString(body.message);

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const propertySnap = await adminDb.collection("properties").doc(propertyId).get();
    if (!propertySnap.exists) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const propertyData = propertySnap.data() as Record<string, unknown>;
    const ownerId =
      asString(propertyData.ownerId) ??
      asString(propertyData.owner_id);

    if (!ownerId) {
      return NextResponse.json({ error: "Property owner is missing" }, { status: 400 });
    }

    if (ownerId === session.uid) {
      return NextResponse.json({ error: "You cannot apply to your own property" }, { status: 400 });
    }

    // Best-effort duplicate guard for same tenant/property.
    const existing = await adminDb
      .collection("applications")
      .where("propertyId", "==", propertyId)
      .where("tenantId", "==", session.uid)
      .limit(1)
      .get()
      .catch(() => null);

    if (existing && !existing.empty) {
      return NextResponse.json(
        {
          ok: true,
          alreadyExists: true,
          applicationId: existing.docs[0]?.id
        },
        { status: 200 }
      );
    }

    const docRef = await adminDb.collection("applications").add({
      propertyId,
      tenantId: session.uid,
      ownerId,
      status: "pending",
      message: message ?? "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ ok: true, applicationId: docRef.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create application";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

