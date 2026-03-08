# Spec: C2 — Google OAuth Sign-In

**Priority:** HIGH — second sign-in option alongside email/password
**Phase:** 2
**Depends on:** C1 (auth.ts must have CredentialsProvider already added)

---

## Goal

Add Google OAuth as a third sign-in option. Users who sign in with Google are automatically linked to their existing account if the email matches. GitHub OAuth and email/password continue to work unchanged.

---

## Files Changed (≤3)

| File | Action | What changes |
|------|--------|--------------|
| `src/lib/auth.ts` | Modify | Add `GoogleProvider` to providers array |
| `src/app/auth/signin/page.tsx` | Modify | Add "Sign in with Google" button |
| `.env.local` (not committed) | Modify | Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` |

---

## Implementation

### 1. auth.ts — add GoogleProvider

```typescript
import GoogleProvider from 'next-auth/providers/google'

// Add to providers array (after CredentialsProvider, before or after GitHubProvider):
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
})
```

The existing `@auth/prisma-adapter` handles account linking automatically: if a Google sign-in email matches an existing `User.email`, NextAuth links the Google account to that user record via the `Account` table.

### 2. Sign-in page update

Add a "Sign in with Google" button above the email/password form:

```
[Sign in with GitHub]    ← existing
[Sign in with Google]    ← new
─── or sign in with email ───
[Email / Password form]
```

Both OAuth buttons call `signIn('google')` / `signIn('github')` respectively.

### 3. Environment variables

Add to `.env.local`:
```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

**Google Cloud Console setup (one-time manual step):**
1. Go to console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret to `.env.local`

---

## Test Skeleton

```typescript
// src/lib/__tests__/auth-providers.test.ts
import { describe, it, expect } from 'vitest'

describe('auth providers', () => {
  it('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are defined in env', () => {
    // This test verifies the env vars are present in the test environment.
    // In CI, set these as test secrets. Locally, they come from .env.local.
    expect(process.env.GOOGLE_CLIENT_ID ?? 'missing').not.toBe('missing')
    expect(process.env.GOOGLE_CLIENT_SECRET ?? 'missing').not.toBe('missing')
  })

  it('auth config exports authOptions with at least 3 providers', async () => {
    const { authOptions } = await import('@/lib/auth')
    expect(authOptions.providers.length).toBeGreaterThanOrEqual(3)
  })
})
```

**Note:** If `GOOGLE_CLIENT_ID` is not set in the test environment, mark this test as skipped rather than failing:
```typescript
it.skipIf(!process.env.GOOGLE_CLIENT_ID)('Google env vars present', () => { ... })
```

---

## Acceptance Criteria

- [ ] "Sign in with Google" button appears on `/auth/signin`
- [ ] Clicking it redirects to Google OAuth consent screen
- [ ] After Google consent, user is signed in and redirected to dashboard
- [ ] If Google email matches existing email/password account, same account is used (no duplicate)
- [ ] GitHub and email/password sign-in still work (regression)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
