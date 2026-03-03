import { requireSession } from "@/lib/auth/require-session";
import {
  getTenantDirectoryForOwner,
  getUserRole
} from "@/features/profile/services/profile-server-service";

export const dynamic = "force-dynamic";

function formatDate(value?: number): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export default async function TenantDirectoryPage() {
  const session = await requireSession("/profile/tenant-directory");
  const role = await getUserRole(session.uid);

  if (role !== "owner") {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-xl font-semibold text-slate-900">Tenant Directory</h1>
          <p className="mt-2 text-sm text-slate-600">
            This section is available for owner accounts only.
          </p>
        </section>
      </div>
    );
  }

  const items = await getTenantDirectoryForOwner(session.uid);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Tenant Directory</h1>
        <p className="mt-2 text-sm text-slate-600">
          Applicants linked to your listings with approval summary.
        </p>
      </section>

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No tenants found yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.uid} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.email ?? "Email unavailable"}</p>
                  {item.phone ? <p className="mt-0.5 text-xs text-slate-500">{item.phone}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                    Applications: {item.applicationsCount}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                    Approved: {item.approvedCount}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Last activity: {formatDate(item.lastApplicationAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

