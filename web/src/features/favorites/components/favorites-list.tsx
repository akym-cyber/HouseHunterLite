"use client";

import { useFavorites } from "@/features/favorites/hooks/use-favorites";
import { useAuthStore } from "@/features/auth/store/use-auth-store";
import { PropertyImageStrip } from "@/features/properties/components/property-image-strip";

type FavoritesListProps = {
  userId: string;
};

export function FavoritesList({ userId }: FavoritesListProps) {
  const authUser = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const effectiveUserId = authUser?.uid ?? userId;
  const canQuery = isHydrated && !!effectiveUserId;

  const { favorites, isLoading, error } = useFavorites(canQuery ? effectiveUserId : null);

  if (!isHydrated) {
    return <p className="text-sm text-slate-500">Checking session...</p>;
  }

  if (!canQuery) {
    return <p className="text-sm text-slate-500">Syncing favorites session...</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading favorites...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (favorites.length === 0) {
    return <p className="text-sm text-slate-500">No saved properties yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {favorites.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <PropertyImageStrip
            title={item.title ?? `Property ${item.propertyId}`}
            imageUrls={Array.from(new Set([...(item.imageUrls ?? []), ...(item.coverUrl ? [item.coverUrl] : [])]))}
            className="rounded-none"
          />
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-900">{item.title ?? "Untitled property"}</h3>
            <p className="mt-1 text-xs text-slate-500">{item.location ?? "Location unavailable"}</p>
            {typeof item.price === "number" ? (
              <p className="mt-3 text-sm font-semibold text-brand-700">
                KES {item.price.toLocaleString()} / month
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
