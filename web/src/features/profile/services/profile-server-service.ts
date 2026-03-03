import "server-only";
import { FieldPath } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

export type ApplicationRow = {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  propertyLocation?: string;
  tenantId: string;
  ownerId: string;
  message?: string;
  status: string;
  createdAt?: number;
  updatedAt?: number;
  role: "tenant" | "owner";
};

export type ViewingRow = {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  tenantId: string;
  ownerId: string;
  scheduledAt?: number;
  timeSlot?: string;
  viewingType?: string;
  status: string;
  contactName?: string;
  contactEmail?: string;
  createdAt?: number;
};

export type PaymentRow = {
  id: string;
  propertyId?: string;
  propertyTitle?: string;
  tenantId: string;
  ownerId: string;
  amount: number;
  status: string;
  currency?: string;
  dueDate?: string;
  paidAt?: number;
  createdAt?: number;
  role: "tenant" | "owner";
};

export type DocumentRow = {
  id: string;
  userId: string;
  title: string;
  type?: string;
  url?: string;
  createdAt?: number;
};

export type TenantDirectoryRow = {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  applicationsCount: number;
  approvedCount: number;
  lastApplicationAt?: number;
};

type PropertyLite = {
  id: string;
  title?: string;
  location?: string;
};

const MAX_ROWS = 120;

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

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function fetchPropertiesLiteByIds(ids: string[]): Promise<Map<string, PropertyLite>> {
  const adminDb = getAdminDb();
  const unique = Array.from(new Set(ids.filter((id) => id.trim().length > 0)));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) {
    chunks.push(unique.slice(i, i + 10));
  }

  const map = new Map<string, PropertyLite>();
  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      adminDb
        .collection("properties")
        .where(FieldPath.documentId(), "in", chunk)
        .get()
        .catch(() => null)
    )
  );

  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    for (const row of snapshot.docs) {
      const data = row.data() as Record<string, unknown>;
      map.set(row.id, {
        id: row.id,
        title: asString(data.title),
        location: asString(data.location) ?? asString(data.city) ?? asString(data.addressLine1)
      });
    }
  }
  return map;
}

async function fetchUsersByIds(ids: string[]): Promise<Map<string, { name: string; email?: string; phone?: string }>> {
  const adminDb = getAdminDb();
  const unique = Array.from(new Set(ids.filter((id) => id.trim().length > 0)));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) {
    chunks.push(unique.slice(i, i + 10));
  }

  const map = new Map<string, { name: string; email?: string; phone?: string }>();
  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      adminDb
        .collection("users")
        .where(FieldPath.documentId(), "in", chunk)
        .get()
        .catch(() => null)
    )
  );

  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    for (const row of snapshot.docs) {
      const data = row.data() as Record<string, unknown>;
      const first = asString(data.firstName) ?? "";
      const last = asString(data.lastName) ?? "";
      const full = `${first} ${last}`.trim();
      const name =
        full ||
        asString(data.name) ||
        asString(data.displayName) ||
        asString(data.email) ||
        `User ${row.id.slice(0, 6)}`;
      map.set(row.id, {
        name,
        email: asString(data.email),
        phone: asString(data.phone)
      });
    }
  }

  return map;
}

export async function getUserRole(uid: string): Promise<"owner" | "tenant" | "unknown"> {
  if (!uid) return "unknown";
  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection("users").doc(uid).get().catch(() => null);
  if (!userSnap?.exists) return "unknown";
  const data = userSnap.data() as Record<string, unknown>;
  const role = asString(data.role)?.toLowerCase();
  if (role === "owner" || role === "tenant") return role;
  return "unknown";
}

export async function getApplicationsForUser(uid: string): Promise<ApplicationRow[]> {
  if (!uid) return [];
  const adminDb = getAdminDb();

  const [tenantSnap, ownerSnap] = await Promise.all([
    adminDb.collection("applications").where("tenantId", "==", uid).limit(MAX_ROWS).get().catch(() => null),
    adminDb.collection("applications").where("ownerId", "==", uid).limit(MAX_ROWS).get().catch(() => null)
  ]);

  const merged = new Map<string, ApplicationRow>();

  const pushRows = (
    snapshot: FirebaseFirestore.QuerySnapshot | null,
    role: "tenant" | "owner"
  ) => {
    if (!snapshot) return;
    for (const row of snapshot.docs) {
      const data = row.data() as Record<string, unknown>;
      merged.set(row.id, {
        id: row.id,
        propertyId: asString(data.propertyId) ?? "",
        tenantId: asString(data.tenantId) ?? "",
        ownerId: asString(data.ownerId) ?? "",
        message: asString(data.message),
        status: asString(data.status) ?? "pending",
        createdAt: mapTimestamp(data.createdAt ?? data.created_at),
        updatedAt: mapTimestamp(data.updatedAt ?? data.updated_at),
        role
      });
    }
  };

  pushRows(tenantSnap, "tenant");
  pushRows(ownerSnap, "owner");

  const rows = Array.from(merged.values());
  const propertyMap = await fetchPropertiesLiteByIds(rows.map((item) => item.propertyId));

  return rows
    .map((item) => {
      const property = propertyMap.get(item.propertyId);
      return {
        ...item,
        propertyTitle: property?.title,
        propertyLocation: property?.location
      };
    })
    .sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0));
}

