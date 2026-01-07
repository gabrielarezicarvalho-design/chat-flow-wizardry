-- Create table for UZAPI contract settings
CREATE TABLE public.uzapi_contract (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name text NOT NULL DEFAULT 'Plano Enterprise',
  total_connections integer NOT NULL DEFAULT 50,
  contract_start date,
  contract_end date,
  monthly_cost numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uzapi_contract ENABLE ROW LEVEL SECURITY;

-- Only admins can manage contract settings
CREATE POLICY "Admins can manage contract" 
ON public.uzapi_contract 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default record
INSERT INTO public.uzapi_contract (plan_name, total_connections) 
VALUES ('Plano Enterprise', 50);