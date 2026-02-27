"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

export type GalleryMediaItem =
  | { type: "image"; url: string }
  | { type: "video"; url: string; thumbnailUrl?: string };

type GalleryModalProps = {
  isOpen: boolean;
  items: GalleryMediaItem[];
  title: string;
  initialIndex?: number;
  onClose: () => void;
};

function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
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
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
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

export function GalleryModal({ isOpen, items, title, initialIndex = 0, onClose }: GalleryModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const safeItems = useMemo(
    () =>
      items
        .map((item) => {
          const url = item.url.trim();
          if (!url) return null;
          if (item.type === "video") {
            return {
              type: "video" as const,
              url,
              thumbnailUrl: item.thumbnailUrl?.trim() || undefined
            };
          }
          return {
            type: "image" as const,
            url
          };
        })
        .filter((item): item is GalleryMediaItem => item !== null),
    [items]
  );
  const total = safeItems.length;

  useEffect(() => {
    if (!isOpen || total === 0) {
      setIsVisible(false);
      return;
    }

    setActiveIndex(clampIndex(initialIndex, total));
    const raf = window.requestAnimationFrame(() => setIsVisible(true));
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [initialIndex, isOpen, total]);

  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || total === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((prev) => clampIndex(prev - 1, total));
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((prev) => clampIndex(prev + 1, total));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, total]);

  const handlePrev = () => setActiveIndex((prev) => clampIndex(prev - 1, total));
  const handleNext = () => setActiveIndex((prev) => clampIndex(prev + 1, total));

  if (!isOpen || total === 0) {
    return null;
  }

  const activeItem = safeItems[activeIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className={[
        "fixed inset-0 z-[120] flex flex-col justify-center bg-black/95 p-3 transition-opacity duration-200 sm:p-6",
        isVisible ? "opacity-100" : "opacity-0"
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 transition hover:bg-black/70 sm:right-6 sm:top-6"
      >
        Close
      </button>

      <div
        className={[
          "mx-auto flex h-full w-full max-w-6xl flex-col transition-all duration-200",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        ].join(" ")}
      >
        <div className="mb-2 flex items-center justify-between text-sm text-slate-200 sm:mb-3">
          <p className="truncate pr-3">{title}</p>
          <p className="shrink-0">
            {activeIndex + 1} / {total}
          </p>
        </div>

        <div
          className="relative flex-1 overflow-hidden rounded-2xl bg-black/60"
          onTouchStart={(event) => {
            touchStartXRef.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartXRef.current === null) return;
            const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
            const delta = endX - touchStartXRef.current;
            touchStartXRef.current = null;
            if (Math.abs(delta) < 40) return;
            if (delta > 0) {
              handlePrev();
            } else {
              handleNext();
            }
          }}
        >
          <div className="relative h-full w-full">
            {activeItem.type === "video" ? (
              <video
                key={`${activeItem.url}-${activeIndex}`}
                src={activeItem.url}
                poster={activeItem.thumbnailUrl}
                controls
                autoPlay
                playsInline
                preload="metadata"
                muted={false}
                className="h-full w-full object-contain"
                onLoadedMetadata={(event) => {
                  const element = event.currentTarget;
                  element.muted = false;
                  element.volume = 1;
                }}
              />
            ) : (
              <Image
                src={activeItem.url}
                alt={`${title} image ${activeIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                loading="eager"
                unoptimized={activeItem.url.includes("res.cloudinary.com")}
              />
            )}
          </div>

          {activeIndex > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 transition hover:bg-black/80 sm:flex"
              aria-label="Previous image"
            >
              <ArrowLeftIcon />
            </button>
          ) : null}

          {activeIndex < total - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 transition hover:bg-black/80 sm:flex"
              aria-label="Next image"
            >
              <ArrowRightIcon />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {safeItems.map((item, index) => (
            <button
              key={`${item.type}-${item.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={[
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                activeIndex === index ? "ring-brand-400" : "ring-transparent hover:ring-slate-400"
              ].join(" ")}
              aria-label={`Open media ${index + 1}`}
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
                  <span className="pointer-events-none absolute inset-0 inline-flex items-center justify-center bg-black/35 text-xs font-semibold text-white">
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
      </div>
    </div>
  );
}
