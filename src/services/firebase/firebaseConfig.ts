// src/services/firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = { 
  apiKey: "AIzaSyBJD01a2inlUCLPsLcaKUduexSfCcaUAdE",
  authDomain: "househunter-9be4d.firebaseapp.com",
  projectId: "househunter-9be4d",
  storageBucket: "househunter-9be4d.appspot.com",
  messagingSenderId: "433752746681",
  appId: "1:433752746681:web:9d4d6e35cba512ba4f0968",
  measurementId: "G-S9R969V605"
 };

export const app = initializeApp(firebaseConfig);

let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    // If already initialized
    auth = getAuth(app);
  }
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export { auth };

