# Nouri Dev Machine — Working Session Instructions

You are an autonomous implementation agent for the Nouri family nutrition app.

## CRITICAL: Read Context Files First

At the start of every session, in this exact order:
1. **STATE.yaml** — what's been built, what health gates look like, what's blocked
2. **CONTEXT-TRANSFER.md** — the most important file. Tells you exactly what was done last session and what to focus on now
3. **specs/architecture.md** — the architectural constraints you must never violate
4. **The specific spec file** — what you're building this session

Do not write a single line of code before reading all four files.

---

## Your Job

1. Pick the first unimplemented feature from `STATE.yaml → specs.features`
2. Cross-reference with `recently_shipped` to find what's left
3. Implement it using **strict TDD**: RED → GREEN → REFACTOR
4. Verify all health gates pass
5. Commit with a meaningful message
6. Update STATE.yaml and CONTEXT-TRANSFER.md
7. Exit cleanly

---

## TDD Protocol (Non-Negotiable)

```
Step 1 — RED: Write the failing test FIRST
  - Put logic functions in a separate logic.ts file
  - Test logic.ts in __tests__/logic.test.ts using Vitest describe/it/expect
  - Run npm test — verify the new test FAILS (expected)
  - If it passes on first run, the test is wrong — fix it

Step 2 — GREEN: Write minimal code to make it pass
  - Implement only what the test requires
  - Run npm test — verify ALL tests pass including new ones

Step 3 — REFACTOR: Clean up without breaking tests
  - Extract shared constants/types if repeated
  - Run npm test again to confirm still green

Step 4 — GATE CHECK: All gates must pass
  - npm test       → 0 failures
  - npm run build  → exit code 0
  - npm run lint   → exit code 0
  - If any gate fails, fix it before committing
```

---

## Test Conventions

All tests use **Vitest** with `describe/it` blocks. Follow this pattern:

```typescript
import { describe, it, expect } from 'vitest'
import assert from 'node:assert/strict'  // acceptable for assertion style
import { functionUnderTest } from '../logic'

describe('functionUnderTest', () => {
  it('does the expected thing', () => {
    expect(functionUnderTest(input)).toBe(expectedOutput)
  })
})
```

Mock pattern for Next.js route handlers:
```typescript
import { vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    mealLog: {
      findMany: vi.fn().mockResolvedValue([...])
    }
  }
}))
```

---

## Architecture Rules (Must Not Violate)

See `specs/architecture.md` for full details. Key constraints:

1. **Multi-AI router** — Always import from `@/lib/ai/router` (not providers directly)
2. **Claude JSON fencing** — Always use `extractJSON()` from `@/lib/ai/providers/utils` when parsing Claude responses
3. **Auth gates** — Every API route must check the session via `getServerSession(authOptions)` and return 401 if missing
4. **Prisma types** — Use the Prisma client types; don't re-declare model shapes in TypeScript
5. **Error surfaces** — Every async operation must have an error state + user-visible message (no silent catch)
6. **Family scoping** — All DB queries must filter by `familyId` from the session

---

## Commit Conventions

```
feat: <what was added>  
fix: <what was corrected>
refactor: <what was restructured>
test: <what was tested>
```

Examples:
```
feat: add day navigation to dashboard with date selector
feat: extract target calculation to lib/targets/calculate.ts
test: add unit tests for target calculation logic
```

One commit per spec. If a spec has a migration, commit the migration separately:
```
chore: add prisma migration for ingredient_constraints table
feat: add ingredient constraints to food preferences and AI prompts
```

---

## Updating STATE.yaml (Required at End of Session)

At the end of every session:

```yaml
# Move implemented spec from specs.features to recently_shipped:
recently_shipped:
  - ref: "manual"
    title: "B4: Day navigation on dashboard"
    files:
      - src/app/(app)/page.tsx
      - src/app/api/dashboard/route.ts
      - src/components/dashboard/child-card.tsx
    tests_added: 8

# Remove the spec from specs.features list
# Update last_session with today's date
last_session: "2026-03-07"
```

---

## Updating CONTEXT-TRANSFER.md (Required at End of Session)

Prepend a new entry at the TOP of CONTEXT-TRANSFER.md:

```markdown
## Session: YYYY-MM-DD

**Implemented:** B4 Day Navigation
**Tests:** 8 new tests added (all passing)
**Health gates:** lint ✅ test ✅ (63 tests) build ✅
**Commit:** abc1234 feat: add day navigation to dashboard

### Key implementation notes
- Used CSS date input with prev/next arrow buttons in page.tsx
- Dashboard API now accepts ?date= param (ISO string)
- ChildCard accepts selectedDate prop, refetches on change
- State is lifted to page.tsx (no context needed)

### Next up
- B5: Nutrition target transparency (see specs/features/phase1/b5-nutrition-targets.md)
```

---

## What "Done" Means

A spec is done when:
- [ ] All tests from the spec skeleton are implemented and passing
- [ ] `npm test` exits 0 (all N tests passing, where N > previous count)
- [ ] `npm run build` exits 0
- [ ] `npm run lint` exits 0
- [ ] Committed with a meaningful message
- [ ] STATE.yaml updated (spec moved to recently_shipped)
- [ ] CONTEXT-TRANSFER.md updated with session entry

Do not mark a spec done if any of these are not met.

---

## If You Get Stuck

1. **Type errors from Prisma**: Run `npx prisma generate` to regenerate the client
2. **Migration needed**: Run `npx prisma migrate dev --name <description>`
3. **DB not running**: `docker compose up -d` (PostgreSQL)
4. **Test import errors**: Check that the imported function is actually exported from logic.ts
5. **Build errors from new API route**: Check that all params are properly typed with `{ params: Promise<{ id: string }> }`
