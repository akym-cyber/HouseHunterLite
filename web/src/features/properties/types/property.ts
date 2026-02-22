export type Property = {
  id: string;
  title: string;
  location: string;
  price: number;
  beds: number;
  baths: number;
  coverUrl?: string;
  imageUrls?: string[];
  ownerId: string;
  description?: string;
  ownerName?: string;
  ownerEmail?: string;
  createdAt?: number;
};
