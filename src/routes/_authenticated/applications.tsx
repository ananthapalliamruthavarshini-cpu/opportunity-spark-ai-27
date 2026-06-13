import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, differenceInDays } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "Applications · OpportunityHub AI" }] }),
  component: Apps,
});

const STATUSES = ["all", "saved", "applied", "interview", "selected", "rejected"] as const;

function Apps() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");

  const { data } = useQuery({
    queryKey: ["apps-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id,status,updated_at,opportunity_id,opportunities(id,title,organization,category,deadline,apply_link)")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((a) => status === "all" || a.status === status);

  async function remove(id: string) {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["apps-full"] });
      qc.invalidateQueries({ queryKey: ["apps-overview"] });
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Application tracker</h1>
          <p className="text-muted-foreground mt-1">Manage everything you've saved, applied to, or interviewed for.</p>
        </div>

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex-wrap h-auto">
            {STATUSES.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>)}
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {filtered.map((a) => {
            const o = a.opportunities as { id: string; title: string; organization: string; category: string; deadline: string; apply_link: string } | null;
            if (!o) return null;
            const daysLeft = differenceInDays(parseISO(o.deadline), new Date());
            const expired = daysLeft < 0;
            return (
              <Card key={a.id}>
                <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="min-w-0 flex-1">
                    <Link to="/opportunities/$id" params={{ id: o.id }} className="font-semibold hover:text-primary">{o.title}</Link>
                    <div className="text-sm text-muted-foreground">{o.organization} · {format(parseISO(o.deadline), "MMM d, yyyy")}{!expired && ` · ${daysLeft}d left`}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{a.status}</Badge>
                    {expired ? (
                      <Button size="sm" variant="outline" disabled>Closed</Button>
                    ) : (
                      <Button size="sm" asChild><a href={o.apply_link} target="_blank" rel="noreferrer">Open</a></Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Nothing here yet.</div>}
        </div>
      </div>
    </AppShell>
  );
}