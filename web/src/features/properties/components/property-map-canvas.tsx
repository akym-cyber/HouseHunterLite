"use client";

import Link from "next/link";
import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/features/properties/types/property";

type PropertyMapCanvasProps = {
  properties: Property[];
};

export function PropertyMapCanvas({ properties }: PropertyMapCanvasProps) {
  const mappable = useMemo(
    () =>
      properties.filter(
        (item) => typeof item.latitude === "number" && typeof item.longitude === "number"
      ),
    [properties]
  );

  if (mappable.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        No map coordinates available for current listings.
      </div>
    );
  }

  const center = [mappable[0].latitude!, mappable[0].longitude!] as [number, number];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-[520px] w-full">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mappable.map((item) => {
            const icon = L.divIcon({
              html: `<div style="
                background:#1d72f3;
                color:white;
                border-radius:999px;
                padding:4px 10px;
                font-size:11px;
                font-weight:700;
                box-shadow:0 2px 6px rgba(0,0,0,0.25);
                border:1px solid rgba(255,255,255,0.65);
                white-space:nowrap;
              ">KES ${item.price.toLocaleString()}</div>`,
              className: "househunter-price-marker",
              iconSize: [84, 32],
              iconAnchor: [42, 32]
            });

            return (
              <Marker key={item.id} position={[item.latitude!, item.longitude!]} icon={icon}>
                <Popup>
                  <div className="min-w-[200px] space-y-2">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.location}</p>
                    <p className="text-sm font-semibold text-brand-700">
                      KES {item.price.toLocaleString()} / month
                    </p>
                    <Link href={`/properties/${item.id}`} className="text-xs font-medium text-brand-700 underline">
                      View details
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
