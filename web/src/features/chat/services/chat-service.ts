import {
  DocumentData,
  QueryDocumentSnapshot,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  CollectionReference,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Conversation } from "@/features/chat/types/chat";

const CONVERSATIONS_COLLECTION = "conversations";
const DEFAULT_PAGE_SIZE = 20;

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
    query(messagesSubRef, orderBy("created_at", "desc"), limit(1)),
    query(messagesSubRef, orderBy("createdAt", "desc"), limit(1)),
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
    lastMessageText: lastMessageTextRaw ? String(lastMessageTextRaw) : undefined,
    lastMessageAt,
    unreadCountByUser: data.unreadCountByUser as Record<string, number> | undefined,
    updatedAt
  };
}

function buildParticipantIdsQuery(userId: string, pageSize = DEFAULT_PAGE_SIZE) {
  return query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("participantIds", "array-contains", userId),
    limit(pageSize)
  );
}

function buildParticipantsQuery(userId: string, pageSize = DEFAULT_PAGE_SIZE) {
  return query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("participants", "array-contains", userId),
    limit(pageSize)
  );
}

function buildParticipant1Query(userId: string, pageSize = DEFAULT_PAGE_SIZE) {
  return query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("participant1_id", "==", userId),
    limit(pageSize)
  );
}

function buildParticipant2Query(userId: string, pageSize = DEFAULT_PAGE_SIZE) {
  return query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("participant2_id", "==", userId),
    limit(pageSize)
  );
}

function sortConversations(items: Conversation[]): Conversation[] {
  return [...items].sort((a, b) => (b.updatedAt ?? b.lastMessageAt ?? 0) - (a.updatedAt ?? a.lastMessageAt ?? 0));
}

export type ConversationsPage = {
  items: Conversation[];
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
};

export function subscribeToConversations(
  userId: string,
  pageSize: number,
  callback: (data: ConversationsPage) => void,
  onError?: (error: Error) => void
) {
  const participant1Query = buildParticipant1Query(userId, pageSize);
  const participant2Query = buildParticipant2Query(userId, pageSize);

  let participant1Items: Conversation[] = [];
  let participant2Items: Conversation[] = [];
  let modernItems: Conversation[] = [];
  let watchedFailures = 0;
  let isActive = true;
  let enrichRunId = 0;
  const previewCache = new Map<string, { stamp: number; text?: string; lastMessageAt?: number }>();

  const enrichAndEmit = async (baseItems: Conversation[]) => {
    const missingPreview = baseItems.filter((item) => !item.lastMessageText).slice(0, 8);
    if (missingPreview.length === 0) return;

    const runId = ++enrichRunId;
    const updates = await Promise.all(
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
    );

    if (!isActive || runId !== enrichRunId) return;
    const updateMap = new Map(updates.map((item) => [item.id, item]));

    const enriched = baseItems.map((item) => {
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
      items: sortConversations(enriched),
      lastDoc: undefined
    });
  };

  const emit = () => {
    if (!isActive) return;
    const map = new Map<string, Conversation>();
    for (const item of [...participant1Items, ...participant2Items, ...modernItems]) {
      map.set(item.id, item);
    }
    const merged = sortConversations(Array.from(map.values()));
    callback({
      items: merged,
      lastDoc: undefined
    });
    void enrichAndEmit(merged);
  };

  // Best-effort read for newer conversation formats.
  void getDocs(buildParticipantIdsQuery(userId, pageSize))
    .then((snapshot) => {
      if (!isActive) return;
      modernItems = [
        ...modernItems,
        ...snapshot.docs.map((docSnap) =>
          mapConversation(docSnap.id, docSnap.data() as Record<string, unknown>)
        )
      ];
      emit();
    })
    .catch(() => {
      // ignore; dataset may be legacy-only
    });

  void getDocs(buildParticipantsQuery(userId, pageSize))
    .then((snapshot) => {
      if (!isActive) return;
      modernItems = [
        ...modernItems,
        ...snapshot.docs.map((docSnap) =>
          mapConversation(docSnap.id, docSnap.data() as Record<string, unknown>)
        )
      ];
      emit();
    })
    .catch(() => {
      // ignore; dataset may not include participants array
    });

  const handleWatchError = (error: Error) => {
    watchedFailures += 1;
    if (watchedFailures >= 2) {
      onError?.(error);
    }
  };

  const unsubParticipant1 = onSnapshot(
    participant1Query,
    (snapshot) => {
      participant1Items = snapshot.docs.map((docSnap) =>
        mapConversation(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      emit();
    },
    (error) => {
      handleWatchError(error);
    }
  );

  const unsubParticipant2 = onSnapshot(
    participant2Query,
    (snapshot) => {
      participant2Items = snapshot.docs.map((docSnap) =>
        mapConversation(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      emit();
    },
    (error) => {
      handleWatchError(error);
    }
  );

  return () => {
    isActive = false;
    unsubParticipant1();
    unsubParticipant2();
  };
}

export async function getMoreConversations(
  userId: string,
  afterDoc: QueryDocumentSnapshot<DocumentData>,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<ConversationsPage> {
  void userId;
  void afterDoc;
  void pageSize;
  // Multi-shape conversation support currently uses live merged snapshots.
  // Pagination is intentionally disabled to avoid inconsistent cursors.
  return { items: [], lastDoc: undefined };
}
