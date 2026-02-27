import { PropertyImageStrip } from "@/features/properties/components/property-image-strip";
import Link from "next/link";

type PropertyCardProps = {
  id: string;
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  propertyType?: string;
  coverUrl?: string;
  imageUrls?: string[];
  videoEntries?: { url: string; thumbnailUrl?: string }[];
  isVerified?: boolean;
  isFeatured?: boolean;
  featuredUntil?: number;
  boostExpiresAt?: number;
};

export function PropertyCard({
  id,
  title,
  location,
  price,
  beds,
  baths,
  propertyType,
  coverUrl,
  imageUrls,
  videoEntries,
  isVerified,
  isFeatured,
  featuredUntil,
  boostExpiresAt
}: PropertyCardProps) {
  const mergedImageUrls = Array.from(new Set([...(imageUrls ?? []), ...(coverUrl ? [coverUrl] : [])]));
  const hasVideo = (videoEntries?.length ?? 0) > 0;
  const now = Date.now();
  const isFeaturedActive =
    isFeatured === true && typeof featuredUntil === "number" && featuredUntil > now;
  const isBoostedActive = typeof boostExpiresAt === "number" && boostExpiresAt > now;

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        isFeaturedActive
          ? "border-amber-300 ring-1 ring-amber-200"
          : "border-slate-200"
      ].join(" ")}
    >
      <PropertyImageStrip title={title} imageUrls={mergedImageUrls} videoEntries={videoEntries} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isFeaturedActive ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            ⭐ Featured
          </span>
        ) : null}
        {isBoostedActive ? (
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
            ⚡ Boosted
          </span>
        ) : null}
        {isVerified ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            Verified
          </span>
        ) : null}
        {hasVideo ? (
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
            Video
          </span>
        ) : null}
        {propertyType ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {propertyType}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-base font-semibold text-slate-900">
        <Link href={`/properties/${id}`} className="hover:underline">
          {title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-slate-500">{location}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-700">{price}</p>
        <p className="text-xs text-slate-500">
          {beds} bed | {baths} bath
        </p>
      </div>
      <div className="mt-3">
        <Link
          href={`/properties/${id}`}
          className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
