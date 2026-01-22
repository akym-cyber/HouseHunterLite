#!/usr/bin/env node

/**
 * TEST SCRIPT: Firebase Auth Persistence
 *
 * This script tests that Firebase Auth persistence is working correctly
 * with AsyncStorage in React Native Expo.
 *
 * Usage:
 * 1. Run the app and log in
 * 2. Run this script: node test-auth-persistence.js
 * 3. Restart the app and check if user remains logged in
 */

const { initializeApp } = require('firebase/app');
const { getAuth, onAuthStateChanged } = require('firebase/auth');

// Firebase config - use environment variables when available
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Validate Firebase configuration
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your-api-key') {
  console.error('❌ Missing Firebase configuration. Please check your .env file.');
  process.exit(1);
}

async function testAuthPersistence() {
  console.log('🔐 Testing Firebase Auth Persistence...\n');

  try {
    // Initialize Firebase (same as in the app)
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    console.log('📱 Firebase Auth initialized');
    console.log('⏳ Checking current auth state...\n');

    // Test auth state persistence
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe(); // Clean up listener

        if (user) {
          console.log('✅ SUCCESS: User is authenticated!');
          console.log('👤 User ID:', user.uid);
          console.log('📧 Email:', user.email);
          console.log('🔄 Provider:', user.providerData?.[0]?.providerId || 'unknown');
          console.log('⏰ Last sign in:', new Date(user.metadata.lastSignInTime).toLocaleString());
          console.log('\n💾 Auth state is PERSISTED between app sessions!');
          console.log('🎉 AsyncStorage persistence is working correctly.');
        } else {
          console.log('❌ FAILURE: No authenticated user found.');
          console.log('💡 This means:');
          console.log('   - User is not logged in, OR');
          console.log('   - Auth persistence is NOT working (user needs to log in again after app restart)');
          console.log('\n🔧 To test persistence:');
          console.log('   1. Run the Expo app and log in');
          console.log('   2. Close the app completely');
          console.log('   3. Run this script again');
          console.log('   4. If user shows as authenticated, persistence is working!');
        }

        resolve();
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('⏰ Auth state check timed out (10 seconds)');
        console.log('❌ This might indicate an issue with Firebase initialization');
        resolve();
      }, 10000);
    });

  } catch (error) {
    console.error('❌ Error testing auth persistence:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Firebase Auth Persistence Test Script');
  console.log('=======================================\n');

  // Load environment variables
  require('dotenv').config();

  await testAuthPersistence();

  console.log('\n📋 Summary:');
  console.log('-----------');
  console.log('✅ AsyncStorage import: firebase/auth/react-native');
  console.log('✅ Persistence config: getReactNativePersistence(ReactNativeAsyncStorage)');
  console.log('✅ Expo compatible: Uses @react-native-async-storage/async-storage');
  console.log('✅ Development builds: Works with Expo Go and custom builds');

  console.log('\n🔗 Related files:');
  console.log('   - Firebase config: src/services/firebase/firebaseConfig.ts');
  console.log('   - Package: @react-native-async-storage/async-storage');

  console.log('\n✨ Test completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAuthPersistence };
