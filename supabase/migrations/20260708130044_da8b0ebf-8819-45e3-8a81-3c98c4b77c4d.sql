
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'workshop';
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'webinar';
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'bootcamp';
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'conference';
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'grant';
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'research';
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'open_source';
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'startup';
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'government';
ALTER TYPE public.opp_category ADD VALUE IF NOT EXISTS 'international';

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  website text,
  logo_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs public read" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "orgs admin insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orgs admin update" ON public.organizations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orgs admin delete" ON public.organizations FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL,
  url text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_category text,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_sources TO authenticated;
GRANT ALL ON public.data_sources TO service_role;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources admin all" ON public.data_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.data_sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  fetched int NOT NULL DEFAULT 0,
  inserted int NOT NULL DEFAULT 0,
  updated int NOT NULL DEFAULT 0,
  skipped int NOT NULL DEFAULT 0,
  archived int NOT NULL DEFAULT 0,
  error text
);
CREATE INDEX IF NOT EXISTS import_runs_source_idx ON public.import_runs(source_id, started_at DESC);
GRANT SELECT ON public.import_runs TO authenticated;
GRANT ALL ON public.import_runs TO service_role;
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs admin read" ON public.import_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS remote_ok boolean,
  ADD COLUMN IF NOT EXISTS stipend text,
  ADD COLUMN IF NOT EXISTS prize text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS popularity_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_processed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS opp_source_ext_uidx
  ON public.opportunities(source_id, external_id) WHERE source_id IS NOT NULL AND external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS opp_deadline_idx ON public.opportunities(deadline);
CREATE INDEX IF NOT EXISTS opp_archived_idx ON public.opportunities(is_archived);
CREATE INDEX IF NOT EXISTS opp_category_idx ON public.opportunities(category);
CREATE INDEX IF NOT EXISTS opp_popularity_idx ON public.opportunities(popularity_score DESC);

CREATE TABLE IF NOT EXISTS public.saved_opportunities (
  user_id uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_opportunities TO authenticated;
GRANT ALL ON public.saved_opportunities TO service_role;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saves own" ON public.saved_opportunities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.followed_orgs (
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followed_orgs TO authenticated;
GRANT ALL ON public.followed_orgs TO service_role;
ALTER TABLE public.followed_orgs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow orgs own" ON public.followed_orgs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.followed_categories (
  user_id uuid NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followed_categories TO authenticated;
GRANT ALL ON public.followed_categories TO service_role;
ALTER TABLE public.followed_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow cats own" ON public.followed_categories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY,
  interests text[] DEFAULT '{}',
  preferred_countries text[] DEFAULT '{}',
  preferred_categories text[] DEFAULT '{}',
  notify_email boolean NOT NULL DEFAULT true,
  notify_push boolean NOT NULL DEFAULT false,
  notify_whatsapp boolean NOT NULL DEFAULT false,
  reminder_offsets int[] NOT NULL DEFAULT ARRAY[7,3,1],
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own" ON public.user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  offsets int[] NOT NULL DEFAULT ARRAY[7,3,1],
  channels text[] NOT NULL DEFAULT ARRAY['email'],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders own" ON public.reminders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  channel text NOT NULL,
  offset_days int NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id, offset_days, channel)
);
GRANT SELECT ON public.notifications_log TO authenticated;
GRANT ALL ON public.notifications_log TO service_role;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif log own" ON public.notifications_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS country text;

CREATE OR REPLACE FUNCTION public.archive_expired_opportunities()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected int;
BEGIN
  UPDATE public.opportunities
     SET is_archived = true, updated_at = now()
   WHERE is_archived = false AND deadline < CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END; $$;

DROP POLICY IF EXISTS "anyone reads opportunities" ON public.opportunities;
CREATE POLICY "anyone reads live opportunities" ON public.opportunities
  FOR SELECT TO anon, authenticated
  USING (is_archived = false);
CREATE POLICY "admins read all opportunities" ON public.opportunities
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_opps_updated ON public.opportunities;
CREATE TRIGGER trg_opps_updated BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_orgs_updated ON public.organizations;
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_sources_updated ON public.data_sources;
CREATE TRIGGER trg_sources_updated BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_prefs_updated ON public.user_preferences;
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
