// src/services/firebase/storage.ts

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig';

export interface MediaFile {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name: string;
  size: number;
  isPrimary?: boolean;
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
