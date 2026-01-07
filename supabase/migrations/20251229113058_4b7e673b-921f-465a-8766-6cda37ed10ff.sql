-- Add AI API keys columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS openai_api_key text,
ADD COLUMN IF NOT EXISTS gemini_api_key text,
ADD COLUMN IF NOT EXISTS ai_provider text DEFAULT 'gemini';

-- Add comment for documentation
COMMENT ON COLUMN public.companies.openai_api_key IS 'OpenAI API key for this company';
COMMENT ON COLUMN public.companies.gemini_api_key IS 'Google Gemini API key for this company';
COMMENT ON COLUMN public.companies.ai_provider IS 'Default AI provider: gemini or openai';