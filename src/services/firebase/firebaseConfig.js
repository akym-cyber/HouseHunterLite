// src/services/firebase/firebaseConfig.js

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// Initialize Firestore
export const db = getFirestore(app);

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

export { auth };
export default app;