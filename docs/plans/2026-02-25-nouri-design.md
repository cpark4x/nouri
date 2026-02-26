# Nouri — Design Document

**Date:** 2026-02-25
**Status:** Approved
**Author:** Engineer/Designer
**PM/CEO:** Chris Park

---

## Vision

Nouri is a family nutrition intelligence platform purpose-built for parents of active, growing kids. It deeply understands each child — their body, their activity level, their preferences, their health data — and becomes an increasingly intelligent partner that helps parents make better food decisions every day.

Nouri is not a generic calorie counter. It is a growth optimization system for Mason (12, select hockey 5-6x/week + baseball) and Charlotte (turning 9 on March 4th, gymnastics + dance), both of whom are on the smaller side and whose parents want to maximize their nutritional intake for growth.

Both parents (Chris and wife) use the app together as a team.

## Three Pillars

1. **Know** — Deep, evolving profiles for each child (biometrics, blood work, activity levels, preferences, growth history). The more you tell it, the smarter it gets.
2. **Track** — Effortless daily food logging via natural language or photo. No measuring cups, no barcode scanning. Describe the meal or snap a picture and Nouri handles the rest.
3. **Grow** — AI-powered intelligence that connects the dots. Flags nutritional gaps, makes proactive recommendations, curates recipes, and is always available as a conversational partner.

## Core Design Principle

AI chat ("Ask Nouri") is the connective tissue of the app, not a bolted-on feature. The dashboard and logging screens handle quick daily use. The chat handles everything else — meal planning, recipe discovery, nutrition questions, profile updates, deep analysis.

---

## Child Profiles

Each child has a living profile that gets richer over time through structured input and learned behavior.

### Structured Data (parent-provided)

| Category | Details |
|----------|---------|
| Basics | Name, birthday, gender |
| Biometrics | Height, weight (tracked over time as growth curve) |
| Activity | Sports, frequency, intensity, seasonal changes |
| Health records | Blood work (PDF/photo upload, AI extracts key values), pediatrician notes, supplements |
| Preferences | Loves, hates, texture aversions, allergies/intolerances |
| Goals | Growth optimization targets |
| Profile photo | Parent-uploaded image (AI-generated or real) |

### Learned Data (AI-inferred over time)

- Which meals they consistently eat vs. leave on the plate
- Nutritional patterns ("Charlotte is chronically low on vitamin D")
- Taste profiles ("Mason gravitates toward savory/umami")
- Seasonal patterns ("Mason's caloric needs spike during hockey season")

### Daily Nutrition Targets

Personalized per child, calculated from:
- Age and gender (baseline)
- Height and weight (size relative to growth curves)
- Activity level (select hockey 5-6x/week demands significantly more than sedentary)
- Growth goals (higher end of recommended ranges)
- Blood work (low iron on labs → iron target increases)

**Key nutrients tracked (primary):** Calories, protein, calcium, vitamin D, iron, zinc.

**Secondary (collapsed by default):** Magnesium, potassium, omega-3s, vitamins A & C, fiber.

---

## Food Logging

Designed for speed. The entire log interaction should take 15 seconds or less.

### Three Input Methods

**1. Natural Language (primary)**

Single text input. Type like you're texting:

> "Mason had 2 scrambled eggs, toast with butter, and a glass of OJ for breakfast"

Nouri parses, estimates portions, looks up nutrition, and presents a confirmation card. Tap "Looks right" and it's done. Tap "Edit" to adjust.

**2. Photo Upload**

Snap a photo of the plate. Vision AI identifies foods, estimates portions using visual cues and calibrated kitchenware, generates confirmation card.

Inherently less precise than text. Nouri states its assumptions so you can correct. Good enough for directional accuracy.

**3. Quick Re-log**

After a few weeks, Nouri knows common meals. A "Recent & Favorites" section enables one-tap re-logging:

- Mason's usual breakfast (eggs, toast, OJ) — last had 2 days ago
- Charlotte's yogurt parfait — last had yesterday
- Family favorite: Mom's turkey meatballs

### Home Calibration

Most meals are at home. During onboarding, parents photograph commonly used plates, bowls, and glasses (4-5 items). Nouri learns their dimensions and uses them for more accurate portion estimation from food photos.

Over time, Nouri recognizes plating patterns ("that looks like Mason's usual portion on the white plate") and pre-fills estimates.

New kitchenware is added by snapping a photo — no re-calibration needed.

### Logging for Each Child

