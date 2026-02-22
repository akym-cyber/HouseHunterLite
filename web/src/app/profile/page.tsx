import { AuthStatusCard } from "@/features/auth/components/auth-status-card";
import { requireSession } from "@/lib/auth/require-session";

export default async function ProfilePage() {
  await requireSession("/profile");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          This is the owner/tenant profile shell with global auth state from Firebase.
        </p>
      </section>
      <AuthStatusCard />
    </div>
  );
}
