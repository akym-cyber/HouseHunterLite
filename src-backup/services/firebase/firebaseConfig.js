// src/services/firebase/firebaseConfig.js

import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, doc, getDoc } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJD01a2inlUCLPsLcaKUduexSfCcaUAdE",
    authDomain: "househunter-9be4d.firebaseapp.com",
    projectId: "househunter-9be4d",
    storageBucket: "househunter-9be4d.appspot.com",
    messagingSenderId: "433752746681",
    appId: "1:433752746681:web:9d4d6e35cba512ba4f0968",
    measurementId: "G-S9R969V605"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
export const db = getFirestore(app);

// Enable offline persistence (web only - React Native uses default persistence)
if (Platform.OS === 'web') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not available');
    }
  });
}

// Initialize Storage
export const storage = getStorage(app);

// Cross-platform Auth initialization
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

// Network connectivity checker
export const checkFirebaseConnection = async (): Promise<{ connected: boolean; error?: string }> => {
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return { connected: false, error: 'No internet connection' };
    }
    
    // Test Firestore connection with a simple read (using a non-existent doc to avoid writes)
    const testDoc = doc(db, '_connection_test', 'test');
    try {
      await getDoc(testDoc);
    } catch (testError) {
      // Even if doc doesn't exist, if we get here without "unavailable" error, connection works
      if (testError?.code === 'unavailable') {
        return { connected: false, error: 'Firebase is offline' };
      }
    }
    
    return { connected: true };
  } catch (error) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      return { connected: false, error: 'Firebase is offline' };
    }
    return { connected: false, error: error?.message || 'Connection test failed' };
  }
};

// Network state listener
export const subscribeToNetworkState = (callback: (isConnected: boolean) => void) => {
  return NetInfo.addEventListener(state => {
    callback(state.isConnected ?? false);
  });
};

export { auth };
export default app;