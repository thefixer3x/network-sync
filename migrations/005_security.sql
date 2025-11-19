-- Migration: Security System
-- Description: Advanced security features including authentication, authorization, audit logging, and threat detection
-- Date: 2025-01-XX

-- ============================================================================
-- Security Events (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  resource TEXT,
  action TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for security events
CREATE INDEX IF NOT EXISTS security_events_type_idx ON security_events (type);
CREATE INDEX IF NOT EXISTS security_events_severity_idx ON security_events (severity);
CREATE INDEX IF NOT EXISTS security_events_user_id_idx ON security_events (user_id);
CREATE INDEX IF NOT EXISTS security_events_ip_address_idx ON security_events (ip_address);
CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_outcome_idx ON security_events (outcome);
CREATE INDEX IF NOT EXISTS security_events_type_created_at_idx ON security_events (type, created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_user_id_created_at_idx ON security_events (user_id, created_at DESC);

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS security_events_metadata_idx ON security_events USING GIN (metadata);

-- ============================================================================
-- API Keys
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  rate_limit INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for API keys
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON api_keys (is_active);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_expires_at_idx ON api_keys (expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- User Sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user sessions
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_token_hash_idx ON user_sessions (token_hash);
CREATE INDEX IF NOT EXISTS user_sessions_refresh_token_hash_idx ON user_sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS user_sessions_last_activity_at_idx ON user_sessions (last_activity_at);

-- Partial index for active sessions
CREATE INDEX IF NOT EXISTS user_sessions_active_idx
  ON user_sessions (user_id, last_activity_at)
  WHERE expires_at > NOW();

-- ============================================================================
-- IP Reputation
-- ============================================================================

CREATE TABLE IF NOT EXISTS ip_reputation (
  ip_address TEXT PRIMARY KEY,
  failed_attempts INTEGER DEFAULT 0,
  successful_attempts INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  blocked_until TIMESTAMPTZ,
  trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for IP reputation
CREATE INDEX IF NOT EXISTS ip_reputation_blocked_until_idx
  ON ip_reputation (blocked_until)
  WHERE blocked_until IS NOT NULL AND blocked_until > NOW();
CREATE INDEX IF NOT EXISTS ip_reputation_trust_score_idx ON ip_reputation (trust_score);
CREATE INDEX IF NOT EXISTS ip_reputation_failed_attempts_idx ON ip_reputation (failed_attempts DESC);

-- ============================================================================
-- IP Whitelist
-- ============================================================================

CREATE TABLE IF NOT EXISTS ip_whitelist (
  ip_address TEXT PRIMARY KEY,
  description TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- IP Blacklist
-- ============================================================================

CREATE TABLE IF NOT EXISTS ip_blacklist (
  ip_address TEXT PRIMARY KEY,
  reason TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Rate Limit Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  identifier TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits (reset_at);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get security events by type and time range
CREATE OR REPLACE FUNCTION get_security_events_by_type(
  event_type TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  severity TEXT,
  user_id TEXT,
  ip_address TEXT,
  message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.type,
    se.severity,
    se.user_id,
    se.ip_address,
    se.message,
    se.created_at
  FROM security_events se
  WHERE se.type = event_type
    AND se.created_at >= start_time
    AND se.created_at <= end_time
  ORDER BY se.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get failed login attempts by IP
CREATE OR REPLACE FUNCTION get_failed_login_attempts(
  ip_addr TEXT,
  time_window_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
  attempt_count BIGINT,
  latest_attempt TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as attempt_count,
    MAX(created_at) as latest_attempt
  FROM security_events
  WHERE type = 'login_failure'
    AND ip_address = ip_addr
    AND created_at >= NOW() - (time_window_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get active sessions count
CREATE OR REPLACE FUNCTION get_active_sessions_count()
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM user_sessions
    WHERE expires_at > NOW()
      AND last_activity_at > NOW() - INTERVAL '30 minutes'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get user's active sessions
CREATE OR REPLACE FUNCTION get_user_active_sessions(user_id_param TEXT)
RETURNS TABLE (
  id UUID,
  ip_address TEXT,
  user_agent TEXT,
  last_activity_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id,
    us.ip_address,
    us.user_agent,
    us.last_activity_at,
    us.expires_at,
    us.created_at
  FROM user_sessions us
  WHERE us.user_id = user_id_param
    AND us.expires_at > NOW()
  ORDER BY us.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get API keys by user
CREATE OR REPLACE FUNCTION get_user_api_keys(user_id_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  permissions JSONB,
  is_active BOOLEAN,
  rate_limit INTEGER,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.id,
    ak.name,
    ak.permissions,
    ak.is_active,
    ak.rate_limit,
    ak.last_used_at,
    ak.expires_at,
    ak.created_at
  FROM api_keys ak
  WHERE ak.user_id = user_id_param
  ORDER BY ak.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get blocked IPs
CREATE OR REPLACE FUNCTION get_blocked_ips()
RETURNS TABLE (
  ip_address TEXT,
  reason TEXT,
  trust_score INTEGER,
  blocked_until TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(bl.ip_address, ir.ip_address) as ip_address,
    bl.reason,
    ir.trust_score,
    ir.blocked_until
  FROM ip_blacklist bl
  FULL OUTER JOIN ip_reputation ir ON bl.ip_address = ir.ip_address
  WHERE bl.ip_address IS NOT NULL
    OR (ir.blocked_until IS NOT NULL AND ir.blocked_until > NOW())
  ORDER BY COALESCE(bl.created_at, ir.updated_at) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get security statistics
CREATE OR REPLACE FUNCTION get_security_statistics(time_window_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  total_events BIGINT,
  failed_logins BIGINT,
  successful_logins BIGINT,
  access_denied BIGINT,
  rate_limit_exceeded BIGINT,
  active_sessions BIGINT,
  blocked_ips BIGINT,
  active_api_keys BIGINT
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
BEGIN
  start_time := NOW() - (time_window_hours || ' hours')::INTERVAL;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM security_events WHERE created_at >= start_time),
    (SELECT COUNT(*) FROM security_events WHERE type = 'login_failure' AND created_at >= start_time),
    (SELECT COUNT(*) FROM security_events WHERE type = 'login_success' AND created_at >= start_time),
    (SELECT COUNT(*) FROM security_events WHERE type = 'access_denied' AND created_at >= start_time),
    (SELECT COUNT(*) FROM security_events WHERE type = 'rate_limit_exceeded' AND created_at >= start_time),
    (SELECT get_active_sessions_count()),
    (SELECT COUNT(*) FROM ip_blacklist),
    (SELECT COUNT(*) FROM api_keys WHERE is_active = true);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Cleanup expired data
CREATE OR REPLACE FUNCTION cleanup_security_data(
  events_retention_days INTEGER DEFAULT 30,
  sessions_retention_days INTEGER DEFAULT 7,
  rate_limits_retention_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  events_deleted BIGINT,
  sessions_deleted BIGINT,
  rate_limits_deleted BIGINT
) AS $$
DECLARE
  events_cutoff TIMESTAMPTZ;
  sessions_cutoff TIMESTAMPTZ;
  rate_limits_cutoff TIMESTAMPTZ;
  events_count BIGINT;
  sessions_count BIGINT;
  rate_limits_count BIGINT;
BEGIN
  events_cutoff := NOW() - (events_retention_days || ' days')::INTERVAL;
  sessions_cutoff := NOW() - (sessions_retention_days || ' days')::INTERVAL;
  rate_limits_cutoff := NOW() - (rate_limits_retention_hours || ' hours')::INTERVAL;

  -- Delete old security events
  DELETE FROM security_events WHERE created_at < events_cutoff;
  GET DIAGNOSTICS events_count = ROW_COUNT;

  -- Delete expired sessions
  DELETE FROM user_sessions
  WHERE expires_at < sessions_cutoff
    OR last_activity_at < sessions_cutoff;
  GET DIAGNOSTICS sessions_count = ROW_COUNT;

  -- Delete old rate limits
  DELETE FROM rate_limits WHERE reset_at < rate_limits_cutoff;
  GET DIAGNOSTICS rate_limits_count = ROW_COUNT;

  -- Unblock IPs that have passed their block duration
  UPDATE ip_reputation
  SET blocked_until = NULL
  WHERE blocked_until IS NOT NULL AND blocked_until < NOW();

  RETURN QUERY SELECT events_count, sessions_count, rate_limits_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Track security event
CREATE OR REPLACE FUNCTION track_security_event(
  event_type TEXT,
  event_severity TEXT,
  user_id_param TEXT DEFAULT NULL,
  ip_address_param TEXT DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  resource_param TEXT DEFAULT NULL,
  action_param TEXT DEFAULT NULL,
  outcome_param TEXT DEFAULT 'success',
  message_param TEXT DEFAULT '',
  metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO security_events (
    type,
    severity,
    user_id,
    ip_address,
    user_agent,
    resource,
    action,
    outcome,
    message,
    metadata
  ) VALUES (
    event_type,
    event_severity,
    user_id_param,
    ip_address_param,
    user_agent_param,
    resource_param,
    action_param,
    outcome_param,
    message_param,
    metadata_param
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at timestamp on api_keys
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- Trigger: Update updated_at timestamp on ip_reputation
CREATE OR REPLACE FUNCTION update_ip_reputation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ip_reputation_updated_at
  BEFORE UPDATE ON ip_reputation
  FOR EACH ROW
  EXECUTE FUNCTION update_ip_reputation_updated_at();

-- Trigger: Update updated_at timestamp on rate_limits
CREATE OR REPLACE FUNCTION update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limits_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE security_events IS 'Security audit log containing all security-related events';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access';
COMMENT ON TABLE user_sessions IS 'Active user sessions with JWT tokens';
COMMENT ON TABLE ip_reputation IS 'IP address reputation tracking for threat detection';
COMMENT ON TABLE ip_whitelist IS 'Whitelisted IP addresses that bypass security checks';
COMMENT ON TABLE ip_blacklist IS 'Blacklisted IP addresses that are blocked from access';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking per identifier';

COMMENT ON FUNCTION get_security_events_by_type IS 'Get security events filtered by type and time range';
COMMENT ON FUNCTION get_failed_login_attempts IS 'Get count of failed login attempts for an IP address';
COMMENT ON FUNCTION get_active_sessions_count IS 'Get count of currently active user sessions';
COMMENT ON FUNCTION get_user_active_sessions IS 'Get all active sessions for a specific user';
COMMENT ON FUNCTION get_user_api_keys IS 'Get all API keys for a specific user';
COMMENT ON FUNCTION get_blocked_ips IS 'Get all blocked IP addresses';
COMMENT ON FUNCTION get_security_statistics IS 'Get comprehensive security statistics';
COMMENT ON FUNCTION cleanup_security_data IS 'Cleanup expired security data';
COMMENT ON FUNCTION track_security_event IS 'Track a security event in the audit log';