export async function getViewingsForUser(uid: string): Promise<ViewingRow[]> {
  if (!uid) return [];
  const adminDb = getAdminDb();

  const [tenantSnap, ownerSnap] = await Promise.all([
    adminDb.collection("viewings").where("tenantId", "==", uid).limit(MAX_ROWS).get().catch(() => null),
    adminDb.collection("viewings").where("ownerId", "==", uid).limit(MAX_ROWS).get().catch(() => null)
  ]);

  const map = new Map<string, ViewingRow>();
  const addRows = (snapshot: FirebaseFirestore.QuerySnapshot | null) => {
    if (!snapshot) return;
    for (const row of snapshot.docs) {
      const data = row.data() as Record<string, unknown>;
      map.set(row.id, {
        id: row.id,
        propertyId: asString(data.propertyId) ?? "",
        tenantId: asString(data.tenantId) ?? "",
        ownerId: asString(data.ownerId) ?? "",
        scheduledAt: mapTimestamp(data.scheduledAt ?? data.scheduled_at),
        timeSlot: asString(data.timeSlot),
        viewingType: asString(data.viewingType),
        status: asString(data.status) ?? "pending",
        contactName: asString(data.contactName),
        contactEmail: asString(data.contactEmail),
        createdAt: mapTimestamp(data.createdAt ?? data.created_at)
      });
    }
  };

  addRows(tenantSnap);
  addRows(ownerSnap);

  const rows = Array.from(map.values());
  const propertyMap = await fetchPropertiesLiteByIds(rows.map((item) => item.propertyId));
  return rows
    .map((item) => ({
      ...item,
      propertyTitle: propertyMap.get(item.propertyId)?.title
    }))
    .sort((a, b) => (b.scheduledAt ?? b.createdAt ?? 0) - (a.scheduledAt ?? a.createdAt ?? 0));
}

export async function getPaymentsForUser(uid: string): Promise<PaymentRow[]> {
  if (!uid) return [];
  const adminDb = getAdminDb();

  const [tenantSnap, ownerSnap] = await Promise.all([
    adminDb.collection("payments").where("tenantId", "==", uid).limit(MAX_ROWS).get().catch(() => null),
    adminDb.collection("payments").where("ownerId", "==", uid).limit(MAX_ROWS).get().catch(() => null)
  ]);

  const map = new Map<string, PaymentRow>();
  const addRows = (snapshot: FirebaseFirestore.QuerySnapshot | null, role: "tenant" | "owner") => {
    if (!snapshot) return;
    for (const row of snapshot.docs) {
      const data = row.data() as Record<string, unknown>;
      map.set(row.id, {
        id: row.id,
        propertyId: asString(data.propertyId),
        tenantId: asString(data.tenantId) ?? "",
        ownerId: asString(data.ownerId) ?? "",
        amount: asNumber(data.amount) ?? 0,
        status: asString(data.status) ?? "pending",
        currency: asString(data.currency) ?? "KES",
        dueDate: asString(data.dueDate),
        paidAt: mapTimestamp(data.paidAt ?? data.paid_at),
        createdAt: mapTimestamp(data.createdAt ?? data.created_at),
        role
      });
    }
  };

  addRows(tenantSnap, "tenant");
  addRows(ownerSnap, "owner");

  const rows = Array.from(map.values());
  const propertyMap = await fetchPropertiesLiteByIds(
    rows.map((item) => item.propertyId ?? "").filter((item) => item.length > 0)
  );

  return rows
    .map((item) => ({
      ...item,
      propertyTitle: item.propertyId ? propertyMap.get(item.propertyId)?.title : undefined
    }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function getDocumentsForUser(uid: string): Promise<DocumentRow[]> {
  if (!uid) return [];
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("documents")
    .where("userId", "==", uid)
    .limit(MAX_ROWS)
    .get()
    .catch(() => null);

  if (!snapshot) return [];
  return snapshot.docs
    .map((row) => {
      const data = row.data() as Record<string, unknown>;
      return {
        id: row.id,
        userId: asString(data.userId) ?? uid,
        title: asString(data.title) ?? "Untitled document",
        type: asString(data.type),
        url: asString(data.url),
        createdAt: mapTimestamp(data.createdAt ?? data.created_at)
      };
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function getTenantDirectoryForOwner(ownerId: string): Promise<TenantDirectoryRow[]> {
  if (!ownerId) return [];
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("applications")
    .where("ownerId", "==", ownerId)
    .limit(MAX_ROWS)
    .get()
    .catch(() => null);

  if (!snapshot) return [];

  const counts = new Map<
    string,
    { applicationsCount: number; approvedCount: number; lastApplicationAt?: number }
  >();

  for (const row of snapshot.docs) {
    const data = row.data() as Record<string, unknown>;
    const tenantId = asString(data.tenantId);
    if (!tenantId) continue;
    const status = asString(data.status) ?? "pending";
    const at = mapTimestamp(data.updatedAt ?? data.updated_at ?? data.createdAt ?? data.created_at);
    const prev = counts.get(tenantId) ?? { applicationsCount: 0, approvedCount: 0 };
    counts.set(tenantId, {
      applicationsCount: prev.applicationsCount + 1,
      approvedCount: prev.approvedCount + (status === "approved" ? 1 : 0),
      lastApplicationAt: Math.max(prev.lastApplicationAt ?? 0, at ?? 0) || prev.lastApplicationAt
    });
  }

  const userMap = await fetchUsersByIds(Array.from(counts.keys()));
  return Array.from(counts.entries())
    .map(([uid, stats]) => {
      const user = userMap.get(uid);
      return {
        uid,
        name: user?.name ?? `User ${uid.slice(0, 6)}`,
        email: user?.email,
        phone: user?.phone,
        applicationsCount: stats.applicationsCount,
        approvedCount: stats.approvedCount,
        lastApplicationAt: stats.lastApplicationAt
      };
    })
    .sort((a, b) => (b.lastApplicationAt ?? 0) - (a.lastApplicationAt ?? 0));
}

