import { Router, type IRouter } from "express";
import { and, gte, lt } from "drizzle-orm";
import { db, waterLogsTable, profileTable } from "@workspace/db";
import {
  GetWaterIntakeResponse,
  LogWaterBody,
  LogWaterResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/water", async (req, res): Promise<void> => {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0]!;
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const logs = await db
    .select()
    .from(waterLogsTable)
    .where(and(gte(waterLogsTable.loggedAt, dayStart), lt(waterLogsTable.loggedAt, dayEnd)))
    .orderBy(waterLogsTable.loggedAt);

  const totalMl = logs.reduce((s, l) => s + l.amountMl, 0);

  const profiles = await db.select().from(profileTable).limit(1);
  const goalMl = profiles[0]?.dailyWaterGoalMl ?? 3000;
  const glasses = Math.floor(totalMl / 250);

  const response = {
    date: dateStr,
    totalMl,
    goalMl,
    glasses,
    percentComplete: Math.min(100, Math.round((totalMl / goalMl) * 100)),
    logs: logs.map(l => ({ id: l.id, amountMl: l.amountMl, loggedAt: l.loggedAt })),
  };

  res.json(GetWaterIntakeResponse.parse(response));
});

router.post("/water", async (req, res): Promise<void> => {
  const parsed = LogWaterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0]!;
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  await db.insert(waterLogsTable).values({
    amountMl: parsed.data.amountMl,
    date: dateStr,
  });

  const logs = await db
    .select()
    .from(waterLogsTable)
    .where(and(gte(waterLogsTable.loggedAt, dayStart), lt(waterLogsTable.loggedAt, dayEnd)))
    .orderBy(waterLogsTable.loggedAt);

  const totalMl = logs.reduce((s, l) => s + l.amountMl, 0);
  const profiles = await db.select().from(profileTable).limit(1);
  const goalMl = profiles[0]?.dailyWaterGoalMl ?? 3000;
  const glasses = Math.floor(totalMl / 250);

  const response = {
    date: dateStr,
    totalMl,
    goalMl,
    glasses,
    percentComplete: Math.min(100, Math.round((totalMl / goalMl) * 100)),
    logs: logs.map(l => ({ id: l.id, amountMl: l.amountMl, loggedAt: l.loggedAt })),
  };

  res.json(LogWaterResponse.parse(response));
});

export default router;
