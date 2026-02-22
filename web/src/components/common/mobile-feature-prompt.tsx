"use client";

type MobileFeaturePromptProps = {
  feature: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function MobileFeaturePrompt({
  feature,
  message,
  ctaLabel = "Open HouseHunter Mobile App",
  ctaHref = "/"
}: MobileFeaturePromptProps) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 sm:p-5">
      <p className="text-sm font-semibold text-brand-700">{feature} is optimized for mobile</p>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
      <a
        href={ctaHref}
        className="mt-3 inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        {ctaLabel}
      </a>
    </div>
  );
}

