import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, Loader2, ShieldPlus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { claimAdminBootstrap } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · OpportunityHub AI" }] }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  college: string | null;
  degree: string | null;
  branch: string | null;
  current_year: string | null;
  cgpa: string | null;
  skills: string[] | null;
  interests: string[] | null;
  certifications: string[] | null;
  projects: string | null;
  languages: string[] | null;
  linkedin_url: string | null;
  github_url: string | null;
  resume_path: string | null;
  resume_text: string | null;
};

function toCsv(arr?: string[] | null) {
  return (arr ?? []).join(", ");
}
function fromCsv(s: string) {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function ProfilePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Profile> & { skillsCsv: string; interestsCsv: string; certsCsv: string; langsCsv: string }>({
    skillsCsv: "", interestsCsv: "", certsCsv: "", langsCsv: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const claimAdmin = useServerFn(claimAdminBootstrap);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data as Profile | null;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        ...profile,
        skillsCsv: toCsv(profile.skills),
        interestsCsv: toCsv(profile.interests),
        certsCsv: toCsv(profile.certifications),
        langsCsv: toCsv(profile.languages),
      });
    }
  }, [profile]);

  async function save() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const update = {
        full_name: form.full_name ?? null,
        phone: form.phone ?? null,
        college: form.college ?? null,
        degree: form.degree ?? null,
        branch: form.branch ?? null,
        current_year: form.current_year ?? null,
        cgpa: form.cgpa ?? null,
        skills: fromCsv(form.skillsCsv),
        interests: fromCsv(form.interestsCsv),
        certifications: fromCsv(form.certsCsv),
        languages: fromCsv(form.langsCsv),
        projects: form.projects ?? null,
        linkedin_url: form.linkedin_url ?? null,
        github_url: form.github_url ?? null,
        resume_text: form.resume_text ?? null,
      };
      const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
      if (error) throw error;
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadResume(file: File) {
    if (file.type !== "application/pdf") return toast.error("Please upload a PDF file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB");
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const path = `${user.id}/resume-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      await supabase.from("profiles").update({ resume_path: path }).eq("id", user.id);
      toast.success("Resume uploaded");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function becomeAdmin() {
    try {
      await claimAdmin();
      toast.success("You're now an admin. Reload to see the Admin tab.");
      setTimeout(() => location.reload(), 800);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Your profile</h1>
          <p className="text-muted-foreground mt-1">Keep this up to date for sharper AI recommendations.</p>
        </div>

        <Card>
          <CardContent className="p-6 grid gap-4 md:grid-cols-2">
            <Field label="Full name"><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Email"><Input value={profile?.email ?? ""} disabled /></Field>
            <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="College"><Input value={form.college ?? ""} onChange={(e) => setForm({ ...form, college: e.target.value })} /></Field>
            <Field label="Degree (e.g. B.Tech)"><Input value={form.degree ?? ""} onChange={(e) => setForm({ ...form, degree: e.target.value })} /></Field>
            <Field label="Branch"><Input value={form.branch ?? ""} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></Field>
            <Field label="Current year"><Input value={form.current_year ?? ""} onChange={(e) => setForm({ ...form, current_year: e.target.value })} placeholder="3rd year" /></Field>
            <Field label="CGPA / %"><Input value={form.cgpa ?? ""} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} placeholder="8.5 / 85%" /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold">Skills & interests (comma separated)</h2>
            <Field label="Skills"><Textarea value={form.skillsCsv} onChange={(e) => setForm({ ...form, skillsCsv: e.target.value })} placeholder="Python, React, Machine Learning, SQL" /></Field>
            <div className="flex flex-wrap gap-1.5">
              {fromCsv(form.skillsCsv).slice(0, 20).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
            <Field label="Interests"><Input value={form.interestsCsv} onChange={(e) => setForm({ ...form, interestsCsv: e.target.value })} placeholder="AI, Web Dev, Open Source" /></Field>
            <Field label="Certifications"><Input value={form.certsCsv} onChange={(e) => setForm({ ...form, certsCsv: e.target.value })} placeholder="AWS CCP, Coursera ML" /></Field>
            <Field label="Languages"><Input value={form.langsCsv} onChange={(e) => setForm({ ...form, langsCsv: e.target.value })} placeholder="English, Hindi" /></Field>
            <Field label="Projects (brief)"><Textarea rows={3} value={form.projects ?? ""} onChange={(e) => setForm({ ...form, projects: e.target.value })} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 grid gap-4 md:grid-cols-2">
            <Field label="LinkedIn URL"><Input value={form.linkedin_url ?? ""} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." /></Field>
            <Field label="GitHub URL"><Input value={form.github_url ?? ""} onChange={(e) => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/..." /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Resume</h2>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" disabled={uploading}>
                <label className="cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload PDF
                  <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])} />
                </label>
              </Button>
              {profile?.resume_path && <span className="text-sm text-muted-foreground">✓ Uploaded</span>}
            </div>
            <Field label="Resume text (paste content for better AI matching)">
              <Textarea rows={6} value={form.resume_text ?? ""} onChange={(e) => setForm({ ...form, resume_text: e.target.value })} placeholder="Paste your resume text here..." />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save profile
          </Button>
          <Button variant="outline" onClick={becomeAdmin}>
            <ShieldPlus className="h-4 w-4 mr-2" /> Claim admin (first user only)
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}