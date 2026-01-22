# OwnerId Data Cleanup Script

## Overview
This script fixes existing properties in Firestore that have invalid `ownerId` values, specifically the placeholder string "No owner" that was used instead of valid Firebase user IDs.

## Problem
After implementing proper ownerId validation, existing properties in the database may have:
- `ownerId: "No owner"` (placeholder string)
- `ownerId: null` or empty string
- Suspiciously short ownerId values

These properties will cause the "Contact Owner" feature to fail with validation errors.

## Solution
Run the cleanup script once to:
1. Remove invalid ownerId fields from affected properties
2. Flag properties for manual owner reassignment
3. Identify properties with suspicious ownerId values for review

## Usage

### Prerequisites
- Node.js installed
- Firebase project access
- `.env` file with Firebase configuration
- `dotenv` package installed (already added as dev dependency)

### Running the Script
```bash
# From the project root (HouseHunter/HouseHunter)
cd HouseHunter/HouseHunter
node scripts/fix-invalid-owner-ids.js
```

### Expected Output
```
🚀 Firebase OwnerId Cleanup Script
=====================================

🔧 Starting cleanup of invalid ownerId values...
📊 Checking properties collection...
📋 Found 25 properties to check
🔄 Fixing property abc123: ownerId = "No owner"
✅ Fixed property: abc123 (1/25)
📊 Progress: 10/25 properties checked
...

🎉 Cleanup completed!
📈 Summary:
   - Total properties checked: 25
   - Properties fixed: 3
   - Properties flagged for review: 1

⚠️  IMPORTANT: Properties with "needsOwnerAssignment: true" need manual owner assignment

🔍 Finding properties that need owner reassignment...

📋 Properties needing owner assignment:
   - abc123: "Beautiful 2BR Apartment" (created: 2024-01-15T10:30:00Z)
   - def456: "Cozy Studio Downtown" (created: 2024-01-14T15:45:00Z)

🔍 Properties needing owner review:
   - ghi789: "Luxury Villa" (ownerId: "short")

✅ Script completed successfully!
```

## What the Script Does

### 1. Invalid OwnerId Removal
- Identifies properties with `ownerId: "No owner"`, `null`, or empty string
- Removes the invalid `ownerId` field entirely using `deleteField()`
- Adds `needsOwnerAssignment: true` flag for manual reassignment
- Adds metadata: `fixedAt` and `fixReason`

### 2. Suspicious OwnerId Detection
- Flags ownerIds shorter than 20 characters (not valid Firebase UIDs)
- Adds `needsOwnerReview: true` flag
- Adds metadata: `flaggedAt` and `flagReason`

### 3. Reporting
- Provides detailed progress during execution
- Lists all properties that need attention
- Gives clear next steps for manual intervention

## After Running the Script

### Manual Owner Assignment Required
Properties flagged with `needsOwnerAssignment: true` need owners assigned manually:

1. **Through Property Editing**: Update the property to assign a valid owner
2. **Admin Interface**: Create admin tools to bulk-assign owners
3. **User Verification**: Contact original creators to verify ownership

### Properties with `needsOwnerAssignment: true` will:
- Show error message when users try to "Contact Owner"
- Be excluded from owner-specific features
- Require manual intervention to become fully functional

### Properties with `needsOwnerReview: true` should be:
- Manually inspected by admins
- Either assigned proper owners or removed if invalid

## Security Notes
- This script requires Firebase Admin access
- Delete the script after running in production (security best practice)
- The script only reads and updates data - no deletions

## Integration with App
The app already handles invalid properties gracefully:
- Property detail screen validates ownerId before navigation
- Chat screen validates ownerId before initialization
- Clear error messages guide users to contact support

## Testing
After running the script:
1. Check Firebase Console for updated properties
2. Test "Contact Owner" on properties with `needsOwnerAssignment: true`
3. Verify error messages appear correctly
4. Test normal functionality on valid properties

## Troubleshooting
- **Missing .env**: Ensure Firebase config environment variables are set
- **Permission denied**: Check Firebase security rules allow the operations
- **Script hangs**: Large datasets may take time; monitor progress logs
- **No properties found**: Verify correct Firebase project and collection name
