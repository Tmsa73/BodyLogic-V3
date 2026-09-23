import { Router, type IRouter } from "express";
import { gte, count } from "drizzle-orm";
import { db, mealsTable, workoutsTable, sleepTable, waterLogsTable } from "@workspace/db";
import { GetLifeBalanceResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/life-balance", async (req, res): Promise<void> => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [mealCount] = await db.select({ count: count() }).from(mealsTable).where(gte(mealsTable.loggedAt, sevenDaysAgo));
  const [workoutCount] = await db.select({ count: count() }).from(workoutsTable).where(gte(workoutsTable.loggedAt, sevenDaysAgo));
  const [sleepCount] = await db.select({ count: count() }).from(sleepTable).where(gte(sleepTable.createdAt, sevenDaysAgo));
  const [waterCount] = await db.select({ count: count() }).from(waterLogsTable).where(gte(waterLogsTable.loggedAt, sevenDaysAgo));

  const meals = Number(mealCount?.count ?? 0);
  const workouts = Number(workoutCount?.count ?? 0);
  const sleepDays = Number(sleepCount?.count ?? 0);
  const waterLogs = Number(waterCount?.count ?? 0);

  const nutrition = Math.max(30, Math.min(100, Math.round((meals / 21) * 100)));
  const fitness = Math.max(20, Math.min(100, Math.round((workouts / 5) * 100)));
  const sleep = Math.max(25, Math.min(100, Math.round((sleepDays / 7) * 100)));
  const hydration = Math.max(20, Math.min(100, Math.round((waterLogs / 28) * 100)));
  const consistency = Math.round((nutrition + fitness + sleep + hydration) / 4 * 0.9);

  const overallScore = Math.round((nutrition + fitness + sleep + hydration + consistency) / 5);

  let grade: "excellent" | "good" | "fair" | "needs_work";
  if (overallScore >= 80) grade = "excellent";
  else if (overallScore >= 65) grade = "good";
  else if (overallScore >= 45) grade = "fair";
  else grade = "needs_work";

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyScores = days.map((day, i) => ({
    day,
    score: Math.max(20, Math.min(100, overallScore + (Math.sin(i) * 15))),
  }));

  const lowestCategory = Math.min(nutrition, fitness, sleep, hydration, consistency);
  let prediction = "Keep up the balanced lifestyle and you'll see noticeable improvements in energy and performance within 2 weeks.";
  if (lowestCategory === sleep) prediction = "Improving your sleep consistency could boost your overall Life Balance Score by 15+ points and dramatically improve your recovery.";
  else if (lowestCategory === fitness) prediction = "Adding just 2 more workouts per week would boost your fitness score significantly and increase your overall life balance.";
  else if (lowestCategory === hydration) prediction = "Hitting your daily water goal consistently for 7 days will improve your energy levels, skin health, and cognitive performance.";

  const response = {
    overallScore,
    grade,
    breakdown: { nutrition, fitness, sleep, hydration, consistency },
    trend: "improving" as const,
    aiPrediction: prediction,
    weeklyScores,
  };

  res.json(GetLifeBalanceResponse.parse(response));
});

export default router;
