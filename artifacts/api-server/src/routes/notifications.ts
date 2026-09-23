import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import {
  GetNotificationsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function seedNotificationsIfEmpty() {
  const existing = await db.select().from(notificationsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(notificationsTable).values([
      { title: "Time to Hydrate!", message: "You haven't logged water in 2 hours. Stay hydrated!", type: "water", icon: "droplets" },
      { title: "Lunch Log Reminder", message: "Don't forget to log your lunch for accurate nutrition tracking.", type: "meal", icon: "utensils" },
      { title: "Workout Streak!", message: "Amazing! You've worked out 3 days in a row. Keep it up!", type: "achievement", icon: "flame" },
      { title: "Sleep Goal Met", message: "You slept 7.5 hours last night. Great recovery!", type: "tip", icon: "moon" },
      { title: "Level Up!", message: "Congratulations! You've reached Level 3: Explorer.", type: "achievement", icon: "star" },
    ]);
  }
}

router.get("/notifications", async (req, res): Promise<void> => {
  await seedNotificationsIfEmpty();
  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt));

  const mapped = notifications.map(n => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.read,
    icon: n.icon,
    createdAt: n.createdAt,
  }));

  res.json(GetNotificationsResponse.parse(mapped));
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.id, params.data.id));

  res.json(MarkNotificationReadResponse.parse({ success: true }));
});

export default router;
