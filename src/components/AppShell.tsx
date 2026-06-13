import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutDashboard, Briefcase, User, MessageSquareText, ListChecks, Shield, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isAdmin as isAdminFn } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/opportunities", label: "Opportunities", icon: Briefcase },
  { to: "/recommendations", label: "For You", icon: Sparkles },
  { to: "/applications", label: "Applications", icon: ListChecks },
  { to: "/chat", label: "AI Mentor", icon: MessageSquareText },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

function NavLinks({ onClick, admin }: { onClick?: () => void; admin: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      {admin && (
        <Link
          to="/admin"
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mt-2 border-t pt-4",
            pathname.startsWith("/admin")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Shield className="h-4 w-4" />
          Admin
        </Link>
      )}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { dark, toggle } = useDark();
  const [open, setOpen] = useState(false);
  const isAdminCall = useServerFn(isAdminFn);
  const { data } = useQuery({ queryKey: ["isAdmin"], queryFn: () => isAdminCall() });
  const admin = !!data?.admin;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar (mobile) */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur px-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>OpportunityHub</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <div className="mb-6 flex items-center gap-2 font-bold text-lg">
                <Sparkles className="h-5 w-5 text-primary" /> OpportunityHub
              </div>
              <NavLinks onClick={() => setOpen(false)} admin={admin} />
              <Button variant="outline" className="mt-6 w-full" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card/50 backdrop-blur p-4">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg mb-8 px-2">
            <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-hero)] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span>OpportunityHub</span>
          </Link>
          <NavLinks admin={admin} />
          <div className="mt-auto space-y-2">
            <Button variant="ghost" className="w-full justify-start" onClick={toggle}>
              {dark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
              {dark ? "Light mode" : "Dark mode"}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 md:pl-64 min-h-screen">
          <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}