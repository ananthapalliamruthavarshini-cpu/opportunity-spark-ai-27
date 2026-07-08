## Overview

Transform OpportunityHub into an automated aggregation platform: pluggable connectors on a 6-hour cron, AI enrichment/dedup, deadline lifecycle, reminders (email now, push/WhatsApp later), richer homepage, admin control panel, and analytics. Existing auth, profile, applications, chat, AI recs stay.

I'll build this in phases so each ships working, not half-done.

---

## Phase 1 — Data model & lifecycle (backend foundation)

New tables (all with RLS + GRANTs):

- `data_sources` — connector config: `kind` (rss | json_api | greenhouse | lever | github_api | usajobs | devpost_rss | hackerearth_rss | custom_json), `url`, `config jsonb`, `enabled`, `last_run_at`, `last_status`, `last_error`, `default_category`.
- `organizations` — normalized org registry (name, website, logo_url).
- `import_runs` — per-connector run log: started_at, finished_at, fetched, inserted, updated, skipped_dupes, archived, errors, status.
- Extend `opportunities`: `source_id`, `external_id`, `slug`, `location`, `remote_ok`, `stipend`, `prize`, `tags text[]`, `summary`, `popularity_score`, `is_archived`, `is_featured`, `content_hash`, `imported_at`, `updated_at`. Unique index `(source_id, external_id)` for dedup.
- Extend `app_category` enum to full 16-category list.
- `saved_opportunities` (bookmarks), `followed_orgs`, `followed_categories`.
- `reminders` — per user + opportunity, offsets array, channels array (`email`, `push`, `whatsapp`), plus `notifications_log` (opportunity_id, user_id, channel, offset, sent_at, status) with unique constraint to prevent duplicates.
- `user_preferences` — interests, preferred_countries, preferred_categories, notification channels.
- Extend `profiles`: `avatar_url`, `country`.

RLS: users own their saves/follows/reminders/prefs; admins manage sources/orgs/opps; opportunities publicly readable when `is_archived = false`.

Deadline lifecycle: SQL function + pg_cron job (hourly) that flips `is_archived = true` where `deadline < now()`.

## Phase 2 — Connector framework & scheduled sync

- `src/lib/connectors/` — one file per kind, each exporting `fetch(source): Promise<NormalizedOpp[]>`. Shared normalizer + `content_hash` for change detection.
- Built-in connectors: **RSS** (Devpost, HackerEarth, university feeds), **Greenhouse/Lever job boards** (public JSON), **GitHub Jobs-style JSON APIs**, **USAJobs public API** (government), **generic RSS**, **generic JSON with JSONPath mapping in `config`**. No scraping of sites that disallow it — connectors only hit official/public feeds.
- Server route `POST /api/public/hooks/sync-opportunities` (verified via `apikey` header = anon key + admin-only trigger token from admin UI) runs all enabled connectors, upserts by `(source_id, external_id)`, updates on `content_hash` change, archives missing/expired.
- pg_cron: every 6 hours calls the route via `pg_net`.
- Admin can trigger the same route manually.
- Retry: failed sources marked with `last_error`; next cron re-runs; exponential-backoff `next_retry_at`.

## Phase 3 — AI enrichment

Server fn `enrichOpportunity(id)` using Lovable AI (`google/gemini-3-flash-preview`) fills: category, summary (≤280 chars), eligibility, skills, stipend/prize, location, tags. Runs on insert + on content change. Batched (10 at a time) inside sync route.

Duplicate detection: content_hash exact match + AI similarity check on title+org for near-dupes across sources; near-dupes merged into a single row with `source_refs jsonb[]`.

Popularity score: `views + 3*bookmarks + 5*applications`, updated by a lightweight SQL job.

## Phase 4 — User features

- Save/bookmark, follow orgs, follow categories (buttons on card + detail page).
- Preferences page: interests, countries, categories, notification channels + reminder offsets.
- Recommendations page already exists — extend prompt to weigh saved/followed/prefs and return `missing_skills` + `learning_roadmap`.
- Deadline badges on cards: "Closing today", "Closing tomorrow", "Last chance" (≤3d), countdown timer on detail page.

## Phase 5 — Reminders

- Email via Resend (needs `RESEND_API_KEY` — I'll request when we reach this phase; also needs a verified sender domain).
- Push and WhatsApp are behind feature flags — scaffolded but disabled until you provide FCM / Meta WhatsApp credentials (I'll ask when you want them on).
- pg_cron every 15 min → `/api/public/hooks/send-reminders`: finds users whose bookmarked opportunities cross a configured offset, sends via enabled channels, writes to `notifications_log` (unique `(user_id, opportunity_id, offset, channel)` prevents duplicates).

## Phase 6 — Homepage & sections

Public `/` becomes dynamic sections powered by public server fn queries (anon-safe views): Featured, Trending (popularity 7d), AI-Recommended (signed-in only), Ending Soon, New Today, Recently Updated, Most Popular, plus per-category rails. Auth call-to-action for saving/personalization.

## Phase 7 — Admin dashboard

Under `/_authenticated/admin` (existing route extended):
- Sources CRUD + enable/disable + "Sync now"
- Import runs table (last 100) with error drill-down
- Duplicate reports
- Opportunities table (edit/archive/feature)
- Organizations, categories, users list, role management
- Analytics cards: totals, daily/weekly/monthly imports, success rate, dupes removed, reminder stats, top viewed/bookmarked

## Phase 8 — Polish

Recheck signup: it already works (email/password + Google via Lovable broker). I'll add clearer inline error, resend-confirmation link, and password-strength hint on the signup tab.

---

## Phasing & delivery

I'll ship **Phase 1 + 2 + a first working connector (Devpost RSS + USAJobs) + admin "Sync now" + signup polish** in this next turn. Phases 3–7 in follow-up turns so you can review as it lands. Reminders (Phase 5) waits until you're ready to provide Resend + optional FCM/WhatsApp credentials.

## Not doing (and why)

- **Web scraping** arbitrary sites — legal/ToS risk and fragile. Only official APIs + RSS + configured JSON.
- **Real-time subscription streams** for every table — heavy and unneeded; polling + invalidations on mutation is enough. Real-time only for admin import-run status.
- **Firebase/OneSignal push and WhatsApp** — require your credentials and a verified WhatsApp Business number. Scaffolded, off by default.

## Technical notes

- Stays on TanStack Start + Lovable Cloud (Supabase). No architecture change.
- All connector fetches run server-side in the cron route (Cloudflare Worker) — pure `fetch`, no Node-only libs.
- New public read policies scoped to `is_archived = false` and safe columns only.
- Migrations are additive; existing rows keep working (new columns nullable with defaults).

---

**Approve to proceed with Phase 1 + 2 + first connectors + signup polish**, or tell me which phases to reprioritize / drop.