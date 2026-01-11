-- Create receipts storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to receipt images
CREATE POLICY "Public read access for receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Allow authenticated uploads (using anon key for now)
CREATE POLICY "Allow uploads to receipts bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

-- Allow deletes
CREATE POLICY "Allow deletes from receipts bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts');
