import { useState } from "react";
import { useGetHistory, GetHistoryType } from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Utensils, Dumbbell, Moon, Calendar as CalendarIcon, Footprints, Droplets } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export default function History() {
  const [filter, setFilter] = useState<GetHistoryType>("all");
  const [days, setDays] = useState<number>(7);
  const { data: history, isLoading } = useGetHistory({ type: filter, limit: 50, days });

  const chartData = history ? (() => {
    const dates: Record<string, { date: string, meal: number, workout: number, sleep: number }> = {};
    [...history].reverse().forEach(h => {
      const d = new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (!dates[d]) dates[d] = { date: d, meal: 0, workout: 0, sleep: 0 };
      if (h.type === 'meal') dates[d].meal++;
      if (h.type === 'workout') dates[d].workout++;
      if (h.type === 'sleep') dates[d].sleep++;
    });
    return Object.values(dates);
  })() : [];

  return (
    <div className="min-h-full bg-background pb-6">
      <div className="p-5 space-y-6">
        <header className="pt-2">
          <h1 className="text-2xl font-black tracking-tight gradient-text">History</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your health journey timeline</p>
        </header>

        <div className="flex gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as GetHistoryType)} className="w-full">
            <TabsList className="w-full h-11 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg text-xs font-bold">All</TabsTrigger>
              <TabsTrigger value="meal" className="rounded-lg text-xs font-bold">Meals</TabsTrigger>
              <TabsTrigger value="workout" className="rounded-lg text-xs font-bold">Fit</TabsTrigger>
              <TabsTrigger value="sleep" className="rounded-lg text-xs font-bold">Sleep</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {chartData.length > 0 && filter === 'all' && (
          <div className="h-32 w-full bg-card rounded-2xl p-4 border border-border/50">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} dy={5} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} />
                <Bar dataKey="workout" stackId="a" fill="hsl(var(--secondary))" radius={[0, 0, 4, 4]} />
                <Bar dataKey="meal" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="sleep" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="relative before:absolute before:inset-0 before:ml-[1.75rem] before:w-0.5 before:bg-border/50 pb-8">
          {isLoading ? (
            <HistorySkeleton />
          ) : (!history || history.length === 0) ? (
            <div className="py-12 text-center relative z-10 bg-background/80 rounded-xl">
              <CalendarIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold text-muted-foreground">No records found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((entry) => {
                const isMeal = entry.type === "meal";
                const isWorkout = entry.type === "workout";
                const isSleep = entry.type === "sleep";
                const date = new Date(entry.date);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                
                return (
                  <div key={entry.id} className="relative flex items-start group">
                    <div className={cn(
                      "flex items-center justify-center w-14 h-14 rounded-2xl border-4 border-background shrink-0 shadow-sm z-10 ml-0 hover-elevate",
                      isMeal ? "bg-primary text-primary-foreground glow-primary" : 
                      isWorkout ? "bg-secondary text-secondary-foreground glow-secondary" : 
                      isSleep ? "bg-accent text-white glow-accent" : "bg-muted"
                    )}>
                      {isMeal ? <Utensils className="w-5 h-5" /> : 
                       isWorkout ? <Dumbbell className="w-5 h-5" /> : 
                       isSleep ? <Moon className="w-5 h-5" /> : <Footprints className="w-5 h-5" />}
                    </div>

                    <div className="w-[calc(100%-4rem)] p-4 rounded-2xl bg-card border border-border/50 shadow-sm ml-4 hover-elevate transition-all">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-sm leading-tight">{entry.title}</h3>
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap ml-2">
                          {timeStr}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{entry.subtitle}</p>
                      
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-2">
                          {Object.entries(entry.metadata).map(([k, v]) => (
                            <span key={k} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {k}: <span className="text-foreground">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6 relative z-10">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="relative flex items-start ml-0">
          <Skeleton className="w-14 h-14 rounded-2xl border-4 border-background shrink-0 ml-0 shimmer" />
          <div className="w-[calc(100%-4rem)] ml-4">
            <Skeleton className="h-24 w-full rounded-2xl shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}