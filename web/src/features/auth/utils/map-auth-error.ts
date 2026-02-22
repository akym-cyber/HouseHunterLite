import type { FirebaseError } from "firebase/app";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account exists for this email.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/email-already-in-use": "This email is already in use.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  "auth/popup-closed-by-user": "Google sign-in was canceled.",
  "auth/popup-blocked": "Popup blocked by browser. Allow popups and try again.",
  "auth/internal-error":
    "Google popup failed unexpectedly. Please retry or use redirect sign-in.",
  "auth/account-exists-with-different-credential":
    "An account already exists with a different sign-in method.",
  "auth/network-request-failed": "Network error. Check your connection and try again."
};

function isFirebaseError(error: unknown): error is FirebaseError {
  return Boolean(error && typeof error === "object" && "code" in error);
}

export function mapAuthError(error: unknown): string {
  if (isFirebaseError(error)) {
    return AUTH_ERROR_MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof Error) {
    return error.message || "Authentication failed. Please try again.";
  }
  return "Authentication failed. Please try again.";
}
