import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data (in reverse dependency order)
  await prisma.dailyTarget.deleteMany();
  await prisma.child.deleteMany();
  await prisma.family.deleteMany();

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());