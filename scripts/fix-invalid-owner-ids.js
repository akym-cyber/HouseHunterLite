#!/usr/bin/env node

/**
 * ONE-TIME DATA CLEANUP SCRIPT
 *
 * Fixes existing properties with invalid ownerId values ("No owner")
 * Run this script once after deploying the ownerId validation fixes
 *
 * Usage: node scripts/fix-invalid-owner-ids.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, deleteField } = require('firebase/firestore');

// Firebase config - use environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixInvalidOwnerIds() {
  console.log('🔧 Starting cleanup of invalid ownerId values...');
  console.log('📊 Checking properties collection...');

  try {
    const propertiesRef = collection(db, 'properties');
    const snapshot = await getDocs(propertiesRef);

    let fixedCount = 0;
    let totalChecked = 0;

    console.log(`📋 Found ${snapshot.size} properties to check`);

    for (const doc of snapshot.docs) {
      totalChecked++;
      const data = doc.data();
      const propertyId = doc.id;

      // Check for invalid ownerId values
      if (data.ownerId === 'No owner' || data.ownerId === '' || data.ownerId === null) {
        console.log(`🔄 Fixing property ${propertyId}: ownerId = "${data.ownerId}"`);

        // Update the document to remove invalid ownerId
        await updateDoc(doc.ref, {
          ownerId: deleteField(), // Remove the field entirely
          needsOwnerAssignment: true, // Flag for manual assignment
          fixedAt: new Date().toISOString(),
          fixReason: 'Invalid ownerId cleanup'
        });

        fixedCount++;
        console.log(`✅ Fixed property: ${propertyId} (${fixedCount}/${totalChecked})`);
      } else if (data.ownerId && data.ownerId.length < 20) {
        // Check for suspiciously short ownerIds (not valid Firebase UIDs)
        console.log(`⚠️  Suspicious ownerId for property ${propertyId}: "${data.ownerId}" (length: ${data.ownerId.length})`);

        // Flag for manual review
        await updateDoc(doc.ref, {
          needsOwnerReview: true,
          flaggedAt: new Date().toISOString(),
          flagReason: 'Suspiciously short ownerId'
        });

        console.log(`🏷️  Flagged property for review: ${propertyId}`);
      }

      // Progress indicator
      if (totalChecked % 10 === 0) {
        console.log(`📊 Progress: ${totalChecked}/${snapshot.size} properties checked`);
      }
    }

    console.log('\n🎉 Cleanup completed!');
    console.log(`📈 Summary:`);
    console.log(`   - Total properties checked: ${totalChecked}`);
    console.log(`   - Properties fixed: ${fixedCount}`);
    console.log(`   - Properties flagged for review: ${snapshot.size - (totalChecked - fixedCount)}`);

    if (fixedCount > 0) {
      console.log('\n⚠️  IMPORTANT: Properties with "needsOwnerAssignment: true" need manual owner assignment');
      console.log('   These properties will show an error when users try to contact the owner.');
      console.log('   Owners should be assigned through property editing or admin tools.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Additional function to find properties with valid owners that need reassignment
async function findPropertiesNeedingReassignment() {
  console.log('\n🔍 Finding properties that need owner reassignment...');

  try {
    const propertiesRef = collection(db, 'properties');
    const snapshot = await getDocs(propertiesRef);

    const needsAssignment = [];
    const needsReview = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.needsOwnerAssignment) {
        needsAssignment.push({
          id: doc.id,
          title: data.title,
          createdAt: data.createdAt
        });
      }
      if (data.needsOwnerReview) {
        needsReview.push({
          id: doc.id,
          title: data.title,
          ownerId: data.ownerId
        });
      }
    });

    if (needsAssignment.length > 0) {
      console.log('\n📋 Properties needing owner assignment:');
      needsAssignment.forEach(prop => {
        console.log(`   - ${prop.id}: "${prop.title}" (created: ${prop.createdAt})`);
      });
    }

    if (needsReview.length > 0) {
      console.log('\n🔍 Properties needing owner review:');
      needsReview.forEach(prop => {
        console.log(`   - ${prop.id}: "${prop.title}" (ownerId: "${prop.ownerId}")`);
      });
    }

    if (needsAssignment.length === 0 && needsReview.length === 0) {
      console.log('✅ No properties need attention');
    }

  } catch (error) {
    console.error('❌ Error finding properties needing reassignment:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Firebase OwnerId Cleanup Script');
  console.log('=====================================\n');

  // Load environment variables
  require('dotenv').config();

  if (!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error('❌ Missing Firebase configuration. Please check your .env file.');
    process.exit(1);
  }

  try {
    await fixInvalidOwnerIds();
    await findPropertiesNeedingReassignment();

    console.log('\n✅ Script completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run this script in production to fix existing data');
    console.log('   2. Monitor properties with "needsOwnerAssignment" flag');
    console.log('   3. Assign owners through property editing or admin interface');
    console.log('   4. Delete this script after running (security best practice)');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fixInvalidOwnerIds, findPropertiesNeedingReassignment };
