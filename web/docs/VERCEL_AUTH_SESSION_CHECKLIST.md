# Vercel Deployment Checklist (Auth + Session Cookie)

Use this checklist before promoting to production.

## 1) Vercel Project Setup

- Set project root to `web/`.
- Framework preset: Next.js.
- Build command: `next build` (default).
- Install command: `npm install` (default).

## 2) Required Environment Variables

Configure these in Vercel for **Production** and **Preview**:

### Public Firebase (client)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

### Cloudinary (client upload)

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### Firebase Admin (server-only)

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Important:

- Store private key with escaped line breaks (`\n`) in Vercel.
- The app converts `\\n` to real newlines in server code.

## 3) Firebase Console Configuration

### Authentication

- Enable Email/Password provider.
- Enable Google provider.
- Add authorized domains:
  - `localhost` (for local)
  - your Vercel production domain
  - your preview domain pattern if needed

### Firestore Rules and Indexes

- Deploy secure rules before launch.
- Create indexes listed in `docs/FIRESTORE_INDEXES.md`.

## 4) Session Cookie Verification

The API route `src/app/api/auth/session/route.ts` must:

- Set `httpOnly: true`
- Set `secure: true` in production
- Set `sameSite: "lax"`
- Set path `/`

Check in browser devtools after login:

- Cookie name: `househunter_session`
- HttpOnly: true
- Secure: true (on HTTPS prod)
- SameSite: Lax

## 5) Middleware and Protected Routes

Confirm middleware protects:

- `/profile`
- `/messages`
- `/favorites`
- `/dashboard`

And protected pages also run server-side `requireSession(...)`.

## 6) Smoke Tests Before Go-Live

- Sign up with email/password.
- Sign in with email/password.
- Sign in with Google.
- Trigger forgot password and confirm reset email arrives.
- Sign out and verify protected routes redirect to login.
- Log in and verify redirect back to original `next` path.

## 7) Common Failure Points

- Missing Firebase Admin env values (server auth fails).
- Unauthorized Google domain (popup auth fails).
- Firestore index missing (query fails with index link).
- Cookie not set due to bad API response (check Network tab for `/api/auth/session`).

