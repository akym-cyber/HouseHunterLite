import Image from "next/image";

type PropertyImageStripProps = {
  title: string;
  imageUrls?: string[];
  className?: string;
};

export function PropertyImageStrip({ title, imageUrls, className }: PropertyImageStripProps) {
  const urls = Array.from(
    new Set(
      (imageUrls ?? [])
        .map((item) => item?.trim())
        .filter((item): item is string => !!item)
    )
  );

  return (
    <div
      className={[
        "relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 via-brand-50 to-white",
        className ?? ""
      ].join(" ")}
    >
      {urls.length > 0 ? (
        <div className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative h-full min-w-full snap-start">
              <Image
                src={url}
                alt={`${title} image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                unoptimized={url.includes("res.cloudinary.com")}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-50 to-white" />
      )}

      {urls.length > 1 ? (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          {urls.length} photos
        </div>
      ) : null}
    </div>
  );
}

