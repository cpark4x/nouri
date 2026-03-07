# Nouri Complete Product Design

## Goal

Build a family nutrition app that Mason and Charlotte actually use daily — by replacing GitHub auth with universal login, adding a gamification layer on top of the existing meal logging loop, and making the app installable as a PWA.

## Background

The core loop is built and working: meal logging, AI parsing, nutrition dashboard, weekly charts, AI chat, and recipe library are all functional. The existing stack is Next.js 16 + TypeScript + Prisma + PostgreSQL with multi-AI integration (Anthropic, OpenAI, Gemini).

The problem is adoption. Nobody in the household is actively using the app yet. There are two blockers: (1) auth is GitHub OAuth, which is developer-only and doesn't work for a 12-year-old or a spouse, and (2) there's no reason for a kid to open the app voluntarily. This design fixes both.

There are also five backlog items (B4–B8) with specs already written that complete the core daily experience. Those get built after the new features.

## Approach

Additive, not a rebuild. The existing AI logic, meal parsing, nutrition calculations, and dashboard stay completely intact. What changes:

1. **Auth** — Replace GitHub OAuth with email + Google sign-in. Add a two-parent family model with wife onboarding via invite link.
2. **Gamification** — Points, streaks, achievement badges, and parent-set milestone goals layered on top of the existing meal logging flow.
3. **PWA** — Add `next-pwa` for installability. Prompt users to add to home screen. Basic offline support.
4. **Backlog** — Ship B4–B8 to complete the daily experience.

V2 (React Native / Expo) is explicitly out of scope until V1 is validated in the household.

## Architecture

Nothing changes in the core architecture. Next.js handles both frontend and backend API routes. Prisma + PostgreSQL handles persistence. The multi-AI layer handles meal parsing and chat. The additions are:

- New auth provider configuration (NextAuth or equivalent) swapping GitHub for email + Google
- New database tables for gamification state
- `next-pwa` plugin generating a service worker and web manifest at build time
- Home screen UI shift: kid cards become the primary entry point, not a parent dashboard

## Components

### Auth Replacement

Remove GitHub OAuth. Add email/password and Google sign-in. Both parents create separate accounts, both linked to the same `Family` record. Either parent can log in from any device and see the same kids, meals, chat history, and recipes.

Wife onboarding: parent sends an invite link via email. The link contains a token. Wife clicks it, creates an account, and is automatically linked to the existing family. Token expires after use or after a set time window.

Kids do not authenticate. No username, no password for Mason or Charlotte. When they open the app on their phone, they see the home screen with both kid cards and tap their name to scope the session. Profile selection, not authentication.

**Schema change:** Add `FamilyInvite` model with `token`, `expiresAt`, `usedAt`, `familyId`, `invitedEmail`.

### Kid Profile Selection

The home screen shows a card for each child. Each card displays:
- Kid's name
- Running points total
- Current streak
- Nutrition bar summary for today
- A prominent **Log a Meal** button

Tapping the Log a Meal button scopes the current session to that child and opens the meal logging flow. The nutrition detail view for each kid stays accessible by tapping the card body (not the button).

### Gamification

**Points:** Awarded at meal save time as part of the save transaction. Base points per meal logged. Bonus points for hitting a daily nutrition goal. Streak multiplier applied when a 7-day logging streak is active. Running total stored on the `Child` record.

**Achievement badges:** A seeded set of ~10–15 badge types defined in an `Achievement` table (not user-created). Examples: first meal logged, 3-day streak, 7-day streak, hitting protein goal 5 days in a row, logging a family meal, hitting calcium goal for a week. Each badge has a name and icon reference.

When a badge is earned, a celebration animation fires. Both kids can see each other's earned badges on their respective cards — sibling visibility is intentional.

**Parent milestone goals:** Either parent can create a goal for a specific child. A goal has a description ("Log 20 meals"), a target count, and tracks current progress. The child sees a progress bar on their card. When the target is hit, the app fires a celebration. The real-world reward is negotiated between parent and child outside the app — the app only tracks progress.

**Achievement and milestone checks run synchronously at meal save time, within the same database transaction.** No background jobs, no queues.

**New schema:**
- `points` column (Int, default 0) on `Child`
- `Achievement` table: `id`, `key` (unique slug), `name`, `description`, `iconRef`, `createdAt`
- `ChildAchievement` table: `id`, `childId`, `achievementId`, `earnedAt`
- `MilestoneGoal` table: `id`, `childId`, `createdByParentId`, `description`, `targetCount`, `currentCount`, `completedAt`

### PWA & Installation

Add `next-pwa` to the existing Next.js app. This generates:
- A **service worker** for caching and offline support
- A **web manifest** (`manifest.json`) with app name ("Nouri"), icon set, theme color, and `display: standalone`

`display: standalone` removes browser chrome when the app is opened from the home screen — it looks and behaves like a native app.

**iOS install problem:** Android shows a native install prompt automatically. iOS requires a manual flow: Share button → "Add to Home Screen." This is unavoidable. All four household members need to be walked through it once. It's a one-time setup.

**In-app install nudge:** On first mobile visit when the app is not yet installed, show a sticky banner at the bottom of the screen: *"Add Nouri to your home screen for the best experience"* with step-by-step iOS instructions (Share → Add to Home Screen icon). The banner is dismissible but persists across sessions until the app is installed. On Android, the banner triggers the native install prompt.

**Offline support:** Static assets and last-known state (dashboard, recent meals) are cached by the service worker and load without connectivity. AI-powered features (meal parsing, chat) require internet and fail gracefully with a "you're offline" message.

