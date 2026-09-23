import { Router, type IRouter } from "express";
import { and, gte, lt, desc, count, eq } from "drizzle-orm";
import { db, mealsTable, workoutsTable, sleepTable, profileTable, waterLogsTable, stepsTable, xpLogsTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6000, 9000, 13000];

function calcLevel(xp: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= (LEVEL_THRESHOLDS[i] ?? Infinity)) level = i + 1;
    else break;
  }
  const xpToNext = (LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]!) - xp;
  return { level, xpToNext: Math.max(0, xpToNext) };
}

const healthTips = [
  { id: 1, category: "nutrition" as const, title: "Stay Hydrated", description: "Drink at least 8 glasses of water today to support metabolism and energy levels.", priority: "high" as const },
  { id: 2, category: "fitness" as const, title: "Move Every Hour", description: "Take short breaks to walk or stretch — sitting for long periods reduces calorie burn by up to 20%.", priority: "medium" as const },
  { id: 3, category: "sleep" as const, title: "Consistent Sleep Schedule", description: "Going to bed at the same time each night improves sleep quality and hormone balance.", priority: "high" as const },
];

router.get("/dashboard", async (req, res): Promise<void> => {
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const profiles = await db.select().from(profileTable).limit(1);
  const profile = profiles[0];
  const calorieGoal = profile?.dailyCalorieGoal ?? 2000;
  const stepGoal = profile?.dailyStepGoal ?? 10000;
  const waterGoalMl = profile?.dailyWaterGoalMl ?? 3000;
  const name = profile?.name ?? "there";
  const hour = today.getHours();
  const greeting = hour < 12 ? `Good morning, ${name}` : hour < 17 ? `Good afternoon, ${name}` : `Good evening, ${name}`;

  const [todayMeals, todayWorkouts, lastSleep, waterLogs, stepsEntry, xpLogs] = await Promise.all([
    db.select().from(mealsTable).where(and(gte(mealsTable.loggedAt, dayStart), lt(mealsTable.loggedAt, dayEnd))),
    db.select().from(workoutsTable).where(and(gte(workoutsTable.loggedAt, dayStart), lt(workoutsTable.loggedAt, dayEnd))),
    db.select().from(sleepTable).orderBy(desc(sleepTable.bedtime)).limit(1),
    db.select().from(waterLogsTable).where(and(gte(waterLogsTable.loggedAt, dayStart), lt(waterLogsTable.loggedAt, dayEnd))),
    db.select().from(stepsTable).where(eq(stepsTable.date, today.toISOString().split("T")[0]!)).limit(1),
    db.select().from(xpLogsTable),
  ]);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [weekWorkoutsResult] = await db.select({ c: count() }).from(workoutsTable).where(gte(workoutsTable.loggedAt, weekAgo));

  const todayCalories = todayMeals.reduce((s, m) => s + m.calories, 0);
  const caloriesBurned = todayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0);
  const todayWorkoutMinutes = todayWorkouts.reduce((s, w) => s + w.durationMinutes, 0);
  const waterMl = waterLogs.reduce((s, l) => s + l.amountMl, 0);
  const todaySteps = stepsEntry[0]?.steps ?? 6420;
  const totalXP = xpLogs.reduce((s, l) => s + l.amount, 0);
  const { level, xpToNext } = calcLevel(totalXP);
  const coins = Math.floor(totalXP / 10);

  const allMeals = await db.select({ loggedAt: mealsTable.loggedAt }).from(mealsTable).orderBy(desc(mealsTable.loggedAt));
  const loggedDays = new Set(allMeals.map((m) => m.loggedAt.toISOString().split("T")[0]!));
  const days = Array.from(loggedDays).sort().reverse();
  let currentStreak = 0;
  let checkDate = today.toISOString().split("T")[0]!;
  for (const day of days) {
    if (day === checkDate) {
      currentStreak++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split("T")[0]!;
    } else break;
  }

  // Life balance score (simplified)
  const [mealCount7] = await db.select({ count: count() }).from(mealsTable).where(gte(mealsTable.loggedAt, weekAgo));
  const [workoutCount7] = await db.select({ count: count() }).from(workoutsTable).where(gte(workoutsTable.loggedAt, weekAgo));
  const [sleepCount7] = await db.select({ count: count() }).from(sleepTable).where(gte(sleepTable.createdAt, weekAgo));
  const nutrition = Math.max(30, Math.min(100, Math.round((Number(mealCount7?.count ?? 0) / 21) * 100)));
  const fitnessScore = Math.max(20, Math.min(100, Math.round((Number(workoutCount7?.count ?? 0) / 5) * 100)));
  const sleepScore2 = Math.max(25, Math.min(100, Math.round((Number(sleepCount7?.count ?? 0) / 7) * 100)));
  const lifeBalanceScore = Math.round((nutrition + fitnessScore + sleepScore2) / 3);

  const recentActivity: Array<{
    id: string;
    type: "meal" | "workout" | "sleep" | "water" | "steps";
    title: string;
    subtitle: string;
    date: Date;
    metadata?: Record<string, unknown>;
  }> = [];

  for (const m of todayMeals.slice(0, 3)) {
    recentActivity.push({
      id: `meal-${m.id}`,
      type: "meal",
      title: m.name,
      subtitle: `${m.calories} cal · ${m.mealType}`,
      date: m.loggedAt,
      metadata: { calories: m.calories, mealType: m.mealType },
    });
  }
  for (const w of todayWorkouts.slice(0, 2)) {
    recentActivity.push({
      id: `workout-${w.id}`,
      type: "workout",
      title: w.name,
      subtitle: `${w.durationMinutes} min · ${w.caloriesBurned} cal burned`,
      date: w.loggedAt,
      metadata: { durationMinutes: w.durationMinutes, caloriesBurned: w.caloriesBurned },
    });
  }
  recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());

  const dashboard = {
    greeting,
    todayCalories,
    calorieGoal,
    caloriesBurned,
    todayWorkoutMinutes,
    lastSleepHours: lastSleep[0]?.durationHours ?? 0,
    lastSleepQuality: lastSleep[0]?.quality ?? null,
    lastSleepScore: lastSleep[0]?.sleepScore ?? null,
    currentStreak,
    weeklyWorkouts: Number(weekWorkoutsResult?.c ?? 0),
    todaySteps,
    stepGoal,
    waterMl,
    waterGoalMl,
    mealIqScore: null,
    lifeBalanceScore,
    level,
    xp: totalXP,
    xpToNextLevel: xpToNext,
    coins,
    insights: {
      tips: healthTips,
      mealSuggestion: "A quinoa bowl with grilled chicken and vegetables would be a great balanced meal today.",
      workoutSuggestion: "A 30-minute HIIT session would complement your current fitness streak perfectly.",
      motivationalQuote: "The only bad workout is the one that didn't happen.",
      behaviorAnalysis: "You log meals consistently in the morning. Keep the streak going — evening logs are your opportunity to complete your daily picture.",
    },
    recentActivity,
  };

  res.json(GetDashboardResponse.parse(dashboard));
});

export default router;
