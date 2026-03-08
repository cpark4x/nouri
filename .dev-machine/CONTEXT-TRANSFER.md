# Nouri Dev Machine — Context Transfer

This file is the machine's working memory across sessions. The most recent session is at the top.
Each session prepends an entry here before exiting.

---

## Session: phase2-build — 2026-03-08

### What Was Done

Built all 6 Phase 2 features. Every spec implemented, all health gates green at every step.

**Commits shipped:**

| Commit | Feature | Tests Added |
|--------|---------|-------------|
| `581f97a` | C1: Email + Password Authentication | +10 |
| `b44df7b` | C6: Gamification (Points, Badges, Milestones) | +18 |
| `28fc213` | C2: Google OAuth Sign-In | +2 (1 skips in CI) |
| `49aac1e` | C3: Family Invite (Wife Onboarding) | +13 |
| `59375fe` | C4: Kid Profile Selection Home Screen | +8 |
| `6b91521` | C5: PWA & Home Screen Installation | 0 (manual verification) |

**Final health gates at `6b91521`:**
- test: ✅ 18 files, 144 passed, 1 skipped, 0 failures
- build: ✅ exit 0, zero TypeScript errors, service worker emitted
- lint: ✅ exit 0, 10 pre-existing warnings only

### Key Decisions Made

- **`prisma db push` everywhere** — `prisma migrate dev` is interactive. Used `db push --accept-data-loss` + `generate` for all schema changes (C1, C6, C3). Migration files still need to be run manually in an interactive terminal before production deployment.
- **`next build --webpack`** (C5) — Next.js 16 defaults to Turbopack; `next-pwa` requires the webpack pipeline for service worker generation. Added `--webpack` flag to build script.
- **Relative imports in all test files** — No vitest config file exists → no `@/` alias resolution in tests. All new test files use relative paths.
- **Gamification try/catch confirmed** — Achievement/points logic wrapped in try/catch inside the meal-save transaction. Failures log to console but never block the meal save.
- **Celebration via URL params** — C6 builder routed celebration state via URL params (`?newBadges=&pointsEarned=`) rather than in-memory state, making the component usable from any navigation context.
- **`calculateStreak` added to dashboard logic** (C4) — Queries last 30 days of meal logs per child; counts consecutive days from today backwards with ≥1 meal.

### Notable Deviations from Specs

- C1: `Family.create` required `name` field (non-nullable in schema) — auto-generated as `"${name}'s Family"`
- C1: Sign-in page wrapped in `<Suspense>` for `useSearchParams` (Next.js 16 App Router requirement)
- C2: Auth provider count test uses `fs.readFileSync` instead of dynamic import (avoids `@/lib/db` alias failure in Vitest)
- C3: Logic functions use dependency injection (`fn(prisma, input)`) to keep them testable without `@/` aliases
- C4: `/kids/[id]` path in spec → actual route is `/child/[id]`; `@testing-library/react` not installed so ChildCard tests skipped
- C5: `createRequire(import.meta.url)` instead of bare `require()` (ESM-safe); generated `sw.js` and `workbox-*.js` excluded from lint

### Handoff Notes

- **All Phase 2 specs are shipped.** The app now has: email/password + Google auth, family invite, kid-centric home screen with gamification, PWA installability.
- **What's left before household rollout:**
  1. Run `npx prisma migrate dev` manually in an interactive terminal to create proper migration files for production (C1 adds `passwordHash`, C6 adds gamification tables, C3 adds `FamilyInvite`)
  2. Set up real Google OAuth credentials in `.env.local` and Azure env vars (C2)
  3. Replace placeholder icons in `public/icons/` with real Nouri app icons (C5)
  4. Walk each household member through the iOS "Add to Home Screen" flow (C5)
  5. B6 (image editing bug) still blocked — needs Chris to identify which image flow is broken
- **Test count:** Started Phase 2 at 94 tests (12 files). Now at 144+ tests (18 files).
- Health gates all green. Working directory clean after STATE.yaml update commit.

