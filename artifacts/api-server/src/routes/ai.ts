import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, aiMessagesTable } from "@workspace/db";
import {
  GetAiMessagesResponse,
  SendAiMessageBody,
  SendAiMessageResponse,
  GetAiInsightsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const healthTips = [
  { id: 1, category: "nutrition" as const, title: "Stay Hydrated", description: "Drink at least 8 glasses of water today to support metabolism and energy levels.", priority: "high" as const },
  { id: 2, category: "fitness" as const, title: "Move Every Hour", description: "Take short breaks to walk or stretch — sitting for long periods reduces calorie burn by up to 20%.", priority: "medium" as const },
  { id: 3, category: "sleep" as const, title: "Consistent Sleep Schedule", description: "Going to bed at the same time each night improves sleep quality and hormone balance.", priority: "high" as const },
  { id: 4, category: "nutrition" as const, title: "Protein at Every Meal", description: "Including protein with each meal helps maintain muscle mass and keeps you feeling full longer.", priority: "medium" as const },
  { id: 5, category: "general" as const, title: "Mindful Eating", description: "Slow down and savor your meals — eating mindfully reduces overeating by up to 30%.", priority: "low" as const },
  { id: 6, category: "water" as const, title: "Morning Hydration", description: "Drinking 500ml of water first thing in the morning kickstarts your metabolism and improves focus.", priority: "medium" as const },
];

const aiResponses = [
  "Great question! Based on your recent activity, I recommend focusing on recovery today. Make sure to get adequate sleep and consider a light stretching session.",
  "Looking at your nutrition data, you're doing well with protein intake! Consider adding more fiber-rich vegetables to hit your carb goals more healthily.",
  "Your workout consistency is impressive! To keep making progress, try increasing the intensity or duration of your sessions by about 10% this week.",
  "Sleep is crucial for recovery and performance. Try to aim for 7-9 hours tonight to optimize your body's repair processes.",
  "I've analyzed your patterns and noticed you tend to snack more in the evenings. Consider having a protein-rich snack like Greek yogurt to keep cravings at bay.",
  "You're on track with your fitness goals! Keep up the great work and remember that consistency beats perfection every time.",
  "Based on your Meal IQ scores, your nutrition quality is improving. Focus on adding more fiber from vegetables and legumes to push your score higher.",
  "Your Life Balance Score suggests sleep is your weakest area right now. Try a consistent 10pm bedtime for the next week and watch your energy levels improve.",
];

router.get("/ai/messages", async (req, res): Promise<void> => {
  const messages = await db
    .select()
    .from(aiMessagesTable)
    .orderBy(aiMessagesTable.createdAt)
    .limit(50);

  res.json(GetAiMessagesResponse.parse(messages));
});

router.post("/ai/messages", async (req, res): Promise<void> => {
  const parsed = SendAiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(aiMessagesTable).values({
    role: "user",
    content: parsed.data.content,
  });

  const responseContent = aiResponses[Math.floor(Math.random() * aiResponses.length)]!;
  const [assistantMessage] = await db.insert(aiMessagesTable).values({
    role: "assistant",
    content: responseContent,
  }).returning();

  res.json(SendAiMessageResponse.parse(assistantMessage));
});

router.get("/ai/insights", async (req, res): Promise<void> => {
  const insights = {
    tips: healthTips.slice(0, 4),
    mealSuggestion: "Try a quinoa bowl with grilled chicken, roasted vegetables, and avocado for a balanced, nutrient-dense lunch packed with complete proteins.",
    workoutSuggestion: "A 30-minute HIIT session would be ideal today — it maximizes calorie burn while fitting into a busy schedule. Combine with a 10-minute cooldown stretch.",
    motivationalQuote: "The only bad workout is the one that didn't happen. Every step forward counts, no matter how small.",
    behaviorAnalysis: "You tend to log meals consistently in the mornings but skip evening logs. Your workout frequency peaks mid-week and drops on weekends. Consider scheduling a Saturday activity to maintain momentum.",
  };

  res.json(GetAiInsightsResponse.parse(insights));
});

export default router;
