
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  function_url text := 'https://nfbqyxzpmjoibthctqlm.supabase.co/functions/v1/welcome-email';
BEGIN
  PERFORM extensions.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'profiles',
      'record', jsonb_build_object('id', NEW.id)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'welcome-email webhook failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_welcome_email_on_profile_insert() FROM PUBLIC, anon, authenticated;
