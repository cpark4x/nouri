# Nouri M3: Library & Insights Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the recipe library, weekly tracking views, AI-generated weekly insights, and kitchen calibration that turn Nouri from a daily logger into a long-term growth intelligence system.

**Architecture:** All features extend the existing Next.js App Router + Prisma + multi-AI setup from M1/M2. The Recipe, RecipeChildRating, and KitchenItem models are already in the schema — no migrations needed. New API routes follow the same pattern as existing ones in `src/app/api/`.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, Prisma (existing schema), Anthropic (recipe description parsing, weekly insights), Google Gemini (recipe research from URLs), OpenAI (kitchen item photo analysis), Recharts (weekly bar charts).

**Worktree:** `.worktrees/m3-library` on branch `feat/m3-library`

---

## Task 1: Recipe Library — Save & Browse

**Goal:** Let parents save meals as recipes and browse their library. No URL scraping yet — that's Task 2.

**Files:**
- Create: `src/app/api/recipes/route.ts` (GET list, POST create)
- Create: `src/app/api/recipes/[id]/route.ts` (GET one, PUT update, DELETE)
- Create: `src/app/api/recipes/[id]/rating/route.ts` (POST child rating)
- Create: `src/app/api/recipes/from-log/route.ts` (POST save logged meal as recipe)
- Create: `src/app/(app)/recipes/page.tsx` (replace placeholder)
- Create: `src/components/recipes/recipe-card.tsx`
- Create: `src/components/recipes/recipe-list.tsx`
- Create: `src/components/recipes/add-recipe-modal.tsx`

**Step 1: Build GET /api/recipes**

```typescript
// src/app/api/recipes/route.ts
// GET: returns all recipes for the family, ordered by createdAt desc
// Query params: ?tag=quick&search=chicken
// Response: { recipes: Recipe[] }
//
// POST: creates a new recipe
// Body: { title, description?, instructions?, ingredients?, nutritionPerServing?, tags?, sourceName? }
// Returns: created recipe
```

- Get familyId from session
- `prisma.recipe.findMany({ where: { familyId }, orderBy: { createdAt: 'desc' } })`
- Include `childRatings` in the response

**Step 2: Build GET/PUT/DELETE /api/recipes/[id]**

```typescript
// GET: single recipe with child ratings
// PUT: update title, instructions, ingredients, nutrition, tags, familyRating
// DELETE: remove recipe (confirm it belongs to the family)
```

**Step 3: Build POST /api/recipes/[id]/rating**

```typescript
// Body: { childId: string, rating: "loved" | "ate_it" | "didnt_eat", notes?: string }
// Upserts RecipeChildRating (one rating per child per recipe)
```

**Step 4: Build POST /api/recipes/from-log**

```typescript
// Body: { mealLogId: string, title: string }
// Fetches the MealLog with its NutritionEntry rows
// Creates a Recipe with:
//   - nutritionPerServing: aggregated from NutritionEntry
//   - sourceName: "Logged meal"
//   - ingredients: [] (empty — can be enriched later)
// Returns: created recipe
```

**Step 5: Build RecipeCard component**

```tsx
// src/components/recipes/recipe-card.tsx
// Props: recipe (with childRatings), onRate, onDelete
// Shows: title, sourceName, tags, family rating (loved/ok/skip), child rating badges
// Tap to expand: shows nutrition per serving, instructions if present
// Actions: rate, edit, delete
```

**Step 6: Build the recipes page**

```tsx
// src/app/(app)/recipes/page.tsx
// - Fetches /api/recipes on load
// - Search bar at top (filters client-side by title/tag)
// - Grid of RecipeCards (2 cols mobile, 3 cols desktop)
// - "+ Add Recipe" button (opens AddRecipeModal)
// - Empty state: "No recipes yet. Save a meal or describe one to Nouri."
```

**Step 7: Build AddRecipeModal**

