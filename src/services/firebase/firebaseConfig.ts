// src/services/firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJD01a2inlUCLPsLcaKUduexSfCcaUAdE",
  authDomain: "househunter-9be4d.firebaseapp.com",
  projectId: "househunter-9be4d",
  storageBucket: "househunter-9be4d.appspot.com",
  messagingSenderId: "433752746681",
  appId: "1:433752746681:web:9d4d6e35cba512ba4f0968",
  measurementId: "G-S9R969V605"
};

// ✅ SINGLE initialization
export const app = initializeApp(firebaseConfig);

// ✅ AUTH with persistence
let auth: any;
try {
  // Try to get existing auth instance
  auth = getAuth(app);
} catch (error) {
  console.log('Auth initialization error:', error);
  auth = getAuth(app);
}

// ✅ Firestore + Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

export { auth };
