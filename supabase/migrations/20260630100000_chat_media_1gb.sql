-- Allow up to 1 GB chat video uploads (direct to Supabase Storage)
update storage.buckets
set file_size_limit = 1073741824
where id = 'chat-media';
