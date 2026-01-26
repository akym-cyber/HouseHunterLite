// CRITICAL: This file enforces user.uid as the SINGLE SOURCE OF TRUTH for user IDs
// Do NOT add custom id fields or aliases - always use user.uid from FirebaseUser
// This prevents permission, filtering, and role-based access bugs

import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../services/firebase/firebaseConfig';
import { userHelpers } from '../services/firebase/firebaseHelpers';
import { User } from '../types/database';

interface AuthUser extends FirebaseUser {
  // CRITICAL: This interface EXTENDS FirebaseUser, which provides user.uid
  // NEVER add a custom 'id' field - always use user.uid for all operations
  // This prevents permission, filtering, and role-based access bugs
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'owner' | 'tenant';
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthResult {
  success: boolean;
  error: string | null;
}

interface UserData {
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'owner' | 'tenant';
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes - no forced logout
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userResult = await userHelpers.getUserById(firebaseUser.uid);
        if (userResult.data) {
          setUser({
            ...firebaseUser,
            ...userResult.data
          });
        } else {
          setUser({
            ...firebaseUser
          } as AuthUser);
          if (userResult.error && userResult.error.includes('client is offline')) {
            setError('You are offline. Some features may not be available.');
          } else if (userResult.error) {
            setError(userResult.error);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Get additional user data
      const userResult = await userHelpers.getUserById(result.user.uid);
      if (userResult.data) {
        setUser({
          ...result.user,
          ...userResult.data
        });
      } else if (userResult.error && userResult.error.includes('client is offline')) {
        setError('You are offline. Some features may not be available.');
        setUser({
          ...result.user
        } as AuthUser);
      } else if (userResult.error) {
        setError(userResult.error);
      }
      
      return { success: true, error: null };
    } catch (error: any) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: UserData): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      const fullName = `${userData.firstName} ${userData.lastName}`;
      
      // Update Firebase Auth profile
      await updateProfile(result.user, {
        displayName: fullName
      });
      
      // Create user profile in Firestore with new format
      const userDoc = doc(db, 'users', result.user.uid);
      await setDoc(userDoc, {
        uid: result.user.uid, // Explicitly store Firebase Auth UID for clarity
        name: fullName,
        email: result.user.email,
        photoURL: result.user.photoURL || null,
        role: userData.role || 'tenant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      // Also save to the old format for backward compatibility
      const userResult = await userHelpers.addUser({
        email: result.user.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role || 'tenant',
        isVerified: false,
        isActive: true
      });
      if (userResult.data) {
        setUser({
          ...result.user,
          ...userResult.data
        });
      }
      
      return { success: true, error: null };
    } catch (error: any) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async (): Promise<AuthResult> => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      return { success: true, error: null };
    } catch (error: any) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);
      
      await sendPasswordResetEmail(auth, email);
      return { success: true, error: null };
    } catch (error: any) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('No user logged in');
      }
      
      const result = await userHelpers.updateUser(user.uid, updates);
      
      if (result.data) {
        setUser({
          ...user,
          ...result.data
        });
      }
      
      return { success: true, error: null };
    } catch (error: any) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut: signOutUser,
    resetPassword,
    updateUserProfile
  };
};