Every log is tied to a specific child via the [+ meal] button on their home screen card. No "who is this for?" step.

Family meals are supported:

> "Both kids had tacos for dinner. Mason had 3, Charlotte had 2."

Nouri splits into two entries with correct portions per child.

### Nutrition Engine (behind every log)

1. AI parsing — text or image interpreted into discrete food items with estimated quantities
2. USDA FoodData Central lookup — each item matched to nutrition database (~370,000 foods, commonly used items cached locally)
3. Confidence indicator — High / Medium / Low, shown as a small tag (not intrusive)
4. Profile update — nutrition totals flow into child's daily tracker in real time

### Portion Intelligence

Nouri understands human language for portions:
- "A handful of blueberries" → ~75g
- "A big glass of milk" → ~12 oz
- "Half a chicken breast" → ~3 oz

When ambiguous, defaults to age-appropriate serving sizes for the specific child. A "bowl of pasta" for 12-year-old Mason defaults larger than for 8-year-old Charlotte.

---

## Dashboard & Tracking

### Home Screen — Both Kids Visible

No toggling. Both profiles visible at once — side by side on laptop, stacked on iPhone.

```
+----------------------------------+
|  [photo] MASON (12)    [+ meal]  |
|  Calories   ████████░░ 1850/2400 |
|  Protein    ██████████  72g/70g  |
|  Calcium    █████░░░░░ 650/1300  |
|  Vitamin D  ███░░░░░░░  240/600  |
|                                  |
|  Breakfast Y  Snack Y            |
|  Lunch .  Dinner .               |
+----------------------------------+
|  [photo] CHARLOTTE (8) [+ meal]  |
|  Calories   ██████░░░░ 1120/1800 |
|  Protein    █████░░░░░  32g/50g  |
|  Calcium    ████░░░░░░ 480/1300  |
|  Vitamin D  ██░░░░░░░░  180/600  |
|                                  |
|  Breakfast Y  Lunch .            |
|  Snack .  Dinner .               |
+----------------------------------+
```

**Color coding:**
- Green — on track or hit target
- Yellow — below pace for time of day
- Red — significantly behind with few meals left

Tap a kid's card → full detail view (all nutrient bars, today's meal list, weekly chart). Tap back to return.

### Weekly Tracking

Accessible via swipe or tab from daily view:

- **Weekly averages vs. targets** — 7-day rolling view per nutrient
- **Daily bar chart** — day-by-day intake to spot patterns ("Mason eats well on weekdays, drops off weekends")
- **Nouri's Weekly Insight** — one AI-generated summary, short and actionable:

> "Mason hit his protein target 6/7 days — great. Calcium was below target every day. Consider adding a glass of milk at lunch. Charlotte's vitamin D was low all week — her current supplement may not be enough."

### Notifications (Smart, Minimal)

- **Afternoon gap alert** (configurable, e.g. 3pm) — only fires if significantly behind pace, includes a specific suggestion
- **Weekly summary** (Sunday evening) — the weekly insight as a push notification
- **No streaks, no guilt.** Missed a day? Nouri picks back up when you return.

---

## Ask Nouri (AI Chat)

Conversational AI that knows everything about Mason and Charlotte. The primary interface for anything beyond quick daily logging.

### Example Interactions

- "Mason has a tournament this weekend — what should I feed him Friday night and Saturday morning?"
- "Charlotte's blood work came back with low vitamin D. What should we change?"
- "What's a high-protein after-school snack both kids will actually eat?"
- "We're going to Whole Foods — give me a grocery list for the week"
- "Mason's been saying he's tired after practice. Could it be nutritional?"

### What Makes It Smart

- Full access to both kids' profiles, meal history, preferences, health data
- Pulls from current nutrition science for pediatric growth and youth athletics
- Remembers past conversations (Charlotte won't eat salmon → won't suggest it again)
- Can update profiles through conversation ("Mason gained two pounds" → profile updated, targets recalculated)
- Both parents share the same chat history

### System Prompt Strategy

Every conversation includes a rich context built from the database:
- Both children's full profiles
- Recent meal logs (last 7 days)
- Current daily/weekly nutrition progress
- Saved recipes and ratings
- Kitchen calibration data

Rebuilt from database on each conversation — always current.

---

## Recipe Library

Recipes are a **side feature, not a workflow**. The primary flow is food logging. Recipes exist for inspiration and saving winners.

### How Recipes Enter the Library

