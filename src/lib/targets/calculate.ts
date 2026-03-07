/**
 * calculate.ts — Evidence-based daily nutrient target calculation.
 *
 * Based on USDA Dietary Reference Intakes (DRI) for children and adolescents,
 * with Physical Activity Level (PAL) multipliers for calorie targets.
 * No external dependencies — pure TypeScript functions, fully testable.
 */

export interface ChildProfile {
  ageYears: number
  gender: 'male' | 'female'
  weightKg: number
  heightCm: number
  activityLevel: 'low' | 'moderate' | 'high' | 'very_high'
}

export interface NutrientTarget {
  nutrient: string
  amount: number
  unit: string
  /** Human-readable explanation of the target source and formula. */
  source: string
}

// ── Physical Activity Level multipliers (PAL) ──────────────────────────────
// Applied to base calorie requirements only.
const PAL: Record<ChildProfile['activityLevel'], number> = {
  low: 1.3,       // sedentary / very light activity
  moderate: 1.5,  // light activity, 1-3x/week
  high: 1.7,      // active 3-5x/week
  very_high: 2.0, // athlete, 5+ intense sessions/week
}

const ACTIVITY_LABEL: Record<ChildProfile['activityLevel'], string> = {
  low: 'sedentary',
  moderate: 'moderate activity',
  high: 'high activity',
  very_high: 'very high activity (athlete)',
}

// ── USDA DRI base values by age bracket and gender ────────────────────────
// Calories are pre-PAL base values (approximate resting energy needs).
// All other nutrients are the Recommended Dietary Allowance (RDA) or
// Adequate Intake (AI) values.

interface DriRow {
  calories: number   // kcal — base before PAL multiplier
  protein: number    // g
  calcium: number    // mg
  vitaminD: number   // mcg
  iron: number       // mg
  zinc: number       // mg
  magnesium: number  // mg
  potassium: number  // mg
  vitaminA: number   // mcg RAE
  vitaminC: number   // mg
  fiber: number      // g
  omega3: number     // g
}

// Keyed by age bracket string, then gender.
// "male" values are used when gender === 'male'; same for "female".
// Where male === female, both entries are identical.
const DRI_TABLE: Record<string, { male: DriRow; female: DriRow }> = {
  '1-3': {
    male: {
      calories: 800, protein: 13, calcium: 700, vitaminD: 15,
      iron: 7, zinc: 3, magnesium: 80, potassium: 2000,
      vitaminA: 300, vitaminC: 15, fiber: 14, omega3: 0.7,
    },
    female: {
      calories: 800, protein: 13, calcium: 700, vitaminD: 15,
      iron: 7, zinc: 3, magnesium: 80, potassium: 2000,
      vitaminA: 300, vitaminC: 15, fiber: 14, omega3: 0.7,
    },
  },
  '4-8': {
    male: {
      calories: 1000, protein: 19, calcium: 1000, vitaminD: 15,
      iron: 10, zinc: 5, magnesium: 130, potassium: 2300,
      vitaminA: 400, vitaminC: 25, fiber: 20, omega3: 0.9,
    },
    female: {
      calories: 950, protein: 19, calcium: 1000, vitaminD: 15,
      iron: 10, zinc: 5, magnesium: 130, potassium: 2300,
      vitaminA: 400, vitaminC: 25, fiber: 20, omega3: 0.9,
    },
  },
  '9-13': {
    male: {
      calories: 1100, protein: 34, calcium: 1300, vitaminD: 15,
      iron: 8, zinc: 8, magnesium: 240, potassium: 2500,
      vitaminA: 600, vitaminC: 45, fiber: 25, omega3: 1.2,
    },
    female: {
      calories: 1000, protein: 34, calcium: 1300, vitaminD: 15,
      iron: 8, zinc: 8, magnesium: 240, potassium: 2300,
      vitaminA: 600, vitaminC: 45, fiber: 22, omega3: 1.0,
    },
  },
  '14-18': {
    male: {
      calories: 1300, protein: 52, calcium: 1300, vitaminD: 15,
      iron: 11, zinc: 11, magnesium: 410, potassium: 3000,
      vitaminA: 900, vitaminC: 75, fiber: 31, omega3: 1.6,
    },
    female: {
      calories: 1100, protein: 46, calcium: 1300, vitaminD: 15,
      iron: 15, zinc: 9, magnesium: 360, potassium: 2600,
      vitaminA: 700, vitaminC: 65, fiber: 26, omega3: 1.1,
    },
  },
}

