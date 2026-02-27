import dynamic from "next/dynamic";
import type { Property } from "@/features/properties/types/property";

type PropertyMapProps = {
  properties: Property[];
  className?: string;
};

const PropertyMapClient = dynamic(
  () => import("@/components/property-map-client").then((module) => module.PropertyMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[540px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
        Loading map...
      </div>
    )
  }
);

export function PropertyMap({ properties, className }: PropertyMapProps) {
  return <PropertyMapClient properties={properties} className={className} />;
}

