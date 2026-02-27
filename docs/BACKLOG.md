# Nouri — Product Backlog

Items are ordered by priority. Each item has enough context for planning.

---

## B1: Meal Detail View + Optimization Tips

**Requested by:** Chris (2026-02-26)

**What:** When viewing a past meal log, show:
- An AI-generated 1-2 sentence summary of what was eaten
- A nutrient breakdown specific to that meal (calories, protein, calcium, etc.)
- A short "growth tip" — one actionable suggestion on how to make this specific meal better for Mason/Charlotte's growth goals (e.g. "Add a glass of milk to boost calcium by 300mg")
- An edit button to correct the meal description or portion if the AI got it wrong

**Why:** Parents want to review past meals and understand the nutritional value of each one, not just the daily totals. The tip gives them something actionable in the moment.

**Where this touches:**
- `src/app/(app)/child/[id]/page.tsx` — Today's meal list (each meal item needs to expand into a detail view)
- `src/app/api/child/[id]/route.ts` — May need to return fuller meal data
- New: `src/app/api/log/[mealLogId]/route.ts` — GET meal detail, PUT edit meal
- New: AI call to generate per-meal summary + tip (Anthropic)

---

## B2: Lunch Not Showing + Daily Goal Suggestions

**Requested by:** Chris (2026-02-26)

**Part A — Bug: Lunch not appearing on Mason's dashboard card**

Mason had 3 meals logged (including lunch) but the dashboard card didn't show lunch as checked off. Needs investigation — likely a `mealType` matching issue or a display logic bug in `meal-status.tsx`.

**Part B — Feature: Goal gap suggestions**

When a child is behind on key nutrients by end of day, show a short AI-generated nudge on the dashboard card or child detail page:
- e.g. "Mason needs 1,200 more calories today. A peanut butter sandwich + glass of milk would cover most of it."
- Ideally triggered when the child is >30% behind on calories or a key nutrient by the afternoon

**Where this touches:**
- `src/components/dashboard/meal-status.tsx` — Bug investigation
- `src/components/dashboard/child-card.tsx` — Where goal suggestions would surface
- New: `src/app/api/child/[id]/suggestions/route.ts` — AI-generated gap suggestions

---

## Known Working (no backlog needed)

| Feedback | Status | Where to find it |
|---|---|---|
| AI chat about nutrition and health | ✅ Built (M2) | Chat tab in bottom nav |
| Edit child profile (height, weight, etc.) | ✅ Built (M2) | Child detail page → Edit button |