```tsx
// src/components/recipes/add-recipe-modal.tsx
// Two tabs: "Describe it" | "Paste a URL" (URL tab is disabled, labeled "coming soon")
// Describe it: title input + optional description textarea + tags
// Submit → POST /api/recipes → closes modal, list refreshes
```

**Step 8: Verify**

```bash
cd .worktrees/m3-library && npm run build
```

Expected: Clean build. Navigate to Recipes tab — shows empty state. Click "+ Add Recipe", fill in a recipe, save. Card appears in list. Rate it, delete it.

**Step 9: Commit**

```bash
git add -A && git commit -m "feat: add recipe library with save, browse, and rating"
```

---

## Task 2: Recipe Library — URL Scraping & AI Description

**Goal:** Let parents paste a URL to add a recipe, or describe one to Nouri in chat. The Gemini provider handles URL research; Anthropic handles description parsing.

**Files:**
- Create: `src/app/api/recipes/from-url/route.ts`
- Create: `src/lib/ai/providers/recipe-scraper.ts`
- Modify: `src/components/recipes/add-recipe-modal.tsx` (enable URL tab)

**Step 1: Build the recipe scraper**

```typescript
// src/lib/ai/providers/recipe-scraper.ts
// export async function scrapeRecipeFromUrl(url: string): Promise<{
//   title: string;
//   sourceName: string;
//   instructions: string;
//   ingredients: { name: string; amount: string; unit: string }[];
//   nutritionPerServing: NutritionEstimate;
//   tags: string[];
// }>
//
// Strategy:
// 1. Fetch the URL content (use fetch() — Next.js server-side)
// 2. Strip HTML tags, keep text
// 3. Send to Gemini with a prompt: "Extract recipe title, ingredients with amounts,
//    instructions, and estimate the nutrition per serving from this webpage content."
// 4. Parse the structured JSON response
// 5. Return the recipe data
```

**Step 2: Build POST /api/recipes/from-url**

```typescript
// Body: { url: string }
// Calls scrapeRecipeFromUrl(url)
// Creates Recipe in DB with familyId from session
// sourceName: extracted from URL hostname (e.g., "budgetbytes.com")
// Returns: created recipe
```

**Step 3: Enable URL tab in AddRecipeModal**

```tsx
// URL tab: single text input for the URL
// Submit → POST /api/recipes/from-url → shows loading spinner → success closes modal
// Error state: "Couldn't extract recipe from that URL. Try describing it instead."
```

**Step 4: Verify**

Paste a real recipe URL (e.g., a simple budgetbytes.com recipe). Verify it extracts the title, ingredients, and nutrition. Check the recipe card shows the correct source name.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add recipe import from URL using Gemini scraping"
```

---

## Task 3: Weekly Tracking API

**Goal:** Build the data API that aggregates a child's nutrition across the past 7 days, per nutrient, per day.

**Files:**
- Create: `src/app/api/child/[id]/weekly/route.ts`

**Step 1: Build GET /api/child/[id]/weekly**

```typescript
// Query params: ?date=2026-02-26 (defaults to today)
// Returns the 7 days ending on `date` (inclusive)
//
// Response shape:
// {
//   child: { id, name, targets: { [nutrient]: { target, unit } } },
//   days: [
//     {
//       date: "2026-02-20",
//       dayLabel: "Thu",
//       intake: { calories: 2100, protein: 65, calcium: 900, vitaminD: 400, ... },
//       percentOfTarget: { calories: 87, protein: 93, calcium: 69, vitaminD: 67, ... }
//     },
//     // ... 7 days total
//   ],
//   weeklyAverages: { calories: 1950, protein: 61, ... },
//   weeklyAveragePercent: { calories: 81, protein: 87, ... },
// }
//
// Implementation:
// 1. Get child + targets from DB (verify familyId from session matches)
// 2. Get all MealLogs for the 7-day window with their NutritionEntries
// 3. Group by date, sum per nutrient per day
// 4. Calculate percentage of daily target for each nutrient each day
// 5. Calculate 7-day averages
```

**Step 2: Verify**

```bash
curl "http://localhost:3003/api/child/[mason-id]/weekly" -H "Cookie: ..."
```

Expected: 7 days of data, with 0s for days with no logs.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add weekly nutrition aggregation API"
```

