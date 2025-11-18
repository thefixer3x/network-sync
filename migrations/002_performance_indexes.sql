-- Migration: Performance Optimization Indexes
-- Description: Add indexes for common query patterns to improve performance
-- Date: 2025-11-18
-- Estimated Impact: 50-80% query performance improvement on filtered queries

-- ====================
-- WORKFLOWS TABLE
-- ====================

-- Create workflows table if not exists (for reference)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  user_id UUID,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for filtering enabled workflows
CREATE INDEX IF NOT EXISTS workflows_enabled_idx
  ON workflows (enabled)
  WHERE enabled = true;

-- Index for user-specific queries
CREATE INDEX IF NOT EXISTS workflows_user_id_idx
  ON workflows (user_id);

-- Composite index for common query pattern (user + enabled)
CREATE INDEX IF NOT EXISTS workflows_user_enabled_idx
  ON workflows (user_id, enabled)
  WHERE enabled = true;

-- Index on created_at for sorting/filtering
CREATE INDEX IF NOT EXISTS workflows_created_at_idx
  ON workflows (created_at DESC);

-- ====================
-- AUTOMATION_CONFIGS TABLE
-- ====================

CREATE TABLE IF NOT EXISTS automation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  config JSONB DEFAULT '{}'::jsonb,
  schedule TEXT, -- Cron expression
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical index for fetching enabled configs
CREATE INDEX IF NOT EXISTS automation_configs_enabled_idx
  ON automation_configs (enabled)
  WHERE enabled = true;

-- Index for workflow relationship
CREATE INDEX IF NOT EXISTS automation_configs_workflow_id_idx
  ON automation_configs (workflow_id);

-- Composite index for common pattern
CREATE INDEX IF NOT EXISTS automation_configs_workflow_enabled_idx
  ON automation_configs (workflow_id, enabled)
  WHERE enabled = true;

-- Index on config JSONB for filtering
CREATE INDEX IF NOT EXISTS automation_configs_config_idx
  ON automation_configs USING GIN (config);

-- ====================
-- CONTENT TABLE
-- ====================

CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  content_text TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, scheduled, published, failed
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical index for status-based queries
CREATE INDEX IF NOT EXISTS content_status_idx
  ON content (status);

-- Partial index for scheduled content (most common query)
CREATE INDEX IF NOT EXISTS content_scheduled_idx
  ON content (scheduled_for)
  WHERE status = 'scheduled';

-- Index for workflow relationship
CREATE INDEX IF NOT EXISTS content_workflow_id_idx
  ON content (workflow_id);

-- Composite index for platform + status queries
CREATE INDEX IF NOT EXISTS content_platform_status_idx
  ON content (platform, status);

-- Index on published_at for analytics
CREATE INDEX IF NOT EXISTS content_published_at_idx
  ON content (published_at DESC)
  WHERE published_at IS NOT NULL;

-- Index on metadata for filtering
CREATE INDEX IF NOT EXISTS content_metadata_idx
  ON content USING GIN (metadata);

-- ====================
-- ACCOUNT_METRICS TABLE (Time-Series)
-- ====================

CREATE TABLE IF NOT EXISTS account_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- followers, engagement_rate, posts, etc.
  value NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Critical index for time-series queries
CREATE INDEX IF NOT EXISTS account_metrics_timestamp_idx
  ON account_metrics (timestamp DESC);

-- Composite index for account + time range queries (most common)
CREATE INDEX IF NOT EXISTS account_metrics_account_time_idx
  ON account_metrics (account_id, timestamp DESC);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS account_metrics_platform_type_time_idx
  ON account_metrics (platform, metric_type, timestamp DESC);

-- Index on account_id for aggregations
CREATE INDEX IF NOT EXISTS account_metrics_account_id_idx
  ON account_metrics (account_id);

-- ====================
-- TRENDS TABLE
-- ====================

CREATE TABLE IF NOT EXISTS trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL,
  relevance_score NUMERIC DEFAULT 0,
  volume INTEGER DEFAULT 0,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for relevance filtering (trends > threshold)
