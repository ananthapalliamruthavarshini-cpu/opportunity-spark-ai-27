REVOKE ALL ON FUNCTION public.archive_expired_opportunities() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_expired_opportunities() TO service_role;