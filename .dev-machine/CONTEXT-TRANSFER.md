# Nouri Dev Machine — Context Transfer

This file is the machine's working memory across sessions. The most recent session is at the top.
Each session prepends an entry here before exiting.

---

## Baseline: 2026-03-06 (Dev Machine Setup)

**Status:** Dev machine initialized. No specs implemented yet.

**Health gates:**
- lint ✅ (exit 0, warnings only)
- test ✅ (8 files, 55 tests, 0 failures)
- build ✅ (25 routes, zero TypeScript errors)
- e2e N/A

**Last shipped:** PR #4 — B3: AI meal title generation + smart input logging

**Test mock pattern for this project:**
```typescript
// Route handler mocking (for API route tests)
import { vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    mealLog: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }
  }
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'user-1', familyId: 'family-1' }
  })
}))
```

**Database:** PostgreSQL via Docker. Run `docker compose up -d` if DB is not running.
After schema changes: `npx prisma migrate dev --name <description>` then `npx prisma generate`

**Key architectural constraints:**
- Always use `extractJSON()` from `@/lib/ai/providers/utils` when parsing Claude responses
- Always check `getServerSession(authOptions)` and return 401 in API routes
- All DB queries must filter by `familyId`
- AI calls go through `@/lib/ai/router` (not providers directly)

**What NOT to do:**
- Do not use `<img>` — convert to `next/image` or leave existing ones (lint warns but doesn't block)
- Do not create new AI provider files — use existing `@/lib/ai/router`
- Do not duplicate types that already exist in Prisma schema

---

## Specs Ready to Implement (Phase 1)

1. **B4: Day Navigation** → `specs/features/phase1/b4-day-navigation.md` — HIGH priority
2. **B5: Nutrition Target Transparency** → `specs/features/phase1/b5-nutrition-targets.md` — HIGH priority  
3. **B7: Past Meals History** → `specs/features/phase1/b7-past-meals-history.md` — MEDIUM priority
4. **B8: Ingredient Constraints** → `specs/features/phase1/b8-ingredient-constraints.md` — MEDIUM priority

**BLOCKED:** B6 (image editing bug) — needs clarification from Chris on which image flow is broken.

---

## Project Context (for Fresh Sessions)

Nouri is a household nutrition tracking app for Chris and his wife to track their two kids:
- **Mason** (12yo): select hockey player, 5-6x/week high intensity
- **Charlotte** (8-9yo): gymnastics + dance

The app exists to make meal logging effortless and give parents nutritional insight without the overhead of precise measurement. AI does the heavy lifting — parents just describe what their kids ate in natural language.

**Tech stack:**
- Next.js 16.1.6, App Router, TypeScript 5, React 19, Tailwind CSS 4
- Prisma 7 + PostgreSQL (Docker locally)
- Anthropic Claude (meal parsing, tips, suggestions, chat)
- OpenAI GPT-4o (photo meal analysis)
- Google Gemini (recipe research)
- Azure Blob Storage (photos)
- NextAuth v4 + GitHub OAuth (dev auth)
- Vitest (unit tests)

**Route structure:** All auth-protected routes are under `src/app/(app)/`.
API routes are under `src/app/api/`. All API routes require session auth.
