// src/services/firebase/profileService.ts

import { 
  doc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  updateProfile as updateAuthProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { db, storage } from './firebaseConfig';
import { User } from '../../types/database';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ProfileService {
  getUserProfile: (userId: string) => Promise<{ success: boolean; data?: User; error?: string }>;
  updateUserProfile: (userId: string, data: ProfileUpdateData) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePicture: (userId: string, imageUri: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  deleteProfilePicture: (userId: string) => Promise<{ success: boolean; error?: string }>;
  subscribeToProfileChanges: (userId: string, callback: (user: User | null) => void) => Unsubscribe;
  syncWithAuthProfile: (firebaseUser: FirebaseUser, profileData: ProfileUpdateData) => Promise<{ success: boolean; error?: string }>;
}

class FirebaseProfileService implements ProfileService {
  async getUserProfile(userId: string): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      const userDoc = doc(db, 'users', userId);
      const userSnap = await getDoc(userDoc);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        return {
          success: true,
          data: userData
        };
      } else {
        return {
          success: false,
          error: 'User profile not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user profile'
      };
    }
  }

  async updateUserProfile(userId: string, data: ProfileUpdateData): Promise<{ success: boolean; error?: string }> {
    try {
      const userDoc = doc(db, 'users', userId);
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(userDoc, updateData);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user profile'
      };
    }
  }

  async uploadProfilePicture(userId: string, imageUri: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Compress image before upload to speed up
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 512 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Convert to blob
      const response = await fetch(manipulated.uri);
      const blob = await response.blob();
      
      // Create storage reference
      const storageRef = ref(storage, `profilePictures/${userId}.jpg`);
      
      // Upload the image
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update user document with new avatar URL
      const userDoc = doc(db, 'users', userId);
      await updateDoc(userDoc, {
        avatarUrl: downloadURL,
        updatedAt: new Date().toISOString()
      });
      
      return {
        success: true,
        url: downloadURL
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload profile picture'
      };
    }
  }

  async deleteProfilePicture(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete from storage
      const storageRef = ref(storage, `profilePictures/${userId}.jpg`);
      await deleteObject(storageRef);
      
      // Remove avatar URL from user document
      const userDoc = doc(db, 'users', userId);
      await updateDoc(userDoc, {
        avatarUrl: null,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete profile picture'
      };
    }
  }

  subscribeToProfileChanges(userId: string, callback: (user: User | null) => void): Unsubscribe {
    const userDoc = doc(db, 'users', userId);
    
    return onSnapshot(userDoc, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as User;
        callback(userData);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to profile changes:', error);
      callback(null);
    });
  }

  async syncWithAuthProfile(firebaseUser: FirebaseUser, profileData: ProfileUpdateData): Promise<{ success: boolean; error?: string }> {
    try {
      const authUpdateData: any = {};
      
      if (profileData.firstName || profileData.lastName) {
        authUpdateData.displayName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
      }
      
      if (profileData.avatarUrl) {
        authUpdateData.photoURL = profileData.avatarUrl;
      }
      
      if (Object.keys(authUpdateData).length > 0) {
        await updateAuthProfile(firebaseUser, authUpdateData);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync with auth profile'
      };
    }
  }
}

export const profileService = new FirebaseProfileService();
