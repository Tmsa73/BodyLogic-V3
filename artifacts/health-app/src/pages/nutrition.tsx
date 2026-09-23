import { useState } from "react";
import {
  useGetNutritionSummary, useGetMeals, useLogMeal, useDeleteMeal, useGetMealStreak, useGetDailyMealIQ,
  getGetNutritionSummaryQueryKey, getGetMealsQueryKey, getGetMealStreakQueryKey, getGetDailyMealIQQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Flame, Zap, Droplets, Brain, Trophy, ChevronRight, Utensils } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

function MacroRing({ value, goal, color, label, unit = "g" }: { value: number; goal: number; color: string; label: string; unit?: string }) {
  const pct = Math.min(100, goal > 0 ? Math.round((value / goal) * 100) : 0);
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 36 36)" className="transition-all duration-1000" />
        <text x="36" y="38" textAnchor="middle" style={{ fill: "hsl(var(--foreground))", fontSize: "13px", fontWeight: "800" }}>{value}</text>
        <text x="36" y="50" textAnchor="middle" style={{ fill: "hsl(var(--muted-foreground))", fontSize: "8px" }}>{unit}</text>
      </svg>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground">{pct}%</span>
    </div>
  );
}

export default function Nutrition() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", mealType: "lunch" });
  const today = new Date().toISOString().split("T")[0]!;
  
  const { data: summary, isLoading } = useGetNutritionSummary();
  const { data: meals } = useGetMeals({ date: today }, { query: { queryKey: getGetMealsQueryKey({ date: today }) } });
  const { data: streak } = useGetMealStreak();
  const { data: mealIQ } = useGetDailyMealIQ();
  const logMeal = useLogMeal();
  const deleteMeal = useDeleteMeal();
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleAdd = () => {
    if (!form.name || !form.calories) return;
    logMeal.mutate({ data: {
      name: form.name,
      calories: Number(form.calories),
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      fiber: Number(form.fiber) || 0,
      sugar: Number(form.sugar) || 0,
      mealType: form.mealType as any,
    }}, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetNutritionSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMealsQueryKey({ date: today }) });
        qc.invalidateQueries({ queryKey: getGetMealStreakQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDailyMealIQQueryKey() });
        setOpen(false);
        setForm({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", mealType: "lunch" });
        toast({ title: "Meal logged!", description: `${form.name} added to your log.` });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteMeal.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetNutritionSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMealsQueryKey({ date: today }) });
        toast({ title: "Meal removed" });
      }
    });
  };

  if (isLoading || !summary) return <NutritionSkeleton />;

  const calorieGoal = summary.calorieGoal;
  const calPct = Math.min(100, Math.round((summary.totalCalories / calorieGoal) * 100));
  const mealIQGrade = () => {
    const s = mealIQ?.score ?? 0;
    if (!s) return { grade: "N/A", color: "text-muted-foreground", bg: "bg-muted" };
    if (s >= 25) return { grade: "A+", color: "text-primary", bg: "bg-primary/15" };
    if (s >= 22) return { grade: "A", color: "text-primary", bg: "bg-primary/15" };
    if (s >= 19) return { grade: "B+", color: "text-yellow-400", bg: "bg-yellow-400/15" };
    if (s >= 16) return { grade: "B", color: "text-yellow-400", bg: "bg-yellow-400/15" };
    if (s >= 13) return { grade: "C+", color: "text-orange-400", bg: "bg-orange-400/15" };
    return { grade: "C", color: "text-destructive", bg: "bg-destructive/15" };
  };
  const iq = mealIQGrade();

  const mealTypeIcons: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };
  const mealTypeColors: Record<string, string> = {
    breakfast: "bg-yellow-500/10 text-yellow-500",
    lunch: "bg-primary/10 text-primary",
    dinner: "bg-accent/10 text-accent",
    snack: "bg-orange-500/10 text-orange-500",
  };

  return (
    <div className="min-h-full bg-background pb-6">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-black tracking-tight gradient-text">Nutrition</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          </div>
          {streak && streak.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400">{streak.currentStreak}d streak</span>
            </div>
          )}
        </div>

        {/* Calorie Ring */}
        <div className="bg-card rounded-2xl p-5 border border-border/50">
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="48" fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
                <circle cx="55" cy="55" r="48" fill="none" stroke="hsl(var(--primary))" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={(2 * Math.PI * 48) - (calPct / 100) * (2 * Math.PI * 48)}
                  transform="rotate(-90 55 55)" className="transition-all duration-1000" />
                <text x="55" y="50" textAnchor="middle" style={{ fill: "hsl(var(--foreground))", fontSize: "20px", fontWeight: "900" }}>{summary.totalCalories}</text>
                <text x="55" y="66" textAnchor="middle" style={{ fill: "hsl(var(--muted-foreground))", fontSize: "10px" }}>kcal</text>
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Daily Goal</p>
                <p className="text-xl font-black">{calorieGoal} <span className="text-sm text-muted-foreground font-normal">kcal</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-xl font-black text-primary">{Math.max(0, calorieGoal - summary.totalCalories)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Burned</p>
                <p className="text-sm font-bold text-orange-400">—</p>
              </div>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <h3 className="text-sm font-bold mb-4">Macronutrients</h3>
          <div className="grid grid-cols-3 gap-4">
            <MacroRing value={Math.round(summary.totalProtein)} goal={Math.round(summary.calorieGoal * 0.3 / 4)} color="#00D4A0" label="Protein" />
            <MacroRing value={Math.round(summary.totalCarbs)} goal={Math.round(summary.calorieGoal * 0.45 / 4)} color="#4F8EF7" label="Carbs" />
            <MacroRing value={Math.round(summary.totalFat)} goal={Math.round(summary.calorieGoal * 0.25 / 9)} color="#A855F7" label="Fat" />
          </div>
          <div className="mt-4 space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground font-medium">Fiber</span>
                <span className="font-bold">{(summary as any).totalFiber?.toFixed(1) ?? 0}g <span className="text-muted-foreground font-normal">/ 25g goal</span></span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${Math.min(100, ((summary as any).totalFiber ?? 0) / 25 * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground font-medium">Sugar</span>
                <span className="font-bold">{(summary as any).totalSugar?.toFixed(1) ?? 0}g <span className="text-muted-foreground font-normal">/ 36g limit</span></span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", ((summary as any).totalSugar ?? 0) > 30 ? "bg-destructive" : "bg-orange-400")} style={{ width: `${Math.min(100, ((summary as any).totalSugar ?? 0) / 36 * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Meal IQ */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Meal IQ Score</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn("w-20 h-20 rounded-2xl flex flex-col items-center justify-center", iq.bg)}>
              <span className={cn("text-3xl font-black", iq.color)}>{mealIQ?.score ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">/ 28</span>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-2xl font-black", iq.color)}>{iq.grade}</span>
                <span className="text-xs text-muted-foreground">{mealIQ?.mealsAnalyzed ?? 0} meals analyzed</span>
              </div>
              {mealIQ?.strengths?.slice(0, 2).map((s, i) => (
                <p key={i} className="text-xs text-primary flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary inline-block" />{s}
                </p>
              ))}
              {mealIQ?.improvements?.slice(0, 1).map((s, i) => (
                <p key={i} className="text-xs text-orange-400 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-orange-400 inline-block" />{s}
                </p>
              ))}
              {mealIQ?.suggestion && <p className="text-[10px] text-muted-foreground italic">{mealIQ.suggestion}</p>}
            </div>
          </div>
        </div>

        {/* Meals List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Today's Meals</h3>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 rounded-xl text-xs font-bold">
                  <Plus className="w-3.5 h-3.5" /> Add Meal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] rounded-2xl">
                <DialogHeader><DialogTitle>Log a Meal</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs">Meal Name *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Grilled Chicken & Rice" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Calories *</Label>
                      <Input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} placeholder="500" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Meal Type</Label>
                      <Select value={form.mealType} onValueChange={v => setForm(f => ({ ...f, mealType: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["breakfast","lunch","dinner","snack"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[["Protein (g)", "protein"], ["Carbs (g)", "carbs"], ["Fat (g)", "fat"]].map(([l, k]) => (
                      <div key={k}>
                        <Label className="text-xs">{l}</Label>
                        <Input type="number" value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder="0" className="mt-1" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[["Fiber (g)", "fiber"], ["Sugar (g)", "sugar"]].map(([l, k]) => (
                      <div key={k}>
                        <Label className="text-xs">{l}</Label>
                        <Input type="number" value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder="0" className="mt-1" />
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" onClick={handleAdd} disabled={logMeal.isPending}>
                    {logMeal.isPending ? "Logging..." : "Log Meal"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {!meals?.length ? (
            <div className="py-8 text-center bg-card rounded-2xl border border-dashed border-border">
              <Utensils className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No meals logged yet today</p>
              <p className="text-xs text-muted-foreground mt-1">Tap "Add Meal" to start tracking</p>
            </div>
          ) : (
            <div className="space-y-2">
              {meals.map(meal => (
                <div key={meal.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover-elevate group">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0", mealTypeColors[meal.mealType] ?? mealTypeColors.snack)}>
                    {mealTypeIcons[meal.mealType] ?? "🍽️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{meal.name}</p>
                    <p className="text-xs text-muted-foreground">P:{meal.protein}g · C:{meal.carbs}g · F:{meal.fat}g</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-primary">{meal.calories}</span>
                    <button onClick={() => handleDelete(meal.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NutritionSkeleton() {
  return <div className="p-5 space-y-5">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-2xl shimmer" />)}</div>;
}