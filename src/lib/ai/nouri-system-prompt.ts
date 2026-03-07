// ── Pure synchronous prompt builder (no DB — fully testable) ─────────────────

export interface IngredientConstraintInput {
  ingredient: string;
  severity: string; // "allergy" | "intolerance" | "avoid"
}

export interface NouriPromptOptions {
  childName?: string;
  childAge?: number;
  ingredientConstraints?: IngredientConstraintInput[];
}

/**
 * Builds a focused Nouri system prompt from explicit options.
 * Pure synchronous function — no DB access. Used for testing and
 * lightweight prompt contexts. The full family-aware prompt is in
 * buildFamilySystemPrompt() below.
 */
export function buildNouriSystemPrompt(options: NouriPromptOptions): string {
  const sections: string[] = [];

  sections.push("You are Nouri, a pediatric nutrition intelligence assistant.");

  if (options.childName) {
    const age = options.childAge ? `, age ${options.childAge}` : "";
    sections.push(`Child: ${options.childName}${age}`);
  }

  if (options.ingredientConstraints && options.ingredientConstraints.length > 0) {
    const lines: string[] = [
      "NEVER suggest or recommend foods containing the following ingredients:",
    ];
    for (const c of options.ingredientConstraints) {
      const tag =
        c.severity === "allergy"
          ? " (ALLERGY — strict avoidance)"
          : ` (${c.severity})`;
      lines.push(`- ${c.ingredient}${tag}`);
    }
    lines.push(
      "\nThis applies to ALL meal tips, suggestions, recipe recommendations, and chat responses.",
    );
    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
}

// ── Full family-aware prompt (async, DB-backed) ───────────────────────────────

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }
  return age;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function sevenDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface ActivitySport {
  name: string;
  frequency?: string;
  intensity?: string;
}

interface ActivityProfile {
  sports?: ActivitySport[];
}

/**
 * Builds the full Nouri system prompt for the AI chat route.
 * Fetches all family data from the database including ingredient constraints.
 * Renamed from buildNouriSystemPrompt to avoid conflicts with the pure
 * synchronous version above.
 */
