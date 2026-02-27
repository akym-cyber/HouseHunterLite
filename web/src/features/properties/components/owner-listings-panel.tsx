"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { uploadFileToCloudinary } from "@/features/media/services/cloudinary-upload-service";
import type { Property } from "@/features/properties/types/property";
import { PropertyImageStrip } from "@/features/properties/components/property-image-strip";

type OwnerListingsPanelProps = {
  ownerId: string;
};

type FormState = {
  id?: string;
  title: string;
  location: string;
  price: string;
  beds: string;
  baths: string;
  propertyType: string;
  description: string;
  latitude: string;
  longitude: string;
  isVerified: boolean;
  isFeatured: boolean;
  featuredUntil: string;
  boostExpiresAt: string;
  imageUrls: string[];
};

const emptyForm: FormState = {
  title: "",
  location: "",
  price: "",
  beds: "",
  baths: "",
  propertyType: "",
  description: "",
  latitude: "",
  longitude: "",
  isVerified: false,
  isFeatured: false,
  featuredUntil: "",
  boostExpiresAt: "",
  imageUrls: []
};

type PropertiesResponse = {
  properties?: Property[];
  error?: string;
};

function mapPropertyToForm(item: Property): FormState {
  return {
    id: item.id,
    title: item.title,
    location: item.location,
    price: String(item.price),
    beds: String(item.beds),
    baths: String(item.baths),
    propertyType: item.propertyType ?? "",
    description: item.description ?? "",
    latitude: typeof item.latitude === "number" ? String(item.latitude) : "",
    longitude: typeof item.longitude === "number" ? String(item.longitude) : "",
    isVerified: item.isVerified === true,
    isFeatured: item.isFeatured === true,
    featuredUntil: item.featuredUntil ? new Date(item.featuredUntil).toISOString().slice(0, 10) : "",
    boostExpiresAt: item.boostExpiresAt ? new Date(item.boostExpiresAt).toISOString().slice(0, 10) : "",
    imageUrls: Array.from(new Set([...(item.imageUrls ?? []), ...(item.coverUrl ? [item.coverUrl] : [])]))
  };
}

export function OwnerListingsPanel({ ownerId }: OwnerListingsPanelProps) {
  const [listings, setListings] = useState<Property[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!form.id;

  const loadListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/properties?ownerId=${encodeURIComponent(ownerId)}&max=50&sort=newest`, {
        credentials: "include"
      });
      const payload = (await response.json()) as PropertiesResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load listings");
      }
      setListings(payload.properties ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load listings");
    } finally {
      setIsLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const submitPayload = useMemo(
    () => ({
      title: form.title,
      location: form.location,
      price: Number(form.price),
      beds: Number(form.beds),
      baths: Number(form.baths),
      propertyType: form.propertyType,
      description: form.description,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      isVerified: form.isVerified,
      isFeatured: form.isFeatured,
      featuredUntil: form.featuredUntil ? new Date(form.featuredUntil).getTime() : undefined,
      boostExpiresAt: form.boostExpiresAt ? new Date(form.boostExpiresAt).getTime() : undefined,
      imageUrls: form.imageUrls,
      coverUrl: form.imageUrls[0]
    }),
    [form]
  );

  const resetForm = () => {
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const endpoint = form.id ? `/api/properties/${encodeURIComponent(form.id)}` : "/api/properties";
      const method = form.id ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(submitPayload)
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save listing");
      }

      await loadListings();
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save listing");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include"
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete listing");
      }

      await loadListings();
      if (form.id === id) resetForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete listing");
    }
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(Array.from(files).map((file) => uploadFileToCloudinary(file)));
      setForm((prev) => ({
        ...prev,
        imageUrls: Array.from(new Set([...prev.imageUrls, ...uploaded]))
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr,1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">My Listings</h2>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600"
          >
            New listing
          </button>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading listings...</p>
        ) : listings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No listings yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {listings.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                <PropertyImageStrip
                  title={item.title}
                  imageUrls={Array.from(new Set([...(item.imageUrls ?? []), ...(item.coverUrl ? [item.coverUrl] : [])]))}
                  videoEntries={item.videoEntries}
                />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.location}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {item.isFeatured && typeof item.featuredUntil === "number" && item.featuredUntil > Date.now() ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          ⭐ Featured until {new Date(item.featuredUntil).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          Featured inactive
                        </span>
                      )}
                      {typeof item.boostExpiresAt === "number" && item.boostExpiresAt > Date.now() ? (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                          ⚡ Boosted until {new Date(item.boostExpiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          Boost inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Property performance</p>
                      <p className="mt-1 text-xs text-slate-600">
                        Views: {item.views ?? 0} • Saves: {item.saves ?? 0} • Messages: {item.messagesStarted ?? 0}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Conversion:{" "}
                        {item.views && item.views > 0
                          ? `${(((item.messagesStarted ?? 0) / item.views) * 100).toFixed(1)}%`
                          : "0.0%"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(mapPropertyToForm(item))}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">{isEditing ? "Edit Listing" : "Create Listing"}</h2>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Title"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            required
          />
          <input
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            placeholder="Location"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            required
          />

          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              placeholder="Price"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              required
            />
            <input
              type="number"
              value={form.beds}
              onChange={(event) => setForm((prev) => ({ ...prev, beds: event.target.value }))}
              placeholder="Beds"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              required
            />
            <input
              type="number"
              value={form.baths}
              onChange={(event) => setForm((prev) => ({ ...prev, baths: event.target.value }))}
              placeholder="Baths"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              required
            />
          </div>

          <input
            value={form.propertyType}
            onChange={(event) => setForm((prev) => ({ ...prev, propertyType: event.target.value }))}
            placeholder="Property type (apartment, bedsitter, house...)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />

          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={4}
            placeholder="Description"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
              placeholder="Latitude"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
              placeholder="Longitude"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.isVerified}
                onChange={(event) => setForm((prev) => ({ ...prev, isVerified: event.target.checked }))}
              />
              Verified listing
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
              />
              Featured listing
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Featured until</span>
              <input
                type="date"
                value={form.featuredUntil}
                onChange={(event) => setForm((prev) => ({ ...prev, featuredUntil: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Boost expires at</span>
              <input
                type="date"
                value={form.boostExpiresAt}
                onChange={(event) => setForm((prev) => ({ ...prev, boostExpiresAt: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="text-xs font-medium text-slate-600">Property images (Cloudinary)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => void handleUploadImages(event.target.files)}
              className="text-sm"
            />
            {form.imageUrls.length > 0 ? (
              <div className="space-y-1">
                {form.imageUrls.map((url) => (
                  <div key={url} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1">
                    <p className="truncate text-xs text-slate-500">{url}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          imageUrls: prev.imageUrls.filter((item) => item !== url)
                        }))
                      }
                      className="text-xs font-medium text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {isUploading ? <p className="text-xs text-brand-600">Uploading image(s)...</p> : null}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSaving || isUploading}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {isSaving ? "Saving..." : isEditing ? "Update Listing" : "Create Listing"}
          </button>
        </form>
      </section>
    </div>
  );
}
