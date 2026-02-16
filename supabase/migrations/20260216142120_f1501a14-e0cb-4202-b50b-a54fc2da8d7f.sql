
-- Create white_label_partners table
CREATE TABLE public.white_label_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#10b981',
  secondary_color TEXT DEFAULT '#059669',
  accent_color TEXT DEFAULT '#6366f1',
  background_color TEXT DEFAULT '#0f172a',
  partner_password TEXT NOT NULL,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.white_label_partners ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage all white label partners"
ON public.white_label_partners FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow anyone to read active partners for login (only slug, name, logo, colors - password checked server-side)
CREATE POLICY "Anyone can view active partners for login"
ON public.white_label_partners FOR SELECT
USING (is_active = true);

-- Update trigger
CREATE TRIGGER update_white_label_partners_updated_at
BEFORE UPDATE ON public.white_label_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
