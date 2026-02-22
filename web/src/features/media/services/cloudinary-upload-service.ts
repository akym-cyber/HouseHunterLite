import { getCloudinaryUploadPreset, getCloudinaryUploadUrl } from "@/lib/cloudinary";

export async function uploadFileToCloudinary(file: File): Promise<string> {
  const url = getCloudinaryUploadUrl();
  const preset = getCloudinaryUploadPreset();

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", preset);

  const response = await fetch(url, {
    method: "POST",
    body
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to Cloudinary");
  }

  const payload = (await response.json()) as { secure_url?: string };
  if (!payload.secure_url) {
    throw new Error("Cloudinary response missing secure_url");
  }

  return payload.secure_url;
}

