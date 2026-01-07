-- Create storage bucket for AI audio files (TTS responses)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-audio', 
  'ai-audio', 
  true, 
  10485760, -- 10MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm']::text[]
) ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload audio
CREATE POLICY "Authenticated users can upload ai-audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ai-audio');

-- Create policy to allow public read access
CREATE POLICY "Public can view ai-audio"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ai-audio');

-- Create policy for service role to manage all
CREATE POLICY "Service role can manage ai-audio"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'ai-audio');
