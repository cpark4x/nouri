# Nouri — Architecture Reference

**Read this before implementing any spec.** These are the constraints the machine must never violate.

---

## Stack Overview

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 16.1.6 |
| Language | TypeScript | 5 (strict mode) |
| UI | React 19, Tailwind CSS 4, Recharts | — |
| Auth | NextAuth v4 + Prisma adapter | — |
| Database | PostgreSQL via Prisma | 7.x |
| Image storage | Azure Blob Storage | — |
| AI — Text parse | Anthropic Claude (claude-sonnet-4-20250514) | — |
| AI — Photo parse | OpenAI GPT-4o vision | — |
| AI — Recipes | Google Gemini | — |
| Tests | Vitest | 4.x |

---

## Directory Layout

```
src/
├── app/
│   ├── (app)/            ← Auth-guarded route group (all user-facing pages)
│   │   ├── page.tsx      ← Dashboard (home)
│   │   ├── layout.tsx    ← Auth gate — redirects to /auth/signin if no session
│   │   ├── child/[id]/   ← Child detail (Today + This Week tabs)
│   │   ├── log/[childId]/← Smart input logging
│   │   ├── chat/         ← Ask Nouri AI chat
│   │   ├── recipes/      ← Recipe library
│   │   └── settings/     ← Kitchen calibration
│   ├── api/              ← All API routes (Next.js Route Handlers)
│   └── auth/             ← NextAuth sign-in page
├── components/           ← React components organized by feature
├── lib/
│   ├── ai/
│   │   ├── router.ts     ← SINGLE AI ACCESS POINT — always use this
│   │   ├── types.ts      ← ParsedMeal, ChatMessage, NutritionEstimate
│   │   ├── nouri-system-prompt.ts
│   │   └── providers/    ← anthropic.ts, openai.ts, gemini.ts (do not import directly)
│   ├── auth.ts           ← NextAuth config
│   ├── db.ts             ← Prisma client singleton
│   └── meal-type-inference.ts
└── types/
    └── next-auth.d.ts    ← Session type extension (familyId)
```

---

## Critical Architectural Rules

### 1. AI — Always Use the Router
```typescript
// ✅ Correct
import { ai } from '@/lib/ai/router'
const result = await ai.parseFoodDescription(text, childContext)

// ❌ Wrong — never import providers directly in route handlers
import { parseWithAnthropic } from '@/lib/ai/providers/anthropic'
```

### 2. Claude JSON Fencing — Always Strip Markdown
Claude wraps JSON in markdown fences. Always use the shared utility:
```typescript
import { extractJSON } from '@/lib/ai/providers/utils'
const parsed = extractJSON(claudeResponse)  // strips ```json ... ``` safely
```

### 3. Auth — Every API Route Must Check Session
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

### 4. All DB Queries Must Scope to familyId
```typescript
// ✅ Correct — family-scoped
const child = await prisma.child.findFirst({
  where: { id: params.id, family: { users: { some: { id: session.user.id } } } }
})

// ❌ Wrong — not scoped
const child = await prisma.child.findUnique({ where: { id: params.id } })
```

### 5. API Route Params Are Now Async (Next.js 16)
```typescript
// ✅ Correct
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

### 6. Error Surfaces — No Silent Failures
Every async operation that can fail must:
- Have a try/catch that sets error state
- Surface an error message to the user
- Include a "Try Again" or recovery path

### 7. Logic Extraction — Pure Functions Are Testable
For any business logic in an API route, extract it to a `logic.ts` file in the same directory:
```
src/app/api/child/[id]/suggestions/
├── route.ts      ← thin: parse request, call logic, return response
├── logic.ts      ← pure functions: aggregateTodayIntake, computeGaps, etc.
└── __tests__/
    └── logic.test.ts  ← tests for logic.ts ONLY
```

### 8. Prisma — Use Generated Types, Don't Redeclare
```typescript
// ✅ Correct
import type { Child, MealLog, NutritionEntry } from '@prisma/client'

// ❌ Wrong — don't create parallel TypeScript interfaces for DB models
interface MealLogData { id: string; description: string; ... }
```

---

## Database Schema Summary

Key models and their relationships:

```
Family
  └── User (parents, NextAuth accounts)
  └── Child (Mason, Charlotte)
       └── HealthRecord
       └── FoodPreference (like/dislike ratings per food)
       └── DailyTarget (per-nutrient daily targets)
       └── MealLog
            └── NutritionEntry (per-nutrient rows)
  └── Recipe
       └── RecipeChildRating
  └── KitchenItem
  └── ChatMessage
```

**MealLog fields:** date, mealType (varchar 20: breakfast/lunch/snack/dinner), description, title (varchar 200), photoUrl, confidence

**NutritionEntry nutrients:** calories, protein, calcium, vitaminD, iron, zinc, magnesium, potassium, vitaminA, vitaminC, fiber, omega3

**DailyTarget:** unique per [childId, nutrient]. Seeded for Mason and Charlotte.

---

## Test Conventions

All tests use Vitest with describe/it blocks:
```typescript
import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'
import assert from 'node:assert/strict'  // acceptable alternative

describe('featureName', () => {
  it('does the expected thing', () => {
    expect(result).toBe(expected)
  })
})
```

Current baseline: **8 test files, 55 tests**. Every spec should add at least 4 new tests.

---

## Adding Schema Changes

If a spec requires a new DB column or model:

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Run `npx prisma generate`
4. Commit the migration file separately from the feature code

---

## Environment Variables

Required in `.env.local` (not committed):
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GITHUB_ID=...
GITHUB_SECRET=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_AI_API_KEY=...
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=...
```
