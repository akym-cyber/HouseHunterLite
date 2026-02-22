"use client";

import { useEffect, useRef } from "react";
import { useConversations } from "@/features/chat/hooks/use-conversations";
import { useAuthStore } from "@/features/auth/store/use-auth-store";

type ConversationListProps = {
  userId: string;
};

const SCROLL_STORAGE_KEY = "househunter_messages_scroll_top";

export function ConversationList({ userId }: ConversationListProps) {
  const authUser = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const canQuery = isHydrated && !!authUser && authUser.uid === userId;

  const { conversations, isLoading, isLoadingMore, hasMore, error, loadMore } = useConversations(
    canQuery ? userId : null
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (saved) {
      node.scrollTop = Number(saved) || 0;
    }

    const onScroll = () => {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(node.scrollTop));
    };

    node.addEventListener("scroll", onScroll);
    return () => {
      node.removeEventListener("scroll", onScroll);
    };
  }, []);

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
    <div className="space-y-4">
      <div
        ref={scrollRef}
        className="max-h-[70vh] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3"
      >
        {conversations.length === 0 ? (
          <p className="text-sm text-slate-500">No conversations yet.</p>
        ) : (
          conversations.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-medium text-slate-900">{item.lastMessageText ?? "No message yet"}</p>
              <p className="mt-1 text-xs text-slate-500">
                Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "Unknown"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Participants: {item.participantIds.length}
              </p>
            </article>
          ))
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={isLoadingMore}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
        >
          {isLoadingMore ? "Loading..." : "Load older conversations"}
        </button>
      )}
    </div>
  );
}
