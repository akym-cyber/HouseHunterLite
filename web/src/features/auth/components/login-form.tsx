"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  requestPasswordReset,
  signInWithEmailPassword,
  signInWithGoogle,
  signUpWithEmailPassword
} from "@/features/auth/services/auth-service";
import { mapAuthError } from "@/features/auth/utils/map-auth-error";

type AuthMode = "signin" | "signup" | "forgot";

type LoginFormProps = {
  nextPath: string;
  initialMode?: AuthMode;
};

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M23.49 12.27c0-.82-.07-1.6-.22-2.35H12v4.45h6.45a5.53 5.53 0 0 1-2.4 3.64v3.02h3.88c2.27-2.1 3.56-5.2 3.56-8.76Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.88-3.02c-1.08.73-2.46 1.17-4.07 1.17-3.12 0-5.76-2.1-6.7-4.92H1.3v3.12A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.3 14.31A7.2 7.2 0 0 1 4.93 12c0-.8.13-1.57.37-2.31V6.57H1.3A12 12 0 0 0 0 12c0 1.93.46 3.76 1.3 5.43l4-3.12Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.77c1.76 0 3.33.6 4.57 1.79l3.43-3.43C17.95 1.16 15.24 0 12 0A12 12 0 0 0 1.3 6.57l4 3.12c.94-2.82 3.58-4.92 6.7-4.92Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginForm({ nextPath, initialMode = "signin" }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isBusy = isSubmitting || isGoogleSubmitting;

  const submitLabel = useMemo(() => {
    if (mode === "signin") return "Sign in";
    if (mode === "signup") return "Create account";
    return "Send reset link";
  }, [mode]);

  const setModeSafe = (value: AuthMode) => {
    setMode(value);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if ((mode === "signin" || mode === "signup") && password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signin") {
        await signInWithEmailPassword(email, password);
        router.replace(nextPath as Route);
        router.refresh();
      } else if (mode === "signup") {
        await signUpWithEmailPassword(email, password);
        router.replace(nextPath as Route);
        router.refresh();
      } else {
        await requestPasswordReset(email);
        setSuccessMessage("Password reset link sent. Check your inbox.");
      }
    } catch (error) {
      setErrorMessage(mapAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (result.usedRedirect) {
        setSuccessMessage("Continuing with Google sign-in...");
        return;
      }
      router.replace(nextPath as Route);
      router.refresh();
    } catch (error) {
      setErrorMessage(mapAuthError(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
      <aside className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-100">HouseHunter</p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          {mode === "signin" && "Welcome back"}
          {mode === "signup" && "Create your account"}
          {mode === "forgot" && "Recover access"}
        </h1>
        <p className="mt-3 max-w-md text-sm text-brand-50 sm:text-base">
          Connect owners and tenants with secure messaging, verified profiles, and real-time listing updates.
        </p>
        <div className="mt-6 grid gap-2 text-xs text-brand-50 sm:text-sm">
          <p>Session cookies are secure and server-validated.</p>
          <p>Firebase Auth powers email/password and Google sign-in.</p>
          <p>After auth, you will continue to: {nextPath}</p>
        </div>
      </aside>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setModeSafe("signin")}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              mode === "signin" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"
            ].join(" ")}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setModeSafe("signup")}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              mode === "signup" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"
            ].join(" ")}
          >
            Create account
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleEmailAuth}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="you@example.com"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="********"
              />
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="********"
              />
            </div>
          )}

          {mode === "signin" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModeSafe("forgot")}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Forgot password?
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModeSafe("signin")}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Back to sign in
              </button>
            </div>
          )}

          {errorMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Please wait..." : submitLabel}
          </button>
        </form>

        {mode !== "forgot" && (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs uppercase tracking-wide text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleAuth()}
              disabled={isBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <GoogleIcon />
              <span>{isGoogleSubmitting ? "Connecting Google..." : "Continue with Google"}</span>
            </button>
          </>
        )}
      </section>
    </div>
  );
}
