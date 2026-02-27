import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  CollectionReference,
  where,
  DocumentData
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Conversation } from "@/features/chat/types/chat";

const CONVERSATIONS_COLLECTION = "conversations";
const DEFAULT_PAGE_SIZE = 20;
const MAX_FETCH = 250;

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

function mapMessagePreview(data: Record<string, unknown>): string | undefined {
  const text =
    data.content ??
    data.text ??
    data.message ??
    data.body ??
    data.lastMessageText ??
    data.last_message_text;

  if (typeof text === "string" && text.trim().length > 0) {
    return text.trim();
  }

  const messageType = String(data.message_type ?? data.messageType ?? "").toLowerCase();
  if (messageType === "audio" || messageType === "voice") return "Voice message";
  if (messageType === "image") return "Image";
  if (messageType === "file") return "File";
  if (messageType === "location") return "Location";

  if (Array.isArray(data.media) && data.media.length > 0) {
    return "Media message";
  }
  if (typeof data.attachment_url === "string" && data.attachment_url.length > 0) {
    return "Attachment";
  }

  return undefined;
}

async function fetchLatestMessagePreview(
  conversationId: string
): Promise<{ text?: string; lastMessageAt?: number }> {
  const messagesSubRef = collection(
    db,
    CONVERSATIONS_COLLECTION,
    conversationId,
    "messages"
  ) as CollectionReference<DocumentData>;

  const candidates = [
    query(messagesSubRef, limit(1))
  ];

  for (const candidate of candidates) {
    try {
      const snapshot = await getDocs(candidate);
      if (snapshot.empty) continue;

      const row = snapshot.docs[0]?.data() as Record<string, unknown> | undefined;
      if (!row) continue;

      return {
        text: mapMessagePreview(row),
        lastMessageAt: mapTimestamp(
          row.created_at ?? row.createdAt ?? row.sentAt ?? row.timestamp
        )
      };
    } catch {
      // Try next query shape.
    }
  }

  return {};
}

function mapConversation(
  docId: string,
  data: Record<string, unknown>
): Conversation {
  const participantIds = Array.isArray(data.participantIds)
    ? data.participantIds.map((id) => String(id))
    : Array.isArray(data.participants)
      ? data.participants.map((id) => String(id))
      : [data.participant1_id, data.participant2_id]
          .filter((id): id is string => typeof id === "string" && id.length > 0);
  const lastMessageAt = mapTimestamp(data.lastMessageAt ?? data.last_message_at);
  const updatedAt =
    mapTimestamp(data.updatedAt ?? data.updated_at) ??
    lastMessageAt ??
    mapTimestamp(data.createdAt ?? data.created_at);

  const lastMessageTextRaw =
    data.lastMessageText ??
    data.last_message_text ??
    data.lastMessage ??
    data.last_message ??
    data.lastMessageContent ??
    data.last_message_content;

  return {
    id: docId,
    participantIds,
    propertyId:
      typeof data.propertyId === "string"
        ? data.propertyId
        : typeof data.property_id === "string"
          ? data.property_id
          : undefined,
    lastMessageText: lastMessageTextRaw ? String(lastMessageTextRaw) : undefined,
    lastMessageAt,
    unreadCountByUser: data.unreadCountByUser as Record<string, number> | undefined,
    updatedAt
  };
}

function buildParticipantIdsQuery(userId: string, pageSize = MAX_FETCH) {
  return query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("participantIds", "array-contains", userId),
    limit(pageSize)
  );
}

function buildParticipantsQuery(userId: string, pageSize = MAX_FETCH) {
  return query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("participants", "array-contains", userId),
    limit(pageSize)
  );
}

function buildParticipant1Query(userId: string, pageSize = MAX_FETCH) {
  return query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("participant1_id", "==", userId),
    limit(pageSize)
  );
}

function buildParticipant2Query(userId: string, pageSize = MAX_FETCH) {
  return query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("participant2_id", "==", userId),
    limit(pageSize)
  );
}

function sortConversations(items: Conversation[]): Conversation[] {
  return [...items].sort((a, b) => (b.updatedAt ?? b.lastMessageAt ?? 0) - (a.updatedAt ?? a.lastMessageAt ?? 0));
}

function mergeAndSort(...groups: Conversation[][]): Conversation[] {
  const merged = new Map<string, Conversation>();
  for (const group of groups) {
    for (const item of group) {
      const existing = merged.get(item.id);
      if (!existing || (item.updatedAt ?? item.lastMessageAt ?? 0) >= (existing.updatedAt ?? existing.lastMessageAt ?? 0)) {
        merged.set(item.id, item);
      }
    }
  }

  return sortConversations(Array.from(merged.values()));
}

