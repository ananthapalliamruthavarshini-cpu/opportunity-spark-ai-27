import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · OpportunityHub AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/profile", replace: true });
    });
  }, [navigate]);

  async function signInGoogle() {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/profile" });
    if (res.error) {
      toast.error(res.error.message || "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (!res.redirected) navigate({ to: "/profile", replace: true });
  }

  async function emailAuth(mode: "signin" | "signup", form: HTMLFormElement) {
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const full_name = String(fd.get("full_name") ?? "");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/profile", data: { full_name } },
        });
        if (error) throw error;
        toast.success("Account created! You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/profile", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-10" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-lg mb-6">
          <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-hero)] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          OpportunityHub AI
        </Link>

        <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
          <CardContent className="p-6 space-y-5">
            <Button onClick={signInGoogle} variant="outline" className="w-full" disabled={loading}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-3 pt-4">
                <form onSubmit={(e) => { e.preventDefault(); emailAuth("signin", e.currentTarget); }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" required minLength={6} autoComplete="current-password" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sign in
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup" className="space-y-3 pt-4">
                <form onSubmit={(e) => { e.preventDefault(); emailAuth("signup", e.currentTarget); }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">Full name</Label>
                    <Input id="full_name" name="full_name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su_email">Email</Label>
                    <Input id="su_email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su_password">Password (min 6 chars)</Label>
                    <Input id="su_password" name="password" type="password" required minLength={6} autoComplete="new-password" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing up you agree to use the platform responsibly.
        </p>
      </div>
    </div>
  );
}