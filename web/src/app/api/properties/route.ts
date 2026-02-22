import { NextResponse } from "next/server";
import { getPropertiesServer } from "@/features/properties/services/property-server-service";

type QueryParams = {
  ownerId?: string;
  limit?: number;
  cursorCreatedAt?: number;
};

function parseParams(url: string): QueryParams {
  const { searchParams } = new URL(url);
  const ownerId = searchParams.get("ownerId") ?? undefined;
  const limitRaw = Number(searchParams.get("limit") ?? "24");
  const cursorRaw = Number(searchParams.get("cursorCreatedAt") ?? "0");

  return {
    ownerId,
    limit: Number.isFinite(limitRaw) ? limitRaw : 24,
    cursorCreatedAt: cursorRaw > 0 ? cursorRaw : undefined
  };
}

export async function GET(request: Request) {
  try {
    const params = parseParams(request.url);
    const properties = await getPropertiesServer({
      max: params.limit,
      ownerId: params.ownerId,
      cursorCreatedAt: params.cursorCreatedAt
    });
    return NextResponse.json({ properties });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch properties";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

