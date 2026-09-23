import { useState, useEffect } from "react";
import { useGetProfile, useGetProfileStats, useUpdateProfile, useGetProgress, useGetMissions, useGetLifeBalance, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Settings, Target, Activity, Edit2, Check, X, Moon, Star, Trophy, Flame, Zap, CheckCircle2, Dumbbell, Utensils, Droplets } from "lucide-react";
import { UpdateProfileBodyGoal, UpdateProfileBodyActivityLevel } from "@workspace/api-client-react/src/generated/api.schemas";
import { cn } from "@/lib/utils";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const { data: profile, isLoading: isLoadingProfile } = useGetProfile();
  const { data: stats, isLoading: isLoadingStats } = useGetProfileStats();
  const { data: progress, isLoading: isLoadingProg } = useGetProgress();
  const { data: missions, isLoading: isLoadingMissions } = useGetMissions();
  const { data: balance, isLoading: isLoadingBalance } = useGetLifeBalance();
  
  const isLoading = isLoadingProfile || isLoadingStats || isLoadingProg || isLoadingMissions || isLoadingBalance;

  if (isLoading || !profile || !stats || !progress || !missions || !balance) return <ProfileSkeleton />;

  const bmi = profile.height > 0 ? (profile.weight / ((profile.height/100) * (profile.height/100))).toFixed(1) : "0";

  return (
    <div className="min-h-full bg-background pb-6">
      <div className="p-5 space-y-6">
        <header className="flex justify-between items-center pt-2">
          <h1 className="text-2xl font-black tracking-tight gradient-text">Profile</h1>
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 press-scale">
            <Settings className="w-5 h-5" />
          </Button>
        </header>

        {/* Hero */}
        <div className="flex flex-col items-center pt-2">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-background shadow-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white text-3xl font-black uppercase overflow-hidden glow-primary">
              {profile.avatarUrl ? (
                 <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.name.charAt(0)
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-card rounded-full flex items-center justify-center border-2 border-background">
              <span className="text-xs font-black text-primary leading-none">L{progress.level}</span>
            </div>
          </div>
          <div className="text-center mt-4">
            <h2 className="text-xl font-black">{profile.name}</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{progress.title}</p>
          </div>
        </div>

        {/* Life Balance Mini */}
        <div className="bg-card rounded-2xl p-4 border border-border/50 hover-elevate">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Life Balance Profile</span>
            <span className="text-lg font-black text-primary">{balance.overallScore}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'nutrition', label: 'Food', score: balance.breakdown.nutritionScore, color: 'bg-primary' },
              { id: 'fitness', label: 'Fit', score: balance.breakdown.fitnessScore, color: 'bg-secondary' },
              { id: 'sleep', label: 'Sleep', score: balance.breakdown.sleepScore, color: 'bg-accent' },
              { id: 'consistency', label: 'Habit', score: balance.breakdown.consistencyScore, color: 'bg-yellow-400' }
            ].map(b => (
              <div key={b.id} className="space-y-1.5">
                <div className="h-16 bg-muted rounded-full relative flex items-end justify-center overflow-hidden">
                  <div className={cn("w-full absolute bottom-0 transition-all duration-1000", b.color)} style={{ height: `${b.score}%` }} />
                </div>
                <p className="text-[10px] font-bold text-center text-muted-foreground uppercase">{b.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* XP & Coins */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-4 hover-elevate">
            <div className="flex justify-between text-xs font-bold text-yellow-600 dark:text-yellow-400 mb-2 uppercase tracking-wider">
              <span>XP Progress</span>
              <span>{progress.xp} / {progress.xp + progress.xpToNextLevel}</span>
            </div>
            <div className="h-2 bg-yellow-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500" style={{ width: `${(progress.xp / (progress.xp + progress.xpToNextLevel)) * 100}%` }} />
            </div>
          </div>
          <div className="col-span-1 bg-card rounded-2xl p-4 border border-border/50 flex flex-col items-center justify-center hover-elevate">
            <Star className="w-5 h-5 text-yellow-400 mb-1" />
            <p className="text-lg font-black leading-none">{progress.coins}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Coins</p>
          </div>
        </div>

        {/* Missions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Daily Missions</h3>
          </div>
          <div className="space-y-2">
            {missions.filter(m => m.type === 'daily').map(mission => (
              <div key={mission.id} className="bg-card rounded-xl p-3 border border-border/50 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", mission.completed ? "bg-primary/20 text-primary" : "bg-muted")}>
                  {mission.completed ? <CheckCircle2 className="w-5 h-5" /> : <Target className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{mission.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">{mission.currentValue} / {mission.targetValue}</p>
                    <span className="text-[10px] font-bold text-yellow-500">+{mission.xpReward} XP</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                    <div className={cn("h-full rounded-full", mission.completed ? "bg-primary" : "bg-secondary")} style={{ width: `${Math.min(100, (mission.currentValue / mission.targetValue) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Lifetime Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Current Streak" value={stats.currentStreak.toString()} unit="days" icon={Flame} color="text-orange-500" bg="bg-orange-500/10" />
            <StatCard title="Total Workouts" value={stats.totalWorkouts.toString()} unit="" icon={Dumbbell} color="text-secondary" bg="bg-secondary/10" />
            <StatCard title="Meals Logged" value={stats.totalMealsLogged.toString()} unit="" icon={Utensils} color="text-primary" bg="bg-primary/10" />
            <StatCard title="Avg Sleep" value={stats.avgSleepQuality} unit="" icon={Moon} color="text-accent" bg="bg-accent/10" />
          </div>
        </div>

        {/* Achievements Grid */}
        {progress.badges.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Achievements</h3>
            <div className="grid grid-cols-4 gap-2">
              {progress.badges.map(b => (
                <div key={b.id} className="aspect-square bg-card rounded-2xl border border-border/50 flex flex-col items-center justify-center p-2 text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Trophy className="w-6 h-6 text-yellow-400 mb-1 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                  <span className="text-[9px] font-bold leading-tight">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Settings Card */}
        <Card className="border border-border/50 shadow-none bg-card hover-elevate">
          <div className="px-4 py-3 flex justify-between items-center border-b border-border/50">
            <h3 className="text-sm font-bold">Body Metrics</h3>
            {!isEditing && (
              <Button variant="ghost" size="sm" className="h-7 text-xs font-bold px-2 rounded-lg" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>
          <CardContent className="p-0">
            {isEditing ? (
              <EditProfileForm profile={profile} onCancel={() => setIsEditing(false)} />
            ) : (
              <div className="divide-y divide-border/50">
                <DetailRow label="Weight" value={`${profile.weight} kg`} />
                <DetailRow label="Height" value={`${profile.height} cm`} />
                <DetailRow label="BMI" value={bmi} />
                <DetailRow label="Activity" value={<span className="capitalize">{profile.activityLevel.replace('_', ' ')}</span>} />
                <DetailRow label="Goal" value={<span className="capitalize text-primary">{profile.goal.replace('_', ' ')}</span>} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, icon: Icon, color, bg }: { title: string, value: string, unit: string, icon: any, color: string, bg: string }) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border/50 hover-elevate">
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", bg, color)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-black leading-none mb-1">
        {value}
        {unit && <span className="text-[10px] font-bold text-muted-foreground ml-1 uppercase tracking-wider">{unit}</span>}
      </p>
      <p className="text-[10px] font-bold text-muted-foreground uppercase">{title}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="text-muted-foreground font-semibold">{label}</span>
      <span className="font-bold text-right">{value}</span>
    </div>
  );
}

function EditProfileForm({ profile, onCancel }: { profile: any, onCancel: () => void }) {
  const [weight, setWeight] = useState(profile.weight.toString());
  const [goal, setGoal] = useState<UpdateProfileBodyGoal>(profile.goal);
  const [activity, setActivity] = useState<UpdateProfileBodyActivityLevel>(profile.activityLevel);
  const [calories, setCalories] = useState(profile.dailyCalorieGoal.toString());

  const qc = useQueryClient();
  const { toast } = useToast();
  
  const update = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        toast({ title: "Profile updated!" });
        onCancel();
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" })
    }
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      data: {
        weight: Number(weight),
        goal,
        activityLevel: activity,
        dailyCalorieGoal: Number(calories)
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Weight (kg)</Label>
          <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Calorie Goal</Label>
          <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} className="h-9" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Main Goal</Label>
        <Select value={goal} onValueChange={(v: UpdateProfileBodyGoal) => setGoal(v)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lose_weight">Lose Weight</SelectItem>
            <SelectItem value="maintain">Maintain Weight</SelectItem>
            <SelectItem value="build_muscle">Build Muscle</SelectItem>
            <SelectItem value="improve_fitness">Improve Fitness</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Activity Level</Label>
        <Select value={activity} onValueChange={(v: UpdateProfileBodyActivityLevel) => setActivity(v)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">Sedentary</SelectItem>
            <SelectItem value="light">Light Activity</SelectItem>
            <SelectItem value="moderate">Moderate Activity</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="very_active">Very Active</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1 rounded-xl h-10" onClick={onCancel} disabled={update.isPending}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button type="submit" className="flex-1 rounded-xl h-10" disabled={update.isPending}>
          <Check className="w-4 h-4 mr-1" /> Save
        </Button>
      </div>
    </form>
  );
}

function ProfileSkeleton() {
  return (
    <div className="p-5 space-y-6">
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="flex flex-col items-center space-y-4 pt-2">
        <Skeleton className="w-24 h-24 rounded-full shimmer" />
        <Skeleton className="h-6 w-32 shimmer" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl shimmer" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-2xl shimmer" />
        <Skeleton className="h-28 rounded-2xl shimmer" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl shimmer" />
    </div>
  );
}