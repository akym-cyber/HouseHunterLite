#!/usr/bin/env node

/**
 * FIRESTORE DATA MIGRATION SCRIPT
 *
 * Migrates existing conversation documents to new optimized structure
 *
 * BEFORE: participant1_id, participant2_id, last_message_at
 * AFTER:  participants[], lastMessageAt (plus existing fields preserved)
 *
 * Usage:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Set up service account key in firebase-key.json
 * 3. Run: node scripts/migrate-conversations.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

console.log('🔄 Starting Firestore Conversation Migration...');
console.log('================================================\n');

/**
 * Migration statistics
 */
const stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  startTime: Date.now()
};

/**
 * Validate conversation document structure
 */
function validateConversation(doc) {
  const data = doc.data();

  // Check for required fields
  const hasParticipant1 = data.participant1_id;
  const hasParticipant2 = data.participant2_id;
  const hasParticipants = data.participants && Array.isArray(data.participants);

  return {
    hasParticipant1,
    hasParticipant2,
    hasParticipants,
    needsMigration: hasParticipant1 && hasParticipant2 && !hasParticipants,
    data
  };
}

/**
 * Migrate a single conversation document
 */
async function migrateConversation(doc) {
  const { needsMigration, hasParticipant1, hasParticipant2, hasParticipants, data } = validateConversation(doc);

  if (!needsMigration) {
    if (hasParticipants) {
      console.log(`⏭️  Skipping ${doc.id} - already has participants array`);
      stats.skipped++;
      return;
    } else {
      console.log(`⚠️  Skipping ${doc.id} - missing required fields`);
      stats.skipped++;
      return;
    }
  }

  try {
    // Prepare migration data
    const migrationData = {};

    // Add participants array
    migrationData.participants = [data.participant1_id, data.participant2_id];

    // Convert last_message_at to lastMessageAt if needed
    if (data.last_message_at && !data.lastMessageAt) {
      migrationData.lastMessageAt = data.last_message_at;
    }

    // Add createdAt if missing
    if (!data.createdAt && data.created_at) {
      migrationData.createdAt = data.created_at;
    }

    // Ensure unreadCount exists
    if (!data.unreadCount) {
      migrationData.unreadCount = {
        [data.participant1_id]: 0,
        [data.participant2_id]: 0
      };
    }

    // Update document
    await doc.ref.update(migrationData);

    console.log(`✅ Migrated ${doc.id}:`, {
      participants: migrationData.participants,
      lastMessageAt: !!migrationData.lastMessageAt,
      createdAt: !!migrationData.createdAt
    });

    stats.migrated++;

  } catch (error) {
    console.error(`❌ Failed to migrate ${doc.id}:`, error.message);
    stats.errors++;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('📊 Analyzing existing conversations...\n');

    // Get all conversations
    const conversationsRef = db.collection('conversations');
    const snapshot = await conversationsRef.get();

    if (snapshot.empty) {
      console.log('📭 No conversations found in database');
      return;
    }

    stats.total = snapshot.size;
    console.log(`📋 Found ${stats.total} conversation documents\n`);

    // Process each conversation
    const promises = [];
    snapshot.forEach(doc => {
      promises.push(migrateConversation(doc));
    });

    // Wait for all migrations to complete
    await Promise.all(promises);

    // Show final results
    const duration = Date.now() - stats.startTime;

    console.log('\n🎉 Migration Complete!');
    console.log('====================');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Total: ${stats.total}`);
    console.log(`✅ Migrated: ${stats.migrated}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);

    if (stats.migrated > 0) {
      console.log('\n🚀 Next Steps:');
      console.log('1. Wait for Firestore index to build (1-5 minutes)');
      console.log('2. Test chat loading in your app');
      console.log('3. Check console for "PRIMARY query" success logs');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Dry run mode (optional)
 */
async function dryRun() {
  console.log('🔍 DRY RUN MODE - Analyzing without making changes...\n');

  try {
    const conversationsRef = db.collection('conversations');
    const snapshot = await conversationsRef.get();

    console.log(`📋 Found ${snapshot.size} conversations:\n`);

    snapshot.forEach(doc => {
      const { needsMigration, hasParticipant1, hasParticipant2, hasParticipants, data } = validateConversation(doc);

      console.log(`${doc.id}:`, {
        needsMigration,
        hasParticipants,
        hasParticipant1,
        hasParticipant2,
        participant1_id: data.participant1_id,
        participant2_id: data.participant2_id,
        participants: data.participants,
        lastMessageAt: !!data.lastMessageAt,
        last_message_at: !!data.last_message_at
      });
    });

  } catch (error) {
    console.error('Dry run failed:', error);
  }
}

// Check command line arguments
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  dryRun();
} else {
  console.log('⚠️  PRODUCTION MIGRATION MODE');
  console.log('This will modify your Firestore data.');
  console.log('Make sure you have a backup!\n');

  // Add a small delay to let user read the warning
  setTimeout(() => {
    runMigration();
  }, 2000);
}
