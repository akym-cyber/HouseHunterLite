"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addFavorite, removeFavorite } from "@/features/favorites/services/favorites-service";
import { useFavorites } from "@/features/favorites/hooks/use-favorites";
import { useAuthStore } from "@/features/auth/store/use-auth-store";

type PropertyDetailActionsProps = {
  propertyId: string;
  ownerId: string;
  title: string;
  location: string;
  coverUrl?: string;
  imageUrls?: string[];
  price: number;
};

export function PropertyDetailActions({
  propertyId,
  ownerId,
  title,
  location,
  coverUrl,
  imageUrls,
  price
}: PropertyDetailActionsProps) {
  const authUser = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const effectiveUserId = authUser?.uid ?? null;
  const { favorites } = useFavorites(isHydrated && effectiveUserId ? effectiveUserId : null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFavorite = useMemo(
    () => favorites.some((item) => item.propertyId === propertyId),
    [favorites, propertyId]
  );

  const handleToggleFavorite = async () => {
    if (!effectiveUserId) {
      setError("Sign in to save properties.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      if (isFavorite) {
        await removeFavorite(effectiveUserId, propertyId);
      } else {
        await addFavorite(effectiveUserId, {
          propertyId,
          title,
          location,
          coverUrl,
          imageUrls,
          price
        });
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update favorites.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleToggleFavorite()}
        disabled={isSaving}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? "Please wait..." : isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      </button>

      <Link
        href={`/messages?userId=${encodeURIComponent(ownerId)}`}
        className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Message Owner
      </Link>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

