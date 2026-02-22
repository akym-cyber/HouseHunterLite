# HouseHunter Web (Next.js)

Production-oriented web codebase for HouseHunter, built with:
- Next.js App Router
- TypeScript
- Firebase Web SDK
- Tailwind CSS
- Zustand

## Run Locally

1. Install dependencies:
```bash
npm install
```
2. Create `.env.local` from `.env.example` and fill values.
3. Start dev server:
```bash
npm run dev
```

## Folder Architecture

```text
web/
  src/
    app/                         # Next.js routes (App Router)
    components/
      layout/                    # App shell and navigation
      providers/                 # App-level providers
    features/
      auth/
        components/
        hooks/
        store/
      properties/
        components/
        services/
        types/
      media/
        services/
    lib/
      env.client.ts              # Env validation
      firebase/client.ts         # Firebase singleton
      cloudinary.ts              # Cloudinary config helpers
    types/                       # Shared app types
```

## Scalability Notes

- Feature-first modules prevent route-level code bloat.
- Firebase and Cloudinary access is isolated in service layers.
- Zustand handles global client state with low boilerplate.
- App shell is responsive-first and shared across mobile/desktop breakpoints.
- Middleware protection is enabled for `/profile`, `/messages`, `/favorites`, `/dashboard`.
- Protected pages also validate session server-side using Firebase Admin.
- Auth flow includes:
  - Email/password sign in
  - Email/password account creation
  - Forgot password reset email flow
  - Google sign in
  - Session cookie synchronization via `/api/auth/session`
- Property listing access is available via server service and route handler:
  - `src/features/properties/services/property-server-service.ts`
  - `src/app/api/properties/route.ts`
- Chat foundation includes realtime conversation listener + pagination + scroll restore:
  - `src/features/chat/hooks/use-conversations.ts`
  - `src/features/chat/components/conversation-list.tsx`
- Favorites uses subcollection model `users/{userId}/favorites`.
- Required Firestore indexes are documented in `docs/FIRESTORE_INDEXES.md`.
- Vercel auth/session deployment checklist is in `docs/VERCEL_AUTH_SESSION_CHECKLIST.md`.
