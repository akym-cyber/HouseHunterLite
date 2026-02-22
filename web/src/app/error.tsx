"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: ErrorPageProps) {
  return (
    <div className="mx-auto w-full max-w-app px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-red-700">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          {error.message || "Unexpected application error."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
        >
          Try again
        </button>
      </section>
    </div>
  );
}

