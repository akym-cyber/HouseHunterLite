import type { PropertyVideoEntry } from "@/features/properties/utils/extract-image-urls";

export type Favorite = {
  id: string;
  propertyId: string;
  title?: string;
  location?: string;
  coverUrl?: string;
  imageUrls?: string[];
  videoEntries?: PropertyVideoEntry[];
  propertyType?: string;
  beds?: number;
  baths?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  featuredUntil?: number;
  boostExpiresAt?: number;
  price?: number;
  savedAt?: number;
};
