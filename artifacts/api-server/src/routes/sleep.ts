import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, sleepTable } from "@workspace/db";
import {
  GetSleepLogsQueryParams,
  GetSleepLogsResponse,
  LogSleepBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sleep", async (req, res): Promise<void> => {
  const parsed = GetSleepLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const limit = parsed.data.limit ?? 7;
  const logs = await db
    .select()
    .from(sleepTable)
    .orderBy(desc(sleepTable.bedtime))
    .limit(limit);

  res.json(GetSleepLogsResponse.parse(logs));
});

router.post("/sleep", async (req, res): Promise<void> => {
  const parsed = LogSleepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const bedtime = new Date(parsed.data.bedtime);
  const wakeTime = new Date(parsed.data.wakeTime);
  const durationHours = (wakeTime.getTime() - bedtime.getTime()) / (1000 * 60 * 60);
  const date = bedtime.toISOString().split("T")[0]!;

  const [log] = await db.insert(sleepTable).values({
    bedtime,
    wakeTime,
    durationHours,
    quality: parsed.data.quality,
    date,
  }).returning();

  res.status(201).json(log);
});

export default router;
