CREATE POLICY "Users can read own campaign media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'campaign-media' AND (storage.foldername(name))[3] = auth.uid()::text);

CREATE POLICY "Users can upload own campaign media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'campaign-media' AND (storage.foldername(name))[3] = auth.uid()::text);

CREATE POLICY "Users can delete own campaign media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'campaign-media' AND (storage.foldername(name))[3] = auth.uid()::text);