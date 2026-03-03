import { AuthStatusCard } from "@/features/auth/components/auth-status-card";
import { SavedSearchesPanel } from "@/features/search/components/saved-searches-panel";
import { requireSession } from "@/lib/auth/require-session";
import {
  getApplicationsForUser,
  getDocumentsForUser,
  getPaymentsForUser,
  getTenantDirectoryForOwner,
  getUserRole,
  getViewingsForUser
} from "@/features/profile/services/profile-server-service";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession("/profile");
  const role = await getUserRole(session.uid);

  const [applications, viewings, payments, documents, tenants] = await Promise.all([
    getApplicationsForUser(session.uid),
    getViewingsForUser(session.uid),
    getPaymentsForUser(session.uid),
    getDocumentsForUser(session.uid),
    role === "owner" ? getTenantDirectoryForOwner(session.uid) : Promise.resolve([])
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          Account controls, auth state, and saved search alerts.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <a
            href="/dashboard"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Manage Properties
          </a>
          <a
            href="/profile/applications"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Applications ({applications.length})
          </a>
          <a
            href="/profile/viewings"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Viewings ({viewings.length})
          </a>
          <a
            href="/profile/payments"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Payments ({payments.length})
          </a>
          <a
            href="/profile/documents"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Documents ({documents.length})
          </a>
          {role === "owner" ? (
            <a
              href="/profile/tenant-directory"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Tenant Directory ({tenants.length})
            </a>
          ) : null}
        </div>
      </section>

      <AuthStatusCard />
      <SavedSearchesPanel />
    </div>
  );
}
