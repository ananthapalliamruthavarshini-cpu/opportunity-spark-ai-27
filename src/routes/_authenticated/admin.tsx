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
import { Plus, Pencil, Trash2, Users, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { format, parseISO } from "date-fns";

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

const CATEGORIES = ["scholarship", "internship", "hackathon", "certification", "course", "fellowship", "competition"] as const;

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

  async function save(o: Partial<Opp>) {
    const payload = {
      title: o.title ?? "",
      organization: o.organization ?? "",
      description: o.description ?? "",
      eligibility: o.eligibility ?? null,
      benefits: o.benefits ?? null,
      deadline: o.deadline ?? "",
      category: o.category ?? "internship",
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
            <p className="text-muted-foreground mt-1">Manage opportunities and view platform stats.</p>
          </div>
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

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-5 flex items-center gap-3"><Briefcase className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{opps?.length ?? 0}</div><div className="text-xs text-muted-foreground">Total opportunities</div></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{usersCount}</div><div className="text-xs text-muted-foreground">Registered users</div></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-3"><Briefcase className="h-8 w-8 text-success" /><div><div className="text-2xl font-bold">{opps?.filter((o) => o.deadline >= new Date().toISOString().slice(0, 10)).length ?? 0}</div><div className="text-xs text-muted-foreground">Live opportunities</div></div></CardContent></Card>
        </div>

        <Card>
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
        </Card>
      </div>
    </AppShell>
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