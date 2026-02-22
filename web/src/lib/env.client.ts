import type { ClientEnv } from "@/types/env";

export function getClientEnv(): ClientEnv {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey) throw new Error("Missing required environment variable: NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!authDomain) throw new Error("Missing required environment variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!projectId) throw new Error("Missing required environment variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!storageBucket) throw new Error("Missing required environment variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (!messagingSenderId) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  }
  if (!appId) throw new Error("Missing required environment variable: NEXT_PUBLIC_FIREBASE_APP_ID");

  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: storageBucket,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: messagingSenderId,
    NEXT_PUBLIC_FIREBASE_APP_ID: appId,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  };
}
