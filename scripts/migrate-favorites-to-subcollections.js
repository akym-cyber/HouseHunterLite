#!/usr/bin/env node

/**
 * Migration Script: Move favorites from global collection to user-scoped subcollections
 *
 * This script migrates favorites from the global /favorites collection to
 * user-scoped subcollections at /users/{userId}/favorites/{favoriteId}
 *
 * Usage:
 *   node scripts/migrate-favorites-to-subcollections.js
 *
 * Environment Variables Required:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_PRIVATE_KEY
 *   - FIREBASE_CLIENT_EMAIL
 *   - Or have firebase.json and .firebaserc configured
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to initialize with service account from environment
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'househunter-kenya',
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID || 'househunter-kenya'}-default-rtdb.firebaseio.com`
      });
    } else {
      // Try to use default credentials (for when running on Firebase functions or with gcloud auth)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'househunter-kenya'
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error.message);
    console.log('Make sure you have either:');
    console.log('1. FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL environment variables set, or');
    console.log('2. gcloud auth configured with appropriate permissions');
    process.exit(1);
  }
}

const db = admin.firestore();

async function migrateFavorites() {
  console.log('🔄 Starting favorites migration to user-scoped subcollections...');

  try {
    // Get all favorites from the global collection
    const favoritesRef = db.collection('favorites');
    const snapshot = await favoritesRef.get();

    if (snapshot.empty) {
      console.log('✅ No favorites found in global collection to migrate');
      return;
    }

    console.log(`📊 Found ${snapshot.size} favorites in global collection`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each favorite
    for (const doc of snapshot.docs) {
      const favoriteId = doc.id;
      const data = doc.data();

      console.log(`\n🔍 Checking favorite ${favoriteId}:`);
      console.log(`   - Has user_id: ${!!data.user_id}`);
      console.log(`   - Has property_id: ${!!data.property_id}`);
      console.log(`   - user_id type: ${typeof data.user_id}`);
      console.log(`   - property_id type: ${typeof data.property_id}`);

      try {
        // Validate favorite data
        if (!data.user_id || !data.property_id) {
          console.error(`   ❌ Invalid favorite: Missing user_id or property_id`);
          console.log(`      user_id: ${data.user_id}`);
          console.log(`      property_id: ${data.property_id}`);
          errorCount++;
          continue;
        }

        if (typeof data.user_id !== 'string' || typeof data.property_id !== 'string') {
          console.error(`   ❌ Invalid favorite: user_id or property_id not strings`);
          console.log(`      user_id type: ${typeof data.user_id}`);
          console.log(`      property_id type: ${typeof data.property_id}`);
          errorCount++;
          continue;
        }

        const userId = data.user_id;
        const propertyId = data.property_id;

        // Check if favorite already exists in user subcollection
        const userFavoritesRef = db.collection(`users/${userId}/favorites`);
        const existingQuery = await userFavoritesRef.where('property_id', '==', propertyId).get();

        if (!existingQuery.empty) {
          console.log(`   ✅ Favorite already exists in user subcollection, skipping`);
          skippedCount++;
          continue;
        }

        // Create the favorite in the user subcollection
        console.log(`   🔄 Migrating favorite to users/${userId}/favorites/${favoriteId}`);

        const favoriteData = {
          property_id: propertyId,
          created_at: data.created_at || admin.firestore.FieldValue.serverTimestamp()
        };

        await userFavoritesRef.doc(favoriteId).set(favoriteData);
        console.log(`   ✅ Successfully migrated favorite ${favoriteId}`);

        migratedCount++;

        // Optional: Delete from global collection after successful migration
        // Uncomment the following lines if you want to clean up the global collection
        // console.log(`   🗑️  Removing favorite from global collection`);
        // await favoritesRef.doc(favoriteId).delete();

      } catch (error) {
        console.error(`   ❌ Error migrating favorite ${favoriteId}:`, error.message);
        errorCount++;
      }
    }

    // Print summary
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} favorites`);
    console.log(`   ⏭️  Skipped: ${skippedCount} favorites (already exist)`);
    console.log(`   ❌ Errors: ${errorCount} favorites`);
    console.log(`   📊 Total processed: ${snapshot.size} favorites`);

    if (migratedCount > 0) {
      console.log('\n🚀 Migration completed! Favorites are now stored in user-scoped subcollections.');
      console.log('   Path format: users/{userId}/favorites/{favoriteId}');
    }

    console.log('\n💡 Note: Global favorites collection preserved for rollback if needed.');
    console.log('   To clean up, uncomment the delete lines in the script and run again.');

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateFavorites()
  .then(() => {
    console.log('\n🎉 Favorites migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Favorites migration script failed:', error.message);
    process.exit(1);
  });