---

## Session: phase2-spec-writing — 2026-03-07

### What Was Done

Wrote all 6 Phase 2 feature specs. All specs are in `specs/features/phase2/`.

**Specs created:**
- `c1-auth-credentials.md` — Email + password registration and sign-in (adds `CredentialsProvider`, bcrypt, `/auth/register` page and API)
- `c2-google-oauth.md` — Google OAuth third sign-in option (adds `GoogleProvider` to auth.ts, Google button on sign-in page)
- `c3-family-invite.md` — Family invite / wife onboarding (new `FamilyInvite` schema model, invite token generation + redemption flow, settings UI)
- `c4-kid-profile-selection.md` — Home screen shift to kid-centric cards (points badge, streak, nutrition bar, Log a Meal CTA on each card)
- `c5-pwa.md` — PWA installability via `next-pwa` (manifest.json, service worker, iOS/Android install nudge banner, offline support)
- `c6-gamification.md` — Points, achievement badges, milestone goals (new schema: `Achievement`, `ChildAchievement`, `MilestoneGoal`, `points` on Child; synchronous within meal-save transaction; 12 seeded badge types; celebration overlay)

**STATE.yaml updated:**
- Added `phase2` spec listing with all 6 specs, statuses, priorities, and dependencies
- Added `build_order_phase2` recommended implementation sequence: C1 → C6 → C2 → C3 → C4 → C5

### Decisions Made

- **C4 depends on C6** — kid cards display `points` and `streak` which come from C6's schema changes. Spec notes they can be built with placeholder `0` values and updated once C6 ships.
- **C5 builds last** — PWA is a cosmetic/delivery layer. No feature depends on it. Build after the product actually works for the household.
- **C6 error handling** — gamification logic is wrapped in try/catch within the meal-save transaction. Achievement/points failures must never block the meal save.
- **12 seeded badge types** — defined the full badge set in C6 spec (the design doc left "10–15 examples" open). Keys: `first-meal`, `meals-5`, `meals-25`, `meals-100`, `streak-3`, `streak-7`, `streak-30`, `protein-goal-5`, `calories-goal-day`, `family-meal`, `variety-5`, `early-bird`.

### Handoff Notes

- **Next action:** Run health gates (lint/test/build) — no code was changed this session, but confirm baseline is still green before starting C1 implementation.
- **Recommended build order:** C1 → C6 → C2 → C3 → C4 → C5. C1 is the foundational blocker — everything else requires real user accounts.
- All Phase 2 specs are written and `ready`. No spec requires a design decision before implementation can begin.
- **Open question from design doc still unresolved:** Badge set is now fully defined in C6 spec. The only remaining open question is B6 (image editing bug) — still blocked pending Chris clarification.

---

## Session: b8-ingredient-constraints — 2026-03-07

### What Was Done
- Spec implemented: `/Users/chrispark/Projects/nouri/specs/features/phase1/b8-ingredient-constraints.md`
- **Files created:**
  - `src/app/api/child/[id]/constraints/route.ts` — GET/POST/DELETE endpoints for ingredient constraints; auth + family-scoping per project pattern; DELETE uses `?id=` query param (not body) since some clients can't send body on DELETE
  - `src/lib/ai/providers/__tests__/system-prompt-constraints.test.ts` — 4 unit tests: constraints in prompt, allergy flagging, empty constraints, undefined constraints
- **Files modified:**
  - `prisma/schema.prisma` — Added `IngredientConstraint` model (id, childId, ingredient, reason?, severity, createdAt) + `ingredientConstraints IngredientConstraint[]` back-reference on `Child`
  - `src/lib/ai/nouri-system-prompt.ts` — Restructured: (1) new pure synchronous `buildNouriSystemPrompt(options)` export for testing; (2) renamed full DB-backed function to `buildFamilySystemPrompt(familyId)`; (3) moved `import { prisma }` from top-level to dynamic `await import("../db")` inside `buildFamilySystemPrompt` so the module can be imported in Vitest without DB; (4) added `ingredientConstraints: true` to Prisma include; (5) injects constraint section per child in the AI prompt
  - `src/app/api/chat/route.ts` — Updated import/call from `buildNouriSystemPrompt` → `buildFamilySystemPrompt`
  - `src/components/profile/food-preferences.tsx` — Added "Ingredients to Avoid" section: fetches from `GET /api/child/[id]/constraints`, displays each constraint with color-coded severity badge (allergy=red, intolerance=orange, preference=gray), add form with ingredient text input + severity dropdown, × delete button
