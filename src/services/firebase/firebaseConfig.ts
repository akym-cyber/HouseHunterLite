// src/services/firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// ✅ SIMPLE + STABLE auth
export const auth = getAuth(app);

// ✅ Firestore + Storage
export const db = getFirestore(app);
export const storage = getStorage(app);
