"use client";

import dynamic from "next/dynamic";
import type { Property } from "@/features/properties/types/property";

const PropertyMapCanvas = dynamic(
  () => import("@/features/properties/components/property-map-canvas").then((m) => m.PropertyMapCanvas),
  { ssr: false }
);

type PropertyMapViewProps = {
  properties: Property[];
};

export function PropertyMapView({ properties }: PropertyMapViewProps) {
  return <PropertyMapCanvas properties={properties} />;
}
