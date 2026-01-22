const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, getDocs } = require('firebase/firestore');

// Firebase config - copy from your app
const firebaseConfig = {
  // You'll need to add your Firebase config here
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

async function testFavorites() {
  console.log('🔍 Testing Favorites Query...\n');

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Test user ID - replace with a real user ID that has favorites
    const testUserId = 'REPLACE_WITH_REAL_USER_ID';

    console.log(`Testing with user ID: ${testUserId}\n`);

    // Query favorites collection
    const favoritesRef = collection(db, 'favorites');
    const q = query(
      favoritesRef,
      where('user_id', '==', testUserId),
      orderBy('created_at', 'desc')
    );

    console.log('Executing query...');
    const querySnapshot = await getDocs(q);

    console.log(`Found ${querySnapshot.size} favorite documents:\n`);

    const favoriteIds = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Favorite ID: ${doc.id}`);
      console.log(`Data:`, data);
      favoriteIds.push(data.property_id);
      console.log('---');
    });

    if (favoriteIds.length > 0) {
      console.log('\nFetching property details for favorites...\n');

      // Get property details
      const propertiesRef = collection(db, 'properties');
      for (const propertyId of favoriteIds) {
        const propertyQuery = query(
          propertiesRef,
          where('__name__', '==', propertyId)
        );
        const propertySnapshot = await getDocs(propertyQuery);

        if (!propertySnapshot.empty) {
          const propertyDoc = propertySnapshot.docs[0];
          const propertyData = propertyDoc.data();
          console.log(`Property ${propertyId}: ${propertyData.title || 'No title'}`);
        } else {
          console.log(`Property ${propertyId}: NOT FOUND`);
        }
      }
    } else {
      console.log('No favorites found for this user.');
    }

  } catch (error) {
    console.error('❌ Error testing favorites:', error);
  }
}

// Run the test
testFavorites();