async function fetchAllUserConversations(userId: string): Promise<Conversation[]> {
  const queries = [
    buildParticipantIdsQuery(userId, MAX_FETCH),
    buildParticipantsQuery(userId, MAX_FETCH),
    buildParticipant1Query(userId, MAX_FETCH),
    buildParticipant2Query(userId, MAX_FETCH)
  ];

  const snapshots = await Promise.all(
    queries.map(async (q) => {
      try {
        return await getDocs(q);
      } catch {
        return null;
      }
    })
  );

  const groups: Conversation[][] = [];
  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    groups.push(
      snapshot.docs.map((docSnap) => mapConversation(docSnap.id, docSnap.data() as Record<string, unknown>))
    );
  }

  return mergeAndSort(...groups);
}

export type ConversationsPage = {
  items: Conversation[];
  hasMore: boolean;
};

export function subscribeToConversations(
  userId: string,
  pageSize: number,
  callback: (data: ConversationsPage) => void,
  onError?: (error: Error) => void
) {
  const normalizedPageSize = Math.max(1, pageSize || DEFAULT_PAGE_SIZE);

  let participant1Items: Conversation[] = [];
  let participant2Items: Conversation[] = [];
  let modernItems: Conversation[] = [];
  let watchedFailures = 0;
  let isActive = true;
  let enrichRunId = 0;
  const previewCache = new Map<string, { stamp: number; text?: string; lastMessageAt?: number }>();

  const emit = () => {
    if (!isActive) return;
    const merged = mergeAndSort(participant1Items, participant2Items, modernItems);
    const sliced = merged.slice(0, normalizedPageSize);

    callback({
      items: sliced,
      hasMore: merged.length > normalizedPageSize
    });

    const missingPreview = sliced.filter((item) => !item.lastMessageText).slice(0, 8);
    if (missingPreview.length === 0) return;

    const runId = ++enrichRunId;
    void Promise.all(
      missingPreview.map(async (item) => {
        const stamp = item.updatedAt ?? item.lastMessageAt ?? 0;
        const cached = previewCache.get(item.id);
        if (cached && cached.stamp === stamp) {
          return { id: item.id, text: cached.text, lastMessageAt: cached.lastMessageAt };
        }

        const preview = await fetchLatestMessagePreview(item.id);
        previewCache.set(item.id, {
          stamp,
          text: preview.text,
          lastMessageAt: preview.lastMessageAt
        });
        return { id: item.id, text: preview.text, lastMessageAt: preview.lastMessageAt };
      })
    ).then((updates) => {
      if (!isActive || runId !== enrichRunId) return;
      const updateMap = new Map(updates.map((item) => [item.id, item]));
      const enriched = sliced.map((item) => {
        const update = updateMap.get(item.id);
        if (!update) return item;
        return {
          ...item,
          lastMessageText: item.lastMessageText ?? update.text,
          lastMessageAt: item.lastMessageAt ?? update.lastMessageAt,
          updatedAt: item.updatedAt ?? update.lastMessageAt
        };
      });

      callback({
        items: enriched,
        hasMore: merged.length > normalizedPageSize
      });
    }).catch(() => {
      // keep base list
    });
  };

  const handleWatchError = (error: Error) => {
    watchedFailures += 1;
    if (watchedFailures >= 2) {
      onError?.(error);
    }
  };

  const unsubParticipant1 = onSnapshot(
    buildParticipant1Query(userId, MAX_FETCH),
    (snapshot) => {
      participant1Items = snapshot.docs.map((docSnap) =>
        mapConversation(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      emit();
    },
    handleWatchError
  );

  const unsubParticipant2 = onSnapshot(
    buildParticipant2Query(userId, MAX_FETCH),
    (snapshot) => {
      participant2Items = snapshot.docs.map((docSnap) =>
        mapConversation(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      emit();
    },
    handleWatchError
  );

  // Best-effort read for newer conversation formats.
  void Promise.all([
    getDocs(buildParticipantIdsQuery(userId, MAX_FETCH)).catch(() => null),
    getDocs(buildParticipantsQuery(userId, MAX_FETCH)).catch(() => null)
  ]).then((snapshots) => {
    if (!isActive) return;

    modernItems = snapshots
      .filter((snapshot): snapshot is NonNullable<typeof snapshot> => !!snapshot)
      .flatMap((snapshot) =>
        snapshot.docs.map((docSnap) => mapConversation(docSnap.id, docSnap.data() as Record<string, unknown>))
      );

    emit();
  });

  return () => {
    isActive = false;
    unsubParticipant1();
    unsubParticipant2();
  };
}

export async function getMoreConversations(
  userId: string,
  loadedCount: number,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<ConversationsPage> {
  const all = await fetchAllUserConversations(userId);
  const nextItems = all.slice(loadedCount, loadedCount + pageSize);
  return {
    items: nextItems,
    hasMore: all.length > loadedCount + nextItems.length
  };
}
