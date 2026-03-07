# Module Spec: API Routes

**Module location:** `src/app/api/`
**Spec version:** 1.0
**Architecture reference:** `specs/architecture.md`

---

## Purpose

All server-side data operations for Nouri. Every feature that reads or writes data goes through a route handler. This module defines the patterns every route must follow — no exceptions.

---

## The Three-File Pattern

Every API route with business logic uses three files:

```
src/app/api/<resource>/
├── route.ts               ← thin: auth → parse → call logic → respond
├── logic.ts               ← pure functions: no I/O, fully testable
└── __tests__/
    └── logic.test.ts      ← unit tests for logic.ts only
```

**route.ts is thin by design.** It does exactly four things:
1. Check the session (return 401 if missing)
2. Parse request params/body
3. Call logic.ts functions
4. Return a Response

**logic.ts is pure by design.** It receives typed inputs and returns typed outputs. No `prisma`, no `getServerSession`, no `fetch`. All testable with `vitest` and no mocking needed beyond DB/auth.

---

## Required Pattern: Auth Gate

Every route handler — GET, POST, PUT, DELETE — must start with:

```typescript
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... rest of handler
}
```

---

## Required Pattern: Family Scoping

Every Prisma query must scope to the session's `familyId`. Never query by ID alone.

```typescript
// ✅ Correct — scoped to family
const child = await prisma.child.findFirst({
  where: {
    id: params.id,
    family: { users: { some: { id: session.user.id } } }
  }
})

// ❌ Wrong — not scoped, data leak risk
const child = await prisma.child.findUnique({ where: { id: params.id } })
```

---

## Required Pattern: Error Surfaces

No silent failures. Every async operation that can fail must surface an error:

```typescript
try {
  const result = await someOperation()
  return Response.json({ data: result })
} catch (error) {
  console.error('Description of what failed:', error)
  return Response.json(
    { error: 'Human-readable message for the client' },
    { status: 500 }
  )
}
```

---

## Required Pattern: Async Params (Next.js 16)

Route segment params are async in Next.js 16. Always await them:

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

---

## Test Strategy

Test only `logic.ts` — not the route handler. Use these standard mocks:

```typescript
import { vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    mealLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    }
  }
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'user-1', familyId: 'family-1' }
  })
}))
```

**Minimum per feature spec:** 4 tests in `__tests__/logic.test.ts`.

---

## Existing Routes Reference

| Route | Has logic.ts? | Tests? |
|-------|--------------|--------|
| GET `/api/dashboard` | ❌ not yet | ❌ |
| POST `/api/log/save` | partial | `normalize-meal-type.test.ts` ✅ |
| PUT/DELETE `/api/log/[mealLogId]` | ✅ | `logic.test.ts` ✅ |
| GET `/api/log/[mealLogId]/tip` | ✅ | `logic.test.ts` ✅ |
| GET `/api/child/[id]/suggestions` | ✅ | `logic.test.ts` ✅ |
| GET `/api/child/[id]/weekly` | ✅ | `logic.test.ts` ✅ |
| GET `/api/child/[id]` | ❌ | ❌ |
| GET/POST `/api/recipes` | ❌ | ❌ |
