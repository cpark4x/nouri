# Nouri — Product Backlog

Items are ordered by priority. Each item has enough context for planning.

---

## ✅ Already Built

| Item | Status | Where |
|---|---|---|
| Meal detail with AI tips | ✅ Built (Feedback Sprint) | Child detail → expand any meal |
| Meal editing with AI re-parse | ✅ Built (Feedback Sprint) | Expand meal → "Edit meal" |
| Lunch display bug | ✅ Fixed (Feedback Sprint) | — |
| Goal gap suggestions | ✅ Built (Feedback Sprint) | Dashboard cards (amber 💡) |
| AI chat about nutrition | ✅ Built (M2) | Chat tab |
| Child profile editing | ✅ Built (M2) | Child detail → Edit button |
| Food likes/dislikes (basic) | ✅ Built (M2) | Child edit → Food Preferences tab |
| Recipe library | ✅ Built (M3) | Recipes tab |
| Weekly tracking charts | ✅ Built (M3) | Child detail → This Week tab |
| AI weekly insight | ✅ Built (M3) | Child detail → This Week tab |

---

## B3: AI Meal Title + Description Rewrite

**Requested by:** Chris (2026-02-27)  
**Priority:** High — affects every single meal log

**What:** When a parent logs a meal, their raw input ("mason had eggs and some toast w butter and oj") should be automatically rewritten into a clean title + description before saving. No extra step — just happens transparently.

- **Title:** Short, clean (e.g. "Scrambled Eggs with Toast & OJ")
- **Description:** 1-2 sentences, readable (e.g. "Two scrambled eggs with buttered whole wheat toast and a glass of orange juice.")
- Should happen as part of the existing parse flow, not a separate step
- Edit button lets parent override if the rewrite is wrong

**Where this touches:**
- `src/app/api/log/parse/route.ts` — add title + clean description to the `ParsedMeal` response
- `src/lib/ai/types.ts` — add `title: string` and `cleanDescription: string` to `ParsedMeal`
- `src/components/log/meal-confirmation.tsx` — show the rewritten title/description in the confirmation card
- `src/app/api/log/save/route.ts` — save `title` field (needs schema addition: `MealLog.title String?`)
- `src/components/dashboard/meal-list.tsx` — display title in meal card header

---

## B4: Homepage Day Navigation

**Requested by:** Chris (2026-02-27)  
**Priority:** High — core daily-use UX

**What:** From the home dashboard, parents should be able to easily see what happened on previous days. Current state: only shows today with no way to navigate.

Options to explore:
- Simple prev/next day arrows (< Today >) with date label
- Swipe gestures on mobile
- A small calendar strip (last 7 days as tappable dots)

Also: overall navigation flow between logging, viewing, and the dashboard needs a review. Parents should feel like the app has a clear path for their daily routine.

**Where this touches:**
- `src/app/(app)/page.tsx` — add date state and navigation controls
- `src/app/api/dashboard/route.ts` — accept `?date=` param (like weekly API already does)
- `src/components/dashboard/child-card.tsx` — pass selected date for data

---

## B5: Nutrition Targets Transparency

**Requested by:** Chris (2026-02-27)  
**Priority:** High — trust/confidence in the core data

**What:** Parents (and the builder) need to understand:
1. What inputs are used to calculate each child's daily targets?
2. How is each target number derived?
3. What changes when you update height/weight/activity?

Currently targets are set once at seed time and not explained anywhere.

**Proposed approach:**
- A "How targets are calculated" explanation on the child edit page or detail page
- Show the formula or source (e.g. "Based on USDA DRI for 12yo active males, adjusted +15% for high-intensity sport")
- When profile changes (new weight, age milestone, activity change), recalculate targets automatically and show what changed
- Consider a "Recalculate targets" button that shows old vs. new targets before applying

**Where this touches:**
- Target calculation logic (currently hardcoded in seed — needs to move to a proper calculation function)
- `src/app/api/child/[id]/update/route.ts` — trigger recalculation on profile save
- New: `src/lib/targets/calculate.ts` — deterministic target calculation function
- UI: show targets with source/explanation on child detail or edit page

---

## B6: Image Editing Bug

**Requested by:** Chris (2026-02-27)  
**Status:** Needs clarification — which image editing isn't working?

Options:
- A) Editing/replacing the photo attached to a meal log
- B) Updating the child's profile photo
- C) Kitchen item photos

**Next step:** Clarify with Chris which specific image flow is broken, then investigate.

---

## B7: Past Meals History View

**Requested by:** Chris (2026-02-27)  
**Priority:** Medium

**What:** A way to browse meals from previous days/weeks — not just today's meals on the dashboard. Parents want to see "what did Mason eat last Tuesday?" and review the ingredients/nutrients from any past meal.

**Proposed approach:**
- Add a "History" section on the child detail page or a calendar strip
- Grouped by day: show meal titles, expand to see full nutrition
- Could reuse the existing `MealList` component with a date filter

**Where this touches:**
- `src/app/(app)/child/[id]/page.tsx` — add history tab or date navigation
- `src/app/api/child/[id]/route.ts` — accept `?date=` param to filter meals by day
- Reuse `MealList` component (already shows nutrients on expand)

---

## B8: Food Ingredient Preferences (Enhancement)

**Requested by:** Chris (2026-02-27)  
**Priority:** Medium

**What:** Beyond liking/disliking specific foods, parents want to flag ingredients to avoid — e.g. "avoid peanuts," "no gluten," "dairy-free." This feeds into AI suggestions so Nouri never recommends a meal with those ingredients.

**Current state:** The existing Food Preferences tab (`/child/[id]/edit`) handles likes/dislikes for specific foods. This is an enhancement to add ingredient-level constraints.

**Proposed additions:**
- "Ingredients to avoid" section on the Food Preferences tab
- Free-text ingredient entry with reason (allergy, intolerance, preference)
- These get injected into every AI prompt (meal tips, suggestions, chat) as hard constraints
- Nouri never recommends a meal containing flagged ingredients

**Where this touches:**
- `prisma/schema.prisma` — add `IngredientConstraint` model (or add to `FoodPreference`)
- `src/components/profile/food-preferences.tsx` — add ingredient avoidance section
- `src/lib/ai/nouri-system-prompt.ts` — inject constraints into Ask Nouri context
- All AI tip/suggestion prompts — add "Never suggest foods containing: [list]"
