import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data using CASCADE to handle all FK constraints
  await pool.query(`
    TRUNCATE TABLE "FoodPreference", "MealLog", "DailyTarget", "ChatMessage", "Child", "User", "Family"
    RESTART IDENTITY CASCADE
  `);

  // 1. Create the Park family
  const family = await prisma.family.create({
    data: { name: "Park" },
  });
  console.log(`Created family: ${family.id} (${family.name})`);

  // 2. Create Mason
  const mason = await prisma.child.create({
    data: {
      familyId: family.id,
      name: "Mason",
      dateOfBirth: new Date("2013-06-15"),
      gender: "male",
      activityProfile: {
        sports: [
          { name: "hockey", frequency: "5-6x/week", intensity: "high" },
          { name: "baseball", frequency: "seasonal", intensity: "moderate" },
        ],
      },
      goals: "growth optimization",
    },
  });
  console.log(`Created child: ${mason.id} (${mason.name})`);

  // 3. Create Charlotte
  const charlotte = await prisma.child.create({
    data: {
      familyId: family.id,
      name: "Charlotte",
      dateOfBirth: new Date("2017-03-04"),
      gender: "female",
      activityProfile: {
        sports: [
          { name: "gymnastics", frequency: "3-4x/week", intensity: "high" },
          { name: "dance", frequency: "2-3x/week", intensity: "moderate" },
        ],
      },
      goals: "growth optimization",
    },
  });
  console.log(`Created child: ${charlotte.id} (${charlotte.name})`);

  // 4. Daily targets for Mason (12 nutrients)
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

  // 5. Daily targets for Charlotte (12 nutrients)
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

  for (const t of masonTargets) {
    await prisma.dailyTarget.create({
      data: { childId: mason.id, ...t },
    });
  }
  console.log(`Created ${masonTargets.length} daily targets for Mason`);

  for (const t of charlotteTargets) {
    await prisma.dailyTarget.create({
      data: { childId: charlotte.id, ...t },
    });
  }
  console.log(`Created ${charlotteTargets.length} daily targets for Charlotte`);

  // Create a dev test user linked to the family
  await prisma.user.upsert({
    where: { email: "dev@nouri.app" },
    update: { familyId: family.id, name: "Dev User" },
    create: {
      email: "dev@nouri.app",
      name: "Dev User",
      familyId: family.id,
    },
  });
  console.log("Created dev user: dev@nouri.app");

  // 6. Seed Achievement badge definitions (upsert — idempotent)
  const achievements = [
    {
      key: "first-meal",
      name: "First Bite",
      description: "Log your first meal",
      iconRef: "🥗",
    },
    {
      key: "meals-5",
      name: "Five and Counting",
      description: "Log 5 meals",
      iconRef: "⭐",
    },
    {
      key: "meals-25",
      name: "On a Roll",
      description: "Log 25 meals",
      iconRef: "🎯",
    },
    {
      key: "meals-100",
      name: "Century",
      description: "Log 100 meals",
      iconRef: "🏆",
    },
    {
      key: "streak-3",
      name: "3-Day Streak",
      description: "Log meals 3 days in a row",
      iconRef: "🔥",
    },
    {
      key: "streak-7",
      name: "Week Warrior",
      description: "Log meals 7 days in a row",
      iconRef: "🔥🔥",
    },
    {
      key: "streak-30",
      name: "Habit Locked",
      description: "Log meals 30 days in a row",
      iconRef: "💪",
    },
    {
      key: "protein-goal-5",
      name: "Protein Pro",
      description: "Hit your protein goal 5 days in a row",
      iconRef: "💪",
    },
    {
      key: "calories-goal-day",
      name: "Balanced Day",
      description: "Hit your calorie goal today",
      iconRef: "✅",
    },
    {
      key: "family-meal",
      name: "Family Table",
      description: "Both kids logged a meal on the same day",
      iconRef: "🍽️",
    },
    {
      key: "variety-5",
      name: "Foodie",
      description: "Log 5 different meals in a single day",
      iconRef: "🌈",
    },
    {
      key: "early-bird",
      name: "Early Bird",
      description: "Log breakfast before 9am",
      iconRef: "🌅",
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: {
        name: achievement.name,
        description: achievement.description,
        iconRef: achievement.iconRef,
      },
      create: achievement,
    });
  }
  console.log(`Seeded ${achievements.length} achievement badges`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());