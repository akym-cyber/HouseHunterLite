"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/features/auth/store/use-auth-store";
import { signOutFromApp } from "@/features/auth/services/auth-service";

export function AuthStatusCard() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);
    try {
      await signOutFromApp();
      const nextPath = pathname && pathname !== "/auth/login" ? pathname : "/";
      router.replace(`/auth/login?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Authentication State</h2>
      {!isHydrated ? (
        <p className="mt-2 text-sm text-slate-500">Checking session...</p>
      ) : user ? (
        <div className="mt-2 space-y-3 text-sm text-slate-700">
          <p>Signed in as {user.email ?? user.uid}</p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-slate-500">No active session.</p>
          <Link
            href="/auth/login?next=/profile"
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            Sign in
          </Link>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
