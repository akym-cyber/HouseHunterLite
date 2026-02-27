"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMoreConversations,
  subscribeToConversations
} from "@/features/chat/services/chat-service";
import type { Conversation } from "@/features/chat/types/chat";

const DEFAULT_PAGE_SIZE = 20;

type UseConversationsResult = {
  conversations: Conversation[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
};

export function useConversations(
  userId: string | null,
  pageSize = DEFAULT_PAGE_SIZE
): UseConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToConversations(
      userId,
      pageSize,
      ({ items, hasMore: canLoadMore }) => {
        setConversations((prev) => {
          const merged = new Map<string, Conversation>();
          for (const row of [...items, ...prev]) {
            const existing = merged.get(row.id);
            if (!existing || (row.updatedAt ?? row.lastMessageAt ?? 0) >= (existing.updatedAt ?? existing.lastMessageAt ?? 0)) {
              merged.set(row.id, row);
            }
          }
          return Array.from(merged.values()).sort(
            (a, b) => (b.updatedAt ?? b.lastMessageAt ?? 0) - (a.updatedAt ?? a.lastMessageAt ?? 0)
          );
        });
        setHasMore(canLoadMore);
        setError(null);
        setIsLoading(false);
      },
      (subscribeError) => {
        setError(subscribeError.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [pageSize, userId]);

  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = await getMoreConversations(userId, conversations.length, pageSize);
      setConversations((prev) => {
        const merged = new Map<string, Conversation>();
        for (const row of [...prev, ...nextPage.items]) {
          const existing = merged.get(row.id);
          if (!existing || (row.updatedAt ?? row.lastMessageAt ?? 0) >= (existing.updatedAt ?? existing.lastMessageAt ?? 0)) {
            merged.set(row.id, row);
          }
        }

        return Array.from(merged.values()).sort(
          (a, b) => (b.updatedAt ?? b.lastMessageAt ?? 0) - (a.updatedAt ?? a.lastMessageAt ?? 0)
        );
      });
      setHasMore(nextPage.hasMore);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load more conversations");
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversations.length, hasMore, isLoadingMore, pageSize, userId]);

  return useMemo(
    () => ({
      conversations,
      isLoading,
      isLoadingMore,
      hasMore,
      error,
      loadMore
    }),
    [conversations, error, hasMore, isLoading, isLoadingMore, loadMore]
  );
}
