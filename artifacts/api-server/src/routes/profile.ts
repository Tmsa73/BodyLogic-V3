import { Router, type IRouter } from "express";
import { eq, avg, count } from "drizzle-orm";
import { db, profileTable, mealsTable, workoutsTable, sleepTable } from "@workspace/db";
import {
  GetProfileResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  GetProfileStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function ensureProfile() {
  const profiles = await db.select().from(profileTable).limit(1);
  if (profiles.length === 0) {
    const [profile] = await db
      .insert(profileTable)
      .values({
        name: "Alex",
        age: 28,
        gender: "unspecified",
        weight: 72,
        height: 175,
        goal: "improve_fitness",
        activityLevel: "moderate",
        dailyCalorieGoal: 2000,
      })
      .returning();
    return profile;
  }
  return profiles[0]!;
}

router.get("/profile", async (req, res): Promise<void> => {
  const profile = await ensureProfile();
  res.json(GetProfileResponse.parse(profile));
});

router.put("/profile", async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const profile = await ensureProfile();

  const [updatedProfile] = await db
    .update(profileTable)
    .set(parsed.data)
    .where(eq(profileTable.id, profile.id))
    .returning();

  res.json(UpdateProfileResponse.parse(updatedProfile));
});

router.get("/profile/stats", async (req, res): Promise<void> => {
  const [totalWorkoutsResult] = await db.select({ count: count() }).from(workoutsTable);
  const [totalMealsResult] = await db.select({ count: count() }).from(mealsTable);
  const [avgCaloriesResult] = await db.select({ avg: avg(mealsTable.calories) }).from(mealsTable);
  const [avgSleepResult] = await db.select({ avg: avg(sleepTable.durationHours) }).from(sleepTable);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { gte } = await import("drizzle-orm");
  const [weeklyWorkoutsResult] = await db
    .select({ count: count() })
    .from(workoutsTable)
    .where(gte(workoutsTable.loggedAt, weekAgo));

  const stats = {
    totalWorkouts: Number(totalWorkoutsResult?.count ?? 0),
    totalMealsLogged: Number(totalMealsResult?.count ?? 0),
    currentStreak: 5,
    avgCaloriesPerDay: Number(avgCaloriesResult?.avg ?? 0),
    avgSleepHours: Number(avgSleepResult?.avg ?? 0),
    weeklyWorkouts: Number(weeklyWorkoutsResult?.count ?? 0),
    weightProgress: -1.5,
  };

  res.json(GetProfileStatsResponse.parse(stats));
});

export default router;
