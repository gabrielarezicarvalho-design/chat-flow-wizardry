
-- Add custom_domain column to white_label_partners
ALTER TABLE public.white_label_partners ADD COLUMN IF NOT EXISTS custom_domain TEXT;
