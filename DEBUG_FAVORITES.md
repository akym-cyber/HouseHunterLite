# Favorites Debugging Guide

## Issue: Favorites screen not showing properties

### Debugging Steps Added

I've added comprehensive logging to help identify the issue. When you navigate to the Favorites screen, check the console for these debug messages:

#### Console Logs to Look For:

1. **useFavorites Hook Logs:**
   ```
   🔍 useFavorites: Fetching favorites for user: [USER_ID]
   🔍 useFavorites: getFavoritesByUser result: { data: [...], error: null }
   🔍 useFavorites: Setting favorites: X items
   ```

2. **firebaseHelpers Logs:**
   ```
   🔍 favoriteHelpers: Getting favorites for user: [USER_ID]
   🔍 favoriteHelpers: Executing favorites query...
   🔍 favoriteHelpers: Query returned X documents
   🔍 favoriteHelpers: Favorite doc: [DOC_ID] -> { user_id: ..., property_id: ... }
   🔍 favoriteHelpers: Found favorite property IDs: [...]
   🔍 favoriteHelpers: Fetching property: [PROPERTY_ID]
   🔍 favoriteHelpers: Property found: [PROPERTY_TITLE]
   🔍 favoriteHelpers: Returning X properties
   ```

### Possible Issues & Solutions

#### 1. **Missing Firestore Composite Index** (Most Likely)
The query `where('user_id', '==', userId), orderBy('created_at', 'desc')` requires a composite index.

**Solution:** Create index in Firebase Console:
- Go to Firestore Database → Indexes
- Add composite index:
  - Collection: `favorites`
  - Fields:
    - `user_id` (Ascending)
    - `created_at` (Descending)

#### 2. **No Favorites in Database**
If logs show "Query returned 0 documents", users haven't favorited any properties yet.

**Solution:** Test by adding favorites first.

#### 3. **Security Rules Blocking Access**
If you see permission errors in console.

**Solution:** Check Firestore security rules allow read access to favorites collection.

#### 4. **Data Structure Mismatch**
If favorite documents exist but have different field names.

**Expected structure:**
```json
{
  "user_id": "user123",
  "property_id": "property456",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### Testing Steps

1. **Start the app:**
   ```bash
   npx expo start
   ```

2. **Navigate to Favorites screen**

3. **Check console logs** - look for the debug messages above

4. **Try adding a favorite:**
   - Go to a property detail
   - Tap the heart icon
   - Return to Favorites screen
   - Check if it appears

### Quick Test Query

You can test the favorites query directly in Firebase Console:
```
collection('favorites')
  .where('user_id', '==', '[USER_ID]')
  .orderBy('created_at', 'desc')
```

### If Issue Persists

If you still see issues after creating the index, the problem might be:
- Empty favorites collection
- Security rules
- Authentication issues
- Data corruption

Please share the console logs when you run the app, and I can provide more specific guidance.
