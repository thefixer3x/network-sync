-- Migration: Create Workflows Table
-- Description: Sets up the workflows table for automation workflows
-- Date: 2025-11-15

CREATE TABLE IF NOT EXISTS workflows (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS workflows_status_idx ON workflows(status);
CREATE INDEX IF NOT EXISTS workflows_type_idx ON workflows(type);
CREATE INDEX IF NOT EXISTS workflows_created_at_idx ON workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS workflows_next_run_idx ON workflows(next_run) WHERE status = 'active';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON workflows TO authenticated;
GRANT SELECT ON workflows TO anon;

COMMENT ON TABLE workflows IS 'Stores social media automation workflows and their execution history';
COMMENT ON COLUMN workflows.schedule IS 'Cron schedule or time-based scheduling configuration';
COMMENT ON COLUMN workflows.platforms IS 'Array of social media platforms this workflow applies to';
COMMENT ON COLUMN workflows.config IS 'Workflow-specific configuration and settings';