---

## Task 4: Weekly Tracking UI

**Goal:** Add a weekly view to each child's detail page showing bar charts and 7-day averages.

**Files:**
- Modify: `package.json` (add recharts)
- Create: `src/components/dashboard/weekly-chart.tsx`
- Create: `src/components/dashboard/weekly-summary.tsx`
- Modify: `src/app/(app)/child/[id]/page.tsx` (add weekly tab)

**Step 1: Install recharts**

```bash
npm install recharts
npm install --save-dev @types/recharts
```

**Step 2: Build WeeklyChart component**

```tsx
// src/components/dashboard/weekly-chart.tsx
// Props: days (array of day data), nutrient ("calories" | "protein" | etc.), target (number)
//
// Renders a Recharts BarChart:
// - X axis: day labels (Mon, Tue, Wed...)
// - Y axis: intake amount
// - Bar fill: green if >= 80% target, yellow if 40-79%, red if < 40%
// - Reference line at target value (dashed, labeled "Target")
// - Tooltip showing exact intake + % of target
// - Responsive: use ResponsiveContainer
//
// Example:
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
```

**Step 3: Build WeeklySummary component**

```tsx
// src/components/dashboard/weekly-summary.tsx
// Props: weeklyAveragePercent (object), child name
//
// Shows a grid of nutrient tiles:
// - Nutrient name
// - Average % of target this week (large number)
// - Color coded: green >= 80%, yellow 40-79%, red < 40%
// - 6 primary nutrients always shown, secondary collapsed
```

**Step 4: Add weekly tab to child detail page**

```tsx
// Modify src/app/(app)/child/[id]/page.tsx
//
// Add two tabs at the top: "Today" | "This Week"
// Today tab: existing content (nutrient bars, meal list)
// This Week tab:
//   - WeeklySummary (grid of 7-day averages)
//   - WeeklyChart for calories (most important)
//   - Expandable charts for other nutrients
```

**Step 5: Verify**

Navigate to Mason's detail page. Toggle to "This Week" tab. Charts render with correct data. Days with no logs show 0 bars. Colors are correct.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add weekly tracking charts and averages"
```

---

## Task 5: AI Weekly Insight

**Goal:** Nouri generates a short, actionable weekly summary for each child, shown on the child detail page.

**Files:**
- Create: `src/app/api/child/[id]/insight/route.ts`
- Create: `src/components/dashboard/weekly-insight.tsx`
- Modify: `src/app/(app)/child/[id]/page.tsx` (add insight card)

**Step 1: Build GET /api/child/[id]/insight**

```typescript
// Generates (and caches) a weekly insight for the child.
// 
// Logic:
// 1. Fetch the weekly data (same as /weekly endpoint)
// 2. Build a prompt for Anthropic:
//    "You are Nouri, a pediatric nutrition assistant. Here is [Mason]'s nutrition
//     data for the past 7 days: [weekly data as JSON]. Write a 2-3 sentence insight
//     that is specific, positive, and actionable. Lead with what went well,
//     then name the biggest gap and give ONE concrete food suggestion to fix it.
//     Use [Mason]'s name. Don't use bullet points."
// 3. Call anthropic.chat() with this prompt
// 4. Return: { insight: string, generatedAt: string }
//
// Caching: store in a simple in-memory cache keyed by childId+weekStart.
// (No DB storage needed for now — regenerates if server restarts.)
```

**Step 2: Build WeeklyInsight component**

```tsx
// src/components/dashboard/weekly-insight.tsx
// Props: childId, childName
//
// Fetches /api/child/[id]/insight on mount
// Shows:
//   - "Nouri's take" label with a small sparkle icon
//   - The insight text in a rounded card (light green background)
//   - Loading skeleton while fetching
//   - "Refresh" button that re-fetches
```

**Step 3: Add to child detail page**

```tsx
// Add WeeklyInsight card at the top of the "This Week" tab
// (above the WeeklySummary grid)
```

**Step 4: Verify**

Open Mason's weekly tab. Insight loads and shows a specific, actionable sentence about his week. Click Refresh — generates a new one.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add AI weekly insight for each child"
```

