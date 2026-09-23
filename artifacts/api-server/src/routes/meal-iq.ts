import { Router, type IRouter } from "express";
import { eq, and, gte, lt } from "drizzle-orm";
import { db, mealsTable } from "@workspace/db";
import {
  GetMealIQParams,
  GetMealIQResponse,
  GetDailyMealIQResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function calcScores(calories: number, protein: number, carbs: number, fat: number, fiber: number, sugar: number) {
  const proteinScore = (() => {
    const ratio = (protein * 4) / Math.max(calories, 1);
    if (ratio >= 0.30) return 5;
    if (ratio >= 0.20) return 4;
    if (ratio >= 0.12) return 3;
    return 1;
  })();

  const fiberScore = (() => {
    if (fiber >= 8) return 5;
    if (fiber >= 5) return 4;
    if (fiber >= 2) return 3;
    return 1;
  })();

  const sugarScore = (() => {
    if (sugar <= 5) return 5;
    if (sugar <= 10) return 4;
    if (sugar <= 20) return 3;
    return 1;
  })();

  const carbScore = (() => {
    const ratio = (carbs * 4) / Math.max(calories, 1);
    if (ratio >= 0.40 && ratio <= 0.55) return 4;
    if (ratio >= 0.30 && ratio <= 0.65) return 3;
    return 2;
  })();

  const fatScore = (() => {
    const ratio = (fat * 9) / Math.max(calories, 1);
    if (ratio >= 0.20 && ratio <= 0.35) return 5;
    if (ratio >= 0.15 && ratio <= 0.40) return 3;
    return 2;
  })();

  const calorieScore = (() => {
    if (calories > 0 && calories <= 500) return 4;
    if (calories > 500 && calories <= 800) return 3;
    if (calories > 800 && calories <= 1000) return 2;
    return 1;
  })();

  const balanceScore = (() => {
    const all = [proteinScore, carbScore, fatScore, fiberScore, sugarScore];
    const avg = all.reduce((s, v) => s + v, 0) / all.length;
    return Math.round(avg);
  })();

  const total = proteinScore + fiberScore + sugarScore + carbScore + fatScore + calorieScore;
  const normalized = Math.min(28, Math.round(total));

  return { total: normalized, proteinScore, carbScore, fatScore, fiberScore, sugarScore, calorieScore, balanceScore };
}

function getGradeEnum(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 22) return "excellent";
  if (score >= 16) return "good";
  if (score >= 10) return "fair";
  return "poor";
}

router.get("/nutrition/meal-iq/:id", async (req, res): Promise<void> => {
  const params = GetMealIQParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid meal ID" });
    return;
  }

  const meals = await db.select().from(mealsTable).where(eq(mealsTable.id, params.data.id)).limit(1);
  if (meals.length === 0) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }

  const m = meals[0]!;
  const scores = calcScores(m.calories, m.protein, m.carbs, m.fat, m.fiber, m.sugar);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (m.protein >= 25) strengths.push("High protein content");
  else { weaknesses.push("Low protein"); suggestions.push("Add chicken, fish, tofu, or legumes for more protein"); }

  if (m.fiber >= 5) strengths.push("Good dietary fiber");
  else { weaknesses.push("Low fiber"); suggestions.push("Add vegetables, beans, or whole grains to boost fiber"); }

  if (m.sugar <= 10) strengths.push("Low sugar content");
  else if (m.sugar > 25) { weaknesses.push("High sugar"); suggestions.push("Reduce added sugars and opt for natural sweeteners"); }

  if (m.calories <= 600) strengths.push("Calorie-controlled portion");
  else if (m.calories > 900) { weaknesses.push("High calorie meal"); suggestions.push("Consider splitting this meal or reducing portion size"); }

  if (strengths.length === 0) strengths.push("Meal logged successfully");

  const response = {
    mealId: m.id,
    mealName: m.name,
    score: scores.total,
    maxScore: 28,
    grade: getGradeEnum(scores.total),
    strengths,
    weaknesses,
    suggestions,
    breakdown: {
      proteinScore: scores.proteinScore,
      carbScore: scores.carbScore,
      fatScore: scores.fatScore,
      fiberScore: scores.fiberScore,
      sugarScore: scores.sugarScore,
      balanceScore: scores.balanceScore,
      calorieScore: scores.calorieScore,
    },
  };

  res.json(GetMealIQResponse.parse(response));
});

router.get("/nutrition/meal-iq", async (req, res): Promise<void> => {
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const meals = await db
    .select()
    .from(mealsTable)
    .where(and(gte(mealsTable.loggedAt, dayStart), lt(mealsTable.loggedAt, dayEnd)));

  if (meals.length === 0) {
    const empty = {
      date: today.toISOString().split("T")[0]!,
      overallScore: 0,
      maxScore: 28,
      grade: "poor" as const,
      mealsCount: 0,
      topStrength: null,
      topWeakness: null,
      suggestion: "Log your first meal today to see your Meal IQ score.",
    };
    res.json(GetDailyMealIQResponse.parse(empty));
    return;
  }

  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = meals.reduce((s, m) => s + m.fat, 0);
  const totalFiber = meals.reduce((s, m) => s + m.fiber, 0);
  const totalSugar = meals.reduce((s, m) => s + m.sugar, 0);

  const avgCal = totalCal / meals.length;
  const scores = calcScores(avgCal, totalProtein, totalCarbs, totalFat, totalFiber, totalSugar);

  let topStrength: string | null = null;
  let topWeakness: string | null = null;
  let suggestion = "Keep up the great nutrition!";

  if (totalProtein >= 80) topStrength = "Excellent daily protein intake";
  else if (totalFiber >= 20) topStrength = "Great fiber intake";
  else if (totalSugar <= 25) topStrength = "Low sugar day";
  else topStrength = "Meals logged consistently";

  if (totalFiber < 15) { topWeakness = "Low fiber intake"; suggestion = "Add more vegetables, legumes, and whole grains."; }
  else if (totalProtein < 50) { topWeakness = "Low protein"; suggestion = "Include more protein-rich foods like eggs, chicken, or Greek yogurt."; }
  else if (totalSugar > 40) { topWeakness = "High sugar intake"; suggestion = "Reduce sugary drinks and processed foods."; }

  const response = {
    date: today.toISOString().split("T")[0]!,
    overallScore: scores.total,
    maxScore: 28,
    grade: getGradeEnum(scores.total),
    mealsCount: meals.length,
    topStrength,
    topWeakness,
    suggestion,
  };

  res.json(GetDailyMealIQResponse.parse(response));
});

export default router;
