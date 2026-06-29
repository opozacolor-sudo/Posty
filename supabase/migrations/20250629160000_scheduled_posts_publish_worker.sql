ALTER TABLE scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;

ALTER TABLE scheduled_posts
  ADD CONSTRAINT scheduled_posts_status_check
  CHECK (status IN ('scheduled', 'publishing', 'published', 'cancelled', 'failed'));

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS media_type text
  CHECK (media_type IS NULL OR media_type IN ('image', 'video'));

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS last_publish_error text;

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS publish_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS scheduled_posts_due_idx
  ON scheduled_posts (scheduled_at)
  WHERE status = 'scheduled';
