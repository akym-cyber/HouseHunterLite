"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
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
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setLastDoc(undefined);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToConversations(
      userId,
      pageSize,
      ({ items, lastDoc: snapshotLastDoc }) => {
        setConversations(items);
        setLastDoc(snapshotLastDoc);
        setHasMore(false);
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
    if (!userId || !lastDoc || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = await getMoreConversations(userId, lastDoc, pageSize);
      setConversations((prev) => [...prev, ...nextPage.items]);
      setLastDoc(nextPage.lastDoc);
      setHasMore(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load more conversations");
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, lastDoc, pageSize, userId]);

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
