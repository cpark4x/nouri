# AI Polish + Smart Input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every logged meal have an AI-generated clean title and description, and simplify the logging screen to a single smart input with time-of-day meal type inference.

**Architecture:** Phase 1 adds `title` and `cleanDescription` to the existing `ParsedMeal` type and Anthropic prompt — same API call, no extra latency. A new `MealLog.title` DB field stores the result. Phase 2 replaces the tab-based logging UI with a single smart input box.

**Tech Stack:** Next.js 16, TypeScript, Tailwind, Prisma (new migration), Anthropic (prompt update), OpenAI (photo parse update).

**Worktree:** `.worktrees/ai-polish` on branch `feat/ai-polish`

---

## Task 1: Add title + cleanDescription to AI types and prompts

**Files:**
- Modify: `src/lib/ai/types.ts`
- Modify: `src/lib/ai/providers/anthropic.ts`
- Modify: `src/lib/ai/providers/openai.ts`

**Step 1: Add fields to ParsedMeal in `src/lib/ai/types.ts`**

```typescript
export interface ParsedMeal {
  items: FoodItem[];
  totalNutrition: NutritionEstimate;
  confidence: "high" | "medium" | "low";
  assumptions: string[];
  title: string;           // NEW — e.g. "Scrambled Eggs & Buttered Toast"
  cleanDescription: string; // NEW — e.g. "Two scrambled eggs with buttered whole wheat toast and a glass of OJ."
}
```

**Step 2: Update `parseFoodDescription` prompt in `src/lib/ai/providers/anthropic.ts`**

Add `title` and `cleanDescription` to the JSON schema in the system prompt. The existing system prompt ends with the JSON structure — extend it:

```
Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "items": [...],
  "totalNutrition": {...},
  "confidence": "high" | "medium" | "low",
  "assumptions": ["string"],
  "title": "string",
  "cleanDescription": "string"
}

title: 2-5 words, title case, clean and readable (e.g. "Scrambled Eggs & Toast", "Chicken Pasta Dinner")
cleanDescription: One complete sentence describing the meal in third person (e.g. "Two scrambled eggs with buttered whole wheat toast and a glass of orange juice.")
```

**Step 3: Update `analyzeFoodPhoto` in `src/lib/ai/providers/openai.ts`**

Same change — add `title` and `cleanDescription` to the JSON response structure in the prompt. The photo parser returns a `ParsedMeal` so it needs these fields too.

**Step 4: Write a test for the prompt structure**

Create `src/lib/ai/providers/__tests__/parsed-meal-fields.test.ts`:

```typescript
import type { ParsedMeal } from "@/lib/ai/types";

// Verify ParsedMeal has the new fields at compile time
const meal: ParsedMeal = {
  items: [],
  totalNutrition: {
    calories: 0, protein: 0, calcium: 0, vitaminD: 0,
    iron: 0, zinc: 0, magnesium: 0, potassium: 0,
    vitaminA: 0, vitaminC: 0, fiber: 0, omega3: 0,
  },
  confidence: "high",
  assumptions: [],
  title: "Test Meal",
  cleanDescription: "A test meal description.",
};

console.assert(typeof meal.title === "string", "title must be string");
console.assert(typeof meal.cleanDescription === "string", "cleanDescription must be string");
console.log("✅ ParsedMeal type check passed");
```

Run: `npx tsx src/lib/ai/providers/__tests__/parsed-meal-fields.test.ts`
Expected: `✅ ParsedMeal type check passed`

**Step 5: Build**

```bash
npm run build
```