// Nutrient units — single source of truth
const UNITS: Record<keyof DriRow, string> = {
  calories: 'kcal',
  protein: 'g',
  calcium: 'mg',
  vitaminD: 'mcg',
  iron: 'mg',
  zinc: 'mg',
  magnesium: 'mg',
  potassium: 'mg',
  vitaminA: 'mcg',
  vitaminC: 'mg',
  fiber: 'g',
  omega3: 'g',
}

/** Map an age in years to the DRI bracket key. */
function ageBracket(ageYears: number): string {
  if (ageYears <= 3) return '1-3'
  if (ageYears <= 8) return '4-8'
  if (ageYears <= 13) return '9-13'
  return '14-18'
}

/**
 * Calculate evidence-based daily nutrient targets for a child.
 * Returns all 12 nutrients tracked by Nouri, each with a source explanation.
 */
export function calculateTargets(profile: ChildProfile): NutrientTarget[] {
  const bracket = ageBracket(profile.ageYears)
  const row = DRI_TABLE[bracket][profile.gender]
  const pal = PAL[profile.activityLevel]
  const actLabel = ACTIVITY_LABEL[profile.activityLevel]
  const genderLabel = profile.gender === 'male' ? 'male' : 'female'
  const baseSource = `USDA DRI ${profile.ageYears}yo ${genderLabel}`

  const targets: NutrientTarget[] = []

  for (const key of Object.keys(UNITS) as (keyof DriRow)[]) {
    const base = row[key]
    let amount: number
    let source: string

    if (key === 'calories') {
      amount = Math.round(base * pal)
      source = `${baseSource}, ${actLabel} multiplier (×${pal})`
    } else if (key === 'calcium' && profile.ageYears >= 9) {
      amount = base
      source = `${baseSource} — peak bone growth phase (age 9–18)`
    } else {
      amount = base
      source = baseSource
    }

    targets.push({ nutrient: key, amount, unit: UNITS[key], source })
  }

  return targets
}

// ── Helpers for converting DB records to ChildProfile ─────────────────────

/**
 * Derive a discrete activity level from the activityProfile JSON stored in the DB.
 * The DB stores { sports: [{ name, frequency, intensity }] } where intensity
 * is 'low' | 'moderate' | 'high'.
 */
export function deriveActivityLevel(
  activityProfile: { sports?: { intensity?: string }[] } | null | undefined,
): ChildProfile['activityLevel'] {
  const sports = activityProfile?.sports ?? []
  if (!sports.length) return 'low'

  const intensityScore = (s: { intensity?: string }) => {
    if (s.intensity === 'high') return 3
    if (s.intensity === 'moderate') return 2
    return 1
  }

  const avg = sports.reduce((sum, s) => sum + intensityScore(s), 0) / sports.length

  if (avg >= 2.5) return 'very_high'
  if (avg >= 2.0) return 'high'
  if (avg >= 1.5) return 'moderate'
  return 'low'
}

/**
 * Build a ChildProfile from a Prisma Child record (or partial equivalent).
 * Safe to call even when optional fields are null.
 */
export function buildProfile(child: {
  dateOfBirth: Date
  gender: string
  weightKg: number | null
  heightCm: number | null
  activityProfile: unknown
}): ChildProfile {
  const ageMs = Date.now() - new Date(child.dateOfBirth).getTime()
  const ageYears = Math.max(1, Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000)))
  const gender = child.gender === 'female' ? 'female' : 'male'
  const profile = child.activityProfile as { sports?: { intensity?: string }[] } | null

  return {
    ageYears,
    gender,
    weightKg: child.weightKg ?? 0,
    heightCm: child.heightCm ?? 0,
    activityLevel: deriveActivityLevel(profile),
  }
}
