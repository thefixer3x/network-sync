-- Migration: 007_backup
-- Description: Backup and disaster recovery system
-- Created: 2025-01-19

-- =====================================================
-- BACKUP CONFIGURATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS backup_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full', 'incremental', 'differential')),
  destination TEXT NOT NULL CHECK (destination IN ('local', 's3', 'gcs', 'azure')),
  destination_path TEXT NOT NULL,
  schedule TEXT, -- Cron expression
  retention_days INTEGER NOT NULL DEFAULT 7,
  compression BOOLEAN DEFAULT true,
  encryption BOOLEAN DEFAULT false,
  encryption_key TEXT,
  include_redis BOOLEAN DEFAULT true,
  include_uploads BOOLEAN DEFAULT true,
  verify_after_backup BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backup_configs_type ON backup_configs(type);
CREATE INDEX idx_backup_configs_destination ON backup_configs(destination);
CREATE INDEX idx_backup_configs_created_at ON backup_configs(created_at);

-- =====================================================
-- BACKUP JOBS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES backup_configs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('full', 'incremental', 'differential')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'verifying', 'verified')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  size BIGINT,
  location TEXT NOT NULL,
  checksum TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_backup_jobs_config_id ON backup_jobs(config_id);
CREATE INDEX idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX idx_backup_jobs_start_time ON backup_jobs(start_time DESC);
CREATE INDEX idx_backup_jobs_type ON backup_jobs(type);

-- =====================================================
-- RECOVERY POINTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS recovery_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_job_id UUID NOT NULL REFERENCES backup_jobs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full', 'incremental', 'differential')),
  size BIGINT NOT NULL,
  location TEXT NOT NULL,
  checksum TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_recovery_points_backup_job_id ON recovery_points(backup_job_id);
CREATE INDEX idx_recovery_points_timestamp ON recovery_points(timestamp DESC);
CREATE INDEX idx_recovery_points_verified ON recovery_points(verified);

-- =====================================================
-- RESTORE JOBS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS restore_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_point_id UUID NOT NULL REFERENCES recovery_points(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'validating')),
  target_timestamp TIMESTAMPTZ, -- For point-in-time recovery
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_restore_jobs_recovery_point_id ON restore_jobs(recovery_point_id);
CREATE INDEX idx_restore_jobs_status ON restore_jobs(status);
CREATE INDEX idx_restore_jobs_start_time ON restore_jobs(start_time DESC);

