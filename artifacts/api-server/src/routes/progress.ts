import { Router, type IRouter } from "express";
import { desc, count } from "drizzle-orm";
import { db, xpLogsTable, mealsTable, workoutsTable } from "@workspace/db";
import { GetProgressResponse, GetMissionsResponse } from "@workspace/api-zod";

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

const LEVEL_TITLES = ["Beginner", "Newcomer", "Learner", "Explorer", "Achiever", "Warrior", "Champion", "Elite", "Master", "Legend", "Immortal"];

const ALL_BADGES = [
  { id: "first_meal", name: "First Bite", description: "Log your first meal", icon: "utensils" },
  { id: "week_streak", name: "Week Warrior", description: "7-day logging streak", icon: "flame" },
  { id: "first_workout", name: "Iron Start", description: "Log your first workout", icon: "dumbbell" },
  { id: "ten_workouts", name: "Dedicated", description: "Complete 10 workouts", icon: "trophy" },
  { id: "hydrated", name: "Hydration Hero", description: "Hit water goal 3 days in a row", icon: "droplets" },
  { id: "sleep_master", name: "Sleep Master", description: "Log 7 nights of sleep", icon: "moon" },
  { id: "level5", name: "Rising Star", description: "Reach level 5", icon: "star" },
  { id: "meal_iq_pro", name: "Meal IQ Pro", description: "Score 20+ Meal IQ", icon: "brain" },
];

router.get("/progress", async (req, res): Promise<void> => {
  const xpLogs = await db.select().from(xpLogsTable).orderBy(desc(xpLogsTable.earnedAt));
  const totalXP = xpLogs.reduce((s, l) => s + l.amount, 0);
  const coins = Math.floor(totalXP / 10);

  const { level, xpToNext } = calcLevel(totalXP);
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)]!;

  const [totalWorkoutsR] = await db.select({ count: count() }).from(workoutsTable);
  const [totalMealsR] = await db.select({ count: count() }).from(mealsTable);
  const totalWorkouts = Number(totalWorkoutsR?.count ?? 0);
  const totalMeals = Number(totalMealsR?.count ?? 0);

  const badges = ALL_BADGES.map(b => {
    let earned = false;
    if (b.id === "first_meal" && totalMeals >= 1) earned = true;
    if (b.id === "first_workout" && totalWorkouts >= 1) earned = true;
    if (b.id === "ten_workouts" && totalWorkouts >= 10) earned = true;
    if (b.id === "level5" && level >= 5) earned = true;
    return { ...b, earned, earnedAt: earned ? new Date().toISOString() : null };
  });

  const recentXpGains = xpLogs.slice(0, 5).map(l => ({
    source: l.source,
    amount: l.amount,
    earnedAt: l.earnedAt,
  }));

  const progress = {
    level,
    xp: totalXP,
    xpToNextLevel: xpToNext,
    coins,
    title,
    badges,
    recentXpGains,
    stats: {
      totalWorkouts,
      totalMealsLogged: totalMeals,
      longestStreak: 7,
      currentStreak: 5,
    },
  };

  res.json(GetProgressResponse.parse(progress));
});

router.get("/progress/missions", async (req, res): Promise<void> => {
  const [todayMealsR] = await db.select({ count: count() }).from(mealsTable);
  const [todayWorkoutsR] = await db.select({ count: count() }).from(workoutsTable);
  const mealsToday = Number(todayMealsR?.count ?? 0);
  const workoutsWeek = Number(todayWorkoutsR?.count ?? 0);

  const missions = [
    {
      id: "log_3_meals",
      title: "Fuel Up",
      description: "Log 3 meals today",
      type: "daily" as const,
      category: "nutrition" as const,
      progress: Math.min(3, mealsToday),
      target: 3,
      xpReward: 50,
      coinReward: 5,
      completed: mealsToday >= 3,
      icon: "utensils",
    },
    {
      id: "drink_water",
      title: "Stay Hydrated",
      description: "Drink 8 glasses of water",
      type: "daily" as const,
      category: "water" as const,
      progress: 5,
      target: 8,
      xpReward: 30,
      coinReward: 3,
      completed: false,
      icon: "droplets",
    },
    {
      id: "log_workout",
      title: "Get Moving",
      description: "Complete a workout today",
      type: "daily" as const,
      category: "fitness" as const,
      progress: Math.min(1, workoutsWeek),
      target: 1,
      xpReward: 75,
      coinReward: 8,
      completed: workoutsWeek >= 1,
      icon: "dumbbell",
    },
    {
      id: "weekly_workouts",
      title: "Consistency King",
      description: "Complete 4 workouts this week",
      type: "weekly" as const,
      category: "fitness" as const,
      progress: Math.min(4, workoutsWeek),
      target: 4,
      xpReward: 200,
      coinReward: 20,
      completed: workoutsWeek >= 4,
      icon: "trophy",
    },
    {
      id: "sleep_7h",
      title: "Rest & Recover",
      description: "Get 7+ hours of sleep",
      type: "daily" as const,
      category: "sleep" as const,
      progress: 1,
      target: 1,
      xpReward: 40,
      coinReward: 4,
      completed: true,
      icon: "moon",
    },
    {
      id: "meal_iq_20",
      title: "Eat Smart",
      description: "Score 20+ Meal IQ this week",
      type: "weekly" as const,
      category: "nutrition" as const,
      progress: 0,
      target: 1,
      xpReward: 150,
      coinReward: 15,
      completed: false,
      icon: "brain",
    },
  ];

  res.json(GetMissionsResponse.parse(missions));
});

export default router;
