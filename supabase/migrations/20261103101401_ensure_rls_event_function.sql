-- Hosted Supabase may install this event trigger helper; a fresh local stack
-- does not. The following revoke migration can run in either environment.
DO $outer$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NULL THEN
    EXECUTE $inner$
      CREATE FUNCTION public.rls_auto_enable()
      RETURNS event_trigger LANGUAGE plpgsql AS 'BEGIN RETURN; END;'
    $inner$;
  END IF;
END;
$outer$;
