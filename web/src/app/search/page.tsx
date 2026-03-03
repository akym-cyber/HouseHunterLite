import { PropertyCard } from "@/features/properties/components/property-card";
import { getUserRole } from "@/features/profile/services/profile-server-service";
import { getPropertiesServer } from "@/features/properties/services/property-server-service";
import { verifySessionCookie } from "@/lib/auth/session";
import type { PropertySort } from "@/features/properties/types/property";
import type { AppPageProps } from "@/types/app-page-props";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  bathrooms?: string;
  propertyType?: string;
  sort?: string;
};

const parseNumber = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseSort = (value?: string): PropertySort => {
  if (value === "price_asc" || value === "price_desc") return value;
  return "newest";
};

export default async function SearchPage({ searchParams }: AppPageProps<Record<string, never>, SearchParams>) {
  const session = await verifySessionCookie();
  const role = session?.uid ? await getUserRole(session.uid) : "unknown";
  const ownerIdFilter = role === "owner" && session?.uid ? session.uid : undefined;

  const params = (searchParams ? await searchParams : {}) as SearchParams;
  const keyword = (params.q ?? "").trim().toLowerCase();
  const minPrice = parseNumber(params.minPrice);
  const maxPrice = parseNumber(params.maxPrice);
  const bedrooms = parseNumber(params.bedrooms);
  const bathrooms = parseNumber(params.bathrooms);
  const propertyType = (params.propertyType ?? "").trim() || undefined;
  const sort = parseSort(params.sort);

  const properties = await getPropertiesServer({
    max: 50,
    ownerId: ownerIdFilter,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    propertyType,
    sort
  });

  const filtered = keyword
    ? properties.filter((item) => {
        const title = item.title.toLowerCase();
        const location = item.location.toLowerCase();
        const type = (item.propertyType ?? "").toLowerCase();
        return title.includes(keyword) || location.includes(keyword) || type.includes(keyword);
      })
    : properties;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Advanced Property Search</h1>
        <p className="mt-1 text-sm text-slate-500">Filter listings by budget, rooms, type, and sorting.</p>

        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Keyword (title/location/type)"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="minPrice"
              defaultValue={params.minPrice ?? ""}
              placeholder="Min price"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              name="maxPrice"
              defaultValue={params.maxPrice ?? ""}
              placeholder="Max price"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="bedrooms"
              min={0}
              defaultValue={params.bedrooms ?? ""}
              placeholder="Bedrooms"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              name="bathrooms"
              min={0}
              defaultValue={params.bathrooms ?? ""}
              placeholder="Bathrooms"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <select
            name="propertyType"
            defaultValue={params.propertyType ?? ""}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            <option value="">All property types</option>
            <option value="apartment">Apartment</option>
            <option value="bedsitter">Bedsitter</option>
            <option value="studio">Studio</option>
            <option value="house">House</option>
            <option value="maisonette">Maisonette</option>
            <option value="townhouse">Townhouse</option>
          </select>

          <select
            name="sort"
            defaultValue={params.sort ?? "newest"}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>

          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Apply Filters
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-slate-600">{filtered.length} result(s) found</p>
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            No properties match your filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((property) => (
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
        )}
      </section>
    </div>
  );
}
