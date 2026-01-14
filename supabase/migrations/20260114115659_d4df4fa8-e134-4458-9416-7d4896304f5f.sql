-- Create storage bucket for campaign media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-media', 
  'campaign-media', 
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload campaign media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-media');

-- Create policy for public read access
CREATE POLICY "Public read access to campaign media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'campaign-media');

-- Create policy for users to delete their own uploads
CREATE POLICY "Users can delete their own campaign media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-media' AND auth.uid()::text = (storage.foldername(name))[1]);