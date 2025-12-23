// src/hooks/useProfile.ts

import { useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { profileService, ProfileUpdateData } from '../services/firebase/profileService';
import { User } from '../types/database';
import * as ImagePicker from 'expo-image-picker';

export const useProfile = (firebaseUser: FirebaseUser | null) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial profile data
  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const result = await profileService.getUserProfile(firebaseUser.uid);
        
        if (result.success && result.data) {
          setProfile(result.data);
        } else {
          setError(result.error || 'Failed to load profile');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [firebaseUser]);

  // Subscribe to real-time profile changes
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribe = profileService.subscribeToProfileChanges(
      firebaseUser.uid,
      (updatedProfile) => {
        setProfile(updatedProfile);
        setError(null);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  const updateProfile = useCallback(async (data: ProfileUpdateData) => {
    if (!firebaseUser) return { success: false, error: 'No user logged in' };

    try {
      setUpdating(true);
      setError(null);

      // Update Firestore profile
      const result = await profileService.updateUserProfile(firebaseUser.uid, data);
      
      if (!result.success) {
        setError(result.error || 'Failed to update profile');
        return result;
      }

      // Sync with Firebase Auth profile
      const authSyncResult = await profileService.syncWithAuthProfile(firebaseUser, data);
      
      if (!authSyncResult.success) {
        console.warn('Failed to sync with auth profile:', authSyncResult.error);
        // Don't fail the entire operation if auth sync fails
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  }, [firebaseUser]);

  const uploadProfilePicture = useCallback(async () => {
    if (!firebaseUser) return { success: false, error: 'No user logged in' };

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Permission to access media library was denied' };
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        return { success: false, error: 'Image selection cancelled' };
      }

      setUpdating(true);
      setError(null);

      // Upload to Firebase Storage
      const uploadResult = await profileService.uploadProfilePicture(
        firebaseUser.uid,
        result.assets[0].uri
      );

      if (!uploadResult.success) {
        setError(uploadResult.error || 'Failed to upload profile picture');
        return uploadResult;
      }

      // Sync with Firebase Auth
      const authSyncResult = await profileService.syncWithAuthProfile(firebaseUser, {
        avatarUrl: uploadResult.url
      });

      if (!authSyncResult.success) {
        console.warn('Failed to sync with auth profile:', authSyncResult.error);
      }

      return { success: true, url: uploadResult.url };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload profile picture';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  }, [firebaseUser]);

  const deleteProfilePicture = useCallback(async () => {
    if (!firebaseUser) return { success: false, error: 'No user logged in' };

    try {
      setUpdating(true);
      setError(null);

      const result = await profileService.deleteProfilePicture(firebaseUser.uid);
      
      if (!result.success) {
        setError(result.error || 'Failed to delete profile picture');
        return result;
      }

      // Sync with Firebase Auth
      const authSyncResult = await profileService.syncWithAuthProfile(firebaseUser, {
        avatarUrl: undefined
      });

      if (!authSyncResult.success) {
        console.warn('Failed to sync with auth profile:', authSyncResult.error);
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete profile picture';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  }, [firebaseUser]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    profile,
    loading,
    updating,
    error,
    updateProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    clearError
  };
};
