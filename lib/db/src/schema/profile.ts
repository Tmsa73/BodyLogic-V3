import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profileTable = pgTable("profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("User"),
  age: integer("age").notNull().default(25),
  gender: text("gender").notNull().default("unspecified"),
  weight: real("weight").notNull().default(70),
  height: real("height").notNull().default(170),
  goal: text("goal").notNull().default("maintain"),
  activityLevel: text("activity_level").notNull().default("moderate"),
  dailyCalorieGoal: integer("daily_calorie_goal").notNull().default(2000),
  dailyWaterGoalMl: integer("daily_water_goal_ml").notNull().default(3000),
  dailyStepGoal: integer("daily_step_goal").notNull().default(10000),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profileTable).omit({ id: true, createdAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profileTable.$inferSelect;
