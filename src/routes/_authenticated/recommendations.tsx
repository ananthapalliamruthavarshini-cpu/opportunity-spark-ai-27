import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { aiRecommend } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { OpportunityCard, type OppRow } from "@/components/OpportunityCard";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({ meta: [{ title: "AI Matches · OpportunityHub AI" }] }),
  component: Recs,
});

function Recs() {
  const recFn = useServerFn(aiRecommend);
  const { data: recs, isLoading } = useQuery({
    queryKey: ["ai-recs"],
    queryFn: () => recFn(),
    staleTime: 1000 * 60 * 10,
  });

  const { data: opps } = useQuery<Map<string, OppRow>>({
    queryKey: ["opps-map"],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("id,title,organization,category,deadline,description,apply_link,skills_required");
      const m = new Map<string, OppRow>();
      (data ?? []).forEach((o) => m.set(o.id, o as OppRow));
      return m;
    },
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-2xl bg-[image:var(--gradient-hero)] text-white p-6 md:p-8">
          <div className="flex items-center gap-2 text-sm font-medium opacity-90"><Sparkles className="h-4 w-4" /> Personalized for you</div>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">AI-matched opportunities</h1>
          <p className="opacity-90 mt-1 text-sm">Ranked by skill match, academic fit, interests, and resume keywords.</p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> AI is matching opportunities...</div>
        )}

        {recs && recs.recommendations.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            Add skills, interests, and a degree to your <a href="/profile" className="text-primary underline">profile</a> for better matches.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recs?.recommendations.map((r) => {
            const o = opps?.get(r.id);
            if (!o) return null;
            return <OpportunityCard key={r.id} opp={o} match={r.match} reasons={r.reasons} />;
          })}
        </div>
      </div>
    </AppShell>
  );
}