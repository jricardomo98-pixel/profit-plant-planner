
-- Garantir extensão pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função que envia o webhook para a edge function welcome-email
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_secret text;
  function_url text := 'https://nfbqyxzpmjoibthctqlm.supabase.co/functions/v1/welcome-email';
BEGIN
  -- Ler o secret partilhado a partir das app settings (configurado via ALTER DATABASE)
  BEGIN
    webhook_secret := current_setting('app.welcome_email_webhook_secret', true);
  EXCEPTION WHEN OTHERS THEN
    webhook_secret := NULL;
  END;

  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RAISE WARNING 'welcome_email_webhook_secret not set; skipping welcome email for %', NEW.id;
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'profiles',
      'schema', 'public',
      'record', to_jsonb(NEW),
      'old_record', NULL
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'welcome-email webhook failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_welcome_email ON public.profiles;
CREATE TRIGGER trg_send_welcome_email
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.send_welcome_email_on_profile_insert();
