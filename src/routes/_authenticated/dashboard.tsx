import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, CheckCircle2, Clock, Sparkles, TrendingUp } from "lucide-react";
import { OpportunityCard, type OppRow } from "@/components/OpportunityCard";
import { format, parseISO, differenceInDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · OpportunityHub AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: apps } = useQuery({
    queryKey: ["apps-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("status,opportunity_id,opportunities(deadline,title)");
      return data ?? [];
    },
  });

  const { data: liveOpps } = useQuery<OppRow[]>({
    queryKey: ["live-opps", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("id,title,organization,category,deadline,description,apply_link,skills_required")
        .gte("deadline", today)
        .order("deadline", { ascending: true })
        .limit(6);
      return (data ?? []) as OppRow[];
    },
  });

  const saved = apps?.filter((a) => a.status === "saved").length ?? 0;
  const applied = apps?.filter((a) => a.status === "applied").length ?? 0;
  const selected = apps?.filter((a) => a.status === "selected").length ?? 0;

  const upcoming = (apps ?? [])
    .map((a) => a.opportunities as { deadline: string; title: string } | null)
    .filter((o): o is { deadline: string; title: string } => !!o && o.deadline >= today)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Hero greeting */}
        <div className="relative overflow-hidden rounded-2xl bg-[image:var(--gradient-hero)] p-6 md:p-8 text-white">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! 👋
            </h1>
            <p className="mt-2 opacity-90">
              {profile?.skills?.length ? "Here are fresh opportunities matched to your profile." : "Add skills to your profile to unlock personalized AI matches."}
            </p>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" asChild><Link to="/recommendations"><Sparkles className="h-4 w-4 mr-2" /> See matches</Link></Button>
              {!profile?.skills?.length && (
                <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" asChild>
                  <Link to="/profile">Complete profile</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard icon={Bookmark} label="Saved" value={saved} />
          <StatCard icon={Clock} label="Applied" value={applied} />
          <StatCard icon={CheckCircle2} label="Selected" value={selected} />
          <StatCard icon={TrendingUp} label="Live opps" value={liveOpps?.length ?? 0} />
        </div>

        {/* Upcoming deadlines */}
        {upcoming.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Upcoming deadlines</h2>
              <div className="space-y-2">
                {upcoming.map((o, i) => {
                  const days = differenceInDays(parseISO(o.deadline), new Date());
                  return (
                    <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                      <span className="font-medium truncate pr-3">{o.title}</span>
                      <span className={days <= 7 ? "text-destructive font-medium" : "text-muted-foreground"}>
                        {format(parseISO(o.deadline), "MMM d")} · {days}d
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Latest live opportunities */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Latest live opportunities</h2>
            <Button variant="ghost" asChild><Link to="/opportunities">View all →</Link></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {liveOpps?.map((o) => <OpportunityCard key={o.id} opp={o} />)}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Bookmark; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-[image:var(--gradient-card)] flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}