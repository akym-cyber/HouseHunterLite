import { requireSession } from "@/lib/auth/require-session";
import { OwnerListingsPanel } from "@/features/properties/components/owner-listings-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage listings, update availability, and keep your rental inventory fresh.
        </p>
      </section>

      <OwnerListingsPanel ownerId={session.uid} />
    </div>
  );
}
