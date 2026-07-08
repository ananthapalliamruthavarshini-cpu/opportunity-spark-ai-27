import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, Briefcase, RefreshCw, Loader2, Archive, Radio } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Admin · OpportunityHub AI" }] }),
  component: Admin,
});

const CATEGORIES = [
  "scholarship","internship","hackathon","certification","course","fellowship","competition",
  "workshop","webinar","bootcamp","conference","grant","research","open_source","startup","government","international",
] as const;
const CONNECTOR_KINDS = ["rss","greenhouse","lever","usajobs","custom_json"] as const;

type Opp = {
  id: string;
  title: string;
  organization: string;
  description: string;
  eligibility: string | null;
  benefits: string | null;
  deadline: string;
  category: string;
  apply_link: string;
  skills_required: string[] | null;
};

function Admin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Opp> | null>(null);
  const [editingSource, setEditingSource] = useState<Partial<SourceRow> | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: opps } = useQuery({
    queryKey: ["admin-opps"],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Opp[];
    },
  });

  const { data: usersCount } = useQuery({
    queryKey: ["users-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: sources } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: async () => {
      const { data } = await supabase.from("data_sources").select("*").order("name");
      return (data ?? []) as SourceRow[];
    },
  });

  const { data: runs } = useQuery({
    queryKey: ["admin-runs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("import_runs")
        .select("*, data_sources(name)")
        .order("started_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Array<{ id: string; source_id: string; started_at: string; finished_at: string | null; status: string; fetched: number; inserted: number; updated: number; skipped: number; archived: number; error: string | null; data_sources: { name: string } | null }>;
    },
    refetchInterval: syncing ? 3000 : false,
  });

  async function triggerSync(sourceId?: string) {
    setSyncing(true);
    try {
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch("/api/public/hooks/sync-opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anon },
        body: JSON.stringify(sourceId ? { sourceId } : {}),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      const s = j.summary as { sources: number; inserted: number; updated: number; archived: number };
      toast.success(`Synced ${s.sources} source(s): +${s.inserted} new, ${s.updated} updated, ${s.archived} archived`);
      qc.invalidateQueries({ queryKey: ["admin-opps"] });
      qc.invalidateQueries({ queryKey: ["admin-runs"] });
      qc.invalidateQueries({ queryKey: ["admin-sources"] });
      qc.invalidateQueries({ queryKey: ["all-opps"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function saveSource(s: Partial<SourceRow>) {
    let cfg: Record<string, unknown> = {};
    try { cfg = s.configText ? JSON.parse(s.configText) : {}; } catch { toast.error("Config must be valid JSON"); return; }
    const payload = {
      name: s.name ?? "",
      kind: s.kind ?? "rss",
      url: s.url ?? "",
      config: cfg,
      default_category: s.default_category ?? null,
      enabled: s.enabled ?? true,
    };
    const { error } = s.id
      ? await supabase.from("data_sources").update(payload).eq("id", s.id)
      : await supabase.from("data_sources").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-sources"] }); setEditingSource(null); }
  }

  async function toggleSource(s: SourceRow) {
    await supabase.from("data_sources").update({ enabled: !s.enabled }).eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["admin-sources"] });
  }
  async function deleteSource(id: string) {
    if (!confirm("Delete this data source? Its imported opportunities will stay but lose their link.")) return;
    await supabase.from("data_sources").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-sources"] });
  }

  async function save(o: Partial<Opp>) {
    const payload = {
      title: o.title ?? "",
      organization: o.organization ?? "",
      description: o.description ?? "",
      eligibility: o.eligibility ?? null,
      benefits: o.benefits ?? null,
      deadline: o.deadline ?? "",
      category: (o.category ?? "internship") as typeof CATEGORIES[number],
      apply_link: o.apply_link ?? "",
      skills_required: (o.skills_required ?? []) as string[],
    };
    const { error } = o.id
      ? await supabase.from("opportunities").update(payload).eq("id", o.id)
      : await supabase.from("opportunities").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-opps"] });
      qc.invalidateQueries({ queryKey: ["all-opps"] });
      qc.invalidateQueries({ queryKey: ["live-opps"] });
      setEditing(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this opportunity?")) return;
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-opps"] }); }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage data sources, opportunities, and view sync activity.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => triggerSync()} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Sync all sources
            </Button>
          <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" /> New opportunity</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} opportunity</DialogTitle></DialogHeader>
              {editing && <OppForm value={editing} onSave={save} />}
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-5 flex items-center gap-3"><Briefcase className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{opps?.length ?? 0}</div><div className="text-xs text-muted-foreground">Total opportunities</div></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-3"><Briefcase className="h-8 w-8 text-success" /><div><div className="text-2xl font-bold">{opps?.filter((o) => o.deadline >= new Date().toISOString().slice(0, 10)).length ?? 0}</div><div className="text-xs text-muted-foreground">Live</div></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-3"><Radio className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{sources?.filter((s) => s.enabled).length ?? 0}</div><div className="text-xs text-muted-foreground">Active sources</div></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{usersCount}</div><div className="text-xs text-muted-foreground">Users</div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="opps">
          <TabsList>
            <TabsTrigger value="opps">Opportunities</TabsTrigger>
            <TabsTrigger value="sources">Data sources</TabsTrigger>
            <TabsTrigger value="runs">Import runs</TabsTrigger>
          </TabsList>

          <TabsContent value="opps"><Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left">
                <tr><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Deadline</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {opps?.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-3"><div className="font-medium">{o.title}</div><div className="text-xs text-muted-foreground">{o.organization}</div></td>
                    <td className="p-3 capitalize">{o.category}</td>
                    <td className="p-3">{format(parseISO(o.deadline), "MMM d, yyyy")}</td>
                    <td className="p-3 text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(o)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(o.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card></TabsContent>

        <TabsContent value="sources"><Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-end">
              <Dialog open={editingSource !== null} onOpenChange={(o) => !o && setEditingSource(null)}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingSource({ kind: "rss", enabled: true })}><Plus className="h-4 w-4 mr-1" /> Add source</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader><DialogTitle>{editingSource?.id ? "Edit" : "New"} data source</DialogTitle></DialogHeader>
                  {editingSource && <SourceForm value={editingSource} onSave={saveSource} />}
                </DialogContent>
              </Dialog>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left">
                  <tr><th className="p-3">Name</th><th className="p-3">Kind</th><th className="p-3">Category</th><th className="p-3">Last run</th><th className="p-3">Status</th><th className="p-3">Enabled</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {sources?.map((s) => (
                    <tr key={s.id} className="border-t align-middle">
                      <td className="p-3"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground truncate max-w-[300px]">{s.url}</div></td>
                      <td className="p-3">{s.kind}</td>
                      <td className="p-3 capitalize">{s.default_category ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{s.last_run_at ? formatDistanceToNow(parseISO(s.last_run_at), { addSuffix: true }) : "never"}</td>
                      <td className="p-3">{s.last_status ? <Badge variant={s.last_status === "success" ? "default" : "destructive"}>{s.last_status}</Badge> : <Badge variant="outline">pending</Badge>}</td>
                      <td className="p-3"><Switch checked={s.enabled} onCheckedChange={() => toggleSource(s)} /></td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => triggerSync(s.id)} disabled={syncing}><RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} />Sync</Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingSource({ ...s, configText: JSON.stringify(s.config, null, 2) })}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteSource(s.id)}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                  {sources?.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No data sources yet. Add one to start importing opportunities automatically.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card></TabsContent>

        <TabsContent value="runs"><Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left">
                <tr><th className="p-3">Source</th><th className="p-3">Started</th><th className="p-3">Status</th><th className="p-3">Fetched</th><th className="p-3">Inserted</th><th className="p-3">Updated</th><th className="p-3">Archived</th><th className="p-3">Error</th></tr>
              </thead>
              <tbody>
                {runs?.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{r.data_sources?.name ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(parseISO(r.started_at), { addSuffix: true })}</td>
                    <td className="p-3"><Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "outline"}>{r.status}</Badge></td>
                    <td className="p-3">{r.fetched}</td>
                    <td className="p-3 text-success">{r.inserted}</td>
                    <td className="p-3">{r.updated}</td>
                    <td className="p-3"><Archive className="h-3.5 w-3.5 inline mr-1" />{r.archived}</td>
                    <td className="p-3 text-xs text-destructive max-w-[300px] truncate">{r.error ?? ""}</td>
                  </tr>
                ))}
                {runs?.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No sync runs yet. Trigger a sync to import opportunities.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

type SourceRow = {
  id: string;
  name: string;
  kind: string;
  url: string;
  config: Record<string, unknown>;
  default_category: string | null;
  enabled: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  configText?: string;
};

function SourceForm({ value, onSave }: { value: Partial<SourceRow>; onSave: (s: Partial<SourceRow>) => void }) {
  const [v, setV] = useState<Partial<SourceRow>>({ ...value, configText: value.configText ?? JSON.stringify(value.config ?? {}, null, 2) });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
      <div className="space-y-1.5"><Label>Name</Label><Input required value={v.name ?? ""} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Devpost Hackathons" /></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Kind</Label>
          <Select value={v.kind ?? "rss"} onValueChange={(k) => setV({ ...v, kind: k })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONNECTOR_KINDS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default category</Label>
          <Select value={v.default_category ?? "internship"} onValueChange={(c) => setV({ ...v, default_category: c })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Feed URL</Label><Input required type="url" value={v.url ?? ""} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://..." /></div>
      <div className="space-y-1.5">
        <Label>Config (JSON)</Label>
        <Textarea rows={5} value={v.configText ?? ""} onChange={(e) => setV({ ...v, configText: e.target.value })} className="font-mono text-xs" placeholder='{"organization":"Devpost"}' />
        <p className="text-xs text-muted-foreground">Optional. For custom_json: {'{"itemsPath":"data.items","map":{"title":"name","apply_link":"url",...}}'}</p>
      </div>
      <div className="flex items-center gap-2"><Switch checked={v.enabled ?? true} onCheckedChange={(e) => setV({ ...v, enabled: e })} /><Label>Enabled</Label></div>
      <Button type="submit" className="w-full">Save data source</Button>
    </form>
  );
}

function OppForm({ value, onSave }: { value: Partial<Opp>; onSave: (o: Partial<Opp>) => void }) {
  const [v, setV] = useState<Partial<Opp> & { skillsCsv?: string }>({
    ...value,
    skillsCsv: (value.skills_required ?? []).join(", "),
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave({ ...v, skills_required: (v.skillsCsv ?? "").split(",").map((s) => s.trim()).filter(Boolean) }); }}>
      <div className="space-y-1.5"><Label>Title</Label><Input required value={v.title ?? ""} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Organization</Label><Input required value={v.organization ?? ""} onChange={(e) => setV({ ...v, organization: e.target.value })} /></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={v.category ?? "internship"} onValueChange={(c) => setV({ ...v, category: c })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Deadline</Label><Input type="date" required value={v.deadline ?? ""} onChange={(e) => setV({ ...v, deadline: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea required rows={3} value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Eligibility</Label><Input value={v.eligibility ?? ""} onChange={(e) => setV({ ...v, eligibility: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Benefits</Label><Input value={v.benefits ?? ""} onChange={(e) => setV({ ...v, benefits: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Apply link</Label><Input type="url" required value={v.apply_link ?? ""} onChange={(e) => setV({ ...v, apply_link: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Skills required (comma separated)</Label><Input value={v.skillsCsv ?? ""} onChange={(e) => setV({ ...v, skillsCsv: e.target.value })} /></div>
      <Button type="submit" className="w-full">Save opportunity</Button>
    </form>
  );
}