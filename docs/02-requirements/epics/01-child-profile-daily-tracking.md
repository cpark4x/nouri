# Epic 01: Child Profile & Daily Tracking

**Owner:** Chris Park

---

## 1. Summary

The foundation of Nouri is knowing each child deeply and making it effortless to see how they're eating every day. This epic covers creating and maintaining rich child profiles, setting personalized nutrition targets calibrated to each child's unique body and activity level, and logging daily meals with real-time progress tracking against those targets. Without this foundation, no other intelligence in Nouri is possible — it is the core daily loop the entire platform is built on.

---

## 2. Problem

Parents of active, growing kids face a daily challenge: ensuring their children are eating enough of the right things to support growth and performance. Generic nutrition apps offer one-size-fits-all guidance that ignores what actually matters — a 12-year-old playing select hockey 5-6 times a week has fundamentally different nutritional needs than an average 12-year-old, and those needs change on a practice day versus a rest day.

Parents like Chris and his wife resort to guesswork, random googling, or expensive nutritionists because no tool exists that knows their specific child well enough to be useful. What's missing isn't more data — it's a system that connects a child's individual profile (age, size, activity load, health data, food preferences) to practical daily guidance parents can actually act on.

---

## 3. Proposed Solution

Nouri gives each child a living profile that captures everything that matters — their biometrics, sports schedule, food preferences, and health data. From this profile, Nouri calculates personalized daily nutrition targets: not generic, but calibrated for Mason's hockey load or Charlotte's gymnastics and dance schedule.

Parents log any meal in seconds using natural language (typed the way you'd text a friend) or a photo — no measuring cups, no barcode scanning. Nouri handles the parsing, estimates portions, and presents a clean confirmation. Both kids are visible at a glance on one dashboard, so parents can see where each child stands nutritionally at any point in the day without switching contexts.

---

## 4. User Stories

### Implemented

> User story files are pending retroactive documentation. Implemented capabilities listed below.

| # | Capability | Notes |
|---|-----------|-------|
| 01-01 | Child profile setup and editing | Name, birthday, gender, height, weight, activity, goals |
| 01-02 | Food preferences | Loves, hates, texture aversions per child |
| 01-03 | Personalized daily nutrition targets | Calories, protein, calcium, vitamin D, iron, zinc with goal gap indicators |
| 01-04 | Natural language meal logging | AI parses free-text input into structured nutrition data |
| 01-05 | AI meal title & description generation | Raw input auto-rewritten into clean, readable meal titles |
| 01-06 | Meal editing with AI re-parse | Edit any logged meal; AI re-parses updated description |
| 01-07 | Dashboard — both children visible | Real-time nutrient progress bars, color-coded by pace |
| 01-08 | Per-child detail view | Full nutrient bars, today's meal list, expandable meal details |
| 01-09 | Meal tips | AI-generated nutritional tips visible on any logged meal |

### Future

- ⏭️ **Activity-aware daily targets** — Mason's targets automatically reflect his load on a 3-hour practice day vs. an off day; Charlotte's adjust for competition week
- ⏭️ **Nutrition target transparency** — Parents see exactly how each target is calculated, what inputs drive it, and what changes when the profile is updated
- ⏭️ **Automatic target recalculation** — When height, weight, or activity changes, targets update immediately and show parents what changed and why
- ⏭️ **Homepage day navigation** — Browse any previous day's nutrition from the home screen; see what Mason ate last Tuesday without digging
- ⏭️ **Past meal history view** — Browse logged meals by day/week per child; full nutrition detail on any past meal
- ⏭️ **Quick re-log** — One-tap re-logging of common meals from a Recent & Favorites list; Nouri learns your family's routine over time
- ⏭️ **Family meal logging** — Log a shared dinner once with automatic portion splits per child ("Both kids had tacos — Mason had 3, Charlotte had 2")
- ⏭️ **Ingredient-level avoidance** — Flag specific ingredients to avoid (allergy, intolerance, preference); Nouri never suggests anything containing them
- ⏭️ **Health record upload** — Upload blood work (PDF or photo) and Nouri extracts key values that directly inform nutrition targets (low iron on labs → iron target increases)
- ⏭️ **Kitchen calibration** — Photograph commonly used plates, bowls, and glasses during onboarding so Nouri makes more accurate portion estimates from food photos
- ⏭️ **Growth history** — Track height and weight over time as a visual growth curve; see how nutritional intake correlates with growth

---

## 5. Outcomes

**Success Looks Like:**
- Parents log every meal — or close to it — for both children without friction; the entire interaction takes under 15 seconds
- At any point in the day, parents know whether each child is on pace nutritionally with no calculation required
- Nutrition targets feel accurate and trustworthy — Mason's targets feel obviously different from Charlotte's, and the difference makes sense
- Both parents use the app as a shared tool without conflict; whoever logs a meal, the other parent sees it immediately

**We'll Measure:**
- Daily meal log frequency (target: 3+ meal entries per child per day)
- Time-to-log for natural language entry (target: under 15 seconds end-to-end)
- Parent confidence in targets (qualitative: do the numbers feel right to Chris and his wife?)
- Consistency: are both parents logging, or only one?

---

## 6. Dependencies

**Requires:**
- Family account with shared two-parent access
- AI parsing pipeline (natural language and photo → structured nutrition data with estimated quantities)
- USDA FoodData Central nutrition database integration

**Enables:**
- Ask Nouri (AI chat) — meaningful only when it has real profile and meal history to reason about
- Weekly tracking and AI insights — requires accumulated daily data
- Recipe library with per-child nutrition fit — requires food preferences and nutrition targets
- All activity-aware planning features — requires activity profiles per child

**Blocks:**
- Epic 02: Nutritional Intelligence & AI Insights — requires real meal history and profile data to generate
- Epic 03: Recipe Library & Meal Planning — requires food preferences and personalized targets to filter meaningfully

---

## 7. Risks & Mitigations

| Risk | Impact | Probability | Strategic Response |
|------|--------|-------------|-------------------|
| Nutrition targets feel inaccurate or arbitrary | High — destroys trust in the core product | Medium | Make calculation transparent; show USDA DRI sources; allow manual override |
| Logging friction breaks the daily habit | High — core loop must be near-effortless | Medium | Hold firm on 15-second target; every added step needs to justify its existence |
| Photo logging too imprecise to feel reliable | Medium — erodes confidence in nutrition data | Medium | Show confidence level clearly; make editing frictionless; position text as primary |
| Double-logging when both parents are active | Medium — pollutes nutrition data | Low | Surface today's recent logs before new log entry; warn on likely duplicates |
| Targets don't adapt to activity variation | High — Mason's needs change dramatically game day vs. rest day | Medium | Prioritize activity-aware targets as first major enhancement post-launch |

---

## 8. Open Questions

- [ ] Should activity schedule (Mason's practice days) be manually entered per week, or pulled from a connected calendar?
- [ ] How do targets handle age milestones — does Mason turning 13 trigger automatic recalculation, or does a parent update prompt it?
- [ ] What's the right depth for blood work integration — simple flag-and-adjust for key values (iron, vitamin D), or full lab panel support?
- [ ] Should kitchen calibration be required during onboarding or available post-setup for parents who log primarily by text?
- [ ] When both parents are logged in and one logs a meal, should the other get a notification or is silent sync sufficient?

---

## 9. Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2026-03-06 | Chris Park | Initial epic |
