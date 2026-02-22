"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToFavorites } from "@/features/favorites/services/favorites-service";
import type { Favorite } from "@/features/favorites/types/favorite";

export function useFavorites(userId: string | null) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToFavorites(
      userId,
      (items) => {
        setFavorites(items);
        setError(null);
        setIsLoading(false);
      },
      (subscribeError) => {
        setError(subscribeError.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return useMemo(
    () => ({ favorites, isLoading, error }),
    [error, favorites, isLoading]
  );
}

