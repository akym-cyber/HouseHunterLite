import { PropertyImageStrip } from "@/features/properties/components/property-image-strip";
import Link from "next/link";

type PropertyCardProps = {
  id: string;
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  coverUrl?: string;
  imageUrls?: string[];
};

export function PropertyCard({ id, title, location, price, beds, baths, coverUrl, imageUrls }: PropertyCardProps) {
  const mergedImageUrls = Array.from(new Set([...(imageUrls ?? []), ...(coverUrl ? [coverUrl] : [])]));

  return (
    <Link href={`/properties/${id}`} className="block">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <PropertyImageStrip title={title} imageUrls={mergedImageUrls} />
        <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{location}</p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-700">{price}</p>
          <p className="text-xs text-slate-500">{beds} bed | {baths} bath</p>
        </div>
      </article>
    </Link>
  );
}
