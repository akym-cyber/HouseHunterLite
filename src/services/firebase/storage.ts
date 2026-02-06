// src/services/firebase/storage.ts

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

export interface MediaFile {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name: string;
  size: number;
  isPrimary?: boolean;
  durationMs?: number;
}

export interface UploadResult {
  success: boolean;
  urls?: string[];
  error?: string;
}

export interface StorageService {
  uploadMultipleFiles: (
    files: MediaFile[],
    propertyId: string,
    onProgress?: (progress: number) => void
  ) => Promise<UploadResult>;
  uploadSingleFile: (
    file: MediaFile,
    propertyId: string
  ) => Promise<{ success: boolean; url?: string; error?: string }>;
  deleteFile: (url: string) => Promise<{ success: boolean; error?: string }>;
}

class FirebaseStorageService implements StorageService {
  // Fallback Firebase uploader kept for backward compatibility (profile pics, etc.)
  async uploadMultipleFiles(
    files: MediaFile[],
    propertyId: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      const uploadPromises = files.map(async (file, index) => {
        const result = await this.uploadSingleFile(file, propertyId);
        if (onProgress) {
          onProgress(((index + 1) / files.length) * 100);
        }
        return result;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result.success);
      const urls = successfulUploads.map(result => result.url!).filter(Boolean);

      return {
        success: urls.length > 0,
        urls,
        error: urls.length === 0 ? 'No files were uploaded successfully' : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async uploadSingleFile(
    file: MediaFile,
    propertyId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Create a reference to the file location in Firebase Storage
      const fileName = `${propertyId}/${file.id}_${file.name}`;
      const storageRef = ref(storage, `properties/${fileName}`);

      // Convert URI to blob for upload
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Upload the file
      const snapshot = await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        url: downloadURL
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async deleteFile(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }
}

export const storageService = new FirebaseStorageService();

// Cloudinary service leveraging the same account used for profile pictures
export interface CloudinaryUploadResult {
  success: boolean;
  resources?: Array<{
    url: string;
    type: 'image' | 'video';
    thumbnailUrl?: string;
    isPrimary?: boolean;
    durationMs?: number;
    bytes: number;
    originalName: string;
  }>;
  error?: string;
}

export class CloudinaryService {
  private cloudName: string | undefined;
  private unsignedPreset: string | undefined;
  private readonly maxVideoDurationMs = 30_000; // 30 seconds

  constructor() {
    // Read from expo-constants properly
    const extra = Constants.expoConfig?.extra || {};
    this.cloudName = extra.cloudinaryCloudName || process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    this.unsignedPreset = extra.cloudinaryUploadPreset || process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    if (__DEV__) {
      console.log('[Cloudinary] Config check:', {
        hasCloudName: Boolean(this.cloudName),
        hasUploadPreset: Boolean(this.unsignedPreset),
        cloudNameLength: this.cloudName?.length || 0,
        presetLength: this.unsignedPreset?.length || 0,
      });
    }
  }

  private hasValidConfig(): { valid: boolean; error?: string } {
    if (!this.cloudName) {
      return { valid: false, error: 'Cloudinary not configured: missing CLOUDINARY_CLOUD_NAME' };
    }
    if (!this.unsignedPreset) {
      return { valid: false, error: 'Cloudinary not configured: missing CLOUDINARY_UPLOAD_PRESET' };
    }
    return { valid: true };
  }

  async uploadMedia(
    files: MediaFile[],
    onProgress?: (index: number, progress: number) => void,
    onProgressById?: (fileId: string, progress: number) => void
  ): Promise<CloudinaryUploadResult> {
    try {
      const cfg = this.hasValidConfig();
      if (!cfg.valid) {
        if (__DEV__) console.warn('[Cloudinary]', cfg.error);
        return { success: false, error: cfg.error };
      }
      const results: CloudinaryUploadResult['resources'] = [];
      const errors: string[] = [];

      // Upload sequentially to report per-file progress
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validation
        if (file.type === 'image') {
          const maxBytes = 5 * 1024 * 1024;
          if (file.size > maxBytes) {
            return { success: false, error: `${file.name} exceeds 5MB limit` };
          }
        } else {
          const maxBytes = 20 * 1024 * 1024;
          if (file.size > maxBytes) {
            return { success: false, error: `${file.name} exceeds 20MB limit` };
          }
          if (file.durationMs !== undefined && file.durationMs > this.maxVideoDurationMs) {
            const seconds = Math.round(file.durationMs / 1000);
            return { success: false, error: `${file.name} is ${seconds}s. Max allowed is 30s.` };
          }
        }

        const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${file.type === 'video' ? 'video' : 'image'}/upload`;

        // Use legacy API import (expo-file-system/legacy) to avoid deprecation warnings
        // This is the recommended migration path per Expo docs
        const base64 = await FileSystem.readAsStringAsync(file.uri, { 
          encoding: FileSystem.EncodingType.Base64 
        });

        const formData = new FormData();
        formData.append('file', `data:${file.type === 'video' ? 'video/mp4' : 'image/jpeg'};base64,${base64}` as any);
        formData.append('upload_preset', this.unsignedPreset!);
        if (file.type === 'video') {
          formData.append('max_duration', Math.round(this.maxVideoDurationMs / 1000).toString());
        }

        // Note: fetch in React Native does not provide granular progress; we emit 100% after completion
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData as any,
        });

        if (!response.ok) {
          const errText = await response.text();
          errors.push(`${file.name}: ${errText}`);
          if (onProgress) onProgress(i, 100);
          if (onProgressById) onProgressById(file.id, 100);
          continue; // continue with next file
        }

        const json = await response.json();
        const resourceUrl: string = json.secure_url;
        
        // LOG: Cloudinary URL returned after upload
        console.log('[Cloudinary] Upload successful - Raw URL:', resourceUrl);
        console.log('[Cloudinary] Upload response:', {
          secure_url: json.secure_url,
          public_id: json.public_id,
          format: json.format,
          bytes: json.bytes,
          width: json.width,
          height: json.height,
        });
        
        let thumbnailUrl: string | undefined;
        let durationMs: number | undefined = file.durationMs;

        if (file.type === 'video') {
          // Generate a poster frame from Cloudinary with automatic format
          // Example transformation: get a jpg thumbnail at time 2s
          const publicId = json.public_id as string;
          thumbnailUrl = `https://res.cloudinary.com/${this.cloudName}/video/upload/so_2,du_0,vs_1/${publicId}.jpg`;
        }

        results!.push({
          url: resourceUrl,
          type: file.type,
          thumbnailUrl,
          isPrimary: file.isPrimary,
          durationMs,
          bytes: file.size,
          originalName: file.name,
        });

        if (onProgress) onProgress(i, 100);
        if (onProgressById) onProgressById(file.id, 100);
      }

      const success = (results?.length || 0) > 0;
      return { success, resources: results!, error: errors.length ? errors.join('; ') : undefined };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Cloudinary upload failed' };
    }
  }
}

export const cloudinaryService = new CloudinaryService();
