import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, ExternalLink, Sparkles } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export type OppRow = {
  id: string;
  title: string;
  organization: string;
  category: string;
  deadline: string;
  description: string;
  apply_link: string;
  skills_required: string[] | null;
};

const categoryColor: Record<string, string> = {
  scholarship: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  internship: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  hackathon: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  certification: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  course: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  fellowship: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  competition: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
};

export function OpportunityCard({
  opp,
  match,
  reasons,
}: {
  opp: OppRow;
  match?: number;
  reasons?: string[];
}) {
  const deadline = parseISO(opp.deadline);
  const daysLeft = differenceInDays(deadline, new Date());
  const expired = daysLeft < 0;

  return (
    <Card className="group relative overflow-hidden border-border/60 hover:shadow-[var(--shadow-elegant)] hover:border-primary/30 transition-all">
      {typeof match === "number" && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-[image:var(--gradient-hero)] px-3 py-1 text-xs font-bold text-white shadow">
          {match}% match
        </div>
      )}
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-2">
          <Badge variant="secondary" className={cn("capitalize", categoryColor[opp.category])}>
            {opp.category}
          </Badge>
          {expired ? (
            <Badge variant="destructive">Closed</Badge>
          ) : daysLeft <= 7 ? (
            <Badge className="bg-warning text-foreground">Closing soon</Badge>
          ) : null}
        </div>

        <div>
          <Link
            to="/opportunities/$id"
            params={{ id: opp.id }}
            className="font-semibold text-base leading-snug hover:text-primary line-clamp-2"
          >
            {opp.title}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {opp.organization}
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{opp.description}</p>

        {opp.skills_required && opp.skills_required.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {opp.skills_required.slice(0, 4).map((s) => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        )}

        {reasons && reasons.length > 0 && (
          <div className="rounded-lg bg-[image:var(--gradient-card)] p-3 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1 text-primary">
              <Sparkles className="h-3 w-3" /> Why recommended
            </div>
            {reasons.slice(0, 3).map((r, i) => (
              <div key={i} className="text-muted-foreground">• {r}</div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {format(deadline, "MMM d, yyyy")}
            {!expired && <span>· {daysLeft}d left</span>}
          </div>
          {expired ? (
            <Button size="sm" variant="outline" disabled>Closed</Button>
          ) : (
            <Button size="sm" asChild>
              <a href={opp.apply_link} target="_blank" rel="noreferrer">
                Apply <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}