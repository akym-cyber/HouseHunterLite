# Firestore Indexes (HouseHunter Web)

To keep query performance stable at scale, create these composite indexes:

## Properties

1. Collection: `properties`
   - Fields:
     - `ownerId` (Ascending)
     - `createdAt` (Descending)

Used by: owner-scoped listing queries with pagination.

## Conversations

1. Collection: `conversations`
   - Fields:
     - `participantIds` (Array contains)
     - `updatedAt` (Descending)

Used by: realtime conversation list per user.

## Favorites

Favorites are read from user subcollections:

`users/{userId}/favorites` ordered by `savedAt DESC`.

This is naturally scoped by path + ordered field and remains efficient for user-level reads.

