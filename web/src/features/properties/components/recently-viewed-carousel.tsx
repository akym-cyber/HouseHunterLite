"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Property } from "@/features/properties/types/property";
import { PropertyImageStrip } from "@/features/properties/components/property-image-strip";

const STORAGE_KEY = "househunter_recently_viewed";
const MAX_ITEMS = 10;

type ApiResponse = {
  properties?: Property[];
};

export function RecentlyViewedCarousel() {
  const [items, setItems] = useState<Property[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    let ids: string[] = [];
    try {
      const parsed = JSON.parse(raw) as string[];
      ids = Array.isArray(parsed)
        ? parsed.map((item) => String(item).trim()).filter((item) => item.length > 0)
        : [];
    } catch {
      ids = [];
    }

    if (ids.length === 0) return;

    void fetch(`/api/properties?ids=${encodeURIComponent(ids.slice(0, MAX_ITEMS).join(","))}`)
      .then((response) => response.json() as Promise<ApiResponse>)
      .then((payload) => {
        if (!payload.properties || payload.properties.length === 0) return;
        setItems(payload.properties);
      })
      .catch(() => {
        // ignore silently
      });
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Recently viewed</h2>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/properties/${item.id}`}
            className="min-w-[280px] snap-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <PropertyImageStrip
              title={item.title}
              imageUrls={Array.from(new Set([...(item.imageUrls ?? []), ...(item.coverUrl ? [item.coverUrl] : [])]))}
              videoEntries={item.videoEntries}
            />
            <p className="mt-3 truncate text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.location}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function trackRecentlyViewed(propertyId: string) {
  if (typeof window === "undefined") return;
  const existingRaw = window.localStorage.getItem(STORAGE_KEY);
  let ids: string[] = [];
  try {
    ids = existingRaw ? (JSON.parse(existingRaw) as string[]) : [];
  } catch {
    ids = [];
  }

  const next = [propertyId, ...ids.filter((id) => id !== propertyId)].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
