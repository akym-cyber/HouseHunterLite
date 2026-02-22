import { redirect } from "next/navigation";
import type { Route } from "next";
import { LoginForm } from "@/features/auth/components/login-form";
import { verifySessionCookie } from "@/lib/auth/session";

type LoginSearchParams = {
  next?: string | string[];
  mode?: string | string[];
};

type LoginPageProps = {
  searchParams?: Promise<LoginSearchParams>;
};

function sanitizeNextPath(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function sanitizeMode(raw: string | string[] | undefined): "signin" | "signup" | "forgot" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "signup") return "signup";
  if (value === "forgot") return "forgot";
  return "signin";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = await (searchParams ?? Promise.resolve({} as LoginSearchParams));
  const nextPath = sanitizeNextPath(resolved.next);
  const mode = sanitizeMode(resolved.mode);
  const session = await verifySessionCookie();

  if (session) {
    redirect(nextPath as Route);
  }

  return <LoginForm nextPath={nextPath} initialMode={mode} />;
}
