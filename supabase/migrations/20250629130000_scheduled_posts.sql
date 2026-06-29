CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  title text NOT NULL,
  caption text,
  scheduled_at timestamptz NOT NULL,
  media_url text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'published', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_posts_user_id_idx
  ON scheduled_posts (user_id);

CREATE INDEX IF NOT EXISTS scheduled_posts_user_scheduled_at_idx
  ON scheduled_posts (user_id, scheduled_at);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users can read own scheduled posts"
  ON scheduled_posts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users can insert own scheduled posts"
  ON scheduled_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users can update own scheduled posts"
  ON scheduled_posts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users can delete own scheduled posts"
  ON scheduled_posts
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_posts TO authenticated;
GRANT ALL ON scheduled_posts TO service_role;
