#!/usr/bin/env node

/**
 * Migration Script: Add participants array to legacy conversations
 *
 * This script updates conversations that use the old participant1_id/participant2_id
 * format to include the new participants array format for better security and queries.
 *
 * Usage:
 *   node scripts/migrate-conversations-participants.js
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

async function migrateConversations() {
  console.log('🔄 Starting conversation participants migration...');

  try {
    // Get all conversations
    const conversationsRef = db.collection('conversations');
    const snapshot = await conversationsRef.get();

    if (snapshot.empty) {
      console.log('✅ No conversations found to migrate');
      return;
    }

    console.log(`📊 Found ${snapshot.size} conversations to check`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each conversation
    for (const doc of snapshot.docs) {
      const conversationId = doc.id;
      const data = doc.data();

      console.log(`\n🔍 Checking conversation ${conversationId}:`);
      console.log(`   - Has participants array: ${!!data.participants}`);
      console.log(`   - Has participant1_id: ${!!data.participant1_id}`);
      console.log(`   - Has participant2_id: ${!!data.participant2_id}`);
      console.log(`   - Has createdBy: ${!!data.createdBy}`);

      try {
        // Check if conversation already has participants array
        if (data.participants && Array.isArray(data.participants) && data.participants.length === 2) {
          console.log(`   ✅ Already migrated - valid participants array: [${data.participants.join(', ')}]`);
          skippedCount++;
          continue;
        }

        // Check if conversation has old participant fields
        if (data.participant1_id && data.participant2_id) {
          const participants = [data.participant1_id, data.participant2_id];

          // Validate participants are different and are strings
          if (participants[0] === participants[1]) {
            console.error(`   ❌ Invalid: participant1_id and participant2_id are the same (${participants[0]})`);
            errorCount++;
            continue;
          }

          if (typeof participants[0] !== 'string' || typeof participants[1] !== 'string') {
            console.error(`   ❌ Invalid: participant IDs are not strings (${typeof participants[0]}, ${typeof participants[1]})`);
            errorCount++;
            continue;
          }

          // Add participants array and createdBy if missing
          const updateData = {
            participants: participants
          };

          if (!data.createdBy) {
            updateData.createdBy = data.participant1_id; // Assume first participant created it
          }

          console.log(`   🔄 Migrating: Adding participants [${participants.join(', ')}]`);

          await conversationsRef.doc(conversationId).update(updateData);

          console.log(`   ✅ Successfully migrated conversation ${conversationId}`);
          migratedCount++;

        } else {
          console.error(`   ❌ Cannot migrate: Missing participant1_id or participant2_id`);
          console.log(`      participant1_id: ${data.participant1_id}`);
          console.log(`      participant2_id: ${data.participant2_id}`);
          errorCount++;
        }

      } catch (error) {
        console.error(`   ❌ Error migrating conversation ${conversationId}:`, error.message);
        errorCount++;
      }
    }

    // Print summary
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} conversations`);
    console.log(`   ⏭️  Skipped: ${skippedCount} conversations (already migrated)`);
    console.log(`   ❌ Errors: ${errorCount} conversations`);
    console.log(`   📊 Total processed: ${snapshot.size} conversations`);

    if (migratedCount > 0) {
      console.log('\n🚀 Migration completed! New conversations will automatically use the participants array format.');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateConversations()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error.message);
    process.exit(1);
  });