Expected: TypeScript errors on any code that constructs `ParsedMeal` without the new fields. Fix those by providing fallback values where needed (e.g. in `src/app/api/log/[mealLogId]/route.ts` which re-parses meals — check if it returns a `ParsedMeal`).

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add title and cleanDescription to ParsedMeal AI types and prompts"
```

---

## Task 2: Database migration + save route

**Files:**
- Modify: `prisma/schema.prisma`
- Create: new Prisma migration
- Modify: `src/app/api/log/save/route.ts`

**Step 1: Add `title` to MealLog in `prisma/schema.prisma`**

```prisma
model MealLog {
  id          String   @id @default(cuid())
  childId     String
  date        DateTime @default(now())
  mealType    String
  description String
  title       String?  // NEW — AI-generated clean title
  photoUrl    String?
  confidence  String   @default("medium")
  aiAnalysis  Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  child     Child            @relation(fields: [childId], references: [id])
  nutrients NutritionEntry[]
}
```

**Step 2: Run migration**

```bash
DATABASE_URL="postgresql://chrispark@localhost/nouri" npx prisma migrate dev --name add_meal_title
```

Expected: Migration created and applied. `MealLog` table now has `title` column (nullable).

**Step 3: Update `src/app/api/log/save/route.ts` to accept and save `title`**

In the request body destructuring, add `title`:

```typescript
const { childId, description, parsedMeal, photoUrl } = body;
const title = (parsedMeal as ParsedMeal).title ?? null;
const mealType = normalizeMealType(body.mealType);
```

In the `prisma.mealLog.create` call, add:

```typescript
data: {
  childId,
  mealType,
  description,       // keep raw input
  title,             // NEW — AI clean title
  photoUrl: photoUrl ?? null,
  confidence: parsedMeal.confidence,
  aiAnalysis: parsedMeal as unknown as Prisma.InputJsonValue,
  nutrients: { create: nutritionData },
}
```

**Step 4: Regenerate Prisma client**

```bash
DATABASE_URL="postgresql://chrispark@localhost/nouri" npx prisma generate
```

**Step 5: Build**

```bash
npm run build
```

Expected: Clean build.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add MealLog.title field and save from parsedMeal"
```

---

## Task 3: Update parse routes to return title

The parse routes (`/api/log/parse`, `/api/log/parse-photo`, `/api/log/parse-family`) already return the full `ParsedMeal` directly — since we updated the Anthropic/OpenAI prompts in Task 1, the title and cleanDescription will automatically flow through. But we need to verify the routes return the new fields and the `parse-family` route handles them correctly.

**Files:**
- Verify: `src/app/api/log/parse/route.ts` (no changes needed — returns ParsedMeal directly)
- Verify: `src/app/api/log/parse-photo/route.ts` (no changes needed)
- Modify: `src/app/api/log/parse-family/route.ts` (verify title flows through per child)

**Step 1: Check parse-family returns title per child**

In `src/app/api/log/parse-family/route.ts`, the response maps children to `{ childId, childName, parsedMeal }`. No changes needed — `parsedMeal` already contains `title` and `cleanDescription` from the updated AI call.

**Step 2: Update the meal edit route to handle title**

In `src/app/api/log/[mealLogId]/route.ts` (PUT handler), when re-parsing a meal after an edit, the new `ParsedMeal` will have a `title`. Update the transaction to save the new title:

```typescript
// In the $transaction, update mealLog with:
data: {
  description: newDescription,
  title: parsed.title ?? null,           // NEW
  cleanDescription not stored — only title
  confidence: parsed.confidence,
  aiAnalysis: parsed as unknown as Prisma.InputJsonValue,
  updatedAt: new Date(),
}
```

**Step 3: Build**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: propagate title through parse routes and meal edit"
```

---

## Task 4: Confirmation card shows polished title

**Files:**
- Modify: `src/components/log/meal-confirmation.tsx`
- Modify: `src/app/(app)/log/[childId]/page.tsx` (pass cleanDescription if needed)

**Step 1: Update `MealConfirmation` to show title prominently**

Read the current file first. The current header is `"{childName}'s Meal"` with a confidence badge.

Replace the header section:

```tsx
{/* Before: just "{childName}'s Meal" */}
{/* After: */}
<div className="mb-4">
  {/* Title — prominently displayed */}
  <h2 className="text-xl font-bold text-gray-900">
    {parsedMeal.title || `${childName}'s Meal`}
  </h2>
  {/* Clean description below title */}
  {parsedMeal.cleanDescription && (
    <p className="mt-1 text-sm text-gray-500">{parsedMeal.cleanDescription}</p>
  )}
  {/* Confidence badge — moved to right of title or below */}
  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${confidenceClass}`}>
    {confidenceLabel}
  </span>
</div>
```

Keep the food items list, nutrition grid, and assumptions below unchanged.

**Step 2: Build and visually verify**

```bash
npm run build
```

