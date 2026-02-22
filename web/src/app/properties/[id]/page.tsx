import { notFound } from "next/navigation";
import { getPropertyByIdServer } from "@/features/properties/services/property-server-service";
import { PropertyImageStrip } from "@/features/properties/components/property-image-strip";
import { PropertyDetailActions } from "@/features/properties/components/property-detail-actions";

type PropertyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const property = await getPropertyByIdServer(id);

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <div className="space-y-4">
          <PropertyImageStrip
            title={property.title}
            imageUrls={Array.from(new Set([...(property.imageUrls ?? []), ...(property.coverUrl ? [property.coverUrl] : [])]))}
          />

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h1 className="text-2xl font-semibold text-slate-900">{property.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{property.location}</p>
            <p className="mt-4 text-lg font-semibold text-brand-700">
              KES {property.price.toLocaleString()} / month
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {property.beds} bed | {property.baths} bath
            </p>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Owner</h2>
            <p className="mt-2 text-sm text-slate-700">{property.ownerName ?? "House owner"}</p>
            <p className="mt-1 text-sm text-slate-500">{property.ownerEmail ?? "Email unavailable"}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <PropertyDetailActions
              propertyId={property.id}
              ownerId={property.ownerId}
              title={property.title}
              location={property.location}
              coverUrl={property.coverUrl}
              imageUrls={property.imageUrls}
              price={property.price}
            />
          </article>
        </aside>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Description</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {property.description?.trim() || "No description provided for this listing yet."}
        </p>
      </section>
    </div>
  );
}
