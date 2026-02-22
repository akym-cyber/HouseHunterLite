import { redirect } from "next/navigation";

type ForgotPasswordProps = {
  searchParams?: { next?: string | string[] } | Promise<{ next?: string | string[] }>;
};

function sanitizeNextPath(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordProps) {
  const resolved = await Promise.resolve(searchParams ?? {});
  const nextPath = sanitizeNextPath(resolved.next);
  redirect(`/auth/login?mode=forgot&next=${encodeURIComponent(nextPath)}`);
}