No new dependencies beyond `next-pwa`.

## Data Flow

**Meal logging (with gamification):**
1. User (parent or kid) taps Log a Meal on a kid's card → session scoped to that child
2. Meal entry submitted → existing AI parsing pipeline runs (unchanged)
3. Meal saved to database → same transaction:
   a. Points calculated and added to `Child.points`
   b. Achievement eligibility checked for all relevant badge types
   c. Any newly earned badges written to `ChildAchievement`
   d. Any affected `MilestoneGoal.currentCount` values incremented; `completedAt` set if target reached
4. Response returned to client with updated points, any newly earned badges, any completed milestones
5. Client fires celebration animation if badges or milestones were earned

**Wife onboarding:**
1. Parent generates invite link from settings → `FamilyInvite` record created with token + expiry
2. Link emailed to wife
3. Wife clicks link → token validated → account creation form pre-filled with invited email
4. Wife completes signup → account created, linked to existing `Family` record → token marked used

## Error Handling

- **Auth errors:** Standard email/password errors (invalid credentials, email not found, invite token expired/used) surface as form validation messages.
- **Invite token invalid or expired:** Show clear error with option to request a new invite.
- **Gamification transaction failure:** If the points/achievement transaction fails, the meal save should still succeed. Achievement checks are a side effect — they should not block the primary write. Wrap achievement logic in a try/catch within the transaction; log failures silently, do not surface to user.
- **PWA offline:** AI features that require network return a user-facing "you're offline" message. Cached pages load normally. No silent failures.
- **B6 image bug:** Blocked — see Open Questions.

## Testing Strategy

- **Auth flows:** Integration tests for email signup, Google OAuth callback, invite link creation, invite link redemption (valid, expired, already-used), two-parent family linking.
- **Gamification logic:** Unit tests for the points calculation function (base points, bonus conditions, streak multiplier). Unit tests for achievement eligibility checks for each badge type. Integration test for the full meal-save transaction including points + achievement writes.
- **Milestone goals:** Unit tests for progress increment and completion detection. Integration test for parent goal creation and child progress display.
- **PWA:** Manual verification — install flow on iOS Safari and Android Chrome. Offline behavior verified by toggling airplane mode after initial load.
- **Backlog items (B4–B8):** Each has its own spec. Tests defined per spec.

## Build Order

**Track 1 — New features (build first):**
1. Auth replacement (foundational — everything else depends on having real users)
2. Kid profile selection (home screen shift — visible immediately after auth)
3. Gamification (points, achievements, milestone goals)
4. PWA setup (last — cosmetic layer on top of working app)

**Track 2 — Existing backlog (build second):**
- B4: Day navigation on dashboard (< Today > arrows)
- B5: Nutrition target transparency (extract `calculate.ts`, show sources in UI, recalculate on profile change)
- B6: Image editing bug — **BLOCKED** pending clarification (see Open Questions)
- B7: Past meals history view (date navigation on child detail page)
- B8: Ingredient constraints (schema addition, UI on food preferences, injection into AI prompts)

B6 stays blocked until the image flow ambiguity is resolved. All other items can proceed independently.

## What's Not Changing

The following are explicitly out of scope for this design and should not be touched:

- **AI integration layer** — Anthropic, OpenAI, Gemini routing and prompt logic stays as-is
- **Meal parsing pipeline** — The existing AI-powered meal parsing flow is unchanged
- **Nutrition calculation logic** — Existing calculation and target logic unchanged (B5 refactors the structure but not the math)
- **Database schema** — No changes beyond the additions listed in the Gamification and Auth sections above
- **Dashboard and charts** — Existing weekly nutrition charts and dashboard views unchanged
- **Recipe library** — Unchanged
- **AI chat** — Unchanged
- **Azure deployment** — Infrastructure unchanged

## V2 — Path to the App Store

V2 is a frontend rewrite, not a full rebuild. The entire backend — API routes, database, AI logic, meal parsing, nutrition calculations — stays exactly as it is. What changes is the UI layer.

**Tech:** React Native with Expo. Expo Router mirrors the Next.js App Router structure. The app makes identical API calls to the same Next.js backend on Azure.

**What V2 adds over V1:**
- Real native feel — animations, haptics, native camera access
- Push notifications that work reliably (critical for meal logging reminders)
- App Store listing — discoverable, downloadable like a normal app
- No "Add to Home Screen" friction

**The gate:** Do not start V2 until V1 is genuinely working for the household. Mason and Charlotte are logging meals, the habit is forming, the app is useful day-to-day. That is the only trigger. Building native before validating the core experience is wasted work.

**Practical steps when ready:** Apple Developer account ($99/year) → Expo build pipeline (`eas build`) → App Store Connect setup → TestFlight for internal testing → submission (7–14 day review for first submission).

**Android:** Optional. Expo builds for both platforms from the same codebase — it's nearly free once iOS is done.

V2 is a future problem. V1 first.

## Open Questions

1. **B6 — Image editing bug:** Which image flow is broken? Three candidates: (a) meal photo capture/edit, (b) child profile photo, (c) kitchen item image. The B6 spec cannot be written or executed until this is clarified. Chris needs to identify which flow and describe what's broken.

2. **Achievement badge set:** The design calls for ~10–15 seeded badge types. The specific full list (names, icons, trigger conditions for each) needs to be defined before the `Achievement` table is seeded and achievement check logic is written. Starter examples are in the design — the complete set needs to be finalized.
