import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { getViewingsForUser } from "@/features/profile/services/profile-server-service";

export const dynamic = "force-dynamic";

function statusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "confirmed") return "bg-emerald-100 text-emerald-700";
  if (normalized === "cancelled" || normalized === "declined") return "bg-rose-100 text-rose-700";
  if (normalized === "completed") return "bg-slate-100 text-slate-700";
  return "bg-amber-100 text-amber-700";
}

function formatDate(value?: number): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export default async function ProfileViewingsPage() {
  const session = await requireSession("/profile/viewings");
  const items = await getViewingsForUser(session.uid);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Viewings</h1>
        <p className="mt-2 text-sm text-slate-600">Your scheduled tours and viewing requests.</p>
      </section>

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No viewings scheduled yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.propertyTitle ?? `Property ${item.propertyId}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.timeSlot ?? "Timeslot pending"} {item.viewingType ? `• ${item.viewingType}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Scheduled: {formatDate(item.scheduledAt)}</span>
                <Link
                  href={`/properties/${item.propertyId}`}
                  className="font-medium text-brand-700 underline underline-offset-2"
                >
                  View property
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

