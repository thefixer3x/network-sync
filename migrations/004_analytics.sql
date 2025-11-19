/**
 * Analytics Migration
 *
 * Adds comprehensive analytics tracking with:
 * - Event tracking
 * - Metric data points
 * - Session management
 * - Pre-computed aggregations
 */

-- ============================================================================
-- Analytics Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  properties JSONB DEFAULT '{}'::jsonb,
  dimensions JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS analytics_events_type_idx
  ON analytics_events (type);

CREATE INDEX IF NOT EXISTS analytics_events_user_idx
  ON analytics_events (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_events_session_idx
  ON analytics_events (session_id)
  WHERE session_id IS NOT NULL;

-- Time-series index
CREATE INDEX IF NOT EXISTS analytics_events_time_idx
  ON analytics_events (created_at DESC);

-- Composite index for type and time
CREATE INDEX IF NOT EXISTS analytics_events_type_time_idx
  ON analytics_events (type, created_at DESC);

-- GIN indexes for JSON queries
CREATE INDEX IF NOT EXISTS analytics_events_properties_idx
  ON analytics_events USING GIN (properties);

CREATE INDEX IF NOT EXISTS analytics_events_dimensions_idx
  ON analytics_events USING GIN (dimensions);

-- ============================================================================
-- Analytics Metrics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- counter, gauge, histogram, summary
  value DECIMAL NOT NULL,
  dimensions JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for metric queries
CREATE INDEX IF NOT EXISTS analytics_metrics_name_idx
  ON analytics_metrics (name);

CREATE INDEX IF NOT EXISTS analytics_metrics_type_idx
  ON analytics_metrics (type);

-- Time-series index
CREATE INDEX IF NOT EXISTS analytics_metrics_time_idx
  ON analytics_metrics (recorded_at DESC);

-- Composite index for name and time
CREATE INDEX IF NOT EXISTS analytics_metrics_name_time_idx
  ON analytics_metrics (name, recorded_at DESC);

-- GIN index for dimensions
CREATE INDEX IF NOT EXISTS analytics_metrics_dimensions_idx
  ON analytics_metrics USING GIN (dimensions);

-- ============================================================================
-- Analytics Sessions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  event_count INTEGER DEFAULT 0,
  duration INTEGER, -- milliseconds
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS analytics_sessions_user_idx
  ON analytics_sessions (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_sessions_start_idx
  ON analytics_sessions (start_time DESC);

CREATE INDEX IF NOT EXISTS analytics_sessions_active_idx
  ON analytics_sessions (last_activity DESC)
  WHERE end_time IS NULL;

-- ============================================================================
-- Analytics Aggregations Table (Pre-computed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  granularity TEXT NOT NULL, -- minute, hour, day, week, month
  dimensions JSONB DEFAULT '{}'::jsonb,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  count INTEGER DEFAULT 0,
  sum DECIMAL DEFAULT 0,
  avg DECIMAL DEFAULT 0,
  min DECIMAL,
  max DECIMAL,
  p50 DECIMAL,
  p95 DECIMAL,
  p99 DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(metric_name, granularity, period_start, dimensions)
);

-- Indexes for aggregation queries
CREATE INDEX IF NOT EXISTS analytics_agg_metric_idx
  ON analytics_aggregations (metric_name);

CREATE INDEX IF NOT EXISTS analytics_agg_granularity_idx
  ON analytics_aggregations (granularity);

CREATE INDEX IF NOT EXISTS analytics_agg_period_idx
  ON analytics_aggregations (period_start DESC, period_end DESC);

-- Composite index for efficient queries
CREATE INDEX IF NOT EXISTS analytics_agg_metric_period_idx
  ON analytics_aggregations (metric_name, granularity, period_start DESC);

-- GIN index for dimensions
CREATE INDEX IF NOT EXISTS analytics_agg_dimensions_idx
  ON analytics_aggregations USING GIN (dimensions);

-- ============================================================================
-- Update Triggers
-- ============================================================================

-- Trigger to update sessions.updated_at
CREATE OR REPLACE FUNCTION update_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_updated_at
  BEFORE UPDATE ON analytics_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_updated_at();

-- Trigger to update aggregations.updated_at
CREATE OR REPLACE FUNCTION update_aggregation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER aggregation_updated_at
  BEFORE UPDATE ON analytics_aggregations
  FOR EACH ROW
  EXECUTE FUNCTION update_aggregation_updated_at();

-- ============================================================================
-- Helper Functions
-- ============================================================================

/**
 * Get event counts by type for a time period
 */
CREATE OR REPLACE FUNCTION get_event_counts(
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
)
RETURNS TABLE (
  event_type TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    type as event_type,
    COUNT(*) as count
  FROM analytics_events
  WHERE created_at >= start_time
    AND created_at <= end_time
  GROUP BY type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get active sessions
 */
CREATE OR REPLACE FUNCTION get_active_sessions(
  timeout_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
  session_id TEXT,
  user_id TEXT,
  start_time TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  event_count INTEGER,
  duration INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id as session_id,
    s.user_id,
    s.start_time,
    s.last_activity,
    s.event_count,
    EXTRACT(EPOCH FROM (s.last_activity - s.start_time))::INTEGER * 1000 as duration
  FROM analytics_sessions s
  WHERE s.end_time IS NULL
    AND s.last_activity >= NOW() - (timeout_minutes || ' minutes')::INTERVAL
  ORDER BY s.last_activity DESC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get top events for a user
 */
CREATE OR REPLACE FUNCTION get_user_top_events(
  user_id_param TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  event_type TEXT,
  count BIGINT,
  last_occurred TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    type as event_type,
    COUNT(*) as count,
    MAX(created_at) as last_occurred
  FROM analytics_events
  WHERE user_id = user_id_param
  GROUP BY type
  ORDER BY count DESC, last_occurred DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get metric statistics for a period
 */
CREATE OR REPLACE FUNCTION get_metric_stats(
  metric_name_param TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
)
RETURNS TABLE (
  count BIGINT,
  sum DECIMAL,
  avg DECIMAL,
  min DECIMAL,
  max DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as count,
    SUM(value) as sum,
    AVG(value) as avg,
    MIN(value) as min,
    MAX(value) as max
  FROM analytics_metrics
  WHERE name = metric_name_param
    AND recorded_at >= start_time
    AND recorded_at <= end_time;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get hourly event counts
 */
CREATE OR REPLACE FUNCTION get_hourly_event_counts(
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
)
RETURNS TABLE (
  hour TIMESTAMPTZ,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as count
  FROM analytics_events
  WHERE created_at >= start_time
    AND created_at <= end_time
  GROUP BY hour
  ORDER BY hour ASC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get daily active users
 */
CREATE OR REPLACE FUNCTION get_daily_active_users(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  active_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users
  FROM analytics_events
  WHERE DATE(created_at) >= start_date
    AND DATE(created_at) <= end_date
    AND user_id IS NOT NULL
  GROUP BY date
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get session duration percentiles
 */
CREATE OR REPLACE FUNCTION get_session_duration_percentiles()
RETURNS TABLE (
  p50 INTEGER,
  p90 INTEGER,
  p95 INTEGER,
  p99 INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration)::INTEGER as p50,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY duration)::INTEGER as p90,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration)::INTEGER as p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration)::INTEGER as p99
  FROM analytics_sessions
  WHERE duration IS NOT NULL AND duration > 0;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Clean up old analytics data
 */
CREATE OR REPLACE FUNCTION cleanup_old_analytics(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE (
  events_deleted BIGINT,
  metrics_deleted BIGINT,
  sessions_deleted BIGINT
) AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  events_count BIGINT;
  metrics_count BIGINT;
  sessions_count BIGINT;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;

  DELETE FROM analytics_events WHERE created_at < cutoff_date;
  GET DIAGNOSTICS events_count = ROW_COUNT;

  DELETE FROM analytics_metrics WHERE recorded_at < cutoff_date;
  GET DIAGNOSTICS metrics_count = ROW_COUNT;

  DELETE FROM analytics_sessions WHERE start_time < cutoff_date;
  GET DIAGNOSTICS sessions_count = ROW_COUNT;

  RETURN QUERY SELECT events_count, metrics_count, sessions_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Partitioning (Optional - for large-scale deployments)
-- ============================================================================

-- Note: For very large deployments, consider partitioning analytics_events
-- and analytics_metrics by time range for better query performance

-- Example (commented out):
-- CREATE TABLE analytics_events_202501 PARTITION OF analytics_events
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE analytics_events IS 'Analytics events tracking user actions and system events';
COMMENT ON TABLE analytics_metrics IS 'Metric data points for performance and business metrics';
COMMENT ON TABLE analytics_sessions IS 'User session tracking and duration analytics';
COMMENT ON TABLE analytics_aggregations IS 'Pre-computed metric aggregations for fast queries';

COMMENT ON FUNCTION get_event_counts IS 'Get event counts by type for a time period';
COMMENT ON FUNCTION get_active_sessions IS 'Get currently active sessions';
COMMENT ON FUNCTION get_user_top_events IS 'Get top events for a specific user';
COMMENT ON FUNCTION get_metric_stats IS 'Get statistical aggregations for a metric';
COMMENT ON FUNCTION cleanup_old_analytics IS 'Clean up analytics data older than specified days';
