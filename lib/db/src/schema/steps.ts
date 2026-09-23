import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stepsTable = pgTable("steps", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  steps: integer("steps").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStepsSchema = createInsertSchema(stepsTable).omit({ id: true, updatedAt: true });
export type InsertSteps = z.infer<typeof insertStepsSchema>;
export type StepsEntry = typeof stepsTable.$inferSelect;
