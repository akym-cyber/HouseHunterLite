"use client";

import { useEffect } from "react";
import { trackRecentlyViewed } from "@/features/properties/components/recently-viewed-carousel";

type TrackRecentlyViewedProps = {
  propertyId: string;
};

export function TrackRecentlyViewed({ propertyId }: TrackRecentlyViewedProps) {
  useEffect(() => {
    trackRecentlyViewed(propertyId);
  }, [propertyId]);

  return null;
}
