import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OpportunityCard, type OppRow } from "@/components/OpportunityCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/opportunities/")({
  head: () => ({ meta: [{ title: "Opportunities · OpportunityHub AI" }] }),
  component: OppList,
});

const CATEGORIES = ["all", "scholarship", "internship", "hackathon", "certification", "course", "fellowship", "competition"] as const;

function OppList() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [liveOnly, setLiveOnly] = useState(true);

  const { data: all } = useQuery<OppRow[]>({
    queryKey: ["all-opps"],
    queryFn: async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("id,title,organization,category,deadline,description,apply_link,skills_required")
        .order("deadline", { ascending: true });
      return (data ?? []) as OppRow[];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    return (all ?? []).filter((o) => {
      if (liveOnly && o.deadline < today) return false;
      if (cat !== "all" && o.category !== cat) return false;
      if (q) {
        const t = q.toLowerCase();
        const hay = `${o.title} ${o.organization} ${o.description} ${(o.skills_required ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [all, q, cat, liveOnly, today]);

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
              <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="React, AWS, Google..." />
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

        <div className="text-sm text-muted-foreground">{filtered.length} result{filtered.length !== 1 && "s"}</div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => <OpportunityCard key={o.id} opp={o} />)}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No opportunities match your filters.</div>
        )}
      </div>
    </AppShell>
  );
}