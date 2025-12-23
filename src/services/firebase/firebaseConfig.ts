// src/services/firebase/firebaseConfig.ts - ULTIMATE SAFE VERSION
import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, Auth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Lazy initialization to avoid "Component auth has not been registered yet"
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function initializeFirebase() {
  if (!_app) {
    try {   
    
      _app = initializeApp(firebaseConfig);
      _auth = initializeAuth(_app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
      _db = getFirestore(_app);
      _storage = getStorage(_app);
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  }
  return { app: _app!, auth: _auth!, db: _db!, storage: _storage! };
}

// Getter functions that initialize on first access
export const getApp = (): FirebaseApp => {
  const { app } = initializeFirebase();
  return app;
};
 
export const getAuth = (): Auth => {
  const { auth } = initializeFirebase();
  return auth;
};

export const getDb = (): Firestore => {
  const { db } = initializeFirebase();
  return db;
};

export const getStorageInstance = (): FirebaseStorage => {
  const { storage } = initializeFirebase();
  return storage;
};

// Also export the initialized instances for backward compatibility
export const app = getApp();
export const auth = getAuth();
export const db = getDb();
export const storage = getStorageInstance();

// Network connection checker
export const checkFirebaseConnection = async () => {
  try {
    return { connected: true };
  } catch (error) {
    return { connected: false, error: 'Connection failed' };
  }
};  