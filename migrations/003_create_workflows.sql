-- Migration: Create Workflows Table (network_sync schema)
-- Description: Sets up the workflows table with scheduling metadata, indexes, and RLS
-- Date: 2025-11-15

BEGIN;

CREATE TABLE IF NOT EXISTS network_sync.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'paused',
  type VARCHAR(100),
  schedule JSONB,
  platforms TEXT[] DEFAULT '{}',
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  total_runs INTEGER DEFAULT 0,
  success_rate FLOAT DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes
CREATE INDEX IF NOT EXISTS workflows_status_idx ON network_sync.workflows(status);
CREATE INDEX IF NOT EXISTS workflows_type_idx ON network_sync.workflows(type);
CREATE INDEX IF NOT EXISTS workflows_created_at_idx ON network_sync.workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS workflows_next_run_active_idx ON network_sync.workflows(next_run) WHERE status = 'active';
-- RLS predicate support
CREATE INDEX IF NOT EXISTS workflows_config_user_idx
  ON network_sync.workflows ((config->>'user_id'));

-- Trigger
DROP TRIGGER IF EXISTS update_workflows_updated_at ON network_sync.workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON network_sync.workflows
  FOR EACH ROW
  EXECUTE FUNCTION network_sync.update_updated_at_column();

-- RLS policies (ownership via config->>'user_id')
ALTER TABLE network_sync.workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflows_select ON network_sync.workflows;
CREATE POLICY workflows_select ON network_sync.workflows
  FOR SELECT TO authenticated
  USING (config->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS workflows_insert ON network_sync.workflows;
CREATE POLICY workflows_insert ON network_sync.workflows
  FOR INSERT TO authenticated
  WITH CHECK (config->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS workflows_update ON network_sync.workflows;
CREATE POLICY workflows_update ON network_sync.workflows
  FOR UPDATE TO authenticated
  USING (config->>'user_id' = auth.uid()::text)
  WITH CHECK (config->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS workflows_delete ON network_sync.workflows;
CREATE POLICY workflows_delete ON network_sync.workflows
  FOR DELETE TO authenticated
  USING (config->>'user_id' = auth.uid()::text);

COMMENT ON TABLE network_sync.workflows IS 'Stores social media automation workflows and their execution history (namespaced)';
COMMENT ON COLUMN network_sync.workflows.schedule IS 'Cron schedule or time-based scheduling configuration';
COMMENT ON COLUMN network_sync.workflows.platforms IS 'Array of social media platforms this workflow applies to';
COMMENT ON COLUMN network_sync.workflows.config IS 'Workflow-specific configuration, including user ownership metadata';

COMMIT;
