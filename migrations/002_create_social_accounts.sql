-- Migration: Create Social Accounts Table (network_sync schema)
-- Description: Sets up the social_accounts table inside the dedicated schema with RLS
-- Date: 2025-11-15

BEGIN;

-- Table definition
CREATE TABLE IF NOT EXISTS network_sync.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_image TEXT,
  status VARCHAR(50) DEFAULT 'connected',
  followers INTEGER DEFAULT 0,
  last_sync TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  credentials JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(platform, username)
);

-- Indexes
CREATE INDEX IF NOT EXISTS social_accounts_platform_idx ON network_sync.social_accounts(platform);
CREATE INDEX IF NOT EXISTS social_accounts_is_active_idx ON network_sync.social_accounts(is_active);
CREATE INDEX IF NOT EXISTS social_accounts_created_at_idx ON network_sync.social_accounts(created_at DESC);
-- RLS predicate support
CREATE INDEX IF NOT EXISTS social_accounts_credentials_user_idx
  ON network_sync.social_accounts ((credentials->>'user_id'));

-- Trigger
DROP TRIGGER IF EXISTS update_social_accounts_updated_at ON network_sync.social_accounts;
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON network_sync.social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION network_sync.update_updated_at_column();

-- RLS policies (ownership via credentials->>'user_id')
ALTER TABLE network_sync.social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_accounts_select ON network_sync.social_accounts;
CREATE POLICY social_accounts_select ON network_sync.social_accounts
  FOR SELECT TO authenticated
  USING (credentials->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS social_accounts_insert ON network_sync.social_accounts;
CREATE POLICY social_accounts_insert ON network_sync.social_accounts
  FOR INSERT TO authenticated
  WITH CHECK (credentials->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS social_accounts_update ON network_sync.social_accounts;
CREATE POLICY social_accounts_update ON network_sync.social_accounts
  FOR UPDATE TO authenticated
  USING (credentials->>'user_id' = auth.uid()::text)
  WITH CHECK (credentials->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS social_accounts_delete ON network_sync.social_accounts;
CREATE POLICY social_accounts_delete ON network_sync.social_accounts
  FOR DELETE TO authenticated
  USING (credentials->>'user_id' = auth.uid()::text);

COMMENT ON TABLE network_sync.social_accounts IS 'Stores connected social media accounts and their metadata (namespaced)';
COMMENT ON COLUMN network_sync.social_accounts.credentials IS 'Encrypted credentials and user ownership metadata';

COMMIT;
