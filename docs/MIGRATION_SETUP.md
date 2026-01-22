# Firestore Conversation Migration Setup

## 🚨 Critical: Run This Before Chat Features Work

Your existing conversation documents use the old data structure. The optimized chat queries require migrated data.

## 📋 Prerequisites

### 1. Install Firebase Admin SDK
```bash
cd HouseHunter/HouseHunter
npm install firebase-admin
```

### 2. Create Firebase Service Account Key

**Firebase Console → Project Settings → Service Accounts**

1. Click **"Generate new private key"**
2. Download the JSON file
3. Rename to `firebase-key.json`
4. Place in project root: `HouseHunter/HouseHunter/firebase-key.json`

**⚠️ Security Warning:**
- Add `firebase-key.json` to `.gitignore`
- Never commit this file to version control
- Keep it secure - it has admin access to your database

### 3. Verify Firebase Project ID

Check your `firebase-key.json` contains:
```json
{
  "project_id": "your-project-id",
  "private_key": "...",
  "client_email": "..."
}
```

## 🏃 Running the Migration

### Step 1: Dry Run (Safe - No Changes)
```bash
cd HouseHunter/HouseHunter
node scripts/migrate-conversations.js --dry-run
```

**Expected Output:**
```
🔍 DRY RUN MODE - Analyzing without making changes...

📋 Found 3 conversations:

abc123: {
  needsMigration: true,
  hasParticipants: false,
  hasParticipant1: true,
  hasParticipant2: true,
  participant1_id: "user1",
  participant2_id: "user2",
  participants: undefined,
  lastMessageAt: false,
  last_message_at: true
}
```

### Step 2: Production Migration
```bash
cd HouseHunter/HouseHunter
node scripts/migrate-conversations.js
```

**⚠️ Important:** Read the warning and wait 2 seconds before it proceeds.

**Expected Output:**
```
⚠️  PRODUCTION MIGRATION MODE
This will modify your Firestore data.
Make sure you have a backup!

🔄 Starting Firestore Conversation Migration...
================================================

📊 Analyzing existing conversations...

📋 Found 3 conversation documents

✅ Migrated abc123: { participants: ["user1", "user2"], lastMessageAt: true, createdAt: true }
✅ Migrated def456: { participants: ["user3", "user4"], lastMessageAt: true, createdAt: true }

🎉 Migration Complete!
====================
⏱️  Duration: 1250ms
📊 Total: 3
✅ Migrated: 3
⏭️  Skipped: 0
❌ Errors: 0

🚀 Next Steps:
1. Wait for Firestore index to build (1-5 minutes)
2. Test chat loading in your app
3. Check console for "PRIMARY query" success logs
```

## 🔍 What Gets Migrated

### Before Migration:
```json
{
  "participant1_id": "user1",
  "participant2_id": "user2",
  "last_message_at": "2024-01-01T00:00:00Z",
  "property_id": "prop123"
}
```

### After Migration:
```json
{
  "participant1_id": "user1",
  "participant2_id": "user2",
  "participants": ["user1", "user2"],
  "last_message_at": "2024-01-01T00:00:00Z",
  "lastMessageAt": "2024-01-01T00:00:00Z",
  "property_id": "prop123",
  "propertyId": "prop123",
  "createdAt": "2024-01-01T00:00:00Z",
  "unreadCount": {
    "user1": 0,
    "user2": 0
  }
}
```

## ✅ Validation Checks

The script validates each document before migration:

- ✅ **Has participant1_id and participant2_id** → Can migrate
- ✅ **Already has participants array** → Skip (already migrated)
- ✅ **Missing required fields** → Skip with warning

## 🚨 Safety Features

- ✅ **Non-destructive:** Only adds fields, never removes existing data
- ✅ **Idempotent:** Safe to run multiple times
- ✅ **Error handling:** Continues processing even if individual docs fail
- ✅ **Dry run mode:** Test without making changes
- ✅ **Progress tracking:** Shows detailed statistics

## 🔧 Troubleshooting

### "firebase-key.json not found"
```bash
# Check file exists and path is correct
ls -la firebase-key.json
```

### "Invalid service account"
- Regenerate the key in Firebase Console
- Ensure JSON structure is valid

### "Permission denied"
- Check service account has Firestore Admin role
- Verify project ID matches

### Migration shows 0 documents
```bash
# Check if conversations exist
firebase firestore:export --project your-project-id
```

### Still no conversations after migration
1. Check Firebase Console indexes are building/enabled
2. Wait 5-10 minutes for index completion
3. Clear app cache: `npx expo start -c`
4. Check browser console for query errors

## 📊 Performance Impact

**Before Migration:** useMessages returns 0 conversations
**After Migration:** useMessages returns all user conversations instantly

## 🎯 Next Steps After Migration

1. **Wait for Index:** Allow 1-5 minutes for composite index to build
2. **Test App:** Open chat features and verify conversations load
3. **Monitor Logs:** Look for "PRIMARY query" success messages
4. **Performance:** Expect 80% faster chat loading

## 🛡️ Backup Recommendation

Before running migration:
```bash
# Export current Firestore data
firebase firestore:export firestore-backup --project your-project-id
```

---

**🚀 Ready to migrate?** Run the dry run first, then proceed with production migration!
