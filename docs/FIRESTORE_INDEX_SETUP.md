# Firestore Composite Index Setup Guide

## 🚨 Index Required for Chat Performance

After optimizing chat queries, your app now requires a Firestore composite index for optimal performance.

### 📋 Index Details

**Collection:** `conversations`
**Fields:**
- `participants` (Ascending)
- `lastMessageAt` (Descending)
**Query Scope:** Collection

### 🔧 How to Create the Index

#### Option 1: Automatic (Recommended)
1. **Trigger the error** by using the chat feature in your app
2. **Check console logs** for the Firebase error message
3. **Click the link** in the error: `You can create it here: [LINK]`
4. **Firebase Console** will open automatically
5. **Click "Create Index"** - takes 1-5 minutes to build

#### Option 2: Manual Creation
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Firestore Database
3. Click **"Indexes"** in the left sidebar
4. Click **"Add Index"**
5. Fill in the details:
   - **Collection ID:** `conversations`
   - **Fields to index:**
     - Field: `participants`, Order: `Ascending`
     - Field: `lastMessageAt`, Order: `Descending`
6. Click **"Create Index"**

### 📊 Index Status

After creation, the index status will be:
- **Creating** (1-5 minutes)
- **Ready** (optimal performance)

### 🔄 Fallback Behavior

While the index builds, your app will:
- ✅ **Continue working** with fallback query
- ⚠️ **Show slower performance** (manual sorting)
- 📱 **Display user message:** "Using slower query while index builds (normal)"

### ✅ Verification

Once index is ready, you'll see in console:
```
✅ useMessages: Conversations loaded (PRIMARY) in XXXms
```

Instead of:
```
⚠️ useMessages: Conversations loaded (FALLBACK) in XXXms
```

### 🚀 Performance Impact

**Before Index:**
- Query time: 2000-5000ms
- Manual sorting required
- Higher Firestore costs

**After Index:**
- Query time: 200-800ms
- Automatic Firestore sorting
- Optimal performance

### 🔍 Query Explanation

The optimized query:
```javascript
query(
  conversationsRef,
  where('participants', 'array-contains', user.id),
  orderBy('lastMessageAt', 'desc'),
  limit(50)
);
```

**Why it needs an index:**
- `array-contains` on `participants` field
- Combined with `orderBy` on `lastMessageAt`
- Requires composite index for efficient execution

### 🛠️ Troubleshooting

**Index still not working?**
1. Check Firebase Console - ensure index is "Ready"
2. Clear app cache: `npx expo start -c`
3. Restart Metro bundler
4. Check Firestore security rules allow read access

**Still seeing fallback queries?**
- Index might still be building (wait 5-10 minutes)
- Check browser console for index creation link
- Verify collection name is exactly `conversations`

### 📝 Notes

- Index creation is **one-time setup**
- Required for **production performance**
- Safe to deploy with fallback query
- Index builds automatically in background

---

**Need help?** Check the Firebase Console indexes tab for status and error messages.
