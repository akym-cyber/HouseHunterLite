"use client";

import Link from "next/link";
import type { Route } from "next";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/features/auth/store/use-auth-store";

type SavedSearch = {
  id: string;
  label: string;
  query: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  sort?: string;
};

export function SavedSearchesPanel() {
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [queryText, setQueryText] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    if (!isHydrated || !user) return;

    const q = query(
      collection(db, "users", user.uid, "savedSearches"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const mapped = snapshot.docs.map((row) => {
          const data = row.data() as Record<string, unknown>;
          return {
            id: row.id,
            label: typeof data.label === "string" ? data.label : "Saved search",
            query: typeof data.query === "string" ? data.query : "",
            minPrice: typeof data.minPrice === "number" ? data.minPrice : undefined,
            maxPrice: typeof data.maxPrice === "number" ? data.maxPrice : undefined,
            bedrooms: typeof data.bedrooms === "number" ? data.bedrooms : undefined,
            bathrooms: typeof data.bathrooms === "number" ? data.bathrooms : undefined,
            propertyType: typeof data.propertyType === "string" ? data.propertyType : undefined,
            sort: typeof data.sort === "string" ? data.sort : "newest"
          } satisfies SavedSearch;
        });
        setItems(mapped);
      },
      (readError) => setError(readError.message)
    );

    return unsub;
  }, [isHydrated, user]);

  const canSave = useMemo(() => !!user && label.trim().length > 0, [label, user]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setError(null);
    try {
      await addDoc(collection(db, "users", user.uid, "savedSearches"), {
        label: label.trim(),
        query: queryText.trim(),
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        propertyType: propertyType || null,
        sort,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setLabel("");
      setQueryText("");
      setMinPrice("");
      setMaxPrice("");
      setBedrooms("");
      setBathrooms("");
      setPropertyType("");
      setSort("newest");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save search");
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    setError(null);
    try {
      await deleteDoc(doc(db, "users", user.uid, "savedSearches", id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete saved search");
    }
  };

  const buildSearchHref = (item: SavedSearch): string => {
    const params = new URLSearchParams();
    if (item.query) params.set("q", item.query);
    if (typeof item.minPrice === "number") params.set("minPrice", String(item.minPrice));
    if (typeof item.maxPrice === "number") params.set("maxPrice", String(item.maxPrice));
    if (typeof item.bedrooms === "number") params.set("bedrooms", String(item.bedrooms));
    if (typeof item.bathrooms === "number") params.set("bathrooms", String(item.bathrooms));
    if (item.propertyType) params.set("propertyType", item.propertyType);
    if (item.sort) params.set("sort", item.sort);
    return `/search?${params.toString()}`;
  };

  if (!isHydrated) {
    return <p className="text-sm text-slate-500">Checking session...</p>;
  }

  if (!user) {
    return <p className="text-sm text-slate-500">Sign in to manage saved searches.</p>;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Saved Search Alerts (Basic)</h2>
      <p className="mt-1 text-sm text-slate-500">Save filters and reopen them instantly from profile.</p>

      <form className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3" onSubmit={handleSave}>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Label (e.g. Westlands 2BR)"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          required
        />
        <input
          value={queryText}
          onChange={(event) => setQueryText(event.target.value)}
          placeholder="Keyword"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <input
          value={propertyType}
          onChange={(event) => setPropertyType(event.target.value)}
          placeholder="Property type"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />

        <input
          type="number"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
          placeholder="Min price"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="number"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          placeholder="Max price"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>

        <input
          type="number"
          value={bedrooms}
          onChange={(event) => setBedrooms(event.target.value)}
          placeholder="Bedrooms"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="number"
          value={bathrooms}
          onChange={(event) => setBathrooms(event.target.value)}
          placeholder="Bathrooms"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
        >
          Save Search
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No saved searches yet.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.query || "All listings"} • {item.propertyType || "Any type"}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={buildSearchHref(item) as Route} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600">
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