Then start the dev server and log a test meal. The confirmation card should show:
- Big title: "Scrambled Eggs & Toast" (not "Mason's Meal")
- Small description: "Two scrambled eggs..."
- Confidence badge below
- Food items list (unchanged)
- Nutrition (unchanged)

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: show AI-generated title and description on meal confirmation card"
```

---

## Task 5: Meal cards display title everywhere

**Files:**
- Modify: `src/components/dashboard/meal-list.tsx`
- Modify: `src/app/api/child/[id]/route.ts`
- Modify: `src/app/api/dashboard/route.ts`

**Step 1: Add `title` to meal response in `src/app/api/child/[id]/route.ts`**

The today's meals mapping currently returns:
```typescript
{ id, mealType, description, createdAt, confidence, nutrients[] }
```

Add `title`:
```typescript
todayMeals = child.mealLogs.map((meal) => ({
  id: meal.id,
  mealType: meal.mealType,
  description: meal.description,
  title: meal.title ?? null,  // NEW
  createdAt: meal.createdAt.toISOString(),
  confidence: meal.confidence,
  nutrients: meal.nutrients.map((n) => ({ nutrient: n.nutrient, amount: n.amount, unit: n.unit })),
}));
```

**Step 2: Add `title` to dashboard meal summary in `src/app/api/dashboard/route.ts`**

The `todayMeals` summary uses `description` as the `summary` field. Update to prefer title:

```typescript
const todayMeals = MEAL_TYPES.map((mealType) => {
  const log = child.mealLogs.find((m) => m.mealType.toLowerCase() === mealType);
  return {
    mealType,
    logged: loggedMealTypes.has(mealType),
    summary: log?.title ?? log?.description,  // prefer title if available
  };
});
```

Also add `title: true` to the `mealLogs` select:
```typescript
mealLogs: {
  where: { date: { gte: todayStart, lte: todayEnd } },
  select: {
    mealType: true,
    description: true,
    title: true,   // NEW
  },
}
```

**Step 3: Update `Meal` interface and display in `src/components/dashboard/meal-list.tsx`**

Add `title?: string | null` to the `Meal` interface:

```typescript
interface Meal {
  id: string;
  mealType: string;
  description: string;
  title?: string | null;  // NEW
  createdAt: string;
  confidence: string;
  nutrients: MealNutrient[];
}
```

In `MealItem`, use the title as the card header:

```tsx
{/* Collapsed state header — show title if available */}
<span className="font-medium text-gray-900">
  {meal.title ?? MEAL_LABELS[meal.mealType] ?? meal.mealType}
</span>
{/* Show description as secondary text when collapsed */}
<span className="mt-0.5 text-xs text-gray-400 line-clamp-1">
  {meal.cleanDescription ?? meal.description}
</span>
```

When expanded, show the clean description (or raw description as fallback) at the top of the expanded area, before the nutrient grid.

**Step 4: Build**

```bash
npm run build
```

Expected: Clean build. New meals show title in the card header. Old meals (no title) fall back to showing mealType label as before.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: display AI meal title throughout meal list and dashboard"
```

---

## Task 6: Smart Input Box (Phase 2)

Replace the current tabbed logging UI with a single smart input box that infers meal type from time of day.

**Files:**
- Modify: `src/components/log/text-input.tsx`
- Modify: `src/app/(app)/log/[childId]/page.tsx`

**Step 1: Read `src/components/log/text-input.tsx` first**

Before making changes, read the full file to understand the current meal type selector implementation and state.

**Step 2: Add time-of-day inference utility**

Create `src/lib/meal-type-inference.ts`:

```typescript
export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

/**
 * Infer meal type from current time of day.
 * Before 10am → breakfast
 * 10am–2pm → lunch
 * 2pm–5pm → snack
 * 5pm+ → dinner
 */
export function inferMealType(now: Date = new Date()): MealType {
  const hour = now.getHours();
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};
```

Write a test `src/lib/__tests__/meal-type-inference.test.ts`:

```typescript
import { inferMealType } from "../meal-type-inference";

const at = (hour: number) => { const d = new Date(); d.setHours(hour, 0, 0, 0); return d; };

console.assert(inferMealType(at(7)) === "breakfast", "7am → breakfast");
console.assert(inferMealType(at(9)) === "breakfast", "9am → breakfast");
console.assert(inferMealType(at(10)) === "lunch", "10am → lunch");
console.assert(inferMealType(at(13)) === "lunch", "1pm → lunch");
console.assert(inferMealType(at(14)) === "snack", "2pm → snack");
console.assert(inferMealType(at(16)) === "snack", "4pm → snack");
console.assert(inferMealType(at(17)) === "dinner", "5pm → dinner");
console.assert(inferMealType(at(21)) === "dinner", "9pm → dinner");
console.log("✅ All meal type inference tests passed");
```

