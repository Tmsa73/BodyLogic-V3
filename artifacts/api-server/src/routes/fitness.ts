import { Router, type IRouter } from "express";
import { eq, and, gte, lt, count } from "drizzle-orm";
import { db, workoutsTable } from "@workspace/db";
import {
  GetWorkoutsResponse,
  LogWorkoutBody,
  DeleteWorkoutParams,
  GetFitnessSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/workouts", async (req, res): Promise<void> => {
  const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;

  let workouts;
  if (dateParam) {
    const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateParam}T23:59:59.999Z`);
    workouts = await db
      .select()
      .from(workoutsTable)
      .where(and(gte(workoutsTable.loggedAt, dayStart), lt(workoutsTable.loggedAt, dayEnd)))
      .orderBy(workoutsTable.loggedAt);
  } else {
    workouts = await db.select().from(workoutsTable).orderBy(workoutsTable.loggedAt);
  }

  res.json(GetWorkoutsResponse.parse(workouts));
});

router.post("/workouts", async (req, res): Promise<void> => {
  const parsed = LogWorkoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [workout] = await db.insert(workoutsTable).values({
    name: parsed.data.name,
    type: parsed.data.type,
    durationMinutes: parsed.data.durationMinutes,
    caloriesBurned: parsed.data.caloriesBurned,
    intensity: parsed.data.intensity,
    distanceKm: parsed.data.distanceKm ?? null,
    notes: parsed.data.notes ?? null,
  }).returning();

  res.status(201).json(workout);
});

router.delete("/workouts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteWorkoutParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(workoutsTable).where(eq(workoutsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/fitness/summary", async (req, res): Promise<void> => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekWorkouts = await db
    .select()
    .from(workoutsTable)
    .where(gte(workoutsTable.loggedAt, weekAgo))
    .orderBy(workoutsTable.loggedAt);

  const totalMinutes = weekWorkouts.reduce((s, w) => s + w.durationMinutes, 0);
  const totalCaloriesBurned = weekWorkouts.reduce((s, w) => s + w.caloriesBurned, 0);

  const typeMap = new Map<string, number>();
  for (const w of weekWorkouts) {
    typeMap.set(w.type, (typeMap.get(w.type) ?? 0) + 1);
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyActivity = days.map((day, i) => {
    const dayDate = new Date(weekAgo);
    dayDate.setDate(dayDate.getDate() + i);
    const dayStr = dayDate.toISOString().split("T")[0]!;
    const dayWorkouts = weekWorkouts.filter(
      (w) => w.loggedAt.toISOString().split("T")[0] === dayStr
    );
    return { day, minutes: dayWorkouts.reduce((s, w) => s + w.durationMinutes, 0) };
  });

  const summary = {
    weeklyWorkouts: weekWorkouts.length,
    totalMinutes,
    totalCaloriesBurned,
    avgDuration: weekWorkouts.length > 0 ? totalMinutes / weekWorkouts.length : 0,
    workoutTypeBreakdown: Array.from(typeMap.entries()).map(([type, ct]) => ({ type, count: ct })),
    weeklyActivity,
  };

  res.json(GetFitnessSummaryResponse.parse(summary));
});

export default router;
