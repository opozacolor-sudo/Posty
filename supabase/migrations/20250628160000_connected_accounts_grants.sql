-- Run this in Supabase SQL Editor if OAuth save fails after creating the table.
-- Safe to run more than once.

GRANT SELECT, INSERT, UPDATE, DELETE ON connected_accounts TO authenticated;
GRANT ALL ON connected_accounts TO service_role;
