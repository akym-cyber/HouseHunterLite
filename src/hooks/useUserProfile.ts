// src/hooks/useUserProfile.ts

import { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth, checkFirebaseConnection } from '../services/firebase/firebaseConfig';
import { cloudinaryService } from '../services/firebase/storage';
import * as ImagePicker from 'expo-image-picker';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role?: 'owner' | 'tenant';
  createdAt: string;
  updatedAt: string;
}

export const useUserProfile = (firebaseUser: FirebaseUser | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
        setError(null);
        
        // Check connection before attempting Firebase operation
        const connectionCheck = await checkFirebaseConnection();
        console.log('[useUserProfile] Firestore connection check:', connectionCheck);
        if (!connectionCheck.connected) {
          // Use fallback profile when offline
          setProfile({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Guest',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || null,
            role: 'tenant',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setError('You are offline. Using cached profile data.');
          setLoading(false);
          return;
        }
        
        const userDoc = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userDoc);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          
          // LOG: URL being read from Firestore (initial load)
          const photoURLFromFirestore = userData.photoURL || firebaseUser.photoURL || null;
          console.log('[useUserProfile] Reading from Firestore (initial load):', {
            userId: firebaseUser.uid,
            photoURL: photoURLFromFirestore,
            hasPhotoURL: !!userData.photoURL,
            authPhotoURL: firebaseUser.photoURL,
          });

          setProfile({
            uid: firebaseUser.uid,
            name: userData.name || firebaseUser.displayName || 'Guest',
            email: userData.email || firebaseUser.email || '',
            photoURL: photoURLFromFirestore,
            role: userData.role || 'tenant',
            createdAt: userData.createdAt || new Date().toISOString(),
            updatedAt: userData.updatedAt || new Date().toISOString(),
          });
          console.log('[useUserProfile] Initial profile load success');
        } else {
          // Create default profile if it doesn't exist
          const defaultProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Guest',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || null,
            role: 'tenant',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await setDoc(userDoc, defaultProfile);
          setProfile(defaultProfile);
        }
      } catch (err: any) {
        console.error('Error loading profile:', err);
        // Handle offline errors gracefully
        if (err?.code === 'unavailable' || err?.message?.includes('offline')) {
          // Use cached data or fallback profile when offline
          setError('You are offline. Using cached profile data.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
        }
        // Set fallback profile from auth data
        setProfile({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Guest',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
          role: 'tenant',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [firebaseUser]);

  // Subscribe to real-time profile changes
  useEffect(() => {
    if (!firebaseUser) return;

    console.log('[useUserProfile] Setting up real-time listener for user:', firebaseUser.uid);

    const userDoc = doc(db, 'users', firebaseUser.uid);

    const unsubscribe = onSnapshot(userDoc, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const newPhotoURL = userData.photoURL || firebaseUser.photoURL || null;

        // LOG: URL being read from Firestore (real-time listener)
        console.log('[useUserProfile] Real-time listener - Reading from Firestore:', {
          userId: firebaseUser.uid,
          photoURL: newPhotoURL,
          hasPhotoURL: !!userData.photoURL,
          timestamp: new Date().toISOString(),
        });

        // Check if photoURL has changed
        const photoURLChanged = profile?.photoURL !== newPhotoURL;

        if (photoURLChanged) {
          console.log('[useUserProfile] PhotoURL changed detected:', {
            old: profile?.photoURL,
            new: newPhotoURL,
          });
        }

        setProfile({
          uid: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName || 'Guest',
          email: userData.email || firebaseUser.email || '',
          photoURL: newPhotoURL,
          role: userData.role || 'tenant',
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: userData.updatedAt || new Date().toISOString(),
        });
        setError(null);

        if (photoURLChanged) {
          console.log('[useUserProfile] Profile updated with new photoURL, UI should refresh');
        }
      }
    }, (err: any) => {
      console.error('Error listening to profile changes:', err);
      // Don't set error for offline scenarios - persistence will handle it
      if (err?.code !== 'unavailable' && !err?.message?.includes('offline')) {
        setError('Failed to sync profile changes');
      }
    });

    return () => {
      console.log('[useUserProfile] Cleaning up real-time listener');
      unsubscribe();
    };
  }, [firebaseUser, profile?.photoURL]);

  const updateUserProfile = async (updates: Partial<Pick<UserProfile, 'name' | 'role'>>) => {
    if (!firebaseUser || !profile) return { success: false, error: 'No user logged in' };

    try {
      setUpdating(true);
      setError(null);

      const userDoc = doc(db, 'users', firebaseUser.uid);
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userDoc, updateData);

      // Sync with Firebase Auth profile
      if (updates.name && auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: updates.name
        });
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  };

  const uploadProfilePicture = async () => {
    if (!firebaseUser) return { success: false, error: 'No user logged in' };
    if (updating) return { success: false, error: 'Profile update already in progress' };

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
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return { success: false, error: 'Image selection cancelled' };
      }

      setUpdating(true);
      setError(null);

      // Upload to Cloudinary (compress handled by ImagePicker quality + Cloudinary)
      const asset = result.assets[0];
      const media = [{
        id: `${firebaseUser.uid}_avatar`,
        uri: asset.uri,
        type: 'image' as const,
        name: asset.fileName || 'avatar.jpg',
        size: asset.fileSize || 0,
      }];
      const upload = await cloudinaryService.uploadMedia(media);
      if (!upload.success || !upload.resources || upload.resources.length === 0) {
        throw new Error(upload.error || 'Avatar upload failed');
      }

      // Apply Cloudinary transformations for fast avatars
      const rawUrl = upload.resources[0]?.url;
      if (!rawUrl) {
        throw new Error('No Cloudinary URL returned');
      }
      // Insert transformation segment: /image/upload/w_160,h_160,c_fill,q_auto,f_auto/
      const transformedUrl = rawUrl.replace('/upload/', '/upload/w_160,h_160,c_fill,q_auto,f_auto/');

      // LOG: Cloudinary URL after transformation
      console.log('[useUserProfile] Cloudinary URL after upload:', {
        rawUrl: rawUrl,
        transformedUrl: transformedUrl,
      });

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      
      // Ensure user document exists before updating
      const existingDoc = await getDoc(userDocRef);
      if (!existingDoc.exists()) {
        await setDoc(userDocRef, {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Guest',
          email: firebaseUser.email || '',
          role: 'tenant',
          createdAt: new Date().toISOString(),
        }, { merge: true });
        console.log('[useUserProfile] Created user document before saving photoURL');
      }
      
      // LOG: URL being saved to Firestore
      console.log('[useUserProfile] Saving to Firestore:', {
        userId: firebaseUser.uid,
        photoURL: transformedUrl,
        timestamp: new Date().toISOString(),
      });
      
      await updateDoc(userDocRef, {
        photoURL: transformedUrl,
        updatedAt: new Date().toISOString()
      });

      // LOG: Confirm Firestore update
      console.log('[useUserProfile] Firestore update completed');

      // Update auth profile photo URL
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: transformedUrl });
        console.log('[useUserProfile] Firebase Auth profile updated successfully');
      } else {
        console.warn('[useUserProfile] Skipped updateProfile: auth.currentUser not available');
      }

      console.log('[useUserProfile] Profile picture upload complete, URL:', transformedUrl);
      
      // The real-time listener will pick up the change and update the profile
      // This ensures the UI refreshes with the new image URL

      return { success: true, url: transformedUrl };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload profile picture';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  };

  const deleteProfilePicture = async () => {
    if (!firebaseUser) return { success: false, error: 'No user logged in' };
    if (updating) return { success: false, error: 'Profile update already in progress' };

    try {
      setUpdating(true);
      setError(null);

      console.log('[useUserProfile] Starting profile picture deletion');

      // Update Firebase Auth profile first (Firebase v9 syntax)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: null });
        console.log('[useUserProfile] Firebase Auth profile updated successfully');
      } else {
        throw new Error('No authenticated user found');
      }

      // Remove from Firestore user document
      const userDoc = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDoc, {
        photoURL: null,
        updatedAt: new Date().toISOString()
      });
      console.log('[useUserProfile] Firestore document updated successfully');

      return { success: true };
    } catch (err: any) {
      console.error('[useUserProfile] Error deleting profile picture:', err);

      // Handle specific Firebase errors
      let errorMessage = 'Failed to delete profile picture';
      if (err?.code === 'auth/requires-recent-login') {
        errorMessage = 'Please sign in again to remove your profile picture';
      } else if (err?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please try again';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    profile,
    loading,
    updating,
    error,
    updateProfile: updateUserProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    clearError
  };
};
