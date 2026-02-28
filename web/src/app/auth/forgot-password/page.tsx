import { redirect } from "next/navigation";
import type { AppPageProps } from "@/types/app-page-props";

export const dynamic = "force-dynamic";

function sanitizeNextPath(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

export default async function ForgotPasswordPage({
  searchParams
}: AppPageProps<Record<string, never>, { next?: string | string[] }>) {
  const resolved = searchParams ? await searchParams : {};
  const nextPath = sanitizeNextPath(resolved.next);
  redirect(`/auth/login?mode=forgot&next=${encodeURIComponent(nextPath)}`);
}