---

## Task 6: Kitchen Calibration

**Goal:** Let parents photograph their commonly used plates/bowls/glasses so Nouri can estimate portions more accurately from food photos.

**Files:**
- Create: `src/app/api/kitchen/route.ts` (GET list, POST add item)
- Create: `src/app/api/kitchen/[id]/route.ts` (DELETE)
- Create: `src/app/(app)/settings/page.tsx` (replace placeholder)
- Create: `src/components/settings/kitchen-calibration.tsx`
- Create: `src/lib/ai/providers/kitchen-analyzer.ts`

**Step 1: Build kitchen API**

```typescript
// GET /api/kitchen — returns all KitchenItems for the family
// POST /api/kitchen — creates a new KitchenItem
//   Body: { name, type, photoUrl?, estimatedDimensions? }
//   If photoUrl provided, calls analyzeKitchenItem() to estimate dimensions
// DELETE /api/kitchen/[id] — removes item
```

**Step 2: Build the kitchen item analyzer**

```typescript
// src/lib/ai/providers/kitchen-analyzer.ts
// export async function analyzeKitchenItem(imageBase64: string, type: string): Promise<{
//   estimatedDimensions: { diameterCm?: number; volumeMl?: number; heightCm?: number };
//   description: string; // e.g., "White ceramic dinner plate, approximately 26cm diameter"
// }>
//
// Sends the image to GPT-4o vision with a prompt:
// "This is a [plate/bowl/glass/cup]. Estimate its dimensions in metric units.
//  Return JSON: { diameterCm?, volumeMl?, heightCm?, description }"
```

**Step 3: Build KitchenCalibration component**

```tsx
// src/components/settings/kitchen-calibration.tsx
//
// "Your Kitchen Items" section:
// - List of current items with photo thumbnail, name, type, estimated dimensions
// - Delete button per item
//
// "Add an item" form:
// - Name input: "Mason's blue cup", "White dinner plate"
// - Type selector: Plate | Bowl | Glass | Cup
// - Photo upload (uses same /api/upload endpoint)
//   - After upload, automatically calls /api/kitchen to analyze and save
// - Or skip photo: just save name + type without dimensions
//
// Tip text: "Adding your commonly used items helps Nouri estimate portion sizes
//            more accurately from food photos."
```

**Step 4: Build the Settings page**

```tsx
// src/app/(app)/settings/page.tsx
// Sections:
// 1. "Kitchen Items" — KitchenCalibration component
// 2. "Account" — sign out button (already have sign-out component)
//
// Clean layout with section headers. Nothing else for now.
```

**Step 5: Verify**

Navigate to Settings tab. Add a "White dinner plate" with a photo. See it analyzed and added to the list. Check it appears in `/api/kitchen` response. Delete it.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add kitchen calibration for better photo portion estimation"
```

---

## End of Milestone 3

At this point, Nouri has:

- ✅ **Recipe Library** — save, import from URL, browse, rate
- ✅ **Weekly Charts** — 7-day bar charts per nutrient with color-coded progress
- ✅ **AI Weekly Insight** — Nouri's personalized weekly summary per child
- ✅ **Kitchen Calibration** — plate/glass library for better photo portions

### What Comes Next (Milestone 4)

- PWA setup (installable on iPhone home screen)
- Smart notifications (afternoon gap alerts, weekly summary push)
- Azure deployment (App Service + PostgreSQL + Blob Storage)
- Performance optimization (caching, optimistic UI)
- Onboarding flow for new families
- Meal plan suggestions (weekly plan generated by Nouri)
