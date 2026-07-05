ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS media_storage_paths jsonb;

COMMENT ON COLUMN scheduled_posts.media_storage_paths IS
  'Supabase storage object paths for chat-media; used at cron publish time instead of expiring signed URLs.';
