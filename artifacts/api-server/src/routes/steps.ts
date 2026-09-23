import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, stepsTable, profileTable } from "@workspace/db";
import { GetStepsResponse, UpdateStepsBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getTodaySteps() {
  const today = new Date().toISOString().split("T")[0]!;
  const existing = await db.select().from(stepsTable).where(eq(stepsTable.date, today)).limit(1);
  if (existing.length === 0) {
    const [entry] = await db.insert(stepsTable).values({ date: today, steps: 6420 }).returning();
    return entry!;
  }
  return existing[0]!;
}

router.get("/steps", async (req, res): Promise<void> => {
  const todayEntry = await getTodaySteps();
  const profiles = await db.select().from(profileTable).limit(1);
  const stepGoal = profiles[0]?.dailyStepGoal ?? 10000;

  const weeklySteps = [];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sampleSteps = [7200, 8400, 5600, 9100, 6800, todayEntry.steps, 0];
  for (let i = 0; i < 7; i++) {
    weeklySteps.push({ day: days[i]!, steps: sampleSteps[i] ?? 0 });
  }

  const steps = todayEntry.steps;
  const distanceKm = Math.round(steps * 0.00076 * 100) / 100;
  const caloriesBurned = Math.round(steps * 0.04);
  const activeMinutes = Math.round(steps / 100);

  const response = {
    date: todayEntry.date,
    todaySteps: steps,
    stepGoal,
    percentComplete: Math.min(100, Math.round((steps / stepGoal) * 100)),
    caloriesBurned,
    distanceKm,
    activeMinutes,
    weeklySteps,
  };

  res.json(GetStepsResponse.parse(response));
});

router.post("/steps", async (req, res): Promise<void> => {
  const parsed = UpdateStepsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date().toISOString().split("T")[0]!;
  const existing = await db.select().from(stepsTable).where(eq(stepsTable.date, today)).limit(1);

  if (existing.length > 0) {
    await db.update(stepsTable).set({ steps: parsed.data.steps }).where(eq(stepsTable.date, today));
  } else {
    await db.insert(stepsTable).values({ date: today, steps: parsed.data.steps });
  }

  const profiles = await db.select().from(profileTable).limit(1);
  const stepGoal = profiles[0]?.dailyStepGoal ?? 10000;
  const steps = parsed.data.steps;

  const weeklySteps = [];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sampleSteps = [7200, 8400, 5600, 9100, 6800, steps, 0];
  for (let i = 0; i < 7; i++) {
    weeklySteps.push({ day: days[i]!, steps: sampleSteps[i] ?? 0 });
  }

  const response = {
    date: today,
    todaySteps: steps,
    stepGoal,
    percentComplete: Math.min(100, Math.round((steps / stepGoal) * 100)),
    caloriesBurned: Math.round(steps * 0.04),
    distanceKm: Math.round(steps * 0.00076 * 100) / 100,
    activeMinutes: Math.round(steps / 100),
    weeklySteps,
  };

  res.json(GetStepsResponse.parse(response));
});

export default router;
