"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  DocumentData,
  limit,
  onSnapshot,
  orderBy,
  query as buildFsQuery,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/store/use-auth-store";
import { useConversations } from "@/features/chat/hooks/use-conversations";
import { db } from "@/lib/firebase/client";

type ChatWorkspaceProps = {
  userId: string;
};

type FilterMode = "all" | "unread";

type UserProfile = {
  label: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeenAt?: number;
};

type ConversationRow = {
  item: ReturnType<typeof buildConversationRowItem>;
  unread: number;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt?: number;
  status?: string;
  isRead?: boolean;
};

function buildConversationRowItem(
  base: {
    id: string;
    participantIds: string[];
    lastMessageText?: string;
    lastMessageAt?: number;
    updatedAt?: number;
    unreadCountByUser?: Record<string, number>;
  },
  mergedUnread: number,
  sourceIds: string[]
) {
  return {
    ...base,
    mergedUnread,
    sourceIds
  };
}

function formatChatTime(value?: number): string {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString();
}

function formatBubbleTime(value?: number): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateSeparatorLabel(value?: number): string {
  if (!value) return "Today";

  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function mapMessagePreviewLabel(messageType: string): string {
  const kind = messageType.toLowerCase();
  if (kind === "image") return "Image";
  if (kind === "audio" || kind === "voice") return "Voice message";
  if (kind === "file" || kind === "document") return "Document";
  if (kind === "location") return "Location";
  return "Message";
}

function getStatusRank(status?: string): number {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "failed") return 5;
  if (normalized === "read") return 4;
  if (normalized === "delivered") return 3;
  if (normalized === "sent" || normalized === "") return 2;
  if (normalized === "sending") return 1;
  return 0;
}

