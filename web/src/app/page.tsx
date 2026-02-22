import { PropertyCard } from "@/features/properties/components/property-card";
import { getPropertiesServer } from "@/features/properties/services/property-server-service";
import type { Property } from "@/features/properties/types/property";

const fallbackFeatured: Property[] = [
  {
    id: "fallback-1",
    title: "Modern 2BR Apartment",
    location: "Westlands, Nairobi",
    price: 75000,
    beds: 2,
    baths: 2,
    ownerId: "seed"
  },
  {
    id: "fallback-2",
    title: "Family Home With Garden",
    location: "Kilimani, Nairobi",
    price: 130000,
    beds: 4,
    baths: 3,
    ownerId: "seed"
  },
  {
    id: "fallback-3",
    title: "Studio Near CBD",
    location: "Upper Hill, Nairobi",
    price: 45000,
    beds: 1,
    baths: 1,
    ownerId: "seed"
  }
];

export default async function HomePage() {
  let featured = fallbackFeatured;
  try {
    const live = await getPropertiesServer({ max: 6 });
    if (live.length > 0) {
      featured = live;
    }
  } catch {
    // keep fallback cards so home still renders when env/admin config is not set yet
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 p-6 text-white sm:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-100">Production web platform</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-4xl">HouseHunter for Owners & Tenants</h1>
        <p className="mt-3 max-w-2xl text-sm text-brand-50 sm:text-base">
          A scalable, responsive web experience powered by Next.js App Router, Firebase, and Cloudinary.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Featured listings</h2>
        </div>

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
              coverUrl={property.coverUrl}
              imageUrls={property.imageUrls}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
