REVOKE INSERT, UPDATE, DELETE ON public.notifications_log FROM authenticated, anon;
CREATE POLICY "notif log no client insert" ON public.notifications_log AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "notif log no client update" ON public.notifications_log AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "notif log no client delete" ON public.notifications_log AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);