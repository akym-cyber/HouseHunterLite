import { HomeMarketplace } from "@/features/properties/components/home-marketplace";
import { getUserRole } from "@/features/profile/services/profile-server-service";
import { getPropertiesServer } from "@/features/properties/services/property-server-service";
import type { Property } from "@/features/properties/types/property";
import { verifySessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

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
  const session = await verifySessionCookie();
  const role = session?.uid ? await getUserRole(session.uid) : "unknown";
  const ownerIdFilter = role === "owner" && session?.uid ? session.uid : undefined;

  let latest: Property[] = ownerIdFilter ? [] : fallbackLatest;
  let featured: Property[] = [];
  let verified: Property[] = [];

  try {
    const [liveLatest, liveFeatured, liveVerified] = await Promise.all([
      getPropertiesServer({ max: 9, sort: "newest", ownerId: ownerIdFilter }),
      getPropertiesServer({ max: 6, onlyFeatured: true, sort: "newest", ownerId: ownerIdFilter }),
      getPropertiesServer({ max: 6, onlyVerified: true, sort: "newest", ownerId: ownerIdFilter })
    ]);

    if (liveLatest.length > 0) {
      latest = liveLatest;
    }
    featured = liveFeatured;
    verified = liveVerified;
  } catch {
    // keep fallback cards for non-owner visitors so home still renders when env/admin config is not set yet
  }

  return <HomeMarketplace latest={latest} featured={featured} verified={verified} isOwner={role === "owner"} />;
}
