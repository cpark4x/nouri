# Spec: B8 — Food Ingredient Constraints

**Priority:** MEDIUM  
**Phase:** 1  
**Depends on:** None (independent of B4-B7)

---

## Goal

Parents can flag specific ingredients to avoid for each child — allergies, intolerances, preferences. These constraints are injected into every AI prompt so Nouri never suggests meals containing those ingredients.

Examples: "avoid peanuts", "dairy-free", "no gluten", "nut allergy — severe"

---

## Files Changed (≤5)

| File | Action | What changes |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `IngredientConstraint` model (linked to Child) |
| `src/app/api/child/[id]/constraints/route.ts` | New | GET (list) + POST (add) + DELETE (remove) endpoints |
| `src/components/profile/food-preferences.tsx` | Modify | Add "Ingredients to avoid" section with add/remove UI |
| `src/lib/ai/nouri-system-prompt.ts` | Modify | Accept constraint list and inject into system prompt |
| `src/lib/ai/providers/__tests__/system-prompt-constraints.test.ts` | New | Tests for constraint injection |

---

## Implementation

### 1. Schema (prisma/schema.prisma)

Add after the `FoodPreference` model:

```prisma
model IngredientConstraint {
  id        String   @id @default(cuid())
  childId   String
  child     Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  ingredient String  // e.g. "peanuts", "dairy", "gluten"
  reason     String? // e.g. "allergy", "intolerance", "preference"
  severity   String  @default("avoid") // "avoid" | "allergy" (allergy = hard warning in prompts)
  createdAt  DateTime @default(now())
}
```

Add the relation back-reference to `Child`:
```prisma
model Child {
  // ... existing fields ...
  ingredientConstraints IngredientConstraint[]
}
```

Run: `npx prisma migrate dev --name add_ingredient_constraints`

### 2. API Route (new)

```
GET  /api/child/[id]/constraints  → returns list of IngredientConstraint[]
POST /api/child/[id]/constraints  → body: { ingredient, reason?, severity? } → creates
DELETE /api/child/[id]/constraints?id=<constraintId> → removes
```

All endpoints: require auth + family scoping (verify child belongs to family).

### 3. System Prompt Injection (modify nouri-system-prompt.ts)

The system prompt currently doesn't include ingredient constraints. Add a parameter:

```typescript
export function buildNouriSystemPrompt(options: {
  childName?: string
  childAge?: number  
  ingredientConstraints?: Array<{ ingredient: string; severity: string }>
}): string
```

In the prompt, after existing context, add:
```
NEVER suggest or recommend foods containing the following ingredients:
- peanuts (ALLERGY — strict avoidance)
- dairy (intolerance)

This applies to ALL meal tips, suggestions, recipe recommendations, and chat responses.
```

### 4. UI (food-preferences.tsx)

Add a new "Ingredients to Avoid" section below the existing likes/dislikes section:

```
── Ingredients to Avoid ─────────────────────
  [peanuts] [allergy]  ×
  [dairy]   [intolerance]  ×

  + Add ingredient  [input: ingredient name] [dropdown: allergy/intolerance/preference]
                    [Add] button
```

State is fetched from `GET /api/child/[id]/constraints` on mount.
Add/remove calls the corresponding API endpoints.

---

## Test Skeleton

```typescript
// src/lib/ai/providers/__tests__/system-prompt-constraints.test.ts
import { describe, it, expect } from 'vitest'
import { buildNouriSystemPrompt } from '../../../ai/nouri-system-prompt'

describe('buildNouriSystemPrompt with ingredient constraints', () => {
  it('includes constraint ingredients in the prompt', () => {
    const prompt = buildNouriSystemPrompt({
      childName: 'Mason',
      childAge: 12,
      ingredientConstraints: [
        { ingredient: 'peanuts', severity: 'allergy' },
        { ingredient: 'dairy', severity: 'intolerance' },
      ]
    })
    expect(prompt).toContain('peanuts')
    expect(prompt).toContain('dairy')
  })

  it('marks allergy-level constraints distinctly', () => {
    const prompt = buildNouriSystemPrompt({
      ingredientConstraints: [
        { ingredient: 'tree nuts', severity: 'allergy' }
      ]
    })
    // Allergy constraints should be clearly flagged
    expect(prompt.toLowerCase()).toMatch(/allergy|severe|strict/)
    expect(prompt).toContain('tree nuts')
  })

  it('produces valid prompt with no constraints', () => {
    const prompt = buildNouriSystemPrompt({
      childName: 'Charlotte',
      ingredientConstraints: []
    })
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('produces valid prompt with undefined constraints', () => {
    const prompt = buildNouriSystemPrompt({ childName: 'Mason' })
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })
})
```

---

## Acceptance Criteria

- [ ] `IngredientConstraint` model is in schema and migration runs cleanly
- [ ] GET/POST/DELETE API endpoints work with auth + family scoping
- [ ] Food preferences page shows "Ingredients to Avoid" section with add/remove
- [ ] `buildNouriSystemPrompt()` accepts constraints and injects them into the prompt
- [ ] Allergy-level constraints are flagged more strongly than preferences
- [ ] Prompts with no constraints still work (backward compatible)
- [ ] `npm test` passes (new tests included)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
