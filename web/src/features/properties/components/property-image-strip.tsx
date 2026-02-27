"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { GalleryModal, type GalleryMediaItem } from "@/features/properties/components/gallery-modal";
import type { PropertyVideoEntry } from "@/features/properties/utils/extract-image-urls";

type PropertyImageStripProps = {
  title: string;
  imageUrls?: string[];
  videoEntries?: PropertyVideoEntry[];
  className?: string;
  aspectClassName?: string;
  showThumbnails?: boolean;
  showCounter?: boolean;
  enableModal?: boolean;
};

function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M9 18l6-6-6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PropertyImageStrip({
  title,
  imageUrls,
  videoEntries,
  className,
  aspectClassName,
  showThumbnails = false,
  showCounter = false,
  enableModal = true
}: PropertyImageStripProps) {
  const slides = useMemo<GalleryMediaItem[]>(
    () => {
      const images = Array.from(
        new Set(
          (imageUrls ?? [])
            .map((item) => item?.trim())
            .filter((item): item is string => !!item)
        )
      ).map((url) => ({ type: "image" as const, url }));

      const videos = Array.from(
        new Map(
          (videoEntries ?? [])
            .map((entry) => ({
              url: entry.url?.trim() ?? "",
              thumbnailUrl: entry.thumbnailUrl?.trim() || undefined
            }))
            .filter((entry) => entry.url.length > 0)
            .map((entry) => [entry.url, entry] as const)
        ).values()
      ).map((entry) => ({
        type: "video" as const,
        url: entry.url,
        thumbnailUrl: entry.thumbnailUrl
      }));

      return [...images, ...videos].filter((item) => item.url.length > 0);
    },
    [imageUrls, videoEntries]
  );

  const total = slides.length;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  const goToIndex = (index: number, behavior: ScrollBehavior = "smooth") => {
    const node = scrollRef.current;
    if (!node) return;

    const clamped = clampIndex(index, total);
    const left = clamped * node.clientWidth;
    node.scrollTo({ left, behavior });
    setActiveIndex(clamped);
  };

  useEffect(() => {
    setActiveIndex(0);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [total]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || total <= 1) return;

    const onScroll = () => {
      const width = node.clientWidth || 1;
      const nextIndex = clampIndex(Math.round(node.scrollLeft / width), total);
      setActiveIndex(nextIndex);
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [total]);

  const openModalAt = (index: number) => {
    if (!enableModal || total === 0) return;
    setModalIndex(clampIndex(index, total));
    setIsModalOpen(true);
  };

  return (
    <div className={["space-y-2", className ?? ""].join(" ")}>
      <div
        className={[
          "group relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 via-brand-50 to-white",
          aspectClassName ?? "aspect-[16/10]"
        ].join(" ")}
      >
        {total > 0 ? (
          <div
            ref={scrollRef}
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {slides.map((item, index) => (
              <button
                key={`${item.type}-${item.url}-${index}`}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openModalAt(index);
                }}
                className="relative h-full min-w-full snap-start"
                aria-label={`Open ${item.type} ${index + 1}`}
              >
                {item.type === "video" ? (
                  <div className="relative h-full w-full">
                    <video
                      src={item.url}
                      poster={item.thumbnailUrl}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    <span className="pointer-events-none absolute inset-0 inline-flex items-center justify-center bg-black/30 text-xs font-semibold text-white">
                      Video
                    </span>
                  </div>
                ) : (
                  <Image
                    src={item.url}
                    alt={`${title} image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes={showThumbnails ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"}
                    loading={index === 0 ? "eager" : "lazy"}
                    unoptimized={item.url.includes("res.cloudinary.com")}
                  />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-50 to-white" />
        )}

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToIndex(activeIndex - 1);
              }}
              className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow transition hover:bg-black/70 md:flex md:opacity-0 md:group-hover:opacity-100"
              aria-label="Previous media"
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToIndex(activeIndex + 1);
              }}
              className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow transition hover:bg-black/70 md:flex md:opacity-0 md:group-hover:opacity-100"
              aria-label="Next media"
            >
              <ArrowRightIcon />
            </button>

            <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_, index) => (
                <span
                  key={`dot-${index}`}
                  className={[
                    "h-1.5 w-1.5 rounded-full transition-all",
                    index === activeIndex ? "bg-white" : "bg-white/55"
                  ].join(" ")}
                />
              ))}
            </div>
          </>
        ) : null}

        {total > 0 ? (
          <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            {total} {total === 1 ? "item" : "items"}
          </div>
        ) : null}

        {showCounter && total > 0 ? (
          <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            {activeIndex + 1} / {total}
          </div>
        ) : null}
      </div>

      {showThumbnails && total > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {slides.map((item, index) => (
            <button
              key={`thumb-${item.type}-${item.url}-${index}`}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToIndex(index);
              }}
              className={[
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                index === activeIndex ? "ring-brand-500" : "ring-slate-200 hover:ring-slate-300"
              ].join(" ")}
              aria-label={`Show media ${index + 1}`}
            >
              {item.type === "video" ? (
                <>
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={`${title} video thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="96px"
                      loading="lazy"
                      unoptimized={item.thumbnailUrl.includes("res.cloudinary.com")}
                    />
                  ) : (
                    <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  )}
                  <span className="pointer-events-none absolute inset-0 inline-flex items-center justify-center bg-black/30 text-[10px] font-semibold text-white">
                    Video
                  </span>
                </>
              ) : (
                <Image
                  src={item.url}
                  alt={`${title} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="96px"
                  loading="lazy"
                  unoptimized={item.url.includes("res.cloudinary.com")}
                />
              )}
            </button>
          ))}
        </div>
      ) : null}

      <GalleryModal
        isOpen={isModalOpen}
        items={slides}
        title={title}
        initialIndex={modalIndex}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
