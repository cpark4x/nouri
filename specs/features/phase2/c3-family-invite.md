# Spec: C3 — Family Invite (Wife Onboarding)

**Priority:** HIGH — enables two-parent household adoption
**Phase:** 2
**Depends on:** C1 (email/password auth must exist — invite creates an email/password account)

---

## Goal

Either parent can generate a one-time invite link from settings. The link is emailed to their partner. The partner clicks the link, creates an account, and is automatically joined to the existing `Family` record. Token expires after 48 hours or after first use.

---

## Schema Change

```prisma
model FamilyInvite {
  id           String    @id @default(cuid())
  token        String    @unique @default(cuid())
  familyId     String
  invitedEmail String?   // optional — pre-fills the registration form
  createdAt    DateTime  @default(now())
  expiresAt    DateTime  // createdAt + 48h
  usedAt       DateTime? // null until redeemed
  family       Family    @relation(fields: [familyId], references: [id])
}
```

Add to `Family` model:
```prisma
model Family {
  // ... existing fields ...
  invites FamilyInvite[]
}
```

Run after schema change:
```bash
npx prisma migrate dev --name add_family_invite
npx prisma generate
```

---

## Files Changed (≤7)

| File | Action | What changes |
|------|--------|--------------|
| `prisma/schema.prisma` | Modify | Add `FamilyInvite` model; add `invites` relation to `Family` |
| `src/app/api/family/invite/route.ts` | New | POST: create invite token for current user's family |
| `src/app/api/family/invite/[token]/route.ts` | New | GET: validate token + return status; POST: redeem token (create account + join family) |
| `src/app/api/family/invite/logic.ts` | New | Pure: `createInviteToken`, `validateInviteToken`, `redeemInvite` |
| `src/app/api/family/invite/__tests__/logic.test.ts` | New | Unit tests for token lifecycle |
| `src/app/settings/page.tsx` | New or Modify | Add "Invite partner" section with generate link + copy button |
| `src/app/auth/invite/[token]/page.tsx` | New | Invite landing page: shows invite context, registration form |

---

## Implementation

### 1. logic.ts (new)

```typescript
// src/app/api/family/invite/logic.ts

export interface InviteCreateInput {
  familyId: string
  invitedEmail?: string
}

export interface InviteValidationResult {
  valid: boolean
  error?: 'not_found' | 'expired' | 'already_used'
  invite?: { familyId: string; invitedEmail: string | null }
}

/**
 * Creates a FamilyInvite record with a 48-hour expiry.
 * Returns the token string.
 */
export async function createInviteToken(input: InviteCreateInput): Promise<string>

/**
 * Validates a token. Returns status without consuming it.
 */
export async function validateInviteToken(token: string): Promise<InviteValidationResult>

/**
 * Redeems a token: creates the new User + links to Family in a transaction.
 * Marks token as used. Returns error if token invalid/expired/used.
 */
export async function redeemInvite(
  token: string,
  newUser: { email: string; password: string; name: string }
): Promise<{ success: boolean; error?: string }>
```

Token expiry check: `invite.expiresAt < new Date()` → expired. Token used check: `invite.usedAt !== null` → already used.

### 2. POST /api/family/invite — create token

```typescript
// Requires authentication (family member only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json()
  const token = await createInviteToken({
    familyId: session.user.familyId,
    invitedEmail: body.email,
  })
  const inviteUrl = `${process.env.NEXTAUTH_URL}/auth/invite/${token}`
  return Response.json({ inviteUrl }, { status: 201 })
}
```

### 3. GET /api/family/invite/[token] — validate token

```typescript
export async function GET(request: Request, { params }: { params: { token: string } }) {
  const result = await validateInviteToken(params.token)
  if (!result.valid) {
    return Response.json({ error: result.error }, { status: 400 })
  }
  return Response.json({ invitedEmail: result.invite?.invitedEmail })
}
```

### 4. POST /api/family/invite/[token] — redeem token

```typescript
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const body = await request.json()
  const result = await redeemInvite(params.token, body)
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }
  return Response.json({ success: true }, { status: 201 })
}
```

### 5. Invite landing page — /auth/invite/[token]/page.tsx

On load:
1. Fetch `GET /api/family/invite/[token]` to validate
2. If invalid/expired/used → show error message with option to ask for a new invite
3. If valid → show registration form pre-filled with `invitedEmail` (if present)

After successful account creation (POST to the token endpoint):
- Redirect to `/auth/signin?invited=true`
- Show "Account created — sign in to join your family" on sign-in page

### 6. Settings page — invite partner UI

```
Invite a family member
──────────────────────
[Email address (optional)]      [Generate invite link]

─── or ───

Invite link: https://nouri.app/auth/invite/abc123...   [Copy]
Expires in 47 hours
```

- Generate button POSTs to `/api/family/invite` with optional email
- On success, shows the generated URL with a Copy button
- Shows time remaining until expiry

---

## Test Skeleton

```typescript
// src/app/api/family/invite/__tests__/logic.test.ts
import { describe, it, expect } from 'vitest'
import { validateInviteToken, redeemInvite } from '../logic'

describe('validateInviteToken', () => {
  it('returns not_found for unknown token', async () => {
    const result = await validateInviteToken('nonexistent-token')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('not_found')
  })

  it('returns expired for a token past its expiry', async () => {
    // Create an invite with expiresAt in the past (test setup)
    // ...
    const result = await validateInviteToken(expiredToken)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('expired')
  })

  it('returns already_used for a consumed token', async () => {
    // Create an invite with usedAt set (test setup)
    // ...
    const result = await validateInviteToken(usedToken)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('already_used')
  })
})

describe('redeemInvite', () => {
  it('creates a new user and links to the family', async () => {
    // Create a valid invite for an existing family (test setup)
    // Redeem it
    // Verify user.familyId matches invite.familyId
  })

  it('marks the token as used after redemption', async () => {
    // After redemption, usedAt should be set
  })

  it('rejects a second redemption of the same token', async () => {
    // Redeem once, then try again — should return error
  })
})
```

---

## Acceptance Criteria

- [ ] Authenticated parent can generate an invite link from settings
- [ ] Link opens `/auth/invite/[token]` with registration form pre-filled with invited email (if provided)
- [ ] New user completes registration → account is linked to the inviting parent's `Family`
- [ ] Both parents can now sign in and see the same kids, meals, and data
- [ ] Expired token (>48h) shows a clear error with option to request a new invite
- [ ] Already-used token shows a clear error
- [ ] Token can only be redeemed once
- [ ] `npm test` passes (new tests included)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
