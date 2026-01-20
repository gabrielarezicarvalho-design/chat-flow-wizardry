-- Update campaign-media bucket to allow 1GB files
UPDATE storage.buckets 
SET file_size_limit = 1073741824 
WHERE id = 'campaign-media';