-- =====================================================
-- BACKUP SCHEDULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES backup_configs(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL,
  next_run TIMESTAMPTZ NOT NULL,
  last_run TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_backup_schedules_config_id ON backup_schedules(config_id);
CREATE INDEX idx_backup_schedules_next_run ON backup_schedules(next_run);
CREATE INDEX idx_backup_schedules_enabled ON backup_schedules(enabled);

-- =====================================================
-- DISASTER RECOVERY METRICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dr_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  total_backups INTEGER NOT NULL,
  successful_backups INTEGER NOT NULL,
  failed_backups INTEGER NOT NULL,
  total_size BIGINT NOT NULL,
  average_backup_time BIGINT NOT NULL, -- In milliseconds
  rpo INTEGER NOT NULL, -- Recovery Point Objective in minutes
  rto INTEGER NOT NULL, -- Recovery Time Objective in minutes
  oldest_recovery_point TIMESTAMPTZ,
  newest_recovery_point TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_dr_metrics_timestamp ON dr_metrics(timestamp DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate backup metrics
CREATE OR REPLACE FUNCTION calculate_backup_metrics()
RETURNS TABLE (
  total_backups BIGINT,
  successful_backups BIGINT,
  failed_backups BIGINT,
  total_size BIGINT,
  average_backup_time BIGINT,
  oldest_recovery_point TIMESTAMPTZ,
  newest_recovery_point TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_backups,
    COUNT(*) FILTER (WHERE status IN ('completed', 'verified'))::BIGINT AS successful_backups,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_backups,
    COALESCE(SUM(size) FILTER (WHERE status IN ('completed', 'verified')), 0)::BIGINT AS total_size,
    COALESCE(AVG(EXTRACT(EPOCH FROM (end_time - start_time)) * 1000) FILTER (WHERE status IN ('completed', 'verified')), 0)::BIGINT AS average_backup_time,
    MIN(rp.timestamp) AS oldest_recovery_point,
    MAX(rp.timestamp) AS newest_recovery_point
  FROM backup_jobs bj
  LEFT JOIN recovery_points rp ON rp.backup_job_id = bj.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get latest recovery point
CREATE OR REPLACE FUNCTION get_latest_recovery_point()
RETURNS TABLE (
  id UUID,
  backup_job_id UUID,
  timestamp TIMESTAMPTZ,
  type TEXT,
  size BIGINT,
  location TEXT,
  checksum TEXT,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT rp.id, rp.backup_job_id, rp.timestamp, rp.type, rp.size, rp.location, rp.checksum, rp.verified
  FROM recovery_points rp
  ORDER BY rp.timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get recovery points in time range
CREATE OR REPLACE FUNCTION get_recovery_points_in_range(
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  backup_job_id UUID,
  timestamp TIMESTAMPTZ,
  type TEXT,
  size BIGINT,
  location TEXT,
  checksum TEXT,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT rp.id, rp.backup_job_id, rp.timestamp, rp.type, rp.size, rp.location, rp.checksum, rp.verified
  FROM recovery_points rp
  WHERE rp.timestamp BETWEEN start_time AND end_time
  ORDER BY rp.timestamp DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to cleanup old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups(
  config_id_param UUID,
  retention_days_param INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_time TIMESTAMPTZ;
BEGIN
  cutoff_time := NOW() - (retention_days_param || ' days')::INTERVAL;

  -- Delete recovery points and related backup jobs
  WITH deleted_points AS (
    DELETE FROM recovery_points
    WHERE backup_job_id IN (
      SELECT id FROM backup_jobs
      WHERE config_id = config_id_param
      AND start_time < cutoff_time
    )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted_points;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to verify backup integrity
CREATE OR REPLACE FUNCTION verify_backup_integrity(
  backup_job_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  job_record backup_jobs%ROWTYPE;
  recovery_point_record recovery_points%ROWTYPE;
BEGIN
  -- Get backup job
  SELECT * INTO job_record FROM backup_jobs WHERE id = backup_job_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup job not found: %', backup_job_id_param;
  END IF;

  -- Get recovery point
  SELECT * INTO recovery_point_record FROM recovery_points WHERE backup_job_id = backup_job_id_param;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if checksums match
  IF job_record.checksum = recovery_point_record.checksum THEN
    UPDATE recovery_points
    SET verified = true
    WHERE id = recovery_point_record.id;

    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get backup status summary
CREATE OR REPLACE FUNCTION get_backup_status_summary()
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  total_size BIGINT,
  average_duration BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bj.status,
    COUNT(*)::BIGINT AS count,
    COALESCE(SUM(bj.size), 0)::BIGINT AS total_size,
    COALESCE(AVG(EXTRACT(EPOCH FROM (bj.end_time - bj.start_time)) * 1000), 0)::BIGINT AS average_duration
  FROM backup_jobs bj
  WHERE bj.end_time IS NOT NULL
  GROUP BY bj.status;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate RPO (Recovery Point Objective)
CREATE OR REPLACE FUNCTION calculate_rpo()
RETURNS INTEGER AS $$
DECLARE
  avg_interval INTERVAL;
  rpo_minutes INTEGER;
BEGIN
  -- Calculate average time between backups
  SELECT AVG(interval_between) INTO avg_interval
  FROM (
    SELECT timestamp - LAG(timestamp) OVER (ORDER BY timestamp) AS interval_between
    FROM recovery_points
    WHERE timestamp > NOW() - INTERVAL '30 days'
  ) AS intervals
  WHERE interval_between IS NOT NULL;

  -- Convert to minutes
  rpo_minutes := EXTRACT(EPOCH FROM COALESCE(avg_interval, INTERVAL '0')) / 60;

  RETURN rpo_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to estimate RTO (Recovery Time Objective)
CREATE OR REPLACE FUNCTION calculate_rto()
RETURNS INTEGER AS $$
DECLARE
  avg_restore_time INTERVAL;
  rto_minutes INTEGER;
BEGIN
  -- Calculate average restore time
  SELECT AVG(end_time - start_time) INTO avg_restore_time
  FROM restore_jobs
  WHERE status = 'completed'
  AND end_time IS NOT NULL;

  -- Convert to minutes, default to 30 if no data
  rto_minutes := COALESCE(EXTRACT(EPOCH FROM avg_restore_time) / 60, 30);

  RETURN rto_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to record DR metrics
CREATE OR REPLACE FUNCTION record_dr_metrics()
RETURNS UUID AS $$
DECLARE
  metrics_record dr_metrics%ROWTYPE;
  new_id UUID;
BEGIN
  -- Calculate current metrics
  SELECT * INTO metrics_record FROM calculate_backup_metrics();

  -- Insert metrics record
  INSERT INTO dr_metrics (
    total_backups,
    successful_backups,
    failed_backups,
    total_size,
    average_backup_time,
    rpo,
    rto,
    oldest_recovery_point,
    newest_recovery_point
  )
  VALUES (
    metrics_record.total_backups,
    metrics_record.successful_backups,
    metrics_record.failed_backups,
    metrics_record.total_size,
    metrics_record.average_backup_time,
    calculate_rpo(),
    calculate_rto(),
    metrics_record.oldest_recovery_point,
    metrics_record.newest_recovery_point
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update backup_configs.updated_at
CREATE OR REPLACE FUNCTION update_backup_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_backup_configs_timestamp
BEFORE UPDATE ON backup_configs
FOR EACH ROW
EXECUTE FUNCTION update_backup_configs_timestamp();

-- Trigger to create recovery point after successful backup
CREATE OR REPLACE FUNCTION create_recovery_point_after_backup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'verified') AND NEW.checksum IS NOT NULL THEN
    INSERT INTO recovery_points (
      backup_job_id,
      timestamp,
      type,
      size,
      location,
      checksum,
      verified,
      metadata
    )
    VALUES (
      NEW.id,
      NEW.start_time,
      NEW.type,
      NEW.size,
      NEW.location,
      NEW.checksum,
      NEW.status = 'verified',
      NEW.metadata
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_recovery_point
AFTER INSERT OR UPDATE ON backup_jobs
FOR EACH ROW
EXECUTE FUNCTION create_recovery_point_after_backup();

-- Trigger to record DR metrics after backup completion
CREATE OR REPLACE FUNCTION record_metrics_after_backup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'verified', 'failed') AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'verified', 'failed')) THEN
    PERFORM record_dr_metrics();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_metrics
AFTER UPDATE ON backup_jobs
FOR EACH ROW
EXECUTE FUNCTION record_metrics_after_backup();

-- =====================================================
-- VIEWS
-- =====================================================

-- View for backup status overview
CREATE OR REPLACE VIEW backup_status_overview AS
SELECT
  bc.id AS config_id,
  bc.name AS config_name,
  bc.type AS backup_type,
  COUNT(bj.id) AS total_jobs,
  COUNT(bj.id) FILTER (WHERE bj.status = 'completed' OR bj.status = 'verified') AS successful_jobs,
  COUNT(bj.id) FILTER (WHERE bj.status = 'failed') AS failed_jobs,
  COUNT(bj.id) FILTER (WHERE bj.status = 'running') AS running_jobs,
  MAX(bj.start_time) AS last_backup_time,
  SUM(bj.size) FILTER (WHERE bj.status = 'completed' OR bj.status = 'verified') AS total_backup_size
FROM backup_configs bc
LEFT JOIN backup_jobs bj ON bj.config_id = bc.id
GROUP BY bc.id, bc.name, bc.type;

-- View for recovery point status
CREATE OR REPLACE VIEW recovery_point_status AS
SELECT
  rp.id,
  rp.timestamp,
  rp.type,
  rp.size,
  rp.verified,
  bj.config_id,
  bc.name AS config_name,
  bj.status AS backup_status,
  NOW() - rp.timestamp AS age
FROM recovery_points rp
JOIN backup_jobs bj ON bj.id = rp.backup_job_id
JOIN backup_configs bc ON bc.id = bj.config_id
ORDER BY rp.timestamp DESC;

-- View for DR metrics dashboard
CREATE OR REPLACE VIEW dr_metrics_dashboard AS
SELECT
  (SELECT COUNT(*) FROM backup_configs) AS total_configs,
  (SELECT COUNT(*) FROM backup_jobs) AS total_backup_jobs,
  (SELECT COUNT(*) FROM recovery_points) AS total_recovery_points,
  (SELECT COUNT(*) FROM restore_jobs) AS total_restore_jobs,
  (SELECT calculate_rpo()) AS current_rpo,
  (SELECT calculate_rto()) AS current_rto,
  (SELECT MAX(timestamp) FROM recovery_points) AS latest_recovery_point,
  (SELECT MIN(timestamp) FROM recovery_points) AS oldest_recovery_point,
  (SELECT SUM(size) FROM recovery_points) AS total_recovery_point_size;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default backup configuration
INSERT INTO backup_configs (
  name,
  type,
  destination,
  destination_path,
  schedule,
  retention_days,
  compression,
  encryption,
  include_redis,
  include_uploads,
  verify_after_backup
)
VALUES (
  'Daily Full Backup',
  'full',
  'local',
  './backups',
  '0 2 * * *', -- Daily at 2 AM
  7,
  true,
  false,
  true,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- Record initial DR metrics
SELECT record_dr_metrics();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;
