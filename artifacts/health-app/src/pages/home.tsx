import { useState } from "react";
import { useGetDashboard, useGetAiInsights, useGetWaterIntake, useGetSteps, useGetProgress, useGetLifeBalance, useGetNotifications, useMarkNotificationRead, useLogWater, getGetWaterIntakeQueryKey, getGetDashboardQueryKey, getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Droplets, Footprints, Moon, Flame, ChevronRight, Zap, Star, TrendingUp, TrendingDown, Minus, Plus, Dumbbell, Utensils, Sparkles, Brain, X, Check } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: insights } = useGetAiInsights();
  const { data: water } = useGetWaterIntake();
  const { data: steps } = useGetSteps();
  const { data: progress } = useGetProgress();
  const { data: balance } = useGetLifeBalance();
  const { data: notifications } = useGetNotifications();
  const markRead = useMarkNotificationRead();
  const logWater = useLogWater();
  const qc = useQueryClient();
  const { toast } = useToast();

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  const addWater = (ml: number) => {
    logWater.mutate({ data: { amountMl: ml } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetWaterIntakeQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: `+${ml}ml added`, description: "Water intake updated" });
      }
    });
  };

  if (isLoading || !dashboard) return <HomeSkeleton />;

  const calPct = Math.min(100, Math.round((dashboard.todayCalories / dashboard.calorieGoal) * 100));
  const stepsPct = Math.min(100, Math.round(((steps?.todaySteps ?? dashboard.todaySteps) / (steps?.stepGoal ?? dashboard.stepGoal)) * 100));
  const waterPct = Math.min(100, Math.round(((water?.totalMl ?? dashboard.waterMl) / (water?.goalMl ?? dashboard.waterGoalMl)) * 100));

  const getBalanceGradeColor = (score: number) => {
    if (score >= 80) return "text-primary";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-destructive";
  };

  const getMealIQColor = (score: number | null | undefined) => {
    if (!score) return "text-muted-foreground";
    if (score >= 22) return "text-primary";
    if (score >= 16) return "text-yellow-400";
    if (score >= 10) return "text-orange-400";
    return "text-destructive";
  };

  const getMealIQGrade = (score: number | null | undefined) => {
    if (!score) return "N/A";
    if (score >= 25) return "A+";
    if (score >= 22) return "A";
    if (score >= 19) return "B+";
    if (score >= 16) return "B";
    if (score >= 13) return "C+";
    return "C";
  };

  const tip = insights?.tips?.[0];
  const tipColors: Record<string, string> = {
    nutrition: "from-primary/20 to-primary/5 border-primary/30",
    fitness: "from-secondary/20 to-secondary/5 border-secondary/30",
    sleep: "from-accent/20 to-accent/5 border-accent/30",
    water: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    general: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
  };
  const tipIconColors: Record<string, string> = {
    nutrition: "text-primary", fitness: "text-secondary", sleep: "text-accent", water: "text-blue-400", general: "text-yellow-400"
  };

  const balanceScore = balance?.overallScore ?? dashboard.lifeBalanceScore;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (balanceScore / 100) * circumference;

  return (
    <div className="min-h-full bg-background">
      {/* Notification Drawer */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setNotifOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 w-[85%] max-w-[360px] bg-card border-l border-border z-50 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-bold text-lg">Notifications</h2>
                <button onClick={() => setNotifOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!notifications?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">All caught up!</p>
                  </div>
                ) : notifications.map(n => {
                  const notifColors: Record<string, string> = { water: "border-l-blue-400", meal: "border-l-primary", workout: "border-l-orange-400", achievement: "border-l-yellow-400", sleep: "border-l-accent", system: "border-l-secondary" };
                  return (
                    <div key={n.id} onClick={() => { if (!n.read) { markRead.mutate({ id: n.id }); qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }); } }} className={cn("p-3 rounded-xl bg-muted/50 border-l-2 cursor-pointer hover:bg-muted transition-colors", notifColors[n.type] ?? "border-l-border", n.read && "opacity-50")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="p-5 pb-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <img src="/bodylogic-logo.png" alt="BodyLogic" className="w-8 h-8 rounded-lg" />
            <span className="font-black text-lg gradient-text">BodyLogic</span>
          </div>
          <button onClick={() => setNotifOpen(true)} className="relative p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors press-scale">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-black tracking-tight">{dashboard.greeting} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's your health snapshot for today</p>
        </div>

        {/* 4 Stat Cards Row */}
        <div className="grid grid-cols-4 gap-2">
          {/* Calories */}
          <div className="col-span-1 bg-card rounded-2xl p-3 border border-border/50 hover-elevate">
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-lg font-black text-foreground leading-none">{dashboard.todayCalories}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">kcal</p>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${calPct}%` }} />
            </div>
          </div>
          {/* Steps */}
          <div className="col-span-1 bg-card rounded-2xl p-3 border border-border/50 hover-elevate">
            <div className="w-7 h-7 rounded-lg bg-secondary/15 flex items-center justify-center mb-2">
              <Footprints className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-lg font-black leading-none">{(steps?.todaySteps ?? dashboard.todaySteps).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">steps</p>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${stepsPct}%` }} />
            </div>
          </div>
          {/* Water */}
          <div className="col-span-1 bg-card rounded-2xl p-3 border border-border/50 hover-elevate">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center mb-2">
              <Droplets className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-lg font-black leading-none">{((water?.totalMl ?? dashboard.waterMl) / 1000).toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">L water</p>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${waterPct}%` }} />
            </div>
          </div>
          {/* Sleep */}
          <div className="col-span-1 bg-card rounded-2xl p-3 border border-border/50 hover-elevate">
            <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center mb-2">
              <Moon className="w-4 h-4 text-accent" />
            </div>
            <p className="text-lg font-black leading-none">{dashboard.lastSleepHours.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">hr sleep</p>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, (dashboard.lastSleepHours / 8) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Life Balance + XP Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Life Balance Score */}
          <div className="bg-card rounded-2xl p-4 border border-border/50 hover-elevate">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Life Balance</span>
              <span className={cn("text-xs font-bold uppercase", getBalanceGradeColor(balanceScore))}>
                {balance?.grade?.replace("_", " ") ?? (balanceScore >= 80 ? "Excellent" : balanceScore >= 65 ? "Good" : balanceScore >= 45 ? "Fair" : "Needs Work")}
              </span>
            </div>
            <div className="flex items-center justify-center py-2">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform="rotate(-90 50 50)" className="transition-all duration-1000" />
                <text x="50" y="54" textAnchor="middle" className="text-foreground" style={{ fill: "hsl(var(--foreground))", fontSize: "22px", fontWeight: "900" }}>{balanceScore}</text>
              </svg>
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              {balance?.trend === "improving" ? <TrendingUp className="w-3 h-3 text-primary" /> : balance?.trend === "declining" ? <TrendingDown className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
              <span>{balance?.trend ?? "stable"}</span>
            </div>
          </div>

          {/* XP & Level */}
          <div className="bg-card rounded-2xl p-4 border border-border/50 hover-elevate">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 rounded-full">
                <Star className="w-3 h-3 text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">{progress?.coins ?? dashboard.coins}</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center py-1 space-y-1">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-2 border-yellow-400/40 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-black text-yellow-400 leading-none">{progress?.level ?? dashboard.level}</p>
                </div>
              </div>
              <p className="text-xs font-bold text-foreground">{progress?.title ?? "Achiever"}</p>
              <div className="w-full">
                <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.round(((progress?.xp ?? dashboard.xp) / ((progress?.xp ?? dashboard.xp) + (progress?.xpToNextLevel ?? dashboard.xpToNextLevel))) * 100))}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1">{progress?.xp ?? dashboard.xp} / {(progress?.xp ?? dashboard.xp) + (progress?.xpToNextLevel ?? dashboard.xpToNextLevel)} XP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Water */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold">Quick Add Water</span>
            </div>
            <span className="text-xs text-muted-foreground">{water?.glasses ?? Math.floor(dashboard.waterMl / 250)} glasses</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[150, 250, 330, 500].map(ml => (
              <button key={ml} onClick={() => addWater(ml)} className="py-2 px-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold transition-all press-scale active:scale-95">
                +{ml}ml
              </button>
            ))}
          </div>
        </div>

        {/* Meal IQ + AI Tip Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Meal IQ */}
          <div className="bg-card rounded-2xl p-4 border border-border/50 hover-elevate">
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Meal IQ</span>
            </div>
            <p className={cn("text-4xl font-black leading-none", getMealIQColor(dashboard.mealIqScore))}>
              {dashboard.mealIqScore ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">/ 28 max score</p>
            <div className={cn("mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold", getMealIQColor(dashboard.mealIqScore) === "text-primary" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
              {getMealIQGrade(dashboard.mealIqScore)}
            </div>
          </div>

          {/* AI Tip */}
          <div className={cn("rounded-2xl p-4 border bg-gradient-to-br hover-elevate", tipColors[tip?.category ?? "general"] ?? tipColors.general)}>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className={cn("w-4 h-4", tipIconColors[tip?.category ?? "general"])} />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Tip</span>
            </div>
            <p className="text-xs font-bold text-foreground leading-snug line-clamp-3">{tip?.title ?? "Stay consistent!"}</p>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{tip?.description ?? "Every healthy choice adds up."}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Log</h2>
          <div className="grid grid-cols-4 gap-2">
            <Link href="/nutrition" className="flex flex-col items-center gap-2 p-3 bg-primary/10 rounded-2xl border border-primary/20 press-scale hover:bg-primary/15 transition-colors">
              <Utensils className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-bold text-primary">Meal</span>
            </Link>
            <Link href="/fitness" className="flex flex-col items-center gap-2 p-3 bg-secondary/10 rounded-2xl border border-secondary/20 press-scale hover:bg-secondary/15 transition-colors">
              <Dumbbell className="w-5 h-5 text-secondary" />
              <span className="text-[10px] font-bold text-secondary">Workout</span>
            </Link>
            <button onClick={() => addWater(250)} className="flex flex-col items-center gap-2 p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 press-scale hover:bg-blue-500/15 transition-colors">
              <Droplets className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400">Water</span>
            </button>
            <Link href="/fitness" className="flex flex-col items-center gap-2 p-3 bg-accent/10 rounded-2xl border border-accent/20 press-scale hover:bg-accent/15 transition-colors">
              <Moon className="w-5 h-5 text-accent" />
              <span className="text-[10px] font-bold text-accent">Sleep</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        {dashboard.recentActivity.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
              <Link href="/history" className="text-xs text-primary font-semibold">View all</Link>
            </div>
            <div className="space-y-2">
              {dashboard.recentActivity.slice(0, 4).map((item) => {
                const iconMap = { meal: Utensils, workout: Dumbbell, sleep: Moon, water: Droplets, steps: Footprints };
                const colorMap = { meal: "text-primary bg-primary/10", workout: "text-secondary bg-secondary/10", sleep: "text-accent bg-accent/10", water: "text-blue-400 bg-blue-400/10", steps: "text-yellow-400 bg-yellow-400/10" };
                const Icon = iconMap[item.type] ?? Utensils;
                const colors = colorMap[item.type] ?? colorMap.meal;
                const time = new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover-elevate">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", colors)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Behavior Insight */}
        {insights?.behaviorAnalysis && (
          <div className="bg-gradient-to-br from-secondary/10 to-accent/5 rounded-2xl p-4 border border-secondary/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-secondary" />
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">AI Behavior Analysis</span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{insights.behaviorAnalysis}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="p-5 space-y-5 animate-pulse">
      <div className="flex items-center justify-between pt-2">
        <div className="h-8 w-32 bg-muted rounded-lg shimmer" />
        <div className="h-9 w-9 bg-muted rounded-xl shimmer" />
      </div>
      <div className="h-10 w-56 bg-muted rounded-lg shimmer" />
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl shimmer" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1,2].map(i => <div key={i} className="h-44 bg-muted rounded-2xl shimmer" />)}
      </div>
    </div>
  );
}