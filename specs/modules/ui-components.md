# Module Spec: UI Components

**Module location:** `src/components/` and `src/app/(app)/`
**Spec version:** 1.0
**Architecture reference:** `specs/architecture.md`

---

## Purpose

React component library for Nouri. Organized by feature domain. Handles all rendering, user interaction, and client-side state. Components are thin — business logic lives in `logic.ts` files, not in components.

---

## Directory Organization

```
src/components/
├── dashboard/     ← Home: child cards, nutrient progress bars, meal list, weekly charts
├── log/           ← Meal input: text input, photo input, family meal, re-log
├── profile/       ← Child editing: form, food preferences, health record upload
├── recipes/       ← Recipe library: list, cards, add modal
├── chat/          ← Ask Nouri AI chat interface
├── settings/      ← Kitchen calibration (item photos for portion context)
└── layout/        ← App shell: header, mobile bottom navigation
```

Each directory owns its feature domain — components in `dashboard/` don't render in `log/` pages.

---

## Client vs. Server Components

**Page files** (`src/app/(app)/*/page.tsx`) are Server Components by default. Keep them thin — they set up layout and pass minimal props.

**Any component with state, event handlers, or browser APIs** must be a Client Component:

```typescript
'use client'  // ← required at top of file

export function ChildCard({ childId }: { childId: string }) {
  const [data, setData] = useState<ChildData | null>(null)
  // ...
}
```

**Rule of thumb:** If it uses `useState`, `useEffect`, `onClick`, or any browser API — `'use client'`.

---

## Data Fetching Pattern

Client components own their data fetching. Every fetch needs loading and error states:

```typescript
'use client'

export function ChildCard({ childId, selectedDate }: Props) {
  const [data, setData] = useState<ChildData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/child/${childId}?date=${toISODateString(selectedDate)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load')
        return r.json()
      })
      .then(setData)
      .catch(err => setError('Could not load data. Try again.'))
      .finally(() => setLoading(false))
  }, [childId, selectedDate])

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorMessage message={error} onRetry={() => setLoading(true)} />
  if (!data) return null
  return <ChildCardContent data={data} />
}
```

**Required:** loading state + error state + retry path on every async fetch.

---

## Tailwind CSS 4 Patterns

Use utility classes directly. No custom CSS files. No `@apply` in component files.

Common patterns established in this codebase:

```
Card container:      bg-white rounded-xl shadow-sm p-4
Section heading:     text-sm font-semibold text-gray-900 mb-3
Body text:           text-sm text-gray-700
Muted / secondary:   text-xs text-gray-500
Primary button:      bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium
Ghost button:        text-gray-500 hover:text-gray-700 text-sm
Progress bar track:  bg-gray-100 rounded-full h-2 overflow-hidden
Progress bar fill:   h-full rounded-full transition-all (+ color class)
Mobile nav bar:      fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100
```

---

## Loading Skeletons

Use `animate-pulse` for initial load states:

```tsx
function LoadingSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-2 bg-gray-200 rounded w-full" />
    </div>
  )
}
```

---

## State Management

No global state library. Use:
- `useState` / `useReducer` for component-local state
- Lift state to the nearest common parent when siblings need to share
- `useEffect` with a dependency array for data re-fetching on prop change

The `selectedDate` pattern in the dashboard (state in `page.tsx`, passed down to `ChildCard`) is the established model for shared state.

---

## Nutrition Color Convention

Progress bars use consistent color-coding by fill percentage:

| % of daily target | Color class |
|---|---|
| ≥ 80% | `bg-green-500` |
| 50–79% | `bg-yellow-400` |
| < 50% | `bg-red-400` |

---

## Test Strategy

UI components are **not unit-tested**. Visual correctness is covered by the QA machine (browser automation). Business logic has already been extracted to `logic.ts` and tested there.

**Exception:** Pure utility functions used by components (date formatting, color calculations) that live in `lib/` files are unit-tested.
