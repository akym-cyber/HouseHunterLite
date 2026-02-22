import { PropertyCard } from "@/features/properties/components/property-card";
import { getPropertiesServer } from "@/features/properties/services/property-server-service";

type SearchPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const keyword = (resolvedParams?.q ?? "").trim().toLowerCase();
  const properties = await getPropertiesServer({ max: 50 });
  const filtered = keyword
    ? properties.filter((item) => {
        const title = item.title.toLowerCase();
        const location = item.location.toLowerCase();
        return title.includes(keyword) || location.includes(keyword);
      })
    : properties;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Search Properties</h1>
        <form className="mt-3 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={resolvedParams?.q ?? ""}
            placeholder="Search by title or location"
            className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Search
          </button>
        </form>
      </section>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No properties found.</p>
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
              coverUrl={property.coverUrl}
              imageUrls={property.imageUrls}
            />
          ))}
        </div>
      )}
    </div>
  );
}