Run: `npx tsx src/lib/__tests__/meal-type-inference.test.ts`
Expected: `✅ All meal type inference tests passed`

**Step 3: Update `TextInput` to remove meal type selector, add inline photo + meal type pill**

In `src/components/log/text-input.tsx`, the current component has a meal type selector (4 pill buttons). Replace with:

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { inferMealType, MEAL_TYPE_LABELS, type MealType } from "@/lib/meal-type-inference";
import type { ParsedMeal } from "@/lib/ai/types";

interface TextInputProps {
  childId: string;
  childName: string;
  onParsed: (meal: ParsedMeal, description: string, mealType: string) => void;
}

export function TextInput({ childId, childName, onParsed }: TextInputProps) {
  const [mealType, setMealType] = useState<MealType>(() => inferMealType());
  const [showMealTypePicker, setShowMealTypePicker] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Placeholder adapts to meal type
  const placeholder = `What did ${childName} have for ${MEAL_TYPE_LABELS[mealType].toLowerCase()}?`;

  async function handleSubmit() {
    if (!text.trim() && !photoFile) return;
    setLoading(true);
    setError(null);
    try {
      if (photoFile) {
        // Upload photo first, then parse-photo
        const formData = new FormData();
        formData.append("file", photoFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const { url } = await uploadRes.json() as { url: string };
        const parseRes = await fetch("/api/log/parse-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, imageUrl: url, mealType }),
        });
        const parsed = await parseRes.json() as ParsedMeal;
        onParsed(parsed, text || "Photo meal", mealType);
      } else {
        // Text parse
        const res = await fetch("/api/log/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, description: text, mealType }),
        });
        const parsed = await res.json() as ParsedMeal;
        onParsed(parsed, text, mealType);
      }
    } catch {
      setError("Couldn't parse that meal. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Meal type pill — tappable to change */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMealTypePicker(!showMealTypePicker)}
          className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          {MEAL_TYPE_LABELS[mealType]}
          <span className="text-xs text-gray-400">▾</span>
        </button>
        {showMealTypePicker && (
          <div className="flex gap-1">
            {(["breakfast", "lunch", "snack", "dinner"] as MealType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setMealType(t); setShowMealTypePicker(false); }}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  mealType === t
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {MEAL_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo preview */}
      {photoPreview && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoPreview} alt="Food" className="h-32 w-full rounded-lg object-cover" />
          <button
            onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main input area with inline photo button */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-gray-200 p-3 pr-12 text-sm resize-none focus:border-gray-400 focus:outline-none"
        />
        {/* Photo button inline */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-3 right-3 text-gray-400 hover:text-gray-600"
          title="Add a photo"
        >
          📷
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setPhotoFile(file);
              setPhotoPreview(URL.createObjectURL(file));
            }
          }}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || (!text.trim() && !photoFile)}
        className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {loading ? "Analyzing..." : "Log Meal"}
      </button>
    </div>
  );
}
```

**Step 4: Update `src/app/(app)/log/[childId]/page.tsx`**

Remove the `inputMode` state and tab bar. The `TextInput` component now handles both text and photo. Remove `<PhotoInput>` import and usage.

The page simplifies to:
- `state === "input"` → `<QuickRelog>` + `<TextInput>` (no tabs)
- `state === "confirming"` → `<MealConfirmation>`
- `state === "saving"` → spinner overlay

**Step 5: Build**

```bash
npm run build
```

Expected: Clean build. `PhotoInput` component may become unused — keep the file for now, remove in a cleanup pass.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: replace tabbed logging UI with smart input box and time-of-day meal type inference"
```

---

## End of Plan

**Success criteria:**
1. Log any meal → confirmation card shows clean title + description, not raw input
2. Meal list on detail page shows title as card header
3. Logging screen: single input, no tabs, meal type inferred from time with pill to override
4. Photo can be added inline without switching tabs
5. Build passes, no regressions on existing meals (old meals without title show mealType label as before)
