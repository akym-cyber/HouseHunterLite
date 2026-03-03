import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { getPaymentsForUser } from "@/features/profile/services/profile-server-service";

export const dynamic = "force-dynamic";

function statusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "bg-emerald-100 text-emerald-700";
  if (normalized === "failed") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function formatMoney(amount: number, currency?: string): string {
  const code = currency || "KES";
  return `${code} ${amount.toLocaleString()}`;
}

function formatDate(value?: number): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export default async function ProfilePaymentsPage() {
  const session = await requireSession("/profile/payments");
  const items = await getPaymentsForUser(session.uid);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
        <p className="mt-2 text-sm text-slate-600">Review payment history for your rental activity.</p>
      </section>

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No payment records yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatMoney(item.amount, item.currency)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.propertyTitle ?? (item.propertyId ? `Property ${item.propertyId}` : "General payment")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {item.role === "owner" ? "Owner side" : "Tenant side"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Created: {formatDate(item.createdAt)}</span>
                {item.paidAt ? <span>Paid: {formatDate(item.paidAt)}</span> : null}
                {item.propertyId ? (
                  <Link
                    href={`/properties/${item.propertyId}`}
                    className="font-medium text-brand-700 underline underline-offset-2"
                  >
                    View property
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

