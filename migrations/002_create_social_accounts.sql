-- Migration: Create Social Accounts Table
-- Description: Sets up the social_accounts table for storing connected social media accounts
-- Date: 2025-11-15

CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_image TEXT,
  status VARCHAR(50) DEFAULT 'connected',
  followers INTEGER DEFAULT 0,
  last_sync TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  credentials JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, username)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS social_accounts_platform_idx ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS social_accounts_is_active_idx ON social_accounts(is_active);
CREATE INDEX IF NOT EXISTS social_accounts_created_at_idx ON social_accounts(created_at DESC);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON social_accounts TO authenticated;
GRANT SELECT ON social_accounts TO anon;

COMMENT ON TABLE social_accounts IS 'Stores connected social media accounts and their metadata';
COMMENT ON COLUMN social_accounts.credentials IS 'Encrypted credentials for social media platform (stored securely)';
