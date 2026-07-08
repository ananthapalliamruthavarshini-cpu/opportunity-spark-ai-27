import { createFileRoute } from "@tanstack/react-router";
import { runConnector, contentHash, type SourceRow, type NormalizedOpp } from "@/lib/connectors";

// POST /api/public/hooks/sync-opportunities
// Auth: apikey header must equal SUPABASE_PUBLISHABLE_KEY (anon key), i.e. the caller
// is anyone with the public anon key (pg_cron via net.http_post, or the admin UI).
// Optional body: { sourceId?: string } to sync a single source, otherwise all enabled sources.
export const Route = createFileRoute("/api/public/hooks/sync-opportunities")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let sourceId: string | undefined;
        try { const body = await request.json(); sourceId = (body as { sourceId?: string })?.sourceId; } catch { /* empty body ok */ }

        const q = supabaseAdmin.from("data_sources").select("*").eq("enabled", true);
        const { data: sources, error: srcErr } = sourceId ? await q.eq("id", sourceId) : await q;
        if (srcErr) return json({ error: srcErr.message }, 500);

        const summary = { sources: 0, fetched: 0, inserted: 0, updated: 0, skipped: 0, archived: 0, errors: [] as string[] };

        for (const src of (sources ?? []) as SourceRow[]) {
          summary.sources++;
          const { data: runIns } = await supabaseAdmin
            .from("import_runs")
            .insert({ source_id: src.id, status: "running" })
            .select("id").single();
          const runId = runIns?.id as string | undefined;

          let inserted = 0, updated = 0, skipped = 0, fetched = 0;
          try {
            const items = await runConnector(src);
            fetched = items.length;
            summary.fetched += fetched;

            // seen externals for archival step
            const seen = new Set<string>();

            for (const it of items) {
              seen.add(it.external_id);
              const hash = contentHash(it);
              const row = {
                source_id: src.id,
                external_id: it.external_id,
                title: it.title,
                organization: it.organization,
                description: it.description,
                apply_link: it.apply_link,
                deadline: it.deadline,
                category: it.category as NormalizedOpp["category"],
                eligibility: it.eligibility ?? null,
                benefits: it.benefits ?? null,
                skills_required: it.skills_required ?? [],
                location: it.location ?? null,
                tags: it.tags ?? [],
                summary: it.summary ?? null,
                content_hash: hash,
                is_archived: false,
                imported_at: new Date().toISOString(),
              };

              const { data: existing } = await supabaseAdmin
                .from("opportunities")
                .select("id, content_hash")
                .eq("source_id", src.id)
                .eq("external_id", it.external_id)
                .maybeSingle();

              if (!existing) {
                const { error } = await supabaseAdmin.from("opportunities").insert(row);
                if (error) { skipped++; summary.errors.push(`${src.name}: ${error.message}`); }
                else inserted++;
              } else if (existing.content_hash !== hash) {
                const { error } = await supabaseAdmin.from("opportunities").update(row).eq("id", existing.id);
                if (error) { skipped++; summary.errors.push(`${src.name}: ${error.message}`); }
                else updated++;
              } else {
                skipped++;
              }
            }

            // archive opportunities from this source that disappeared
            let archivedCount = 0;
            if (seen.size > 0) {
              const { data: current } = await supabaseAdmin
                .from("opportunities")
                .select("id, external_id")
                .eq("source_id", src.id)
                .eq("is_archived", false);
              const toArchive = (current ?? []).filter((r) => r.external_id && !seen.has(r.external_id)).map((r) => r.id);
              if (toArchive.length) {
                await supabaseAdmin.from("opportunities").update({ is_archived: true }).in("id", toArchive);
                archivedCount = toArchive.length;
              }
            }
            summary.inserted += inserted;
            summary.updated += updated;
            summary.skipped += skipped;
            summary.archived += archivedCount;

            await supabaseAdmin.from("data_sources").update({
              last_run_at: new Date().toISOString(),
              last_status: "success",
              last_error: null,
              next_retry_at: null,
            }).eq("id", src.id);

            if (runId) await supabaseAdmin.from("import_runs").update({
              finished_at: new Date().toISOString(),
              status: "success",
              fetched, inserted, updated, skipped, archived: archivedCount,
            }).eq("id", runId);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            summary.errors.push(`${src.name}: ${msg}`);
            const backoffMin = 30;
            await supabaseAdmin.from("data_sources").update({
              last_run_at: new Date().toISOString(),
              last_status: "failed",
              last_error: msg,
              next_retry_at: new Date(Date.now() + backoffMin * 60_000).toISOString(),
            }).eq("id", src.id);
            if (runId) await supabaseAdmin.from("import_runs").update({
              finished_at: new Date().toISOString(),
              status: "failed",
              error: msg,
              fetched, inserted, updated, skipped,
            }).eq("id", runId);
          }
        }

        // archive globally expired opportunities
        try {
          const { data: expiredCount } = await supabaseAdmin.rpc("archive_expired_opportunities");
          summary.archived += (expiredCount as number) ?? 0;
        } catch {/* ignore */}

        return json({ ok: true, summary });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}