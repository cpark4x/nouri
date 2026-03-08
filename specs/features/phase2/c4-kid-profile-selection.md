# Spec: C4 — Kid Profile Selection (Home Screen Shift)

**Priority:** HIGH — makes the app usable by kids without their own login
**Phase:** 2
**Depends on:** C6 (Gamification schema — kid cards display points + streak)

---

## Goal

Replace the parent-centric dashboard home with a kid-selection home screen. Kids do not authenticate. When anyone opens the app, they see cards for each child. Tapping a card's **Log a Meal** button scopes the session to that child and opens meal logging. Tapping the card body opens the nutrition detail view for that child.

---

## What Changes

The existing home page (`src/app/(app)/page.tsx`) currently shows a parent dashboard with all child cards. This spec reorganizes the visual hierarchy so each child card is the primary entry point, with gamification data (points + streak) prominently displayed.

No new data is fetched — the dashboard API already returns child records. The gamification fields (`points`, `streak`) are added by C6. This spec can be implemented with placeholder values (`points: 0`, `streak: 0`) and updated once C6 ships.

---

## Files Changed (≤5)

| File | Action | What changes |
|------|--------|--------------|
| `src/app/(app)/page.tsx` | Modify | Redesign layout — kid cards as primary UI, each with points + streak + nutrition bar + Log a Meal button |
| `src/components/dashboard/child-card.tsx` | Modify | Add points badge, streak indicator, nutrition bar summary, prominent Log a Meal button |
| `src/app/api/dashboard/route.ts` | Modify | Include `points` and `streak` in each child's response payload |
| `src/components/dashboard/kid-select-header.tsx` | New | Optional: page header ("Hi! Who's logging today?") |
| `src/app/(app)/log/page.tsx` | Verify | Confirm `childId` query param already scopes the log flow to a specific child |

---

## Implementation

### 1. Dashboard API — add gamification fields

```typescript
// In the child record returned by GET /api/dashboard
{
  id: string
  name: string
  age: number
  points: number        // from Child.points (added by C6); 0 until C6 ships
  streak: number        // computed: consecutive days with ≥1 meal logged (added by C6); 0 until C6 ships
  todayCalories: number
  todayCaloriesTarget: number
  // ... existing nutrition fields ...
}
```

### 2. Child card redesign

Each card renders:

```
┌─────────────────────────────────────┐
│  Mason                   🔥 5-day   │
│                          ⭐ 340 pts │
│                                     │
│  [Calories bar ████████░░ 72%]      │
│                                     │
│       [Log a Meal  →]               │
└─────────────────────────────────────┘
```

- **Name** — prominent, top left
- **Streak** — top right, flame emoji + "{n}-day" (hidden if streak = 0)
- **Points** — top right below streak, star emoji + "{n} pts"
- **Nutrition bar** — calories progress bar (today's intake vs. daily target), compact
- **Log a Meal button** — prominent, full-width or large CTA at card bottom

Tapping the card body (anywhere except the button) → navigates to `/kids/[id]` (existing child detail page).

Tapping **Log a Meal** → navigates to `/log?childId=[id]` (existing log flow).

### 3. Session scoping

The meal log flow at `/log` already accepts a `childId` query param and scopes the session to that child. No changes needed there — verify this works as expected.

### 4. Home page layout

```typescript
// src/app/(app)/page.tsx (simplified)
export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const data = await getDashboardData(session.user.familyId)

  return (
    <main>
      <KidSelectHeader />                          {/* "Who's logging today?" */}
      <div className="grid gap-4">
        {data.children.map(child => (
          <ChildCard key={child.id} child={child} />
        ))}
      </div>
    </main>
  )
}
```

The existing date navigation, family summary panels, and other parent-facing widgets move below the kid cards (or to a collapsible "Parent View" section — builder's discretion on placement).

---

## Test Skeleton

```typescript
// src/components/dashboard/__tests__/child-card.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildCard } from '../child-card'

const mockChild = {
  id: 'child-1',
  name: 'Mason',
  points: 340,
  streak: 5,
  todayCalories: 1440,
  todayCaloriesTarget: 2000,
}

describe('ChildCard', () => {
  it('renders the child name', () => {
    render(<ChildCard child={mockChild} />)
    expect(screen.getByText('Mason')).toBeTruthy()
  })

  it('renders points when > 0', () => {
    render(<ChildCard child={mockChild} />)
    expect(screen.getByText(/340 pts/i)).toBeTruthy()
  })

  it('renders streak when > 0', () => {
    render(<ChildCard child={mockChild} />)
    expect(screen.getByText(/5.day/i)).toBeTruthy()
  })

  it('hides streak when streak is 0', () => {
    render(<ChildCard child={{ ...mockChild, streak: 0 }} />)
    expect(screen.queryByText(/0.day/i)).toBeNull()
  })

  it('renders a Log a Meal button', () => {
    render(<ChildCard child={mockChild} />)
    expect(screen.getByRole('button', { name: /log a meal/i })).toBeTruthy()
  })
})
```

---

## Acceptance Criteria

- [ ] Home screen shows one card per child in the family
- [ ] Each card displays: child name, points total, streak (hidden if 0), calories progress bar, Log a Meal button
- [ ] Tapping **Log a Meal** on Mason's card opens the log flow scoped to Mason (`childId` pre-selected)
- [ ] Tapping the card body (not the button) navigates to Mason's nutrition detail page
- [ ] Both parents see the same home screen (same children, same data)
- [ ] Points and streak show `0` gracefully before C6 ships (no crash)
- [ ] `npm test` passes (new tests included)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
