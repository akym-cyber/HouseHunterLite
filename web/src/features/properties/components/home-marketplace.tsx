"use client";

import { useMemo, useState } from "react";
import { PropertyMap } from "@/components/property-map";
import { PropertyCard } from "@/features/properties/components/property-card";
import { RecentlyViewedCarousel } from "@/features/properties/components/recently-viewed-carousel";
import type { Property } from "@/features/properties/types/property";

type HomeMarketplaceProps = {
  latest: Property[];
  featured: Property[];
  verified: Property[];
};

export function HomeMarketplace({ latest, featured, verified }: HomeMarketplaceProps) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const mapCandidates = useMemo(() => {
    const merged = [...featured, ...latest, ...verified];
    const byId = new Map<string, Property>();
    for (const row of merged) {
      byId.set(row.id, row);
    }
    return Array.from(byId.values());
  }, [featured, latest, verified]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 p-6 text-white sm:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-100">Kenyan rental marketplace</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-4xl">HouseHunter Web</h1>
        <p className="mt-3 max-w-2xl text-sm text-brand-50 sm:text-base">
          Browse trusted homes faster with map search, featured listings, and verified inventory.
        </p>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Discover homes</h2>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={[
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              viewMode === "list" ? "bg-brand-600 text-white" : "text-slate-600"
            ].join(" ")}
          >
            List View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={[
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              viewMode === "map" ? "bg-brand-600 text-white" : "text-slate-600"
            ].join(" ")}
          >
            Map View
          </button>
        </div>
      </div>

      {viewMode === "list" && featured.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900">Featured listings</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((property) => (
              <PropertyCard
                key={property.id}
                id={property.id}
                title={property.title}
                location={property.location}
                price={`KES ${property.price.toLocaleString()} / month`}
                beds={property.beds}
                baths={property.baths}
                propertyType={property.propertyType}
                coverUrl={property.coverUrl}
                imageUrls={property.imageUrls}
                videoEntries={property.videoEntries}
                isVerified={property.isVerified}
                isFeatured={property.isFeatured}
                featuredUntil={property.featuredUntil}
                boostExpiresAt={property.boostExpiresAt}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="transition-all duration-300 ease-out">
        {viewMode === "map" ? (
          <PropertyMap properties={mapCandidates} className="w-full" />
        ) : (
          <section className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">Latest listings</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {latest.map((property) => (
                <PropertyCard
                  key={property.id}
                  id={property.id}
                  title={property.title}
                  location={property.location}
                  price={`KES ${property.price.toLocaleString()} / month`}
                  beds={property.beds}
                  baths={property.baths}
                  propertyType={property.propertyType}
                  coverUrl={property.coverUrl}
                  imageUrls={property.imageUrls}
                  videoEntries={property.videoEntries}
                  isVerified={property.isVerified}
                  isFeatured={property.isFeatured}
                  featuredUntil={property.featuredUntil}
                  boostExpiresAt={property.boostExpiresAt}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {verified.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900">Verified listings</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {verified.map((property) => (
              <PropertyCard
                key={property.id}
                id={property.id}
                title={property.title}
                location={property.location}
                price={`KES ${property.price.toLocaleString()} / month`}
                beds={property.beds}
                baths={property.baths}
                propertyType={property.propertyType}
                coverUrl={property.coverUrl}
                imageUrls={property.imageUrls}
                videoEntries={property.videoEntries}
                isVerified
                isFeatured={property.isFeatured}
                featuredUntil={property.featuredUntil}
                boostExpiresAt={property.boostExpiresAt}
              />
            ))}
          </div>
        </section>
      ) : null}

      <RecentlyViewedCarousel />
    </div>
  );
}