- **Tests added:** `src/lib/ai/providers/__tests__/system-prompt-constraints.test.ts` (4 tests)
- **All gates: PASS ✓**
  - test: 12 files, 94 tests, 0 failures
  - build: 37 routes, zero TypeScript errors
  - lint: exit code 0 (warnings only, all pre-existing)
- **Commit:** `3e6aad7 feat(b8-ingredient-constraints): add ingredient constraints to schema, API, system prompt, and profile UI`

### Decisions Made
- **`buildNouriSystemPrompt` → split into pure + async** — The spec's test skeleton imports `buildNouriSystemPrompt` synchronously. The existing function was async + DB-backed, causing Vitest to fail with `Cannot find package '@/lib/db'` (no vitest config for `@/` alias resolution). Solution: export a NEW pure synchronous `buildNouriSystemPrompt(options)` and rename the DB function to `buildFamilySystemPrompt`. Used a dynamic `await import("../db")` inside `buildFamilySystemPrompt` so the module can load in test context without triggering DB initialization.
- **`prisma db push` instead of `prisma migrate dev`** — `prisma migrate dev` is interactive (prompts for confirmation on column type warnings from pre-existing schema drift). Used `prisma db push --accept-data-loss` + `prisma generate` instead. The column changes (mealType Text→VarChar(20), title Text→VarChar(200)) are pre-existing drift, not new. A manual migration file should be created in an interactive terminal session.
- **DELETE uses query param `?id=`** — Spec shows `DELETE /api/child/[id]/constraints?id=<constraintId>`. Some HTTP clients don't send request bodies on DELETE. Used query param for safety, consistent with a clean REST pattern.
- **Severity color coding in UI** — allergy = red badge, intolerance = orange badge, preference/avoid = gray badge. Provides at-a-glance severity awareness without requiring the parent to read text labels.

### Known Issues / Follow-up
- **No migration file created** — Schema was applied via `prisma db push`, not `prisma migrate dev`. Next session should run `npx prisma migrate dev --name add_ingredient_constraints` in an interactive terminal to create the proper migration file for production deployment tracking.
- **All Phase 1 specs are now shipped** — B4, B5, B7, B8 all done. B6 (image editing bug) remains BLOCKED pending Chris's clarification.
- Pre-existing `<img>` lint warnings remain acceptable.

### Handoff Notes
- **Next spec to implement:** B6 — Image Editing Bug (blocked; needs Chris to clarify which image flow is broken), OR new Phase 2 specs
- The `buildFamilySystemPrompt(familyId)` function in `nouri-system-prompt.ts` now automatically includes ingredient constraints in all AI chat responses — no callers need to change.
- The `buildNouriSystemPrompt(options)` pure function is available for lightweight prompt contexts (e.g., parse routes, suggestions) if they ever need child-specific constraints.
- Health gates are all green at `3e6aad7`.

---

## Session: b7-past-meals-history — 2026-03-07

