import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const xpLogsTable = pgTable("xp_logs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  amount: integer("amount").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertXpLogSchema = createInsertSchema(xpLogsTable).omit({ id: true, earnedAt: true });
export type InsertXpLog = z.infer<typeof insertXpLogSchema>;
export type XpLog = typeof xpLogsTable.$inferSelect;
