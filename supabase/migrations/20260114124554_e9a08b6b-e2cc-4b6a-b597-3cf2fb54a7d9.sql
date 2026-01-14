-- Update campaign-media bucket to allow video uploads
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
],
file_size_limit = 52428800 -- 50MB limit for videos
WHERE id = 'campaign-media';