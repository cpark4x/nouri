# Nouri Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Nouri — a family nutrition intelligence app that tracks and optimizes nutrition for two active, growing kids (Mason, 12 and Charlotte, 8).

**Architecture:** Next.js 14 App Router with TypeScript and Tailwind CSS. PostgreSQL via Prisma ORM, hosted on Azure. Multi-AI backend (OpenAI for vision, Anthropic for parsing/chat, Gemini for research) abstracted behind a router layer. NextAuth.js for family auth.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma, PostgreSQL, NextAuth.js, OpenAI API, Anthropic API, Google Gemini API, Azure App Service, Azure Blob Storage.

**Design Doc:** `docs/plans/2026-02-25-nouri-design.md`

---

## Milestone Overview

| Milestone | What It Delivers | Status |
|-----------|-----------------|--------|
| **M1: Foundation** | Project scaffold, database, auth, seed data, basic layout shell | Planned |
| **M2: Core Features** | Home dashboard, food logging (text + photo), nutrition engine, Ask Nouri chat | Planned |
| **M3: Library & Insights** | Recipe library, weekly tracking, AI insights, kitchen calibration | Future |
| **M4: Polish & Deploy** | PWA, notifications, Azure deployment, performance | Future |

Milestones 3-4 will be planned in detail after M1-M2 are complete and validated.

---

## Milestone 1: Foundation

Gets the project running with database, auth, and basic app shell. No features yet — just the skeleton everything else builds on.

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.js`
- Create: `src/app/layout.tsx` (root layout)
- Create: `src/app/page.tsx` (home page placeholder)
- Create: `src/app/globals.css` (Tailwind imports)
- Create: `.env.local.example` (env var template)
- Create: `.gitignore`

**Step 1: Create Next.js app with TypeScript and Tailwind**

```bash
cd /Users/chrispark/Projects/nouri
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full scaffold.

**Step 2: Verify it runs**

```bash
npm run dev
```

Expected: App runs on http://localhost:3000, shows Next.js default page.

**Step 3: Create env template**

Create `.env.local.example`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nouri"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secret-here"

# AI Providers
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GOOGLE_GEMINI_API_KEY=""

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=""
AZURE_STORAGE_CONTAINER_NAME="nouri-images"
```

**Step 4: Replace home page with Nouri placeholder**

Replace `src/app/page.tsx` with a simple centered "Nouri" heading and tagline: "Nutrition intelligence for growing kids."

**Step 5: Verify placeholder renders**

```bash
npm run dev
```

Expected: See "Nouri" heading at localhost:3000.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with TypeScript and Tailwind"
```

---

### Task 2: Set Up Prisma and Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts` (Prisma client singleton)
- Modify: `package.json` (add prisma dependency)

**Step 1: Install Prisma**

