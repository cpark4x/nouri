# Module Spec: AI Layer

**Module location:** `src/lib/ai/`
**Spec version:** 1.0
**Architecture reference:** `specs/architecture.md`

---

## Purpose

Multi-provider AI routing. Abstracts three AI providers (Anthropic Claude, OpenAI GPT-4o, Google Gemini) behind a single import. All AI calls anywhere in the app go through this module — nothing outside this module knows which provider handles what.

---

## Module Structure

```
src/lib/ai/
├── router.ts                 ← PUBLIC: the only import the rest of the app uses
├── types.ts                  ← PUBLIC: shared types (ParsedMeal, etc.)
├── nouri-system-prompt.ts    ← INTERNAL: builds per-child system prompt
└── providers/
    ├── anthropic.ts          ← INTERNAL: Claude implementation
    ├── openai.ts             ← INTERNAL: GPT-4o implementation
    ├── gemini.ts             ← INTERNAL: Gemini implementation
    ├── utils.ts              ← INTERNAL: extractJSON and shared helpers
    └── __tests__/            ← Tests for utility functions only
        ├── parsed-meal-fields.test.ts
        └── recipe-scraper.test.ts
```

---

## Public API

The only file the rest of the app imports is `router.ts`:

```typescript
import { ai } from '@/lib/ai/router'

// Parse a meal description (→ Anthropic Claude)
const parsed: ParsedMeal = await ai.parseFoodDescription(text, childContext)

// Analyze a food photo (→ OpenAI GPT-4o vision)
const analyzed: NutritionEstimate = await ai.analyzeFoodPhoto(imageUrl, childContext)

// AI chat with family context (→ Anthropic Claude)
const response: string = await ai.chat(messages, familyContext)

// Research and generate recipes (→ Google Gemini)
const recipes: RecipeSuggestion[] = await ai.researchRecipes(query, childContext)
```

**Never import providers directly from `providers/*.ts`** — they are private implementation details.

---

## Key Types (types.ts)

```typescript
interface ParsedMeal {
  title: string           // Short clean title (e.g. "Scrambled Eggs with Toast")
  description: string     // 1-2 sentence clean description
  mealType: MealType      // breakfast | lunch | snack | dinner
  confidence: number      // 0.0–1.0
  nutrients: NutrientMap  // keyed by nutrient name
}

type NutrientMap = {
  calories: number
  protein: number
  calcium: number
  vitaminD: number
  iron: number
  zinc: number
  magnesium: number
  potassium: number
  vitaminA: number
  vitaminC: number
  fiber: number
  omega3: number
}
```

---

## Critical: Claude JSON Handling

Claude wraps JSON in markdown fences. Always use the shared utility — never `JSON.parse` a raw Claude response:

```typescript
import { extractJSON } from '@/lib/ai/providers/utils'

const raw = await callClaude(prompt)
const parsed = extractJSON(raw)  // strips ```json ... ``` safely
```

---

## System Prompt Pattern

The system prompt injects per-child context. Use the builder for all child-specific AI operations:

```typescript
import { buildNouriSystemPrompt } from '@/lib/ai/nouri-system-prompt'

const systemPrompt = buildNouriSystemPrompt(child, {
  includeFoodPreferences: true,
  includeHealthRecord: false,
  // includeIngredientConstraints: true  ← add when B8 is implemented
})
```

---

## Extending the AI Layer

To add a new AI operation:
1. Add the function to the `ai` object in `router.ts` with a typed signature
2. Implement in the appropriate provider file (or create a new function in an existing one)
3. Add/update types in `types.ts`

**Do NOT add new provider files** without discussing with the architect — the three-provider split is intentional.

---

## Test Strategy

**Do not test providers directly** — they make real API calls.

Test modules that use the AI layer by mocking the router:

```typescript
vi.mock('@/lib/ai/router', () => ({
  ai: {
    parseFoodDescription: vi.fn().mockResolvedValue({
      title: 'Scrambled Eggs',
      description: 'Two scrambled eggs with buttered toast',
      mealType: 'breakfast',
      confidence: 0.9,
      nutrients: { calories: 350, protein: 18, calcium: 80, vitaminD: 1, iron: 2,
                   zinc: 2, magnesium: 30, potassium: 300, vitaminA: 120, vitaminC: 5,
                   fiber: 2, omega3: 0.1 }
    })
  }
}))
```

The `providers/__tests__/` directory tests only utility functions (field validation, JSON parsing) — not AI calls.
