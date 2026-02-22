"use client";

import type { User } from "firebase/auth";

type SessionPayload = {
  idToken: string;
};

async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;

  let message = "Session synchronization failed";
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload.error) {
      message = payload.error;
    }
  } catch {
    // ignore parse errors and keep fallback message
  }

  throw new Error(message);
}

export async function setServerSessionCookie(idToken: string): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken } satisfies SessionPayload),
    credentials: "include"
  });

  await assertOk(response);
}

export async function clearServerSessionCookie(): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include"
  });

  await assertOk(response);
}

export async function syncServerSessionFromUser(user: User | null): Promise<void> {
  if (!user) {
    await clearServerSessionCookie();
    return;
  }

  const idToken = await user.getIdToken();
  await setServerSessionCookie(idToken);
}

