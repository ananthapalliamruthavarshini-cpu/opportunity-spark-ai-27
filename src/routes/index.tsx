import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Brain, Target, Trophy, Users, ArrowRight, Search, MessageSquareText, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OpportunityHub AI — Scholarships, Internships & Hackathons for Students" },
      { name: "description", content: "AI-powered platform matching students with scholarships, internships, hackathons, free certifications and fellowships based on skills, interests and academics." },
      { property: "og:title", content: "OpportunityHub AI" },
      { property: "og:description", content: "Discover scholarships, internships & hackathons that match your profile, powered by AI." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-6xl">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-hero)] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            OpportunityHub
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-10" />
        <div className="container relative mx-auto px-4 py-16 md:py-28 max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3 text-primary" /> AI matches you to the right opportunity
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            Your next <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">scholarship, internship, hackathon</span> — found by AI.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for rural and urban students. Get personalized matches with reasons, track applications, close skill gaps, and chat with an AI mentor — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth">Start free <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Brain, title: "AI Recommendations", desc: "Get match % and reasons explaining why each opportunity fits you." },
            { icon: Search, title: "Smart Search", desc: "Filter by skill, category, organization or deadline in seconds." },
            { icon: Target, title: "Skill Gap Analysis", desc: "See what skills you need and get free learning resources." },
            { icon: Trophy, title: "Application Tracker", desc: "Save, apply, mark interviews and selections in one dashboard." },
            { icon: MessageSquareText, title: "AI Career Mentor", desc: "Ask anything: career paths, certifications, resume advice." },
            { icon: BarChart3, title: "Live Opportunities Only", desc: "Expired ones are auto-hidden. Never miss a deadline again." },
          ].map((f) => (
            <Card key={f.title} className="border-border/60">
              <CardContent className="p-6 space-y-2">
                <div className="h-10 w-10 rounded-lg bg-[image:var(--gradient-card)] flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20 max-w-4xl">
        <Card className="relative overflow-hidden border-0 bg-[image:var(--gradient-hero)] text-white">
          <CardContent className="p-10 md:p-14 text-center space-y-4">
            <Users className="h-10 w-10 mx-auto opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold">Join thousands of students discovering opportunities daily.</h2>
            <p className="opacity-90 max-w-xl mx-auto">Free forever for students. Create your profile in 2 minutes.</p>
            <Button size="lg" variant="secondary" asChild className="mt-4">
              <Link to="/auth">Create your free account</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} OpportunityHub AI · Built for students.
      </footer>
    </div>
  );
}