export async function buildFamilySystemPrompt(
  familyId: string,
): Promise<string> {
  // Dynamic import keeps prisma out of the module's top-level scope,
  // allowing the pure buildNouriSystemPrompt() to be imported and tested
  // without a database connection.
  const { prisma } = await import("../db");

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: {
      children: {
        include: {
          foodPreferences: true,
          ingredientConstraints: true,
          dailyTargets: true,
          healthRecords: {
            where: { type: "blood_work" },
            orderBy: { date: "desc" },
            take: 1,
          },
          mealLogs: {
            where: { date: { gte: sevenDaysAgo() } },
            orderBy: { date: "desc" },
            include: { nutrients: true },
          },
        },
      },
      kitchenItems: true,
      recipes: {
        include: { childRatings: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!family) {
    return "You are Nouri, a pediatric nutrition assistant. No family data is available.";
  }

  const sections: string[] = [];

  sections.push(
    `You are Nouri, a pediatric nutrition intelligence assistant for the ${family.name} family.`,
  );
  sections.push(
    "You have deep knowledge of pediatric nutrition science. Be specific, actionable, and reference the children by name. Use their actual nutrition data in your recommendations.",
  );

  // Children profiles
  const todayStart = startOfToday();

  for (const child of family.children) {
    const age = calculateAge(child.dateOfBirth);
    const lines: string[] = [];
    lines.push(`## ${child.name} (age ${age}, ${child.gender})`);

    // Activity profile
    const profile = child.activityProfile as ActivityProfile | null;
    if (profile?.sports && profile.sports.length > 0) {
      const sportStrs = profile.sports.map(
        (s) =>
          `${s.name}${s.frequency ? ` ${s.frequency}` : ""}${s.intensity ? ` (${s.intensity})` : ""}`,
      );
      lines.push(`- Activity: ${sportStrs.join(", ")}`);
    }

    if (child.goals) {
      lines.push(`- Goals: ${child.goals}`);
    }
    if (child.heightCm) {
      lines.push(`- Height: ${child.heightCm} cm`);
    }
    if (child.weightKg) {
      lines.push(`- Weight: ${child.weightKg} kg`);
    }

    // Food preferences
    if (child.foodPreferences.length > 0) {
      const grouped: Record<string, string[]> = {};
      for (const pref of child.foodPreferences) {
        if (!grouped[pref.rating]) grouped[pref.rating] = [];
        grouped[pref.rating].push(pref.food);
      }
      const parts: string[] = [];
      for (const rating of ["love", "like", "neutral", "dislike", "hate"]) {
        if (grouped[rating]) {
          parts.push(`${rating}s: ${grouped[rating].join(", ")}`);
        }
      }
      lines.push(`- Food preferences: ${parts.join("; ")}`);
    }

    // Ingredient constraints
    if (child.ingredientConstraints.length > 0) {
      const constraintLines: string[] = [
        "- NEVER suggest or recommend foods containing the following ingredients:",
      ];
      for (const c of child.ingredientConstraints) {
        const tag =
          c.severity === "allergy"
            ? " (ALLERGY — strict avoidance)"
            : ` (${c.severity})`;
        constraintLines.push(`  - ${c.ingredient}${tag}`);
      }
      constraintLines.push(
        "  This applies to ALL meal tips, suggestions, recipe recommendations, and chat responses.",
      );
      lines.push(constraintLines.join("\n"));
    }

    // Recent meals summary
    if (child.mealLogs.length > 0) {
      const mealSummaries = child.mealLogs.slice(0, 14).map((ml) => {
        const date = ml.date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        return `${date} ${ml.mealType}: ${ml.description}`;
      });
      lines.push(`- Recent meals (last 7 days):`);
      for (const s of mealSummaries) {
        lines.push(`  - ${s}`);
      }
    }

    // Today's nutrition progress
    const todayMeals = child.mealLogs.filter((ml) => ml.date >= todayStart);
    if (child.dailyTargets.length > 0) {
      const intakeMap: Record<string, number> = {};
      for (const meal of todayMeals) {
        for (const n of meal.nutrients) {
          intakeMap[n.nutrient] = (intakeMap[n.nutrient] || 0) + n.amount;
        }
      }
      const progressParts = child.dailyTargets.map((t) => {
        const current = intakeMap[t.nutrient] || 0;
        return `${t.nutrient}: ${Math.round(current)}/${Math.round(t.target)} ${t.unit}`;
      });
      lines.push(`- Today's nutrition progress: ${progressParts.join(", ")}`);
    }

    // Latest health data
    if (child.healthRecords.length > 0) {
      const record = child.healthRecords[0];
      const data = record.data as Record<string, unknown>;
      const entries = Object.entries(data)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const date = record.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      lines.push(`- Latest blood work (${date}): ${entries}`);
    }

    sections.push(lines.join("\n"));
  }

  // Kitchen items
  if (family.kitchenItems.length > 0) {
    const items = family.kitchenItems.map((ki) => `${ki.name} (${ki.type})`);
    sections.push(`## Kitchen\n${items.join(", ")}`);
  }

  // Recipes
  if (family.recipes.length > 0) {
    const recipeLines = family.recipes.map(
      (r) => `- ${r.title}${r.familyRating ? ` (family: ${r.familyRating})` : ""}`,
    );
    sections.push(`## Family Recipes\n${recipeLines.join("\n")}`);
  }

  // Guidelines
  sections.push(`## Guidelines
- Always be encouraging and practical
- Suggest foods the children actually like when possible
- Flag if a child is significantly below targets on important nutrients
- When asked about meal ideas, consider what's already been eaten today
- If the parent mentions new information (weight change, new food preference, blood work result), suggest they update the profile`);

  return sections.join("\n\n");
}