```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

**Step 2: Define the complete schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Family {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  parents   Parent[]
  children  Child[]
  recipes   Recipe[]
  kitchenItems KitchenItem[]
  chatMessages ChatMessage[]
}

model Parent {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  familyId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  family    Family   @relation(fields: [familyId], references: [id])
  accounts  Account[]
  sessions  Session[]
  chatMessages ChatMessage[]
}

// NextAuth required models
model Account {
  id                String  @id @default(cuid())
  parentId          String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  parent Parent @relation(fields: [parentId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  parentId     String
  expires      DateTime

  parent Parent @relation(fields: [parentId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Child {
  id              String   @id @default(cuid())
  familyId        String
  name            String
  dateOfBirth     DateTime
  gender          String
  photoUrl        String?
  heightCm        Float?
  weightKg        Float?
  activityProfile Json?    // { sports: [{ name, frequency, intensity }] }
  goals           String?  // e.g., "growth optimization"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  family          Family   @relation(fields: [familyId], references: [id])
  healthRecords   HealthRecord[]
  foodPreferences FoodPreference[]
  mealLogs        MealLog[]
  dailyTargets    DailyTarget[]
}

model HealthRecord {
  id        String   @id @default(cuid())
  childId   String
  type      String   // "blood_work", "growth_measurement", "supplement", "note"
  date      DateTime
  data      Json     // flexible: { iron: 12, vitaminD: 30, ... } or { height: 148, weight: 38 }
  notes     String?
  fileUrl   String?  // uploaded PDF/photo of blood work
  createdAt DateTime @default(now())

  child     Child    @relation(fields: [childId], references: [id])
}

model FoodPreference {
  id        String   @id @default(cuid())
  childId   String
  food      String   // e.g., "salmon", "broccoli", "pasta"
  rating    String   // "love", "like", "neutral", "dislike", "hate"
  notes     String?  // e.g., "only likes it grilled, not baked"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  child     Child    @relation(fields: [childId], references: [id])
}

model MealLog {
  id          String   @id @default(cuid())
  childId     String
  date        DateTime @default(now())
  mealType    String   // "breakfast", "lunch", "dinner", "snack"
  description String   // raw text input from parent
  photoUrl    String?  // food photo if provided
  confidence  String   @default("medium") // "high", "medium", "low"
  aiAnalysis  Json?    // raw AI response for debugging
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  child       Child    @relation(fields: [childId], references: [id])
  nutrients   NutritionEntry[]
}

model NutritionEntry {
  id        String   @id @default(cuid())
  mealLogId String
  nutrient  String   // "calories", "protein", "calcium", "vitaminD", "iron", "zinc", etc.
  amount    Float
  unit      String   // "kcal", "g", "mg", "IU", "mcg"

  mealLog   MealLog  @relation(fields: [mealLogId], references: [id], onDelete: Cascade)
}

model DailyTarget {
  id        String   @id @default(cuid())
  childId   String
  nutrient  String   // same keys as NutritionEntry
  target    Float
  unit      String
  updatedAt DateTime @updatedAt

  child     Child    @relation(fields: [childId], references: [id])

  @@unique([childId, nutrient])
}

model Recipe {
  id                String   @id @default(cuid())
  familyId          String
  title             String
  sourceUrl         String?
  sourceName        String?  // "Grandma", "Budget Bytes", "Nouri suggestion"
  description       String?
  instructions      String?  @db.Text
  ingredients       Json?    // [{ name, amount, unit }]
  nutritionPerServing Json?  // { calories: 420, protein: 38, ... }
  familyRating      String?  // "loved", "ok", "skip"
  tags              String[] // ["quick", "high-protein", "family-favorite"]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  family            Family   @relation(fields: [familyId], references: [id])
  childRatings      RecipeChildRating[]
}

model RecipeChildRating {
  id        String @id @default(cuid())
  recipeId  String
  childId   String
  rating    String // "loved", "ate_it", "didnt_eat"
  notes     String?

  recipe    Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([recipeId, childId])
}

model KitchenItem {
  id                 String   @id @default(cuid())
  familyId           String
  name               String   // "white dinner plate", "Mason's blue glass"
  type               String   // "plate", "bowl", "glass", "cup"
  photoUrl           String?
  estimatedDimensions Json?   // { diameterCm: 26, volumeMl: 350 }
  createdAt          DateTime @default(now())

  family             Family   @relation(fields: [familyId], references: [id])
}

model ChatMessage {
  id        String   @id @default(cuid())
  familyId  String
  parentId  String?  // which parent sent it (null for AI responses)
  role      String   // "user", "assistant"
  content   String   @db.Text
  metadata  Json?    // any context: which child discussed, actions taken
  createdAt DateTime @default(now())

  family    Family   @relation(fields: [familyId], references: [id])
  parent    Parent?  @relation(fields: [parentId], references: [id])
}
```

**Step 3: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 4: Set up local database and run migration**

```bash
# Ensure PostgreSQL is running locally, then:
createdb nouri

# Copy env template and fill in DATABASE_URL
cp .env.local.example .env.local
# Edit .env.local: DATABASE_URL="postgresql://chrispark@localhost:5432/nouri"

# Run migration
npx prisma migrate dev --name init
```

Expected: Migration creates all tables. Prisma client generates.

**Step 5: Verify Prisma client works**

```bash
npx prisma studio
```

Expected: Opens Prisma Studio in browser showing all empty tables.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema with complete data model"
```

---

### Task 3: Set Up NextAuth.js Authentication

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/auth.ts` (auth config)
- Create: `src/components/auth/sign-in-button.tsx`
- Create: `src/components/auth/sign-out-button.tsx`
- Create: `src/app/providers.tsx` (session provider wrapper)
- Modify: `src/app/layout.tsx` (wrap with providers)
- Modify: `package.json` (add next-auth)

**Step 1: Install NextAuth**

```bash
npm install next-auth @auth/prisma-adapter
```

**Step 2: Create auth configuration**

Create `src/lib/auth.ts`:

```typescript
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    // Email magic link (primary — simple for your wife)
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
    // GitHub (convenient for you)
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Attach parent info to session
      const parent = await prisma.parent.findUnique({
        where: { email: user.email! },
        include: { family: true },
      });
      if (parent) {
        (session as any).parentId = parent.id;
        (session as any).familyId = parent.familyId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
```

Note: The Prisma adapter expects the standard NextAuth models (Account, Session, VerificationToken). Our schema maps `Parent` to the user role. We may need to adjust the adapter mapping — handle this during implementation if the adapter expects a `User` model. Simplest fix: rename `Parent` to `User` in Prisma and add a `role` field, or create a thin `User` model that links to `Parent`. Decide during implementation based on what works cleanly.

**Step 3: Create the API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**Step 4: Create session provider**

