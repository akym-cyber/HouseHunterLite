"use client";

type MessagesErrorProps = {
  error: Error;
  reset: () => void;
};

export default function MessagesError({ error, reset }: MessagesErrorProps) {
  return (
    <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-red-700">Failed to load messages</h2>
      <p className="mt-2 text-sm text-slate-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
      >
        Retry
      </button>
    </section>
  );
}

