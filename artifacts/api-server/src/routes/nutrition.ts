import { Router, type IRouter } from "express";
import { eq, and, gte, lt, count } from "drizzle-orm";
import { db, mealsTable, profileTable } from "@workspace/db";
import {
  GetMealsResponse,
  LogMealBody,
  DeleteMealParams,
  GetNutritionSummaryResponse,
  GetMealStreakResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/meals", async (req, res): Promise<void> => {
  const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;

  let meals;
  if (dateParam) {
    const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateParam}T23:59:59.999Z`);
    meals = await db
      .select()
      .from(mealsTable)
      .where(and(gte(mealsTable.loggedAt, dayStart), lt(mealsTable.loggedAt, dayEnd)))
      .orderBy(mealsTable.loggedAt);
  } else {
    meals = await db.select().from(mealsTable).orderBy(mealsTable.loggedAt);
  }

  res.json(GetMealsResponse.parse(meals));
});

router.post("/meals", async (req, res): Promise<void> => {
  const parsed = LogMealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [meal] = await db.insert(mealsTable).values({
    name: parsed.data.name,
    calories: parsed.data.calories,
    protein: parsed.data.protein,
    carbs: parsed.data.carbs,
    fat: parsed.data.fat,
    fiber: parsed.data.fiber ?? 0,
    sugar: parsed.data.sugar ?? 0,
    vitamins: parsed.data.vitamins ?? null,
    mealType: parsed.data.mealType,
    notes: parsed.data.notes ?? null,
  }).returning();

  res.status(201).json(meal);
});

router.delete("/meals/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMealParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(mealsTable).where(eq(mealsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/nutrition/summary", async (req, res): Promise<void> => {
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const todayMeals = await db
    .select()
    .from(mealsTable)
    .where(and(gte(mealsTable.loggedAt, dayStart), lt(mealsTable.loggedAt, dayEnd)));

  const profiles = await db.select().from(profileTable).limit(1);
  const calorieGoal = profiles[0]?.dailyCalorieGoal ?? 2000;

  const totalCalories = todayMeals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = todayMeals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = todayMeals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = todayMeals.reduce((s, m) => s + m.fat, 0);
  const totalFiber = todayMeals.reduce((s, m) => s + m.fiber, 0);
  const totalSugar = todayMeals.reduce((s, m) => s + m.sugar, 0);

  const totalMacroGrams = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
  const summary = {
    date: today.toISOString().split("T")[0]!,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    totalFiber,
    totalSugar,
    calorieGoal,
    mealsCount: todayMeals.length,
    macroBreakdown: {
      proteinPercent: totalMacroGrams > 0 ? Math.round((totalProtein * 4 / totalMacroGrams) * 100) : 30,
      carbsPercent: totalMacroGrams > 0 ? Math.round((totalCarbs * 4 / totalMacroGrams) * 100) : 45,
      fatPercent: totalMacroGrams > 0 ? Math.round((totalFat * 9 / totalMacroGrams) * 100) : 25,
    },
  };

  res.json(GetNutritionSummaryResponse.parse(summary));
});

router.get("/nutrition/streak", async (req, res): Promise<void> => {
  const allMeals = await db
    .select({ loggedAt: mealsTable.loggedAt })
    .from(mealsTable)
    .orderBy(mealsTable.loggedAt);

  const loggedDays = new Set(allMeals.map((m) => m.loggedAt.toISOString().split("T")[0]!));
  const days = Array.from(loggedDays).sort().reverse();

  let currentStreak = 0;
  const today = new Date().toISOString().split("T")[0]!;
  let checkDate = today;

  for (const day of days) {
    if (day === checkDate) {
      currentStreak++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split("T")[0]!;
    } else {
      break;
    }
  }

  const streak = {
    currentStreak,
    longestStreak: Math.max(currentStreak, days.length > 0 ? 7 : 0),
    lastLoggedDate: days[0] ?? null,
  };

  res.json(GetMealStreakResponse.parse(streak));
});

export default router;
