// Debug script for messaging regression
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc
} = require('firebase/firestore');

// Firebase config (same as in the app)
const firebaseConfig = {
  apiKey: "AIzaSyBJD01a2inlUCLPsLcaKUduexSfCcaUAdE",
  authDomain: "househunter-9be4d.firebaseapp.com",
  projectId: "househunter-9be4d",
  storageBucket: "househunter-9be4d.appspot.com",
  messagingSenderId: "433752746681",
  appId: "1:433752746681:web:9d4d6e35cba512ba4f0968",
  measurementId: "G-S9R969V605"
};

async function debugMessaging() {
  console.log('🔍 DEBUG MESSAGING REGRESSION: Starting debug...');

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Test 1: Check Firestore permissions
  console.log('\n1. Testing Firestore permissions...');
  try {
    const testRef = doc(db, '_debug', 'test');
    await setDoc(testRef, { timestamp: new Date() });
    console.log('✅ Firestore WRITE permission: OK');
    await deleteDoc(testRef);
    console.log('✅ Firestore DELETE permission: OK');
  } catch (error) {
    console.error('❌ Firestore permission error:', error);
  }

  // Test 2: Check ALL conversations in database
  console.log('\n2. Checking ALL conversations in database...');
  try {
    const conversationsRef = collection(db, 'conversations');
    const querySnapshot = await getDocs(conversationsRef);

    const allConversations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    console.log(`Total conversations in DB: ${allConversations.length}`);

    allConversations.forEach(conv => {
      const data = conv.data;
      console.log(`   - ${conv.id}:`, {
        participants: data.participants || data.users, // Check both field names
        participantCount: (data.participants || data.users)?.length,
        participant1_id: data.participant1_id,
        participant2_id: data.participant2_id,
        last_message_at: data.last_message_at,
        property_id: data.property_id
      });
    });
  } catch (error) {
    console.error('❌ Error checking conversations:', error);
  }

  // Test 3: Try different query patterns
  console.log('\n3. Testing different query patterns...');

  // Test with the tenant's user ID
  const testUserIds = ['4ax2z4tWvQWzKmdpNutEH9C7nuy2'];

  for (const testUserId of testUserIds) {
    console.log(`\n--- Testing user: ${testUserId} ---`);

    // Query 1: participant1_id
    try {
      console.log('Querying participant1_id ==', testUserId);
      const q1 = query(collection(db, 'conversations'), where('participant1_id', '==', testUserId));
      const snapshot1 = await getDocs(q1);
      console.log(`Found ${snapshot1.size} conversations with participant1_id`);
    } catch (error) {
      console.error('❌ participant1_id query error:', error.message);
    }

    // Query 2: participant2_id
    try {
      console.log('Querying participant2_id ==', testUserId);
      const q2 = query(collection(db, 'conversations'), where('participant2_id', '==', testUserId));
      const snapshot2 = await getDocs(q2);
      console.log(`Found ${snapshot2.size} conversations with participant2_id`);
    } catch (error) {
      console.error('❌ participant2_id query error:', error.message);
    }

    // Query 3: participants array (if exists)
    try {
      console.log('Querying participants array-contains', testUserId);
      const q3 = query(collection(db, 'conversations'), where('participants', 'array-contains', testUserId));
      const snapshot3 = await getDocs(q3);
      console.log(`Found ${snapshot3.size} conversations with participants array`);
    } catch (error) {
      console.error('❌ participants array query error:', error.message);
    }

    // Query 4: users array (if exists)
    try {
      console.log('Querying users array-contains', testUserId);
      const q4 = query(collection(db, 'conversations'), where('users', 'array-contains', testUserId));
      const snapshot4 = await getDocs(q4);
      console.log(`Found ${snapshot4.size} conversations with users array`);
    } catch (error) {
      console.error('❌ users array query error:', error.message);
    }
  }

  console.log('\n🔍 DEBUG: Complete. Check the output above for issues.');
}

// Run the debug
debugMessaging().catch(console.error);
