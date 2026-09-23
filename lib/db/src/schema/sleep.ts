import { pgTable, text, serial, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sleepTable = pgTable("sleep", {
  id: serial("id").primaryKey(),
  bedtime: timestamp("bedtime", { withTimezone: true }).notNull(),
  wakeTime: timestamp("wake_time", { withTimezone: true }).notNull(),
  durationHours: real("duration_hours").notNull(),
  quality: text("quality").notNull().default("good"),
  deepSleepHours: real("deep_sleep_hours").notNull().default(0),
  lightSleepHours: real("light_sleep_hours").notNull().default(0),
  remSleepHours: real("rem_sleep_hours").notNull().default(0),
  awakeMins: integer("awake_mins").notNull().default(0),
  sleepScore: integer("sleep_score").notNull().default(75),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSleepSchema = createInsertSchema(sleepTable).omit({ id: true, createdAt: true });
export type InsertSleep = z.infer<typeof insertSleepSchema>;
export type SleepEntry = typeof sleepTable.$inferSelect;
