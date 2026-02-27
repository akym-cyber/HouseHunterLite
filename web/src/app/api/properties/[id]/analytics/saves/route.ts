import { NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/auth/session";
import { incrementPropertySavesServer } from "@/features/properties/services/property-server-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const session = await verifySessionCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await incrementPropertySavesServer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to track property save";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
