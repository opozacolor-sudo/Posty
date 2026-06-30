-- Allow larger chat video uploads (direct to Supabase, bypasses Vercel body limit)
update storage.buckets
set file_size_limit = 52428800
where id = 'chat-media';
