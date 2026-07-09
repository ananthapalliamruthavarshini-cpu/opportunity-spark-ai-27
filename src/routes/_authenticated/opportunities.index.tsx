import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OpportunityCard, type OppRow } from "@/components/OpportunityCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
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
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {q ? `No opportunities match "${q}". Try a different keyword or clear filters.` : "No opportunities match your filters."}
          </div>
        )}
      </div>
    </AppShell>
  );
}