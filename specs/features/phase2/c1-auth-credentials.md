# Spec: C1 — Email + Password Authentication

**Priority:** HIGH — unlocks household adoption (removes GitHub dependency)
**Phase:** 2
**Depends on:** None (additive — GitHub OAuth continues to work)

---

## Goal

Replace GitHub-only auth with email/password sign-in and registration. GitHub OAuth remains active as a fallback. Both parents can have separate accounts. New users register at `/auth/register`; existing users sign in at `/auth/signin` with either GitHub or email+password.

---

## New Dependency

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

---

## Files Changed (≤8)

| File | Action | What changes |
|------|--------|--------------|
| `prisma/schema.prisma` | Modify | Add `passwordHash String?` to `User` model |
| `src/lib/auth.ts` | Modify | Add `CredentialsProvider` alongside existing `GitHubProvider` |
| `src/app/api/auth/register/route.ts` | New | POST handler: validate input → hash password → create user → link to family |
| `src/app/api/auth/register/logic.ts` | New | Pure: `validateRegisterInput`, `hashPassword`, `verifyPassword` |
| `src/app/api/auth/register/__tests__/logic.test.ts` | New | Unit tests for registration logic |
| `src/app/auth/register/page.tsx` | New | Registration page UI (email, password, name fields) |
| `src/app/auth/signin/page.tsx` | Modify | Add email/password form below existing GitHub button |

---

## Implementation

### 1. Prisma Schema

```prisma
model User {
  // ... existing fields ...
  passwordHash String?   // null for OAuth-only users
}
```

Run after schema change:
```bash
npx prisma migrate dev --name add_user_password_hash
npx prisma generate
```

### 2. logic.ts (new)

```typescript
// src/app/api/auth/register/logic.ts
import bcrypt from 'bcryptjs'

export interface RegisterInput {
  email: string
  password: string
  name: string
}

export interface RegisterValidation {
  valid: boolean
  error?: string
}

/**
 * Validates registration input. Returns error if invalid.
 */
export function validateRegisterInput(input: RegisterInput): RegisterValidation

/**
 * Hashes a plaintext password. Uses bcrypt with cost factor 12.
 */
export async function hashPassword(password: string): Promise<string>

/**
 * Verifies a plaintext password against a stored hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean>
```

Validation rules:
- `email`: must contain `@` and `.` — use `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `password`: minimum 8 characters
- `name`: minimum 1 character, trimmed

### 3. register/route.ts (new)

```typescript
export async function POST(request: Request) {
  const body = await request.json()
  const validation = validateRegisterInput(body)
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) {
    return Response.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const passwordHash = await hashPassword(body.password)

  // Create user + family in a transaction
  await prisma.$transaction(async (tx) => {
    const family = await tx.family.create({ data: {} })
    await tx.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        familyId: family.id,
      }
    })
  })

  return Response.json({ success: true }, { status: 201 })
}
```

### 4. auth.ts — add CredentialsProvider

```typescript
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

// Add to providers array:
CredentialsProvider({
  name: 'Email',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: { family: true }
    })
    if (!user?.passwordHash) return null  // OAuth-only user
    const valid = await bcrypt.compare(credentials.password, user.passwordHash)
    if (!valid) return null
    return { id: user.id, email: user.email ?? '', name: user.name, familyId: user.familyId }
  }
})
```

### 5. sign-in page update

Below the existing GitHub button, add:

```
─── or sign in with email ───

[Email input]
[Password input]
[Sign in button]

Don't have an account? Register →
```

`Register →` links to `/auth/register`.

### 6. register/page.tsx (new)

Simple form: Name, Email, Password fields. POST to `/api/auth/register`. On success, redirect to `/auth/signin` with `?registered=true`. Show "Account created — sign in below" message on sign-in page when query param present.

---

## Test Skeleton

```typescript
// src/app/api/auth/register/__tests__/logic.test.ts
import { describe, it, expect } from 'vitest'
import { validateRegisterInput, hashPassword, verifyPassword } from '../logic'

describe('validateRegisterInput', () => {
  it('accepts valid email, password, name', () => {
    const result = validateRegisterInput({ email: 'test@example.com', password: 'password123', name: 'Chris' })
    expect(result.valid).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = validateRegisterInput({ email: 'notanemail', password: 'password123', name: 'Chris' })
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects password shorter than 8 characters', () => {
    const result = validateRegisterInput({ email: 'test@example.com', password: 'short', name: 'Chris' })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/password/i)
  })

  it('rejects empty name', () => {
    const result = validateRegisterInput({ email: 'test@example.com', password: 'password123', name: '' })
    expect(result.valid).toBe(false)
  })
})

describe('hashPassword / verifyPassword', () => {
  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('mypassword123')
    const valid = await verifyPassword('mypassword123', hash)
    expect(valid).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('mypassword123')
    const valid = await verifyPassword('wrongpassword', hash)
    expect(valid).toBe(false)
  })
})
```

---

## Acceptance Criteria

- [ ] New user can register at `/auth/register` with email + password + name
- [ ] Duplicate email registration returns a clear error message
- [ ] Registered user can sign in with email + password at `/auth/signin`
- [ ] Wrong password shows error — does not sign in
- [ ] GitHub OAuth sign-in still works (regression test)
- [ ] Passwords are hashed with bcrypt — `passwordHash` in DB is never plaintext
- [ ] `npm test` passes (new tests included)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
