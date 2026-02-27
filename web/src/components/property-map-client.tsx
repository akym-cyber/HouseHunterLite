"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/features/properties/types/property";

type PropertyMapClientProps = {
  properties: Property[];
  className?: string;
};

const KENYA_CENTER: [number, number] = [-0.0236, 37.9062];
const KENYA_DEFAULT_ZOOM = 6;

type MappableProperty = {
  id: string;
  title: string;
  location: string;
  price: number;
  coverUrl?: string;
  isFeatured?: boolean;
  featuredUntil?: number;
  lat: number;
  lng: number;
};

function FitMapBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      map.setView(KENYA_CENTER, KENYA_DEFAULT_ZOOM, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.2), { animate: true });
  }, [map, points]);

  return null;
}

function toMappableProperty(item: Property): MappableProperty | null {
  const lat = typeof item.lat === "number" ? item.lat : item.latitude;
  const lng = typeof item.lng === "number" ? item.lng : item.longitude;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    location: item.location,
    price: item.price,
    coverUrl: item.coverUrl,
    isFeatured: item.isFeatured,
    featuredUntil: item.featuredUntil,
    lat,
    lng
  };
}

export function PropertyMapClient({ properties, className }: PropertyMapClientProps) {
  const mappable = useMemo(() => {
    const mapped = properties.map(toMappableProperty).filter((item): item is MappableProperty => !!item);
    const unique = new Map<string, MappableProperty>();
    for (const row of mapped) unique.set(row.id, row);
    return Array.from(unique.values());
  }, [properties]);

  const points = useMemo(() => mappable.map((item) => [item.lat, item.lng] as [number, number]), [mappable]);

  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300",
        className ?? ""
      ].join(" ")}
    >
      <div className="h-[540px] w-full">
        <MapContainer center={KENYA_CENTER} zoom={KENYA_DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitMapBounds points={points} />

          {mappable.map((item) => {
            const now = Date.now();
            const isFeaturedActive =
              item.isFeatured === true &&
              typeof item.featuredUntil === "number" &&
              item.featuredUntil > now;
            const icon = L.divIcon({
              html: `<div style="
                background:${isFeaturedActive ? "#b7791f" : "#1d72f3"};
                color:${isFeaturedActive ? "#fff7ed" : "white"};
                border-radius:999px;
                padding:${isFeaturedActive ? "6px 13px" : "5px 11px"};
                font-size:${isFeaturedActive ? "12px" : "11px"};
                font-weight:700;
                line-height:1;
                box-shadow:0 4px 10px rgba(15,23,42,0.28);
                border:1px solid ${isFeaturedActive ? "rgba(251,191,36,0.9)" : "rgba(255,255,255,0.72)"};
                white-space:nowrap;
              ">${isFeaturedActive ? "⭐ " : ""}KES ${item.price.toLocaleString()}</div>`,
              className: "househunter-price-marker",
              iconSize: isFeaturedActive ? [112, 40] : [92, 34],
              iconAnchor: isFeaturedActive ? [56, 40] : [46, 34]
            });

            return (
              <Marker key={item.id} position={[item.lat, item.lng]} icon={icon}>
                <Popup>
                  <div className="min-w-[220px] max-w-[240px] space-y-2">
                    <div className="h-24 w-full overflow-hidden rounded-lg bg-slate-100">
                      {item.coverUrl ? (
                        <Image
                          src={item.coverUrl}
                          alt={item.title}
                          width={320}
                          height={128}
                          className="h-full w-full object-cover"
                          unoptimized={item.coverUrl.includes("res.cloudinary.com")}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                          No image
                        </div>
                      )}
                    </div>
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="line-clamp-1 text-xs text-slate-500">{item.location}</p>
                    <p className="text-sm font-semibold text-brand-700">
                      KES {item.price.toLocaleString()} / month
                    </p>
                    <Link href={`/properties/${item.id}`} className="text-xs font-semibold text-brand-700 underline">
                      View property
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
