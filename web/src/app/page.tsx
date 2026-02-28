import { HomeMarketplace } from "@/features/properties/components/home-marketplace";
import { getPropertiesServer } from "@/features/properties/services/property-server-service";
import type { Property } from "@/features/properties/types/property";

export const revalidate = 60;

const fallbackLatest: Property[] = [
  {
    id: "fallback-1",
    title: "Modern 2BR Apartment",
    location: "Westlands, Nairobi",
    price: 75000,
    beds: 2,
    baths: 2,
    propertyType: "apartment",
    ownerId: "seed"
  },
  {
    id: "fallback-2",
    title: "Family Home With Garden",
    location: "Kilimani, Nairobi",
    price: 130000,
    beds: 4,
    baths: 3,
    propertyType: "house",
    ownerId: "seed"
  },
  {
    id: "fallback-3",
    title: "Studio Near CBD",
    location: "Upper Hill, Nairobi",
    price: 45000,
    beds: 1,
    baths: 1,
    propertyType: "studio",
    ownerId: "seed"
  }
];

export default async function HomePage() {
  let latest = fallbackLatest;
  let featured: Property[] = [];
  let verified: Property[] = [];

  try {
    const [liveLatest, liveFeatured, liveVerified] = await Promise.all([
      getPropertiesServer({ max: 9, sort: "newest" }),
      getPropertiesServer({ max: 6, onlyFeatured: true, sort: "newest" }),
      getPropertiesServer({ max: 6, onlyVerified: true, sort: "newest" })
    ]);

    if (liveLatest.length > 0) {
      latest = liveLatest;
    }
    featured = liveFeatured;
    verified = liveVerified;
  } catch {
    // keep fallback cards so home still renders when env/admin config is not set yet
  }

  return <HomeMarketplace latest={latest} featured={featured} verified={verified} />;
}
