import { getClientEnv } from "@/lib/env.client";

export function getCloudinaryUploadUrl(): string {
  const { NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME } = getClientEnv();
  if (!NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  }
  return `https://api.cloudinary.com/v1_1/${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`;
}

export function getCloudinaryUploadPreset(): string {
  const { NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET } = getClientEnv();
  if (!NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET");
  }
  return NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
}

