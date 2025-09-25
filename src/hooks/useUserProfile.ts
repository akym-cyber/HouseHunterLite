// src/hooks/useUserProfile.ts

import { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { db, storage } from '../services/firebase/firebaseConfig';
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
        
        const userDoc = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userDoc);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setProfile({
            uid: firebaseUser.uid,
            name: userData.name || firebaseUser.displayName || 'Guest',
            email: userData.email || firebaseUser.email || '',
            photoURL: userData.photoURL || firebaseUser.photoURL || undefined,
            role: userData.role || 'tenant',
            createdAt: userData.createdAt || new Date().toISOString(),
            updatedAt: userData.updatedAt || new Date().toISOString(),
          });
        } else {
          // Create default profile if it doesn't exist
          const defaultProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Guest',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            role: 'tenant',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          await setDoc(userDoc, defaultProfile);
          setProfile(defaultProfile);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        // Set fallback profile
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

    const userDoc = doc(db, 'users', firebaseUser.uid);
    
    const unsubscribe = onSnapshot(userDoc, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setProfile({
          uid: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName || 'Guest',
          email: userData.email || firebaseUser.email || '',
          photoURL: userData.photoURL || firebaseUser.photoURL || undefined,
          role: userData.role || 'tenant',
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: userData.updatedAt || new Date().toISOString(),
        });
        setError(null);
      }
    }, (err) => {
      console.error('Error listening to profile changes:', err);
      setError('Failed to sync profile changes');
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'name' | 'role'>>) => {
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
      if (updates.name) {
        await updateAuthProfile(firebaseUser, {
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

      // Convert URI to blob
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `profilePictures/${firebaseUser.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore
      const userDoc = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDoc, {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString()
      });

      // Update Firebase Auth profile
      await updateAuthProfile(firebaseUser, {
        photoURL: downloadURL
      });

      return { success: true, url: downloadURL };
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

    try {
      setUpdating(true);
      setError(null);

      // Delete from storage
      const storageRef = ref(storage, `profilePictures/${firebaseUser.uid}.jpg`);
      await deleteObject(storageRef);
      
      // Remove from Firestore
      const userDoc = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDoc, {
        photoURL: null,
        updatedAt: new Date().toISOString()
      });

      // Update Firebase Auth profile
      await updateAuthProfile(firebaseUser, {
        photoURL: null
      });

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete profile picture';
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
    updateProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    clearError
  };
};