function mergeDuplicateMessage(a: ChatMessage, b: ChatMessage): ChatMessage {
  const statusA = getStatusRank(a.status);
  const statusB = getStatusRank(b.status);
  const keepStatus = statusB >= statusA ? b.status : a.status;

  return {
    ...a,
    ...b,
    content: b.content?.trim() ? b.content : a.content,
    messageType: b.messageType || a.messageType,
    createdAt: Math.max(a.createdAt ?? 0, b.createdAt ?? 0) || a.createdAt || b.createdAt,
    isRead: !!a.isRead || !!b.isRead,
    status: (!!a.isRead || !!b.isRead) ? "read" : keepStatus
  };
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M6.6 10.8a15.8 15.8 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.08.36 2.24.56 3.42.56a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.6 21 3 13.4 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.18.2 2.34.56 3.42a1 1 0 0 1-.24 1l-2.22 2.38Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M15 8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V8Zm0 3 5-3v8l-5-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function pickUserDisplayName(userData: Record<string, unknown>, fallbackUid: string): string {
  const firstName = typeof userData.firstName === "string" ? userData.firstName.trim() : "";
  const lastName = typeof userData.lastName === "string" ? userData.lastName.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;

  if (typeof userData.name === "string" && userData.name.trim()) return userData.name.trim();
  if (typeof userData.displayName === "string" && userData.displayName.trim()) return userData.displayName.trim();
  if (typeof userData.email === "string" && userData.email.trim()) return userData.email.trim();

  return `User ${fallbackUid.slice(0, 6)}`;
}

function pickUserAvatar(userData: Record<string, unknown>): string | undefined {
  const candidates = [
    userData.avatarUrl,
    userData.photoURL,
    userData.photoUrl,
    userData.avatar
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function mapTimestamp(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof value === "object" && "seconds" in value) {
    const withSeconds = value as { seconds?: number };
    if (typeof withSeconds.seconds === "number") {
      return withSeconds.seconds * 1000;
    }
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function mapChatMessage(
  docId: string,
  data: Record<string, unknown>,
  fallbackConversationId: string
): ChatMessage {
  const contentRaw = data.content ?? data.text ?? data.body ?? data.message ?? "";
  const messageTypeRaw = data.message_type ?? data.messageType ?? "text";
  const normalizedStatus =
    typeof data.status === "string" ? data.status.toLowerCase() : undefined;
  const senderId = String(data.sender_id ?? data.senderId ?? "");
  const explicitIsRead = toBoolean(
    data.is_read ?? data.isRead ?? data.read ?? data.seen ?? data.seenByRecipient
  );
  const readBy = toStringArray(
    data.read_by ?? data.readBy ?? data.read_by_user_ids ?? data.readByUserIds
  );
  const deliveredTo = toStringArray(
    data.delivered_to ?? data.deliveredTo ?? data.delivered_to_user_ids ?? data.deliveredToUserIds
  );
  const hasReadByOther = readBy.some((uid) => uid !== senderId);
  const hasDeliveredToOther = deliveredTo.some((uid) => uid !== senderId);
  const hasReadAt = mapTimestamp(data.read_at ?? data.readAt) !== undefined;
  const hasDeliveredAt = mapTimestamp(data.delivered_at ?? data.deliveredAt) !== undefined;
  const deliveredFlag = toBoolean(data.delivered) === true;
  const resolvedIsRead =
    !!explicitIsRead || normalizedStatus === "read" || hasReadByOther || hasReadAt;
  let resolvedStatus = normalizedStatus;

  if (resolvedIsRead) {
    resolvedStatus = "read";
  } else if (
    (!resolvedStatus || resolvedStatus === "sent") &&
    (hasDeliveredToOther || hasDeliveredAt || deliveredFlag)
  ) {
    resolvedStatus = "delivered";
  }

  return {
    id: docId,
    conversationId: String(data.conversation_id ?? data.conversationId ?? fallbackConversationId),
    senderId,
    content: typeof contentRaw === "string" ? contentRaw : "",
    messageType: typeof messageTypeRaw === "string" ? messageTypeRaw : "text",
    createdAt: mapTimestamp(
      data.created_at ?? data.createdAt ?? data.sentAt ?? data.timestamp
    ),
    status: resolvedStatus,
    // Mobile-compatible read detection (is_read first, legacy status fallback).
    isRead: resolvedIsRead
  };
}

function getMessageStatusTick(
  message: ChatMessage,
  currentUserId: string | undefined
): { icon: string; className: string } | null {
  if (!currentUserId || message.senderId !== currentUserId) return null;

  if (message.status === "failed") {
    return { icon: "!", className: "text-red-400" };
  }
  if (message.status === "sending") {
    return { icon: "...", className: "text-slate-300" };
  }
  if (message.status === "read" || message.isRead) {
    return { icon: "✓✓", className: "text-sky-400" };
  }
  if (message.status === "delivered") {
    return { icon: "✓✓", className: "text-slate-300" };
  }

  return { icon: "✓", className: "text-slate-300" };
}

function getMessageStatusMeta(
  message: ChatMessage,
  currentUserId: string | undefined
): { icon: string; className: string } | null {
  if (!currentUserId || message.senderId !== currentUserId) return null;

  // Mirror mobile ChatBubble.getStatusDisplay precedence.
  const status = (message.status ?? "").toLowerCase();

  if (status === "sending") return { icon: "\u23F3", className: "text-brand-100" };
  if (status === "failed") return { icon: "\u274C", className: "text-red-200" };
  if (message.isRead || status === "read") return { icon: "\u2713\u2713", className: "text-amber-300" };
  if (status === "sent" || !status) return { icon: "\u2713", className: "text-brand-100" };
  if (status === "delivered") return { icon: "\u2713\u2713", className: "text-brand-100" };

  return { icon: "\u2713", className: "text-brand-100" };
}

function resolveOnlineFlag(data: Record<string, unknown>): boolean | undefined {
  const directCandidates = [
    data.isOnline,
    data.is_online,
    data.online,
    data.active
  ];

  for (const candidate of directCandidates) {
    const resolved = toBoolean(candidate);
    if (typeof resolved === "boolean") return resolved;
  }

  const presence = data.presence;
  if (presence && typeof presence === "object") {
    const normalizedPresence = presence as Record<string, unknown>;
    for (const candidate of [
      normalizedPresence.isOnline,
      normalizedPresence.is_online,
      normalizedPresence.online
    ]) {
      const resolved = toBoolean(candidate);
      if (typeof resolved === "boolean") return resolved;
    }
  }

  return undefined;
}

function mapUserProfile(data: Record<string, unknown>, uid: string): UserProfile {
  const presence = data.presence && typeof data.presence === "object"
    ? (data.presence as Record<string, unknown>)
    : undefined;

  return {
    label: pickUserDisplayName(data, uid),
    avatarUrl: pickUserAvatar(data),
    isOnline: resolveOnlineFlag(data),
    lastSeenAt: mapTimestamp(
      data.lastSeenAt ??
        data.last_seen_at ??
        data.lastSeen ??
        data.last_seen ??
        data.lastActiveAt ??
        data.last_active_at ??
        presence?.lastSeenAt ??
        presence?.last_seen_at ??
        presence?.lastSeen ??
        presence?.last_seen
    )
  };
}

function resolveOtherParticipantId(participantIds: string[], currentUserId: string | undefined): string | null {
  if (participantIds.length === 0) return null;
  if (!currentUserId) return participantIds[0] ?? null;
  const other = participantIds.find((id) => id !== currentUserId);
  return other ?? participantIds[0] ?? null;
}

function extractConversationParticipantIds(data: Record<string, unknown>): string[] {
  const fromParticipantIds = toStringArray(data.participantIds);
  if (fromParticipantIds.length > 0) return fromParticipantIds;

  const fromParticipants = toStringArray(data.participants);
  if (fromParticipants.length > 0) return fromParticipants;

  return [data.participant1_id, data.participant2_id]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

async function findExistingConversationIdForUsers(
  currentUserId: string,
  recipientId: string
): Promise<string | null> {
  const conversationsRef = collection(db, "conversations");
  const twoPartyCandidates = [
    buildFsQuery(
      conversationsRef,
      where("participant1_id", "==", currentUserId),
      where("participant2_id", "==", recipientId),
      limit(1)
    ),
    buildFsQuery(
      conversationsRef,
      where("participant1_id", "==", recipientId),
      where("participant2_id", "==", currentUserId),
      limit(1)
    )
  ];

  for (const candidate of twoPartyCandidates) {
    try {
      const snapshot = await getDocs(candidate);
      if (!snapshot.empty) {
        return snapshot.docs[0]?.id ?? null;
      }
    } catch {
      // Try next query shape.
    }
  }

  const participantArrayCandidates = [
    buildFsQuery(conversationsRef, where("participantIds", "array-contains", currentUserId), limit(50)),
    buildFsQuery(conversationsRef, where("participants", "array-contains", currentUserId), limit(50))
  ];

  for (const candidate of participantArrayCandidates) {
    try {
      const snapshot = await getDocs(candidate);
      for (const row of snapshot.docs) {
        const participantIds = extractConversationParticipantIds(row.data() as Record<string, unknown>);
        if (participantIds.includes(currentUserId) && participantIds.includes(recipientId)) {
          return row.id;
        }
      }
    } catch {
      // Try next query shape.
    }
  }

  return null;
}

async function fetchUserProfileByUid(uid: string): Promise<UserProfile> {
  try {
    const directSnap = await getDoc(doc(db, "users", uid));
    if (directSnap.exists()) {
      return mapUserProfile(directSnap.data() as Record<string, unknown>, uid);
    }

    const fallbackQuery = buildFsQuery(collection(db, "users"), where("uid", "==", uid), limit(1));
    const fallbackSnap = await getDocs(fallbackQuery);
    if (!fallbackSnap.empty) {
      return mapUserProfile(fallbackSnap.docs[0].data() as Record<string, unknown>, uid);
    }
  } catch {
    // fall through
  }

  return { label: `User ${uid.slice(0, 6)}` };
}

export function ChatWorkspace({ userId }: ChatWorkspaceProps) {
  const searchParams = useSearchParams();
  const authUser = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const effectiveUserId = authUser?.uid;
  const canQuery = isHydrated && !!effectiveUserId;
  const requestedRecipientId = searchParams.get("userId")?.trim();
  const pendingRecipientId =
    requestedRecipientId && requestedRecipientId !== effectiveUserId ? requestedRecipientId : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const presenceUnsubsRef = useRef<Map<string, () => void>>(new Map());
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const statusUpdateGuardRef = useRef<Map<string, "delivered" | "read">>(new Map());
  const [presenceNow, setPresenceNow] = useState<number>(() => Date.now());

  const { conversations, isLoading, error } = useConversations(canQuery ? effectiveUserId : null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPresenceNow(Date.now());
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!effectiveUserId || conversations.length === 0) return;

    const uidsToLoad = Array.from(
      new Set(
        conversations
          .map((item) => resolveOtherParticipantId(item.participantIds, effectiveUserId))
          .filter((uid): uid is string => !!uid && !userProfiles[uid])
      )
    );
    if (pendingRecipientId && !userProfiles[pendingRecipientId]) {
      uidsToLoad.push(pendingRecipientId);
    }

    if (uidsToLoad.length === 0) return;

    let cancelled = false;
    void (async () => {
      const loaded = await Promise.all(
        uidsToLoad.map(async (uid) => [uid, await fetchUserProfileByUid(uid)] as const)
      );

      if (cancelled) return;
      setUserProfiles((prev) => {
        const next = { ...prev };
        for (const [uid, profile] of loaded) {
          next[uid] = profile;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [conversations, effectiveUserId, pendingRecipientId, userProfiles]);

  useEffect(() => {
    if (!effectiveUserId) return;

    const targetUids = Array.from(
      new Set(
        conversations
          .map((item) => resolveOtherParticipantId(item.participantIds, effectiveUserId))
          .filter((uid): uid is string => !!uid)
      )
    );
    if (pendingRecipientId && !targetUids.includes(pendingRecipientId)) {
      targetUids.push(pendingRecipientId);
    }

    const activeSet = new Set(targetUids);

    // Remove listeners no longer needed
    for (const [uid, unsub] of presenceUnsubsRef.current.entries()) {
      if (!activeSet.has(uid)) {
        unsub();
        presenceUnsubsRef.current.delete(uid);
      }
    }

    // Add listeners for new UIDs
    for (const uid of targetUids) {
      if (presenceUnsubsRef.current.has(uid)) continue;

      const directRef = doc(db, "users", uid);
      const unsubDirect = onSnapshot(
        directRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const mapped = mapUserProfile(snapshot.data() as Record<string, unknown>, uid);
          setUserProfiles((prev) => ({ ...prev, [uid]: { ...prev[uid], ...mapped } }));
        },
        () => {
          // ignore direct listener errors; fallback query listener below can still work
        }
      );

      const fallbackQ = buildFsQuery(collection(db, "users"), where("uid", "==", uid), limit(1));
      const unsubFallback = onSnapshot(
        fallbackQ,
        (snapshot) => {
          if (snapshot.empty) return;
          const mapped = mapUserProfile(snapshot.docs[0].data() as Record<string, unknown>, uid);
          setUserProfiles((prev) => ({ ...prev, [uid]: { ...prev[uid], ...mapped } }));
        },
        () => {
          // ignore fallback listener errors
        }
      );

      presenceUnsubsRef.current.set(uid, () => {
        unsubDirect();
        unsubFallback();
      });
    }

    return () => {
      // keep listeners alive while component mounted; cleanup only on unmount
    };
  }, [conversations, effectiveUserId, pendingRecipientId]);

  useEffect(() => {
    return () => {
      for (const unsub of presenceUnsubsRef.current.values()) unsub();
      presenceUnsubsRef.current.clear();
    };
  }, []);

  const getConversationLabel = (participantIds: string[]): string => {
    const otherUid = resolveOtherParticipantId(participantIds, effectiveUserId);
    if (!otherUid) return "Unknown user";
    return userProfiles[otherUid]?.label ?? `User ${otherUid.slice(0, 6)}`;
  };

  const getConversationAvatarUrl = (participantIds: string[]): string | undefined => {
    const otherUid = resolveOtherParticipantId(participantIds, effectiveUserId);
    if (!otherUid) return undefined;
    return userProfiles[otherUid]?.avatarUrl;
  };

  const getConversationStatusLabel = (participantIds: string[]): string => {
    const otherUid = resolveOtherParticipantId(participantIds, effectiveUserId);
    if (!otherUid) return "Offline";

    const profile = userProfiles[otherUid];
    if (profile?.isOnline) return "Online";

    if (profile?.lastSeenAt) {
      const diffMs = Math.max(0, presenceNow - profile.lastSeenAt);
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return "Last seen just now";
      if (mins < 60) return `Last seen ${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `Last seen ${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `Last seen ${days}d ago`;
    }

    return "Offline";
  };

  const dedupedConversations = useMemo(() => {
    const activeUid = effectiveUserId ?? "";
    const threads = new Map<
      string,
      ReturnType<typeof buildConversationRowItem>
    >();

    const getStamp = (c: { updatedAt?: number; lastMessageAt?: number }) => c.updatedAt ?? c.lastMessageAt ?? 0;

    for (const item of conversations) {
      const key =
        item.participantIds.length > 0
          ? Array.from(new Set(item.participantIds)).sort().join("|")
          : item.id;
      const unread = item.unreadCountByUser?.[activeUid] ?? 0;
      const existing = threads.get(key);

      if (!existing) {
        threads.set(
          key,
          buildConversationRowItem(item, unread, [item.id])
        );
        continue;
      }

      const newer = getStamp(item) >= getStamp(existing) ? item : existing;
      const older = newer === item ? existing : item;

      threads.set(
        key,
        buildConversationRowItem(
          {
            ...newer,
            lastMessageText: newer.lastMessageText ?? older.lastMessageText,
            lastMessageAt: newer.lastMessageAt ?? older.lastMessageAt,
            updatedAt: newer.updatedAt ?? older.updatedAt
          },
          existing.mergedUnread + unread,
          Array.from(new Set([...existing.sourceIds, item.id]))
        )
      );
    }

    return Array.from(threads.values()).sort(
      (a, b) => (b.updatedAt ?? b.lastMessageAt ?? 0) - (a.updatedAt ?? a.lastMessageAt ?? 0)
    );
  }, [conversations, effectiveUserId]);

  const filteredConversations = useMemo(() => {
    const text = searchQuery.trim().toLowerCase();
    return dedupedConversations.filter((item) => {
      const unread = item.mergedUnread > 0;
      if (filter === "unread" && !unread) return false;
      if (!text) return true;
      const participantName = getConversationLabel(item.participantIds).toLowerCase();
      return (
        item.id.toLowerCase().includes(text) ||
        participantName.includes(text) ||
        (item.lastMessageText ?? "").toLowerCase().includes(text)
      );
    });
  }, [dedupedConversations, filter, searchQuery, userProfiles]);

  const selectedConversation =
    filteredConversations.find((item) => item.id === selectedId) ?? filteredConversations[0] ?? null;
  const pendingConversation = useMemo(() => {
    if (!pendingRecipientId || !effectiveUserId) return null;
    return buildConversationRowItem(
      {
        id: `pending:${pendingRecipientId}`,
        participantIds: [effectiveUserId, pendingRecipientId]
      },
      0,
      []
    );
  }, [effectiveUserId, pendingRecipientId]);
  const activeConversation = selectedConversation ?? pendingConversation;

  useEffect(() => {
    if (!selectedId && filteredConversations.length > 0) {
      setSelectedId(filteredConversations[0].id);
    } else if (selectedId && !filteredConversations.some((item) => item.id === selectedId)) {
      setSelectedId(filteredConversations[0]?.id ?? null);
    }
  }, [filteredConversations, selectedId]);

  useEffect(() => {
    if (!pendingRecipientId) return;
    const match = dedupedConversations.find((item) => item.participantIds.includes(pendingRecipientId));
    if (match) {
      setSelectedId(match.id);
    }
  }, [dedupedConversations, pendingRecipientId]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setMessagesError(null);
      return;
    }

    const sourceIds =
      selectedConversation.sourceIds && selectedConversation.sourceIds.length > 0
        ? selectedConversation.sourceIds
        : [selectedConversation.id];

    const unsubs: Array<() => void> = [];
    const mergedBySource = new Map<string, ChatMessage[]>();
    let cancelled = false;

    const emit = () => {
      if (cancelled) return;
      const merged = Array.from(mergedBySource.values()).flat();
      const deduped = new Map<string, ChatMessage>();

      for (const item of merged) {
        const existing = deduped.get(item.id);
        if (!existing) {
          deduped.set(item.id, item);
          continue;
        }
        deduped.set(item.id, mergeDuplicateMessage(existing, item));
      }

      const sorted = Array.from(deduped.values()).sort(
        (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)
      );
      setMessages(sorted);
    };

    setMessagesError(null);
    for (const sourceId of sourceIds) {
      const subRef = collection(db, "conversations", sourceId, "messages");
      const liveCandidates = [
        buildFsQuery(subRef, orderBy("created_at", "desc"), limit(200)),
        buildFsQuery(subRef, orderBy("createdAt", "desc"), limit(200)),
        buildFsQuery(subRef, limit(200))
      ];

      const attachLiveListener = () => {
        for (const liveQuery of liveCandidates) {
          try {
            const unsubscribe = onSnapshot(
              liveQuery,
              (snapshot) => {
                mergedBySource.set(
                  `sub:${sourceId}`,
                  snapshot.docs.map((row) =>
                    mapChatMessage(row.id, row.data() as Record<string, unknown>, sourceId)
                  )
                );
                emit();
              },
              () => {
                setMessagesError("Unable to load messages for this chat.");
              }
            );
            unsubs.push(unsubscribe);
            return true;
          } catch {
            // Try next query shape.
          }
        }
        return false;
      };

      const attached = attachLiveListener();
      if (!attached) {
        setMessagesError("Unable to load messages for this chat.");
      }

      // One-time legacy fallback for root-level messages.
      void (async () => {
        try {
          const rootRef = collection(db, "messages");
          const snakeSnapshot = await getDocs(
            buildFsQuery(rootRef, where("conversation_id", "==", sourceId), limit(120))
          );
          if (!cancelled && !snakeSnapshot.empty) {
            mergedBySource.set(
              `rootSnakeOnce:${sourceId}`,
              snakeSnapshot.docs.map((row) =>
                mapChatMessage(row.id, row.data() as Record<string, unknown>, sourceId)
              )
            );
            emit();
            return;
          }

          const camelSnapshot = await getDocs(
            buildFsQuery(rootRef, where("conversationId", "==", sourceId), limit(120))
          );
          if (!cancelled && !camelSnapshot.empty) {
            mergedBySource.set(
              `rootCamelOnce:${sourceId}`,
              camelSnapshot.docs.map((row) =>
                mapChatMessage(row.id, row.data() as Record<string, unknown>, sourceId)
              )
            );
            emit();
          }
        } catch {
          // Ignore root fallback failures.
        }
      })();
    }

    return () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
    };
  }, [selectedConversation]);

  useEffect(() => {
    const node = messagesScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, selectedConversation?.id]);

  useEffect(() => {
    if (!effectiveUserId || !selectedConversation) return;
    if (messages.length === 0) return;

    const sourceIds =
      selectedConversation.sourceIds && selectedConversation.sourceIds.length > 0
        ? selectedConversation.sourceIds
        : [selectedConversation.id];

    const tryUpdateMessage = async (
      message: ChatMessage,
      payload: Record<string, unknown>
    ): Promise<boolean> => {
      const candidateConversationIds = Array.from(
        new Set(
          [message.conversationId, ...sourceIds].filter(
            (value): value is string => typeof value === "string" && value.length > 0
          )
        )
      );

      for (const conversationId of candidateConversationIds) {
        try {
          await updateDoc(doc(db, "conversations", conversationId, "messages", message.id), payload);
          return true;
        } catch {
          // try next conversation shape
        }
      }

      try {
        await updateDoc(doc(db, "messages", message.id), payload);
        return true;
      } catch {
        console.warn("[web-chat] read receipt update failed", {
          messageId: message.id,
          conversationId: message.conversationId,
          payload
        });
        return false;
      }
    };

    const candidates: ChatMessage[] = [];

    for (const message of messages) {
      if (!message.senderId || message.senderId === effectiveUserId) continue;

      const guardKey = `${message.conversationId}:${message.id}`;
      const currentGuard = statusUpdateGuardRef.current.get(guardKey);
      const status = (message.status ?? "").toLowerCase();
      const alreadyRead = message.isRead || status === "read";

      // Mobile-style effective result: opened conversation marks inbound messages as read.
      if (!alreadyRead && currentGuard !== "read") {
        candidates.push(message);
      }
    }

    void (async () => {
      for (const message of candidates) {
        const readOk = await tryUpdateMessage(message, {
          is_read: true,
          isRead: true,
          read: true,
          seen: true,
          status: "read",
          read_at: serverTimestamp(),
          readAt: serverTimestamp()
        });
        if (readOk) {
          const guardKey = `${message.conversationId}:${message.id}`;
          statusUpdateGuardRef.current.set(guardKey, "read");
        }
      }
    })();
  }, [effectiveUserId, messages, selectedConversation]);

  useEffect(() => {
    statusUpdateGuardRef.current.clear();
  }, [selectedConversation?.id]);

  const messageRows = useMemo(() => {
    const rows: Array<
      | { type: "date"; key: string; label: string }
      | { type: "message"; key: string; message: ChatMessage }
    > = [];

    let previousDateLabel = "";
    for (const item of messages) {
      const dateLabel = formatDateSeparatorLabel(item.createdAt);
      if (dateLabel !== previousDateLabel) {
        rows.push({ type: "date", key: `date-${dateLabel}-${item.id}`, label: dateLabel });
        previousDateLabel = dateLabel;
      }
      rows.push({ type: "message", key: `msg-${item.id}`, message: item });
    }

    return rows;
  }, [messages]);

  const getInitialForConversation = (participantIds: string[]): string => {
    const label = getConversationLabel(participantIds);
    return label.charAt(0).toUpperCase() || "U";
  };

  const resolveRecipientIdForSend = (): string | null => {
    if (activeConversation) {
      return resolveOtherParticipantId(activeConversation.participantIds, effectiveUserId);
    }
    return pendingRecipientId ?? null;
  };

  const ensureConversationForSend = async (): Promise<string> => {
    if (selectedConversation) {
      return selectedConversation.id;
    }

    const recipientId = resolveRecipientIdForSend();
    if (!effectiveUserId || !recipientId) {
      throw new Error("Missing recipient");
    }

    const existing = dedupedConversations.find((item) =>
      item.participantIds.includes(recipientId) && item.participantIds.includes(effectiveUserId)
    );
    if (existing) {
      setSelectedId(existing.id);
      return existing.id;
    }

    const existingInDb = await findExistingConversationIdForUsers(effectiveUserId, recipientId);
    if (existingInDb) {
      setSelectedId(existingInDb);
      return existingInDb;
    }

    const participantIds = Array.from(new Set([effectiveUserId, recipientId]));
    const conversationRef = await addDoc(collection(db, "conversations"), {
      participantIds,
      participants: participantIds,
      participant1_id: participantIds[0],
      participant2_id: participantIds[1],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      lastMessageText: "",
      last_message_text: "",
      lastMessageAt: serverTimestamp(),
      last_message_at: serverTimestamp(),
      unreadCountByUser: {
        [participantIds[0]]: 0,
        [participantIds[1]]: 0
      }
    });

    setSelectedId(conversationRef.id);
    return conversationRef.id;
  };

  const handleSendMessage = async () => {
    const text = draft.trim();
    if (!text || !effectiveUserId || isSending) return;

    setIsSending(true);
    try {
      const conversationId = await ensureConversationForSend();
      await addDoc(collection(db, "conversations", conversationId, "messages"), {
        conversation_id: conversationId,
        conversationId,
        sender_id: effectiveUserId,
        senderId: effectiveUserId,
        content: text,
        text,
        message_type: "text",
        messageType: "text",
        created_at: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: "sent",
        delivered: false,
        is_read: false,
        isRead: false,
        read: false
      });

      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessageText: text,
        last_message_text: text,
        lastMessageAt: serverTimestamp(),
        last_message_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      setDraft("");
      const node = messagesScrollRef.current;
      if (node) node.scrollTop = node.scrollHeight;
    } catch (sendError) {
      setMessagesError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isHydrated) {
    return <p className="text-sm text-slate-500">Checking session...</p>;
  }

  if (!canQuery) {
    return <p className="text-sm text-slate-500">Syncing secure chat session...</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading conversations...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[420px,1fr]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
        <h2 className="text-sm font-semibold tracking-wide text-slate-700">Conversations</h2>
        {effectiveUserId && effectiveUserId !== userId ? (
          <p className="mt-1 text-[11px] text-amber-600">
            Using active client account for realtime sync.
          </p>
        ) : null}
        <div className="mt-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search chat or message"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium",
              filter === "all" ? "bg-brand-600 text-white" : "bg-white text-slate-600"
            ].join(" ")}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium",
              filter === "unread" ? "bg-brand-600 text-white" : "bg-white text-slate-600"
            ].join(" ")}
          >
            Unread
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredConversations.length === 0 ? (
            <p className="rounded-lg bg-white p-3 text-sm text-slate-500">No conversations found.</p>
          ) : (
            filteredConversations.map((item) => {
              const unread = item.mergedUnread;
              const isActive = selectedConversation?.id === item.id;
              const avatarUrl = getConversationAvatarUrl(item.participantIds);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={[
                    "w-full rounded-xl border p-3 text-left transition",
                    isActive
                      ? "border-brand-300 bg-brand-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative mt-0.5 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-slate-200">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={getConversationLabel(item.participantIds)} className="h-full w-full object-cover" />
                      ) : (
                        <span className="inline-flex h-full w-full items-center justify-center text-sm font-semibold text-slate-600">
                          {getInitialForConversation(item.participantIds)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {getConversationLabel(item.participantIds)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatChatTime(item.updatedAt ?? item.lastMessageAt)}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-slate-600">{item.lastMessageText ?? "No message yet"}</p>
                        {unread > 0 ? (
                          <span className="inline-flex min-w-5 justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="flex min-h-0 flex-col bg-slate-100">
        {activeConversation ? (
          <>
            <header className="-mt-4 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative mt-3.5 h-8 w-8 overflow-hidden rounded-full bg-slate-200">
                      {getConversationAvatarUrl(activeConversation.participantIds) ? (
                        <img
                          src={getConversationAvatarUrl(activeConversation.participantIds)}
                          alt={getConversationLabel(activeConversation.participantIds)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
                          {getInitialForConversation(activeConversation.participantIds)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {getConversationLabel(activeConversation.participantIds)}
                    </h3>
                  </div>
                  <p className="absolute left-10 top-8 inline-flex items-center gap-1 whitespace-nowrap text-xs text-slate-500">
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        getConversationStatusLabel(activeConversation.participantIds) === "Online"
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      ].join(" ")}
                    />
                    {getConversationStatusLabel(activeConversation.participantIds)}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100"
                    title="Audio call (coming soon)"
                  >
                    <PhoneIcon />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100"
                    title="Video call (coming soon)"
                  >
                    <VideoIcon />
                  </button>
                </div>
              </div>
            </header>

            <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-5">
              {messagesError ? (
                <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {messagesError}
                </p>
              ) : null}

              {messageRows.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">No message yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {messageRows.map((row) => {
                    if (row.type === "date") {
                      return (
                        <div key={row.key} className="my-2 flex justify-center">
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600">
                            {row.label}
                          </span>
                        </div>
                      );
                    }

                    const message = row.message;
                    const isOwnMessage = !!effectiveUserId && message.senderId === effectiveUserId;
                    const statusMeta = getMessageStatusMeta(message, effectiveUserId);
                    const textBody = message.content.trim() || mapMessagePreviewLabel(message.messageType);

                    return (
                      <div key={row.key} className={["flex", isOwnMessage ? "justify-end" : "justify-start"].join(" ")}>
                        <div
                          className={[
                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                            isOwnMessage
                              ? "rounded-br-md bg-brand-600 text-white"
                              : "rounded-bl-md bg-white text-slate-700"
                          ].join(" ")}
                        >
                          <p className="whitespace-pre-wrap break-words">{textBody}</p>
                          <p
                            className={[
                              "mt-1 inline-flex w-full items-center justify-end gap-1 text-[11px]",
                              isOwnMessage ? "text-brand-100" : "text-slate-400"
                            ].join(" ")}
                          >
                            <span>{formatBubbleTime(message.createdAt)}</span>
                            {statusMeta ? (
                              <span className={statusMeta.className}>{statusMeta.icon}</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="border-t border-slate-200 bg-white p-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={1}
                  placeholder="Type a message..."
                  className="max-h-32 min-h-10 flex-1 resize-y rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!draft.trim() || isSending || !effectiveUserId}
                  className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                  title="Send message"
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
            Select a conversation to start messaging.
          </div>
        )}
      </div>
    </section>
  );
}
