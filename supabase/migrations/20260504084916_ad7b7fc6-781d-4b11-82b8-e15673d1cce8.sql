ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

CREATE OR REPLACE FUNCTION public.validate_profile_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('trial', 'active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be trial, active or suspended', NEW.status;
  END IF;
  IF NEW.plan NOT IN ('free', 'pro') THEN
    RAISE EXCEPTION 'Invalid plan: %. Must be free or pro', NEW.plan;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_profile_status_trigger ON public.profiles;
CREATE TRIGGER validate_profile_status_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_status();