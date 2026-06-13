import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, ExternalLink, ArrowLeft, Sparkles, Bookmark, CheckCircle2, Loader2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiSkillGap } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/opportunities/$id")({
  head: () => ({ meta: [{ title: "Opportunity · OpportunityHub AI" }] }),
  component: OppDetail,
});

function OppDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [gap, setGap] = useState<null | { missing_skills: string[]; matched_skills: string[]; resources: { skill: string; resource: string }[]; suggested_certifications: string[] }>(null);
  const [gapLoading, setGapLoading] = useState(false);
  const skillGapFn = useServerFn(aiSkillGap);

  const { data: opp } = useQuery({
    queryKey: ["opp", id],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: myApp } = useQuery({
    queryKey: ["my-app", id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("applications").select("*").eq("user_id", user.id).eq("opportunity_id", id).maybeSingle();
      return data;
    },
  });

  if (!opp) return <AppShell><div>Loading...</div></AppShell>;

  const deadline = parseISO(opp.deadline);
  const daysLeft = differenceInDays(deadline, new Date());
  const expired = daysLeft < 0;

  async function setStatus(status: "saved" | "applied" | "interview" | "selected" | "rejected") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("applications")
      .upsert({ user_id: user.id, opportunity_id: id, status }, { onConflict: "user_id,opportunity_id" });
    if (error) toast.error(error.message);
    else {
      toast.success(`Marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["my-app", id] });
      qc.invalidateQueries({ queryKey: ["apps-overview"] });
    }
  }

  async function runSkillGap() {
    setGapLoading(true);
    try {
      const res = await skillGapFn({ data: { opportunityId: id } });
      setGap(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setGapLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" asChild><Link to="/opportunities"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>

        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="capitalize">{opp.category}</Badge>
            {expired ? <Badge variant="destructive">Closed</Badge> : daysLeft <= 7 && <Badge className="bg-warning text-foreground">Closing in {daysLeft}d</Badge>}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold">{opp.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {opp.organization}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Deadline: {format(deadline, "MMM d, yyyy")}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {expired ? (
            <Button disabled variant="outline">Applications closed</Button>
          ) : (
            <Button asChild>
              <a href={opp.apply_link} target="_blank" rel="noreferrer">Apply now <ExternalLink className="h-4 w-4 ml-1" /></a>
            </Button>
          )}
          <Button variant="outline" onClick={() => setStatus("saved")}><Bookmark className="h-4 w-4 mr-1" /> {myApp?.status === "saved" ? "Saved" : "Save"}</Button>
          {!expired && <Button variant="outline" onClick={() => setStatus("applied")}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark applied</Button>}
          <Button variant="outline" onClick={() => setStatus("interview")}>Interview</Button>
          <Button variant="outline" onClick={() => setStatus("selected")}>Selected</Button>
        </div>
        {myApp && <div className="text-sm text-muted-foreground">Your status: <span className="font-semibold capitalize text-foreground">{myApp.status}</span></div>}

        <Card>
          <CardContent className="p-6 space-y-4">
            <Section title="Description">{opp.description}</Section>
            {opp.eligibility && <Section title="Eligibility">{opp.eligibility}</Section>}
            {opp.benefits && <Section title="Benefits">{opp.benefits}</Section>}
            {opp.skills_required && opp.skills_required.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Skills required</h3>
                <div className="flex flex-wrap gap-1.5">
                  {opp.skills_required.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Skill Gap Analysis</h3>
              <Button size="sm" onClick={runSkillGap} disabled={gapLoading}>
                {gapLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Analyze
              </Button>
            </div>
            {gap && (
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <div className="font-medium mb-1 text-success">✓ Skills you have</div>
                  <div className="flex flex-wrap gap-1.5">{gap.matched_skills.length ? gap.matched_skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>) : <span className="text-muted-foreground">—</span>}</div>
                </div>
                <div>
                  <div className="font-medium mb-1 text-destructive">⚠ Missing skills</div>
                  <div className="flex flex-wrap gap-1.5">{gap.missing_skills.length ? gap.missing_skills.map((s) => <Badge key={s} variant="destructive">{s}</Badge>) : <span className="text-muted-foreground">None — you're a great fit!</span>}</div>
                </div>
                {gap.resources.length > 0 && (
                  <div className="md:col-span-2">
                    <div className="font-medium mb-1">📚 Recommended resources</div>
                    <ul className="space-y-1 text-muted-foreground">
                      {gap.resources.map((r, i) => <li key={i}>• <span className="font-medium text-foreground">{r.skill}</span>: {r.resource}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground whitespace-pre-line">{children}</p>
    </div>
  );
}