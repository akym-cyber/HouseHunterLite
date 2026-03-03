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
        <article key={item.id} className="rounded-2xl bg-transparent p-0 shadow-none">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <PropertyImageStrip
              title={item.title ?? `Property ${item.propertyId}`}
              imageUrls={Array.from(new Set([...(item.imageUrls ?? []), ...(item.coverUrl ? [item.coverUrl] : [])]))}
              videoEntries={item.videoEntries}
              className="rounded-none"
            />
          </div>
          <div className="mt-3 space-y-2 px-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {item.isFeatured ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Featured
                </span>
              ) : null}
              {typeof item.boostExpiresAt === "number" && item.boostExpiresAt > Date.now() ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  Boosted
                </span>
              ) : null}
              {item.isVerified ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Verified
                </span>
              ) : null}
              {(item.videoEntries?.length ?? 0) > 0 ? (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  Video
                </span>
              ) : null}
              {item.propertyType ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {item.propertyType}
                </span>
              ) : null}
            </div>
            <h3 className="text-sm font-semibold text-slate-900">{item.title ?? "Untitled property"}</h3>
            <p className="mt-1 text-xs text-slate-500">{item.location ?? "Location unavailable"}</p>
            {(typeof item.beds === "number" || typeof item.baths === "number") ? (
              <p className="mt-1 text-xs text-slate-500">
                {typeof item.beds === "number" ? item.beds : "-"} bed |{" "}
                {typeof item.baths === "number" ? item.baths : "-"} bath
              </p>
            ) : null}
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