- **Save a logged meal** — "Save tonight's dinner as Mason's favorite tacos." Captures the already-logged meal as a reusable recipe.
- **Paste a URL** — from any food blog, AllRecipes, NYT Cooking, YouTube. Nouri scrapes, extracts ingredients/instructions, calculates nutrition.
- **Describe it to Nouri** — "My mom makes this amazing chicken soup — whole chicken, carrots, celery, egg noodles, parmesan rind. Save as Grandma's Chicken Soup."
- **Nouri suggestions** — ask for meal ideas, Nouri researches and suggests. Save if you like, discard if not.

### Organization

Tagged by source (Grandma's recipes, Budget Bytes, Nouri suggestions, etc.). Browsable and searchable.

### Feedback Loop

After logging a meal from a saved recipe:

> How'd it go?
> Both loved it / Didn't eat it / Mason Y Charlotte N / Notes

One tap. Builds a picture over time: family favorites, Mason-only, Charlotte-only, retired. Nouri uses this in all future suggestions.

### Weekly Meal Plan (optional)

Nouri can generate a suggested weekly meal plan based on:
- Previous week's nutritional gaps
- Saved/favorited recipes
- Food ratings per kid
- Week's activity schedule

Starting point, not a mandate. Adjustable.

---

## Tech Stack

### Infrastructure

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14+ (App Router) | React-based, handles frontend + API in one project |
| Language | TypeScript | Type safety for nutrition calculations |
| Styling | Tailwind CSS | Fast responsive development, iPhone-first |
| Database | Azure Database for PostgreSQL (Flexible Server) | Relational data, covered by MS credits |
| Auth | NextAuth.js (GitHub or email provider) | Simple multi-user auth |
| Image Storage | Azure Blob Storage | Food photos, profiles, plate calibration. Covered by credits. |
| Hosting | Azure App Service | Next.js hosting, covered by MS credits |
| Source Control | GitHub (private repo) | Already available |
| CI/CD | GitHub Actions → Azure | Push to main, auto-deploy |
| PWA | next-pwa | Installable on iPhone home screen |
| Nutrition Data | USDA FoodData Central | Free, 370k+ foods, government-maintained |

### Multi-AI Strategy

| Capability | Provider | Model | Rationale |
|------------|----------|-------|-----------|
| Food photo analysis | OpenAI | GPT-4o | Best vision model for food identification and portion estimation |
| Natural language food parsing | Anthropic | Claude | Excellent structured extraction (text → ingredient list with quantities) |
| Ask Nouri chat | Anthropic | Claude | Strong long-context conversation with rich system prompts |
| Recipe research & suggestions | Google | Gemini | Broad knowledge base for food research |
| Nutrition target calculation | Code logic | N/A | Deterministic math, no AI needed |

AI provider is abstracted behind a router layer. Swapping models for any capability is a config change.

### Data Model

```
Family
  has many → Parents (auth users)
  has many → Children
    - name, dob, gender, height, weight, activity_profile, goals, photo_url
    has many → HealthRecords (blood work, growth measurements)
    has many → FoodPreferences (loves, hates, intolerances)
    has many → MealLogs
      - date, meal_type, description, photo_url, confidence
      has many → NutritionEntries (nutrient, amount, unit)
    has many → DailyTargets (recalculated when profile changes)

Recipes
  - title, source_url, source_name, instructions
  - ingredients, nutrition_per_serving
  - family_rating, per-child ratings
  - tags

KitchenItems
  - name, type (plate/bowl/glass), photo_url, estimated_dimensions
  belongs to → Family

ChatHistory
  - messages (user + AI, timestamped)
  - parent_id
  belongs to → Family
```

### Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Azure (hosting, database, storage) | ~$0 (MS employee credits) |
| OpenAI API (vision) | ~$5-10 |
| Anthropic API (parsing + chat) | ~$10-15 |
| Google Gemini API (research) | ~$2-5 |
| **Total** | **~$15-30/month** |

---

## Multi-User Design

- Family account with two parent logins
- Both parents see the same data: kid profiles, meal logs, chat history, recipes
- Either parent can log meals, update profiles, chat with Nouri
- Chat history is shared — if wife asks Nouri something in the morning, Chris sees it and Nouri remembers it in the evening

---

## What Nouri Is Not

- Not a medical device. It provides nutritional guidance, not medical advice.
- Not a calorie restriction tool. The goal is growth optimization, not dieting.
- Not a replacement for a pediatrician. Blood work insights are informational — "discuss with your doctor" where appropriate.
- Not a recipe app. Recipes are a reference library, not the core workflow.
