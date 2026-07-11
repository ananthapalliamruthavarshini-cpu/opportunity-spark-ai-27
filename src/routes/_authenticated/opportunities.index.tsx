import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OpportunityCard, type OppRow } from "@/components/OpportunityCard";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { aiSearchOpportunities, type WebOpp } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Sparkles, ExternalLink, Building2, Calendar, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/opportunities/")({
  head: () => ({ meta: [{ title: "Opportunities · OpportunityHub AI" }] }),
  component: OppList,
});

const CATEGORIES = [
  "all", "scholarship", "internship", "hackathon", "certification",
  "course", "fellowship", "competition", "grant", "research",
  "conference", "bootcamp", "job", "volunteer", "mentorship",
  "startup", "government",
] as const;

function OppList() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [liveOnly, setLiveOnly] = useState(true);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  const today = new Date().toISOString().slice(0, 10);
  const { data: filtered = [], isFetching } = useQuery<OppRow[]>({
    queryKey: ["opps", q, cat, liveOnly],
    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select("id,title,organization,category,deadline,description,apply_link,skills_required")
        .eq("is_archived", false)
        .order("deadline", { ascending: true })
        .limit(500);
      if (liveOnly) query = query.gte("deadline", today);
      if (cat !== "all") query = query.eq("category", cat as never);
      if (q) {
        const esc = q.replace(/[,%()]/g, " ");
        query = query.or(
          `title.ilike.%${esc}%,organization.ilike.%${esc}%,description.ilike.%${esc}%,location.ilike.%${esc}%`
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as OppRow[];
    },
  });

  // Web fallback: when local DB returns nothing for a non-empty query, ask AI for real opportunities
  const searchWeb = useServerFn(aiSearchOpportunities);
  const shouldFallback = !isFetching && q.length > 1 && filtered.length === 0;
  const { data: web, isFetching: webLoading } = useQuery<{ results: WebOpp[] }>({
    queryKey: ["opps-web", q, cat],
    queryFn: () => searchWeb({ data: { query: q, category: cat } }),
    enabled: shouldFallback,
    staleTime: 5 * 60_000,
  });
  const webResults = web?.results ?? [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Browse opportunities</h1>
          <p className="text-muted-foreground mt-1">Search scholarships, internships, hackathons and more.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_200px_auto] items-end">
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                className="pl-9"
                placeholder="Search titles, companies, skills, locations..."
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch id="live" checked={liveOnly} onCheckedChange={setLiveOnly} />
            <Label htmlFor="live" className="text-sm">Live only</Label>
          </div>
        </div>

        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {filtered.length} result{filtered.length !== 1 && "s"}
          {q && <span>for "{q}"</span>}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => <OpportunityCard key={o.id} opp={o} />)}
        </div>

        {shouldFallback && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-2 border-t">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">AI-sourced from the web</h2>
              {webLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">real programs matched to "{q}"</span>
            </div>
            {webLoading && webResults.length === 0 && (
              <div className="text-sm text-muted-foreground">Searching the web for real opportunities…</div>
            )}
            {!webLoading && webResults.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No confident matches found for "{q}". Try different keywords or a broader category.
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {webResults.map((w, i) => <WebOppCard key={i} opp={w} />)}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function WebOppCard({ opp }: { opp: WebOpp }) {
  return (
    <Card className="group border-border/60 hover:border-primary/40 hover:shadow-[var(--shadow-elegant)] transition-all">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-2">
          <Badge variant="secondary" className="capitalize">{opp.category || "opportunity"}</Badge>
          <Badge variant="outline" className="gap-1 text-xs"><Globe className="h-3 w-3" /> Web</Badge>
        </div>
        <div>
          <a href={opp.apply_link} target="_blank" rel="noreferrer" className="font-semibold text-base leading-snug hover:text-primary line-clamp-2">
            {opp.title}
          </a>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> {opp.organization}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">{opp.description}</p>
        {opp.skills_required && opp.skills_required.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {opp.skills_required.slice(0, 4).map((s) => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {opp.deadline ? opp.deadline : "Check site"}
          </div>
          <Button size="sm" asChild>
            <a href={opp.apply_link} target="_blank" rel="noreferrer">
              Visit <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}