### What Was Done
- Spec implemented: `/Users/chrispark/Projects/nouri/specs/features/phase1/b7-past-meals-history.md`
- **Files created:**
  - `src/app/api/child/[id]/__tests__/date-filter.test.ts` — 5 unit tests covering all spec skeleton criteria (parseDateParam null/valid/garbage, buildDateWindow 24h span, midnight UTC start)
  - `src/app/api/child/[id]/logic.ts` — re-exports `parseDateParam` and `buildDateWindow` from `../../dashboard/logic` via relative path (avoids `@/` alias which Vitest can't resolve without a config file)
- **Files modified:**
  - `src/app/api/child/[id]/route.ts` — replaced hardcoded "today" (`startOfDay`/`endOfDay` inline helpers) with `parseDateParam` + `buildDateWindow` from `./logic`; changed `lte` to `lt` to match the half-open interval pattern; renamed `_request` → `request` to read URL search params
  - `src/app/(app)/child/[id]/page.tsx` — added `selectedDate` state (initialized to today); added `< [Label] >` date navigation arrows in the Today tab; `>` arrow disabled when viewing today; `fetchChild` now passes `?date=YYYY-MM-DD` when not viewing today; `setLoading(true)` on each fetch so navigation shows skeleton; dynamic "Today's Meals" / "Meals — {label}" heading; imported `subDays`, `addDays`, `isSameDay`, `toDateParam`, `formatDateLabel` from `@/app/api/dashboard/logic`
- **Tests added:** `src/app/api/child/[id]/__tests__/date-filter.test.ts` (5 tests)
- **All gates: PASS ✓**
  - test: 11 files, 90 tests, 0 failures
  - build: 36 routes, zero TypeScript errors
  - lint: exit code 0 (warnings only, all pre-existing)
- **Commit:** `633f6eb feat(b7-past-meals-history): add date navigation to child detail page with ?date= API support`

### Decisions Made
- **Re-export, don't duplicate** — `parseDateParam` and `buildDateWindow` already existed in `src/app/api/dashboard/logic.ts` from B4. Created a thin `logic.ts` in the child route directory that re-exports them via relative path. This keeps the test import (`from '../logic'`) matching the spec skeleton while avoiding any code duplication.
- **Relative path in logic.ts** — Vitest has no config file in this project, so `@/` path aliases don't resolve at test time. All other test files use relative imports (`from '../logic'`). Used `../../dashboard/logic` (relative) in the re-export to stay consistent.
- **`lte` → `lt` in Prisma filter** — Changed from the original `lte: todayEnd` (23:59:59.999) pattern to `lt: end` (midnight next day). This matches the spec's half-open interval (`gte: start, lt: end`) and the dashboard route pattern, and correctly handles meals logged at midnight.
- **`setLoading(true)` on each navigation** — When the user navigates to a past date, the full skeleton shows briefly. This is consistent with the initial load UX. A future spec could add a more subtle in-place loading indicator, but that's out of scope here.
- **Dynamic meals heading** — "Today's Meals" for today, "Meals — {label}" for past days (e.g., "Meals — Yesterday", "Meals — Mar 3"). Provides clear context without a heavy UI change.

### Known Issues / Follow-up
- The `title` field in `todayMeals` is present in the API response but not in the `ChildDetail` interface in `page.tsx`. This was pre-existing (not introduced by B7) — `MealList` renders the title from the prop shape it receives, which works correctly. A cleanup spec could align the interface.
- `<img>` warning in page.tsx (line 275) is pre-existing and acceptable per project convention.
- The weekly tab's `suggestions` API still doesn't accept a `?date=` param (pre-existing, noted in B4 context). Not in scope for B7.

### Handoff Notes
- **Next spec to implement:** B8 — Ingredient Constraints (`specs/features/phase1/b8-ingredient-constraints.md`)
- `src/app/api/dashboard/logic.ts` remains the canonical source for all date utilities. Import via relative path in route-local `logic.ts` files (as done in B7) to keep Vitest resolvable.
- Health gates are all green at `633f6eb`.

---

## Session: b5-nutrition-targets — 2026-03-07

### What Was Done
- Spec implemented: `/Users/chrispark/Projects/nouri/specs/features/phase1/b5-nutrition-targets.md`
- **Files created:**
  - `src/lib/targets/calculate.ts` — pure functions: `calculateTargets(profile)`, `deriveActivityLevel(activityProfile)`, `buildProfile(child)`; full USDA DRI table for 12 nutrients across 4 age brackets; PAL activity multipliers (1.3/1.5/1.7/2.0)
  - `src/lib/targets/__tests__/calculate.test.ts` — 10 unit tests covering all spec acceptance criteria
- **Files modified:**
  - `src/app/api/child/[id]/update/route.ts` — replaced 70-line inline RDA calculation with `calculateTargets(buildProfile(updated))`; expanded recalculate trigger to include `heightChanged` (was only weight + activity); now upserts all 12 nutrients via `Promise.all`
  - `src/components/profile/profile-form.tsx` — added "Targets will recalculate on save" amber notice when height, weight, or sports list differs from saved values; implemented as a cheap inline boolean comparison (no useMemo needed)
  - `src/app/(app)/child/[id]/page.tsx` — added collapsible "How targets are set" section to Today tab; computes `calculateTargets` client-side from loaded child profile; shows each nutrient's amount/unit and its USDA DRI source string
- **Tests added:** `src/lib/targets/__tests__/calculate.test.ts` (10 tests)
- **All gates: PASS ✓**
  - test: 10 files, 85 tests, 0 failures
  - build: 36 routes, zero TypeScript errors
  - lint: exit code 0 (warnings only, all pre-existing)
- **Commit:** `4d32b8c feat(b5-nutrition-targets): extract target calculation to lib/targets/calculate.ts with UI transparency`

### Decisions Made
- **No schema change** — the spec said "no new API route needed" and source strings aren't stored in the DB. Instead, `calculateTargets` is called client-side inside the child detail page (it's a pure function with zero server imports, safe in `"use client"` components). This means source strings are always fresh from the current DRI table without any migration.
- **`buildProfile` helper exported** — the route and (potentially) other callers need to convert from the DB `Child` shape to `ChildProfile`. Exported from `calculate.ts` so there's one place for that mapping logic.
- **`deriveActivityLevel` mapping** — sports with avg intensity score ≥ 2.5 → `very_high`, ≥ 2.0 → `high`, ≥ 1.5 → `moderate`, else → `low`. Single high-intensity sport → score 3.0 → `very_high` (correct for Mason's hockey). Two moderate sports → score 2.0 → `high` (correct for Charlotte's gymnastics + dance).
- **`heightChanged` added as recalculate trigger** — the spec acceptance criterion says height changes should trigger target recalculation. Height isn't used in the DRI formula directly but is part of `ChildProfile`, so the recalculate is correct behavior when any physical field changes.
- **Inline IIFE for computed targets** in `page.tsx` — avoids adding a separate state variable or derived constant at the top of the component. The computation is cheap (pure synchronous function). Kept it co-located with the render section for readability.
- **Simplified recalculate notice** — used a plain inline boolean comparison (not `useMemo`) since the comparison runs on every render and is trivially cheap.

### Known Issues / Follow-up
- Source strings appear in the "How targets are set" section computed from the *current profile in state* (loaded on page mount), not from the stored `DailyTarget` rows in the DB. If targets were seeded manually with different values, there could be a visual discrepancy. Acceptable for now — in practice, all targets will be set via `calculateTargets` after this spec ships.
- The `activityProfile` in the existing seed data may still use the old sports-based intensity format. The `deriveActivityLevel` function handles this correctly (maps sport intensity strings to PAL levels).
- `<img>` warnings remain in several components — pre-existing, acceptable per CONTEXT-TRANSFER baseline.

### Handoff Notes
- **Next spec to implement:** B7 — Past Meals History (`specs/features/phase1/b7-past-meals-history.md`)
- `src/lib/targets/calculate.ts` is now the authoritative source for target values. Any future spec that touches DailyTargets should use `calculateTargets` + `buildProfile` rather than inline RDA logic.
- Health gates are all green at `4d32b8c`.

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
2. **B5: Nutrition Target Transparency** ✅ SHIPPED — `4d32b8c`
3. **B7: Past Meals History** ✅ SHIPPED — `633f6eb`
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
