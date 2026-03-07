# Nouri Dev Machine — Context Transfer

This file is the machine's working memory across sessions. The most recent session is at the top.
Each session prepends an entry here before exiting.

---

## Session: b4-day-navigation — 2026-03-07

### What Was Done
- Spec implemented: `/Users/chrispark/Projects/nouri/specs/features/phase1/b4-day-navigation.md`
- **Files created:**
  - `src/app/api/dashboard/logic.ts` — pure date functions: `parseDateParam`, `buildDateWindow`, `subDays`, `addDays`, `isSameDay`, `isYesterday`, `toDateParam`, `formatDateLabel`
  - `src/app/api/dashboard/__tests__/date-filter.test.ts` — 20 unit tests covering all logic functions
- **Files modified:**
  - `src/app/api/dashboard/route.ts` — now accepts `?date=YYYY-MM-DD` param; uses `parseDateParam` + `buildDateWindow` for Prisma filter; removed inline `startOfDay`/`endOfDay` helpers
  - `src/app/(app)/page.tsx` — added `selectedDate` state, prev/next arrow nav, date label ("Today"/"Yesterday"/"Feb 15"), `>` disabled when viewing today; passes `selectedDate` to ChildCard; `useEffect` re-fetches on date change
  - `src/components/dashboard/child-card.tsx` — added `selectedDate: Date` prop; added to suggestions `useEffect` deps so AI tip refreshes on nav
  - `eslint.config.mjs` — added `.worktrees/**` to `globalIgnores` (worktree `.next/` type files were causing lint errors)
  - **Pre-existing lint fixes** (unrelated to spec, fixed to unblock lint gate):
    - `src/app/api/chat/history/route.ts`
    - `src/app/api/chat/route.ts`
    - `src/app/api/child/[id]/health-record/route.ts`
    - `src/app/api/child/[id]/preferences/route.ts`
    - `src/app/api/child/[id]/update/route.ts`
    - `src/app/api/log/parse-family/route.ts`
    - `src/app/api/log/parse-photo/route.ts`
    - `src/app/api/log/parse/route.ts`
    — All replaced `(session as any).familyId` with `session.familyId ?? undefined` (type augmentation in `src/types/next-auth.d.ts` already existed)
- **Tests added:** `src/app/api/dashboard/__tests__/date-filter.test.ts` (20 tests)
- **All gates: PASS ✓**
  - test: 9 files, 75 tests, 0 failures
  - build: 36 routes, zero TypeScript errors
  - lint: exit code 0 (warnings only)
- **Commit:** `667f71b feat(b4-day-navigation): add day navigation to dashboard with date selector`

### Decisions Made
- **No date-fns** — all date utilities implemented as pure functions in `logic.ts` as spec required. Functions are simple enough (setDate arithmetic) that a library adds no value.
- **Architecture choice** — kept dashboard data-fetch in `page.tsx` (owner of `selectedDate` state) rather than moving fetch into ChildCard. ChildCard accepts `selectedDate` prop as spec requires; data updates naturally when page re-fetches. This avoids duplicate parallel requests.
- **`toDateParam` format** — formats as `YYYY-MM-DD` local time to match the user's visible calendar date (not UTC), ensuring "Today" in the UI always matches the local date the user sees.
- **Lint pre-existing errors** — `(session as any)` casts in 8 route files were pre-existing but newly surfaced errors (possibly because `.worktrees/` was added after last lint check). Fixed all of them since `Session` type augmentation already existed in `next-auth.d.ts`.

### Known Issues / Follow-up
- The suggestions API (`/api/child/[id]/suggestions`) does not accept a date param, so it always returns tips based on today's data even when viewing a past day. This is acceptable for now — suggestions are non-critical. A future spec could add `?date=` support there.
- `<img>` warnings remain in several components — pre-existing, acceptable per CONTEXT-TRANSFER baseline.

### Handoff Notes
- **Next spec to implement:** B5 — Nutrition Target Transparency (`specs/features/phase1/b5-nutrition-targets.md`)
- The dashboard API and ChildCard now fully support day navigation. B5 can build directly on top of this.
- The `logic.ts` date utilities are already available for import anywhere — no need to re-implement date helpers in future specs.
- Health gates are all green at `667f71b`.

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

1. **B4: Day Navigation** ✅ SHIPPED — `667f71b`
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
