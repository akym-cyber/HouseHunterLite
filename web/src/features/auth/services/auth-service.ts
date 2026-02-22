"use client";

import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase/client";
import {
  clearServerSessionCookie,
  setServerSessionCookie
} from "@/features/auth/services/session-sync";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
let googleSignInPromise: Promise<GoogleSignInResult> | null = null;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

type GoogleSignInResult = {
  user: User | null;
  usedRedirect: boolean;
};

const shouldUseRedirectFallback = (error: unknown): boolean => {
  const firebaseError = error as FirebaseError | undefined;
  const code = firebaseError?.code ?? "";
  const message = firebaseError?.message ?? "";

  return (
    code === "auth/popup-blocked" ||
    (code === "auth/internal-error" &&
      message.includes("Pending promise was never set"))
  );
};

export async function signInWithEmailPassword(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  const idToken = await credential.user.getIdToken();
  await setServerSessionCookie(idToken);
  return credential.user;
}

export async function signUpWithEmailPassword(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
  const idToken = await credential.user.getIdToken();
  await setServerSessionCookie(idToken);
  return credential.user;
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (googleSignInPromise) {
    return googleSignInPromise;
  }

  googleSignInPromise = (async () => {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();
      await setServerSessionCookie(idToken);
      return { user: credential.user, usedRedirect: false };
    } catch (error) {
      if (shouldUseRedirectFallback(error)) {
        await signInWithRedirect(auth, googleProvider);
        return { user: null, usedRedirect: true };
      }
      throw error;
    } finally {
      googleSignInPromise = null;
    }
  })();

  return googleSignInPromise;
}

export async function completeGoogleRedirectSignIn(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  if (!result?.user) {
    return null;
  }
  const idToken = await result.user.getIdToken();
  await setServerSessionCookie(idToken);
  return result.user;
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, normalizeEmail(email));
}

export async function signOutFromApp() {
  try {
    await signOut(auth);
  } finally {
    await clearServerSessionCookie();
  }
}
