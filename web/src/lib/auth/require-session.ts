import "server-only";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/auth/session";

export async function requireSession(pathname: string) {
  const session = await verifySessionCookie();
  if (!session) {
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }
  return session;
}

