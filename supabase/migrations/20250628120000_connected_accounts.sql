CREATE TABLE IF NOT EXISTS connected_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  account_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS connected_accounts_user_id_idx
  ON connected_accounts (user_id);

ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own connected accounts"
  ON connected_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connected accounts"
  ON connected_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connected accounts"
  ON connected_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own connected accounts"
  ON connected_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON connected_accounts TO authenticated;
GRANT ALL ON connected_accounts TO service_role;
