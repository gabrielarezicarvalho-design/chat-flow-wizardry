ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS sales BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_permissions_sales
  ON public.user_permissions (company_id, sales, last_assigned_at NULLS FIRST)
  WHERE sales = true;