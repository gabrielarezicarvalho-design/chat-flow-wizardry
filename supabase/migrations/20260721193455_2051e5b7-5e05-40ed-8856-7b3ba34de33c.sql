
CREATE TABLE public.generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'generate' CHECK (mode IN ('generate','edit','remove_bg','upscale','ad_creative')),
  model TEXT NOT NULL DEFAULT 'google/gemini-3-pro-image',
  image_url TEXT NOT NULL,
  storage_path TEXT,
  source_image_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_images_company ON public.generated_images(company_id, created_at DESC);
CREATE INDEX idx_generated_images_user ON public.generated_images(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_images TO authenticated;
GRANT ALL ON public.generated_images TO service_role;

ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view images from their company"
ON public.generated_images FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users insert own images"
ON public.generated_images FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own or company admin"
ON public.generated_images FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);
