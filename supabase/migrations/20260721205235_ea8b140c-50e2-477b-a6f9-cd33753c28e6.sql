CREATE OR REPLACE FUNCTION public.auto_distribute_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_target UUID;
BEGIN
  -- Only run for unassigned leads that belong to a company
  IF NEW.user_id IS NOT NULL OR NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT auto_distribute INTO v_enabled
  FROM public.sales_settings
  WHERE company_id = NEW.company_id;

  IF COALESCE(v_enabled, false) = false THEN
    RETURN NEW;
  END IF;

  -- Pick the salesperson who received a lead the longest time ago (NULL first)
  SELECT user_id INTO v_target
  FROM public.user_permissions
  WHERE company_id = NEW.company_id
    AND sales = true
  ORDER BY last_assigned_at NULLS FIRST, user_id
  LIMIT 1;

  IF v_target IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.user_id := v_target;
  IF NEW.status IS NULL OR NEW.status = 'new' THEN
    NEW.status := 'contacted';
  END IF;

  UPDATE public.user_permissions
  SET last_assigned_at = now()
  WHERE user_id = v_target;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_distribute_lead ON public.leads;
CREATE TRIGGER trg_auto_distribute_lead
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.auto_distribute_lead();