import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, mealsTable, workoutsTable, sleepTable } from "@workspace/db";
import {
  GetHistoryQueryParams,
  GetHistoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/history", async (req, res): Promise<void> => {
  const parsed = GetHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const limit = parsed.data.limit ?? 30;
  const type = parsed.data.type ?? "all";

  const entries: Array<{
    id: string;
    type: "meal" | "workout" | "sleep";
    title: string;
    subtitle: string;
    date: Date;
    metadata: Record<string, unknown>;
  }> = [];

  if (type === "all" || type === "meal") {
    const meals = await db
      .select()
      .from(mealsTable)
      .orderBy(desc(mealsTable.loggedAt))
      .limit(limit);

    for (const m of meals) {
      entries.push({
        id: `meal-${m.id}`,
        type: "meal",
        title: m.name,
        subtitle: `${m.calories} cal · ${m.mealType}`,
        date: m.loggedAt,
        metadata: { calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, mealType: m.mealType },
      });
    }
  }

  if (type === "all" || type === "workout") {
    const workouts = await db
      .select()
      .from(workoutsTable)
      .orderBy(desc(workoutsTable.loggedAt))
      .limit(limit);

    for (const w of workouts) {
      entries.push({
        id: `workout-${w.id}`,
        type: "workout",
        title: w.name,
        subtitle: `${w.durationMinutes} min · ${w.caloriesBurned} cal burned`,
        date: w.loggedAt,
        metadata: { durationMinutes: w.durationMinutes, caloriesBurned: w.caloriesBurned, workoutType: w.type, intensity: w.intensity },
      });
    }
  }

  if (type === "all" || type === "sleep") {
    const sleepLogs = await db
      .select()
      .from(sleepTable)
      .orderBy(desc(sleepTable.bedtime))
      .limit(limit);

    for (const s of sleepLogs) {
      entries.push({
        id: `sleep-${s.id}`,
        type: "sleep",
        title: `${s.durationHours.toFixed(1)}h sleep`,
        subtitle: `Quality: ${s.quality}`,
        date: s.bedtime,
        metadata: { durationHours: s.durationHours, quality: s.quality },
      });
    }
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  const limited = entries.slice(0, limit);

  res.json(GetHistoryResponse.parse(limited));
});

export default router;
