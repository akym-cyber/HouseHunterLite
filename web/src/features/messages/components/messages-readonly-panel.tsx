"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/features/auth/store/use-auth-store";
import { MobileFeaturePrompt } from "@/components/common/mobile-feature-prompt";

type MessagesReadonlyPanelProps = {
  userId: string;
};

type ConversationPreview = {
  id: string;
  participantIds: string[];
  updatedAt?: number;
  lastMessageText?: string;
};

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

function mapConversation(docId: string, data: Record<string, unknown>): ConversationPreview {
  const participantIds = Array.isArray(data.participantIds)
    ? data.participantIds.map((id) => String(id))
    : Array.isArray(data.participants)
      ? data.participants.map((id) => String(id))
      : [data.participant1_id, data.participant2_id]
          .filter((id): id is string => typeof id === "string" && id.length > 0);

  const lastMessageText = [
    data.lastMessageText,
    data.last_message_text,
    data.lastMessage,
    data.last_message
  ].find((value) => typeof value === "string" && value.trim().length > 0) as string | undefined;

  return {
    id: docId,
    participantIds: Array.from(new Set(participantIds)),
    updatedAt: mapTimestamp(data.updatedAt ?? data.updated_at ?? data.lastMessageAt ?? data.last_message_at),
    lastMessageText
  };
}

async function fetchConversationPreviews(userId: string): Promise<ConversationPreview[]> {
  const ref = collection(db, "conversations");
  const qList = [
    query(ref, where("participantIds", "array-contains", userId), limit(80)),
    query(ref, where("participants", "array-contains", userId), limit(80)),
    query(ref, where("participant1_id", "==", userId), limit(80)),
    query(ref, where("participant2_id", "==", userId), limit(80))
  ];

  const snapshots = await Promise.all(
    qList.map(async (q) => {
      try {
        return await getDocs(q);
      } catch {
        return null;
      }
    })
  );

  const merged = new Map<string, ConversationPreview>();
  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    for (const row of snapshot.docs) {
      const mapped = mapConversation(row.id, row.data() as Record<string, unknown>);
      const existing = merged.get(mapped.id);
      if (!existing || (mapped.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
        merged.set(mapped.id, mapped);
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

async function fetchUserLabel(uid: string): Promise<string> {
  const direct = await getDoc(doc(db, "users", uid)).catch(() => null);
  if (direct?.exists()) {
    const data = direct.data() as Record<string, unknown>;
    const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
    const lastName = typeof data.lastName === "string" ? data.lastName.trim() : "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    if (typeof data.name === "string" && data.name.trim()) return data.name.trim();
  }

  const fallback = await getDocs(query(collection(db, "users"), where("uid", "==", uid), limit(1))).catch(
    () => null
  );
  if (!fallback || fallback.empty) return `User ${uid.slice(0, 6)}`;
  const data = fallback.docs[0].data() as Record<string, unknown>;
  const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
  const lastName = typeof data.lastName === "string" ? data.lastName.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  if (typeof data.name === "string" && data.name.trim()) return data.name.trim();
  return `User ${uid.slice(0, 6)}`;
}

function formatUpdated(value?: number): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export function MessagesReadonlyPanel({ userId }: MessagesReadonlyPanelProps) {
  const authUser = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const effectiveUserId = authUser?.uid;
  const canQuery = isHydrated && !!effectiveUserId;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ConversationPreview[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canQuery || !effectiveUserId) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    void fetchConversationPreviews(effectiveUserId)
      .then(async (rows) => {
        if (cancelled) return;
        setItems(rows);

        const otherUids = Array.from(
          new Set(
            rows
              .map((row) => row.participantIds.find((uid) => uid !== effectiveUserId))
              .filter((uid): uid is string => !!uid)
          )
        );

        const loaded = await Promise.all(
          otherUids.map(async (uid) => [uid, await fetchUserLabel(uid)] as const)
        );

        if (cancelled) return;
        setLabels((prev) => {
          const next = { ...prev };
          for (const [uid, label] of loaded) next[uid] = label;
          return next;
        });
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load messages.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canQuery, effectiveUserId]);

  const rows = useMemo(() => {
    if (!effectiveUserId) return items;
    return items;
  }, [items, effectiveUserId]);

  if (!isHydrated) return <p className="text-sm text-slate-500">Checking session...</p>;
  if (!canQuery) return <p className="text-sm text-slate-500">Syncing secure chat session...</p>;
  if (isLoading) return <p className="text-sm text-slate-500">Loading messages...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <MobileFeaturePrompt
        feature="Messaging"
        message="Web shows your conversation history. Replying and real-time chat are available in the mobile app."
      />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
          No conversations yet.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((item) => {
            const otherUid = item.participantIds.find((uid) => uid !== effectiveUserId);
            return (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">
                  {otherUid ? (labels[otherUid] ?? `User ${otherUid.slice(0, 6)}`) : "Conversation"}
                </p>
                <p className="mt-1 text-sm text-slate-600">{item.lastMessageText ?? "No message yet"}</p>
                <p className="mt-2 text-xs text-slate-500">Updated: {formatUpdated(item.updatedAt)}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

