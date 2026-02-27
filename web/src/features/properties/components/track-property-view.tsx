"use client";

import { useEffect, useRef } from "react";
import { trackPropertyView } from "@/features/properties/services/property-analytics-service";

type TrackPropertyViewProps = {
  propertyId: string;
};

export function TrackPropertyView({ propertyId }: TrackPropertyViewProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current || !propertyId) return;
    hasTrackedRef.current = true;
    void trackPropertyView(propertyId).catch(() => {
      // Swallow analytics errors to avoid disrupting property detail UX.
    });
  }, [propertyId]);

  return null;
}
