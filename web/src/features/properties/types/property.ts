import type { PropertyVideoEntry } from "@/features/properties/utils/extract-image-urls";

export type Property = {
  id: string;
  title: string;
  location: string;
  price: number;
  beds: number;
  baths: number;
  propertyType?: string;
  description?: string;
  coverUrl?: string;
  imageUrls?: string[];
  videoEntries?: PropertyVideoEntry[];
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
  featuredUntil?: number;
  boostExpiresAt?: number;
  views?: number;
  saves?: number;
  messagesStarted?: number;
  // Legacy alias kept for backward compatibility with existing docs.
  expiresAt?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type PropertySort = "newest" | "price_asc" | "price_desc";

export type PropertyQueryFilters = {
  max?: number;
  ownerId?: string;
  cursorCreatedAt?: number;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  sort?: PropertySort;
  onlyVerified?: boolean;
  onlyFeatured?: boolean;
  ids?: string[];
};

export type PropertyWriteInput = {
  title: string;
  location: string;
  price: number;
  beds: number;
  baths: number;
  propertyType?: string;
  description?: string;
  coverUrl?: string;
  imageUrls?: string[];
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  featuredUntil?: number;
  boostExpiresAt?: number;
  views?: number;
  saves?: number;
  messagesStarted?: number;
  // Legacy alias kept for backward compatibility with existing callers.
  expiresAt?: number;
};
