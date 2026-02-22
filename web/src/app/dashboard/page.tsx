import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";

export default async function DashboardPage() {
  await requireSession("/dashboard");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">
        Owner/Tenant account controls and operational views.
      </p>
      <div className="mt-4">
        <Link
          href="/dashboard/favorites"
          className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
        >
          Open favorites dashboard
        </Link>
      </div>
    </section>
  );
}