Create `src/app/providers.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**Step 5: Wrap root layout with providers**

Modify `src/app/layout.tsx` to wrap `{children}` with `<Providers>`.

**Step 6: Create basic sign-in/sign-out components**

Simple button components using `signIn()` and `signOut()` from `next-auth/react`.

**Step 7: Verify auth flow**

For local dev, use GitHub OAuth (simpler than setting up email server):
1. Create a GitHub OAuth app (Settings → Developer Settings → OAuth Apps)
2. Set callback URL to `http://localhost:3000/api/auth/callback/github`
3. Add `GITHUB_ID` and `GITHUB_SECRET` to `.env.local`
4. Add `NEXTAUTH_SECRET` (run `openssl rand -base64 32`)
5. Visit `http://localhost:3000/api/auth/signin` — should see GitHub sign-in option

Expected: Can sign in via GitHub, session is created.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth.js with GitHub and email providers"
```

---

### Task 4: Seed Data — The Park Family

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma seed script)

**Step 1: Create seed file**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create the Park family
  const family = await prisma.family.create({
    data: {
      name: "Park Family",
    },
  });

  // Create Mason's profile
  const mason = await prisma.child.create({
    data: {
      familyId: family.id,
      name: "Mason",
      dateOfBirth: new Date("2013-06-15"), // approximate — 12 years old
      gender: "male",
      activityProfile: {
        sports: [
          { name: "Hockey (Select)", frequency: "5-6x/week", intensity: "high" },
          { name: "Baseball", frequency: "seasonal", intensity: "moderate" },
        ],
      },
      goals: "growth optimization",
    },
  });

  // Create Charlotte's profile
  const charlotte = await prisma.child.create({
    data: {
      familyId: family.id,
      name: "Charlotte",
      dateOfBirth: new Date("2017-03-04"), // turning 9 on March 4
      gender: "female",
      activityProfile: {
        sports: [
          { name: "Gymnastics", frequency: "3-4x/week", intensity: "high" },
          { name: "Dance", frequency: "2-3x/week", intensity: "moderate" },
        ],
      },
      goals: "growth optimization",
    },
  });

  // Set initial daily targets for Mason
  // Based on: 12yo active male, growth optimization
  const masonTargets = [
    { nutrient: "calories", target: 2400, unit: "kcal" },
    { nutrient: "protein", target: 70, unit: "g" },
    { nutrient: "calcium", target: 1300, unit: "mg" },
    { nutrient: "vitaminD", target: 600, unit: "IU" },
    { nutrient: "iron", target: 8, unit: "mg" },
    { nutrient: "zinc", target: 8, unit: "mg" },
    { nutrient: "magnesium", target: 240, unit: "mg" },
    { nutrient: "potassium", target: 2300, unit: "mg" },
    { nutrient: "vitaminA", target: 600, unit: "mcg" },
    { nutrient: "vitaminC", target: 45, unit: "mg" },
    { nutrient: "fiber", target: 31, unit: "g" },
    { nutrient: "omega3", target: 1200, unit: "mg" },
  ];

  for (const t of masonTargets) {
    await prisma.dailyTarget.create({
      data: { childId: mason.id, ...t },
    });
  }

  // Set initial daily targets for Charlotte
  // Based on: 8yo active female, growth optimization
  const charlotteTargets = [
    { nutrient: "calories", target: 1800, unit: "kcal" },
    { nutrient: "protein", target: 50, unit: "g" },
    { nutrient: "calcium", target: 1300, unit: "mg" },
    { nutrient: "vitaminD", target: 600, unit: "IU" },
    { nutrient: "iron", target: 10, unit: "mg" },
    { nutrient: "zinc", target: 5, unit: "mg" },
    { nutrient: "magnesium", target: 200, unit: "mg" },
    { nutrient: "potassium", target: 2300, unit: "mg" },
    { nutrient: "vitaminA", target: 400, unit: "mcg" },
    { nutrient: "vitaminC", target: 25, unit: "mg" },
    { nutrient: "fiber", target: 25, unit: "g" },
    { nutrient: "omega3", target: 900, unit: "mg" },
  ];

  for (const t of charlotteTargets) {
    await prisma.dailyTarget.create({
      data: { childId: charlotte.id, ...t },
    });
  }

  console.log("Seeded: Park family with Mason and Charlotte");
  console.log(`Family ID: ${family.id}`);
  console.log(`Mason ID: ${mason.id}`);
  console.log(`Charlotte ID: ${charlotte.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

**Step 2: Add seed script to package.json**

Add to `package.json`:

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Install ts-node:

```bash
npm install ts-node --save-dev
```

**Step 3: Run seed**

```bash
npx prisma db seed
```

Expected: Outputs family ID, Mason ID, Charlotte ID. No errors.

**Step 4: Verify in Prisma Studio**

```bash
npx prisma studio
```

Expected: Family table has 1 row, Child table has 2 rows (Mason and Charlotte), DailyTarget table has 24 rows (12 per child).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add seed data for Park family (Mason and Charlotte)"
```

---

### Task 5: App Shell and Layout

**Files:**
- Create: `src/components/layout/app-header.tsx`
- Create: `src/components/layout/mobile-nav.tsx`
- Create: `src/app/(app)/layout.tsx` (authenticated app layout)
- Create: `src/app/(app)/page.tsx` (dashboard home — placeholder)
- Create: `src/app/(app)/chat/page.tsx` (Ask Nouri — placeholder)
- Create: `src/app/(app)/recipes/page.tsx` (Recipe library — placeholder)
- Create: `src/app/(app)/settings/page.tsx` (Settings — placeholder)
- Create: `src/app/auth/signin/page.tsx` (sign-in page)

**Step 1: Create the authenticated layout with route group**

The `(app)` route group wraps all authenticated pages. The layout includes:
- A minimal header: "Nouri" logo/wordmark on the left, user avatar and sign-out on the right
- A bottom mobile nav (iPhone-style): Home | Chat | Recipes | Settings (4 tabs with icons)
- On desktop: same nav as a left sidebar

Use Tailwind responsive classes: `md:` prefix for desktop sidebar, mobile bottom nav by default.

**Step 2: Create placeholder pages**

Each page in the route group gets a simple heading:
- Home: "Dashboard" (this becomes the dual-kid home screen in M2)
- Chat: "Ask Nouri" 
- Recipes: "Recipe Library"
- Settings: "Settings"

**Step 3: Create sign-in page**

`src/app/auth/signin/page.tsx` — centered card with "Welcome to Nouri" heading, GitHub sign-in button. Minimal and clean.

**Step 4: Add auth guard to app layout**

The `(app)/layout.tsx` checks for session. If not authenticated, redirect to `/auth/signin`.

**Step 5: Verify navigation works**

```bash
npm run dev
```

Expected: 
- Unauthenticated → redirected to sign-in
- After sign-in → see dashboard with bottom nav (mobile) or sidebar (desktop)
- Can navigate between all 4 sections
- Responsive: works on narrow (iPhone) and wide (laptop) viewports

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add app shell with authenticated layout and navigation"
```

---

## Milestone 2: Core Features

The app becomes usable. Dashboard shows real data, you can log meals, and Ask Nouri works.

---

### Task 6: AI Service Layer

**Files:**
- Create: `src/lib/ai/router.ts` (AI provider router)
- Create: `src/lib/ai/providers/openai.ts`
- Create: `src/lib/ai/providers/anthropic.ts`
- Create: `src/lib/ai/providers/gemini.ts`
- Create: `src/lib/ai/types.ts` (shared types)
- Modify: `package.json` (add AI SDKs)

**Step 1: Install AI SDKs**

```bash
npm install openai @anthropic-ai/sdk @google/generative-ai
```

**Step 2: Define shared types**

Create `src/lib/ai/types.ts`:

```typescript
export interface FoodItem {
  name: string;
  quantity: string;    // "2 large", "1 cup", "a handful"
  estimatedGrams: number;
}

export interface NutritionEstimate {
  calories: number;
  protein: number;      // grams
  calcium: number;      // mg
  vitaminD: number;     // IU
  iron: number;         // mg
  zinc: number;         // mg
  magnesium: number;    // mg
  potassium: number;    // mg
  vitaminA: number;     // mcg
  vitaminC: number;     // mg
  fiber: number;        // grams
  omega3: number;       // mg
}

export interface ParsedMeal {
  items: FoodItem[];
  totalNutrition: NutritionEstimate;
  confidence: "high" | "medium" | "low";
  assumptions: string[]; // e.g., "Assumed whole wheat toast", "Estimated large egg (50g)"
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  content: string;
  actions?: Array<{
    type: "update_profile" | "save_recipe" | "log_meal";
    data: Record<string, unknown>;
  }>;
}
```

**Step 3: Create provider wrappers**

Each provider file exports a simple async function:

`src/lib/ai/providers/anthropic.ts`:
- `parseFoodDescription(description: string, childContext: object): Promise<ParsedMeal>` — sends the description with a system prompt instructing Claude to extract food items and estimate nutrition using USDA-aligned values
- `chat(messages: ChatMessage[], systemPrompt: string): Promise<ChatResponse>` — Ask Nouri chat, returns response with optional structured actions

`src/lib/ai/providers/openai.ts`:
- `analyzeFoodPhoto(imageBase64: string, childContext: object): Promise<ParsedMeal>` — sends photo to GPT-4o vision with system prompt to identify foods, estimate portions, and provide nutrition

`src/lib/ai/providers/gemini.ts`:
- `researchRecipes(query: string, childrenContext: object): Promise<Recipe[]>` — recipe research and suggestions

**Step 4: Create AI router**

`src/lib/ai/router.ts` — maps each capability to its provider:

```typescript
import { parseFoodDescription, chat } from "./providers/anthropic";
import { analyzeFoodPhoto } from "./providers/openai";
import { researchRecipes } from "./providers/gemini";

export const ai = {
  parseFoodDescription,
  analyzeFoodPhoto,
  chat,
  researchRecipes,
};
```

Simple re-export. No abstraction layers, no factory patterns. If we need to swap a provider, we change the import.

**Step 5: Write a quick integration test**

Create `src/lib/ai/__tests__/parse-food.test.ts`:

Test that `parseFoodDescription("2 scrambled eggs and a glass of milk", {})` returns a `ParsedMeal` with items and reasonable nutrition values (protein > 15g, calcium > 200mg). This is an integration test hitting the real API — skip in CI, run manually.

**Step 6: Verify**

```bash
npx jest src/lib/ai/__tests__/parse-food.test.ts
```

Expected: Parses the description, returns structured nutrition data.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add AI service layer with multi-provider router"
```

---

### Task 7: Home Dashboard — Dual-Kid View

**Files:**
- Create: `src/app/(app)/page.tsx` (replace placeholder)
- Create: `src/components/dashboard/child-card.tsx`
- Create: `src/components/dashboard/nutrient-bar.tsx`
- Create: `src/components/dashboard/meal-status.tsx`
- Create: `src/app/api/dashboard/route.ts` (API: get today's data for both kids)

**Step 1: Build the API endpoint**

`GET /api/dashboard` returns today's data for the family:

```typescript
// Response shape:
{
  children: [
    {
      id: string,
      name: string,
      age: number,
      photoUrl: string | null,
      targets: { [nutrient: string]: { target: number, unit: string } },
      todayIntake: { [nutrient: string]: { amount: number, unit: string } },
      todayMeals: { mealType: string, logged: boolean, summary?: string }[],
    },
    // ... second child
  ]
}
```

The API:
1. Gets the family ID from the session
2. Fetches both children with their daily targets
3. Aggregates today's MealLog → NutritionEntry sums per nutrient
4. Returns the combined payload

**Step 2: Build the NutrientBar component**

`src/components/dashboard/nutrient-bar.tsx`:
- Props: `label`, `current`, `target`, `unit`
- Renders: label on left, horizontal progress bar, "current/target unit" on right
- Color: green if >= 80% of target, yellow if 40-80%, red if < 40%
- Use Tailwind for the bar (a `div` with percentage width and background color)

**Step 3: Build the MealStatus component**

`src/components/dashboard/meal-status.tsx`:
- Shows which meals are logged today: Breakfast, Lunch, Snack, Dinner
- Logged meals show a checkmark, unlogged show a dot
- Compact, single row

**Step 4: Build the ChildCard component**

`src/components/dashboard/child-card.tsx`:
- Shows: profile photo (or initial avatar), name, age
- Shows: 4 primary NutrientBars (calories, protein, calcium, vitamin D)
- Shows: MealStatus row
- Shows: [+ meal] button in the top-right corner
- Tappable to expand to full detail view (link to `/child/[id]`)

**Step 5: Assemble the home page**

`src/app/(app)/page.tsx`:
- Fetches `/api/dashboard` on load
- Renders two ChildCards stacked vertically (mobile) or side-by-side (desktop `md:grid-cols-2`)
- Shows current date at the top

**Step 6: Verify**

```bash
npm run dev
```

Expected: Home screen shows Mason and Charlotte cards with empty progress bars (no meals logged yet) and all meal slots unlogged. Responsive: stacked on narrow viewport, side-by-side on wide.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add home dashboard with dual-kid nutrition cards"
```

---

### Task 8: Child Detail View

**Files:**
- Create: `src/app/(app)/child/[id]/page.tsx`
- Create: `src/components/dashboard/nutrient-detail.tsx` (full nutrient list)
- Create: `src/components/dashboard/meal-list.tsx` (today's meals expanded)
- Create: `src/app/api/child/[id]/route.ts` (API: full child data)

**Step 1: Build the API endpoint**

`GET /api/child/[id]` returns full detail for one child:
- Profile info (name, age, photo, activity, goals)
- All daily targets (primary + secondary nutrients)
- Today's intake per nutrient (aggregated from meal logs)
- Today's meal list with full details (description, nutrition breakdown, timestamp, confidence)

**Step 2: Build the detail page**

`src/app/(app)/child/[id]/page.tsx`:
- Profile header: photo, name, age, activity summary
- All nutrient bars (6 primary always visible, secondary expandable)
- Today's meals list: each meal shows description, time, and full nutrition breakdown on tap/expand
- Back button to return to home dashboard

**Step 3: Verify**

Navigate from home → tap Mason's card → see full detail view. Back button returns to home.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add child detail view with full nutrition breakdown"
```

---

### Task 9: Meal Logging — Text Input

**Files:**
- Create: `src/app/(app)/log/[childId]/page.tsx` (logging page)
- Create: `src/components/log/text-input.tsx` (natural language input)
- Create: `src/components/log/meal-confirmation.tsx` (confirmation card)
- Create: `src/app/api/log/parse/route.ts` (API: send text to AI, get nutrition)
- Create: `src/app/api/log/save/route.ts` (API: save confirmed meal log)

**Step 1: Build the parse API**

`POST /api/log/parse`:
- Request: `{ childId: string, description: string, mealType: string }`
- Fetches child context (age, preferences) from DB
- Calls `ai.parseFoodDescription(description, childContext)`
- Returns: `ParsedMeal` (items, nutrition, confidence, assumptions)
- Does NOT save yet — this is a preview

**Step 2: Build the save API**

`POST /api/log/save`:
- Request: `{ childId: string, mealType: string, description: string, parsedMeal: ParsedMeal, photoUrl?: string }`
- Creates MealLog + NutritionEntry rows in database
- Returns: saved meal log with ID

**Step 3: Build the text input component**

`src/components/log/text-input.tsx`:
- Meal type selector at top: Breakfast | Lunch | Snack | Dinner (pill buttons)
- Large text area: "What did [Mason] eat?"
- Submit button
- Shows loading spinner while AI processes

**Step 4: Build the confirmation card**

`src/components/log/meal-confirmation.tsx`:
- Shows: parsed food items with quantities
- Shows: total nutrition summary (calories, protein, calcium, vitamin D)
- Shows: assumptions the AI made (if any)
- Shows: confidence indicator
- Two buttons: "Looks right ✓" (saves) and "Edit" (lets parent modify items/quantities)
- Edit mode: inline editable fields for each food item and quantity

**Step 5: Build the logging page**

`src/app/(app)/log/[childId]/page.tsx`:
- Shows child name at top ("Logging for Mason")
- Text input component → on submit → shows confirmation card → on confirm → saves and redirects to home
- The [+ meal] button on the home dashboard links here with the child's ID

**Step 6: Verify end-to-end**

1. From home, tap [+ meal] on Mason's card
2. Select "Breakfast", type "2 scrambled eggs, toast with butter, glass of OJ"
3. AI parses → confirmation card shows items and nutrition
4. Tap "Looks right ✓" → saves → redirects to home
5. Home dashboard now shows updated progress bars and Breakfast checked off

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add text-based meal logging with AI nutrition parsing"
```

---

### Task 10: Meal Logging — Photo Upload

**Files:**
- Create: `src/components/log/photo-input.tsx`
- Create: `src/app/api/log/parse-photo/route.ts`
- Create: `src/app/api/upload/route.ts` (image upload to Azure Blob)
- Modify: `src/app/(app)/log/[childId]/page.tsx` (add photo tab)
- Modify: `package.json` (add Azure storage SDK)

**Step 1: Install Azure Storage SDK**

```bash
npm install @azure/storage-blob
```

**Step 2: Build the image upload API**

`POST /api/upload`:
- Accepts multipart form data with an image file
- Uploads to Azure Blob Storage container
- Returns: `{ url: string }` — the public URL of the uploaded image

**Step 3: Build the photo parse API**

`POST /api/log/parse-photo`:
- Request: `{ childId: string, imageUrl: string, mealType: string }`
- Downloads image, converts to base64
- Fetches child context + kitchen items (calibrated plates/glasses) from DB
- Calls `ai.analyzeFoodPhoto(imageBase64, { childContext, kitchenItems })`
- Returns: `ParsedMeal` (same shape as text parsing)

**Step 4: Build the photo input component**

`src/components/log/photo-input.tsx`:
- Camera button (opens device camera on iPhone) and gallery button (pick existing photo)
- Shows image preview after selection
- Upload button → uploads to Azure → sends to parse API → shows confirmation card
- Uses the same `meal-confirmation.tsx` component as text logging

**Step 5: Add photo tab to logging page**

Modify `src/app/(app)/log/[childId]/page.tsx`:
- Two tabs at top: "Describe it" (text) | "Take a photo" (camera)
- Both paths converge on the same confirmation card and save flow

**Step 6: Verify**

1. From home, tap [+ meal] on Charlotte's card
2. Select photo tab, take or upload a food photo
3. AI analyzes → confirmation card shows identified foods and nutrition
4. Confirm → saves → home dashboard updates

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add photo-based meal logging with GPT-4o vision"
```

---

### Task 11: Quick Re-log (Recent & Favorites)

**Files:**
- Create: `src/components/log/quick-relog.tsx`
- Create: `src/app/api/log/recent/route.ts` (API: recent meals for a child)
- Modify: `src/app/(app)/log/[childId]/page.tsx` (add recent section)

**Step 1: Build the recent meals API**

`GET /api/log/recent?childId=[id]`:
- Returns the last 10 unique meals for this child (deduplicated by description similarity)
- Each includes: description, mealType, nutrition summary, last logged date
- Ordered by frequency (most common first), then recency

**Step 2: Build the quick re-log component**

`src/components/log/quick-relog.tsx`:
- Shows a list of recent/common meals as tappable cards
- Each card: meal description, last logged date, quick nutrition summary
- Tap → immediately creates a new MealLog with the same nutrition values (no AI call needed)
- Redirects to home after save

**Step 3: Add to logging page**

Show the quick re-log section above the text/photo input on the logging page. Label: "Quick re-log" with a subtitle "Meals [Mason] has had before."

**Step 4: Verify**

After logging a few meals via text/photo, the quick re-log section should populate. Tapping one should instantly log it and update the dashboard.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add quick re-log for common meals"
```

---

### Task 12: Ask Nouri — AI Chat

**Files:**
- Create: `src/app/(app)/chat/page.tsx` (replace placeholder)
- Create: `src/components/chat/chat-interface.tsx`
- Create: `src/components/chat/message-bubble.tsx`
- Create: `src/lib/ai/nouri-system-prompt.ts` (builds context-rich system prompt)
- Create: `src/app/api/chat/route.ts` (API: chat endpoint)
- Create: `src/app/api/chat/history/route.ts` (API: load chat history)

**Step 1: Build the system prompt builder**

`src/lib/ai/nouri-system-prompt.ts`:

```typescript
export async function buildNouriSystemPrompt(familyId: string): Promise<string> {
  // Fetches from DB:
  // 1. Both children's full profiles (name, age, activity, goals, preferences)
  // 2. Recent meal logs (last 7 days per child)
  // 3. Current daily/weekly nutrition progress
  // 4. Health records summary (latest blood work values)
  // 5. Kitchen calibration data
  // 6. Saved recipes and ratings
  //
  // Assembles into a structured system prompt:
  // "You are Nouri, a pediatric nutrition intelligence assistant for the Park family..."
  // Includes all child data, current nutrition status, preferences, health data.
  // Instructions: be specific, actionable, reference the children by name,
  // use their actual nutrition data in recommendations.
  // When the user says something that updates a profile (new weight, new preference),
  // return a structured action in the response.
}
```

This function is called fresh on every chat interaction so the context is always current.

**Step 2: Build the chat API**

`POST /api/chat`:
- Request: `{ message: string }`
- Gets familyId and parentId from session
- Builds system prompt via `buildNouriSystemPrompt(familyId)`
- Loads recent chat history from DB (last 20 messages for context window)
- Calls `ai.chat([...history, { role: "user", content: message }], systemPrompt)`
- Saves both user message and AI response to ChatMessage table
- If response includes actions (profile update, recipe save), executes them
- Returns: `{ content: string, actions?: Action[] }`

`GET /api/chat/history`:
- Returns last 50 messages for the family, ordered by createdAt
- Includes parent name on user messages

**Step 3: Build the chat interface**

`src/components/chat/chat-interface.tsx`:
- Standard chat UI: messages list (scrollable), text input at bottom
- User messages right-aligned (blue), Nouri messages left-aligned (gray)
- Show which parent sent each message (small label)
- Auto-scroll to bottom on new messages
- Loading indicator while Nouri is thinking

`src/components/chat/message-bubble.tsx`:
- Renders a single message with appropriate styling
- Nouri messages: render markdown (bold, lists, etc.) for formatted responses

**Step 4: Build the chat page**

`src/app/(app)/chat/page.tsx`:
- Loads chat history on mount
- Renders chat interface
- Full height (fills available space between header and nav)

**Step 5: Verify**

1. Navigate to Chat tab
2. Type "What should Mason eat for dinner tonight?"
3. Nouri responds with a personalized recommendation based on Mason's profile and today's nutrition gaps
4. Message appears in chat, saved to DB
5. Refresh page — chat history persists

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Ask Nouri conversational AI chat"
```

---

### Task 13: Child Profile Management

**Files:**
- Create: `src/app/(app)/child/[id]/edit/page.tsx`
- Create: `src/components/profile/profile-form.tsx`
- Create: `src/components/profile/health-record-upload.tsx`
- Create: `src/components/profile/food-preferences.tsx`
- Create: `src/app/api/child/[id]/update/route.ts`
- Create: `src/app/api/child/[id]/health-record/route.ts`
- Create: `src/app/api/child/[id]/preferences/route.ts`

**Step 1: Build the profile update API**

`PUT /api/child/[id]/update`:
- Updates basic info: height, weight, activity profile, goals, photo
- If height/weight changed, creates a new HealthRecord of type "growth_measurement" for historical tracking
- Recalculates DailyTargets if weight or activity changed

**Step 2: Build the health record API**

`POST /api/child/[id]/health-record`:
- Accepts: type, date, data (JSON), optional file upload
- For blood work uploads: stores the file, and in a future iteration AI can extract values
- For now: manual entry of key blood work values (iron, vitamin D, calcium, etc.) via a simple form

**Step 3: Build the preferences API**

`POST /api/child/[id]/preferences`:
- Add/update food preference: food name, rating (love/like/neutral/dislike/hate), optional notes
- Used by AI when making recommendations

**Step 4: Build the profile form**

`src/components/profile/profile-form.tsx`:
- Sections: Basics (photo, height, weight), Activity (sports list — add/remove), Goals
- Photo upload for profile picture (uses same Azure upload endpoint)
- Save button at bottom

**Step 5: Build the health record component**

`src/components/profile/health-record-upload.tsx`:
- Add new record: select type (blood work, growth measurement, supplement, note)
- For blood work: form fields for common values (iron, vitamin D, calcium, B12, etc.)
- For growth: height and weight fields
- Date picker
- Optional file upload (PDF, photo)
- History list showing past records

**Step 6: Build the food preferences component**

`src/components/profile/food-preferences.tsx`:
- List of current preferences with ratings
- Add new: food name input, rating selector (emoji scale: love → hate), optional notes
- Edit/delete existing
- Searchable/filterable

**Step 7: Build the edit page**

`src/app/(app)/child/[id]/edit/page.tsx`:
- Tabs: Profile | Health Records | Food Preferences
- Each tab shows the corresponding component
- Accessible from the child detail view (edit button)

**Step 8: Verify**

1. Navigate to Mason's detail view → tap Edit
2. Update weight → save → daily targets recalculate
3. Add a blood work record with vitamin D level
4. Add food preferences (loves: pasta, chicken; hates: broccoli)
5. Return to home — data reflects changes
6. Ask Nouri "What does Mason like to eat?" — should reference the preferences

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add child profile management with health records and food preferences"
```

---

### Task 14: Family Meal Logging

**Files:**
- Create: `src/components/log/family-meal-input.tsx`
- Create: `src/app/api/log/parse-family/route.ts`
- Modify: `src/app/(app)/log/[childId]/page.tsx` (add family meal option)

**Step 1: Build the family meal parse API**

`POST /api/log/parse-family`:
- Request: `{ description: string, mealType: string }`
- Parses descriptions like "Both kids had tacos for dinner. Mason had 3, Charlotte had 2."
- Returns: `{ mason: ParsedMeal, charlotte: ParsedMeal }` — separate nutrition for each child
- Uses Anthropic Claude with a prompt that understands multi-child meal descriptions

**Step 2: Build the family meal input component**

`src/components/log/family-meal-input.tsx`:
- Similar to text input but labeled "Log for both kids"
- Shows two confirmation cards side by side (or stacked on mobile) — one per child
- Each can be confirmed or edited independently
- "Save both" button at bottom

**Step 3: Add family meal option**

Add a "Log family meal" button on the home dashboard (between the two kid cards) or as a third tab on the logging page.

**Step 4: Verify**

1. Tap "Log family meal"
2. Type "Both kids had spaghetti and meatballs. Mason had a big plate, Charlotte had a small bowl."
3. See two confirmation cards with different portions
4. Confirm both → both dashboards update

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add family meal logging for both kids at once"
```

---

## End of Milestone 2

At this point, Nouri is a **functional app**:

- Both parents can sign in
- Home screen shows both kids with live nutrition tracking
- Meals can be logged via text, photo, quick re-log, or family meal
- AI parses food and estimates nutrition automatically
- Full child profiles with health records and preferences
- Ask Nouri chat provides personalized nutrition guidance
- All data persists and builds over time

### What Comes Next (Milestones 3-4, planned later)

**M3: Library & Insights**
- Recipe library (save meals as recipes, paste URLs, browse/search, feedback ratings)
- Weekly tracking view with bar charts and trends
- AI weekly insight generation
- Kitchen calibration (plate/glass onboarding)
- Nouri proactive meal plan suggestions

**M4: Polish & Deploy**
- PWA setup (installable on iPhone home screen)
- Smart notifications (afternoon gap alerts, weekly summary)
- Azure deployment (App Service + PostgreSQL + Blob Storage)
- Performance optimization (caching, optimistic UI)
- Onboarding flow for new families