CREATE INDEX IF NOT EXISTS trends_relevance_idx
  ON trends (relevance_score DESC)
  WHERE relevance_score > 0.5;

-- Composite index for platform + time queries
CREATE INDEX IF NOT EXISTS trends_platform_time_idx
  ON trends (platform, detected_at DESC);

-- Index for keyword searches
CREATE INDEX IF NOT EXISTS trends_keyword_idx
  ON trends (keyword);

-- ====================
-- COMPETITOR_ANALYSES TABLE
-- ====================

CREATE TABLE IF NOT EXISTS competitor_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for competitor + platform queries
CREATE INDEX IF NOT EXISTS competitor_analyses_name_platform_idx
  ON competitor_analyses (competitor_name, platform);

-- Index on analyzed_at for recent analyses
CREATE INDEX IF NOT EXISTS competitor_analyses_time_idx
  ON competitor_analyses (analyzed_at DESC);

-- Index on analysis_data JSONB
CREATE INDEX IF NOT EXISTS competitor_analyses_data_idx
  ON competitor_analyses USING GIN (analysis_data);

-- ====================
-- SOCIAL_ACCOUNTS TABLE
-- ====================

CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  account_handle TEXT NOT NULL,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, account_handle)
);

-- Index for user's accounts
CREATE INDEX IF NOT EXISTS social_accounts_user_id_idx
  ON social_accounts (user_id);

-- Partial index for active accounts
CREATE INDEX IF NOT EXISTS social_accounts_active_idx
  ON social_accounts (user_id, platform)
  WHERE is_active = true;

-- Index for token expiration checks
CREATE INDEX IF NOT EXISTS social_accounts_token_expiry_idx
  ON social_accounts (token_expires_at)
  WHERE is_active = true AND token_expires_at IS NOT NULL;

-- ====================
-- QUERY OPTIMIZATION FUNCTIONS
-- ====================

-- Function to get scheduled content ready for posting
CREATE OR REPLACE FUNCTION get_ready_content(current_time TIMESTAMPTZ DEFAULT NOW())
RETURNS TABLE (
  id UUID,
  workflow_id UUID,
  platform TEXT,
  content_text TEXT,
  scheduled_for TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT id, workflow_id, platform, content_text, scheduled_for
  FROM content
  WHERE status = 'scheduled'
    AND scheduled_for <= current_time
  ORDER BY scheduled_for ASC
  LIMIT 100;
$$;

-- Function to get recent metrics for account
CREATE OR REPLACE FUNCTION get_account_metrics_range(
  p_account_id UUID,
  p_metric_type TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  timestamp TIMESTAMPTZ,
  metric_type TEXT,
  value NUMERIC,
  metadata JSONB
)
LANGUAGE SQL
STABLE
AS $$
  SELECT timestamp, metric_type, value, metadata
  FROM account_metrics
  WHERE account_id = p_account_id
    AND timestamp >= (NOW() - (p_days || ' days')::INTERVAL)
    AND (p_metric_type IS NULL OR metric_type = p_metric_type)
  ORDER BY timestamp DESC;
$$;

-- ====================
-- MAINTENANCE & STATISTICS
-- ====================

-- Analyze tables to update query planner statistics
ANALYZE workflows;
ANALYZE automation_configs;
ANALYZE content;
ANALYZE account_metrics;
ANALYZE trends;
ANALYZE competitor_analyses;
ANALYZE social_accounts;

-- ====================
-- COMMENTS
-- ====================

COMMENT ON INDEX workflows_enabled_idx IS 'Speeds up queries filtering for enabled workflows';
COMMENT ON INDEX content_scheduled_idx IS 'Optimizes queries for content ready to be posted';
COMMENT ON INDEX account_metrics_account_time_idx IS 'Critical for time-series analytics queries';
COMMENT ON FUNCTION get_ready_content IS 'Efficiently retrieves content scheduled for immediate posting';
COMMENT ON FUNCTION get_account_metrics_range IS 'Optimized function for retrieving metrics within a time range';
