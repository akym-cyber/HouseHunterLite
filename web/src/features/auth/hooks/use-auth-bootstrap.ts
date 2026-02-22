"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuthStore } from "@/features/auth/store/use-auth-store";
import { completeGoogleRedirectSignIn } from "@/features/auth/services/auth-service";
import { syncServerSessionFromUser } from "@/features/auth/services/session-sync";

export function useAuthBootstrap(): void {
  const setUser = useAuthStore((state) => state.setUser);
  const setHydrated = useAuthStore((state) => state.setHydrated);

  useEffect(() => {
    void (async () => {
      try {
        await completeGoogleRedirectSignIn();
      } catch {
        // ignore redirect completion errors; onAuthStateChanged will still run
      }
    })();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setHydrated(true);
      void (async () => {
        try {
          await syncServerSessionFromUser(user);
        } catch {
          // best effort sync between firebase client session and server cookie
        }
      })();
    });

    return unsubscribe;
  }, [setHydrated, setUser]);
}
