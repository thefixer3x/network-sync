-- Migration: Compliance & GDPR System
-- Description: Audit logging, consent management, GDPR compliance, and data retention
-- Date: 2025-01-XX

-- ============================================================================
-- Audit Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'export', 'share', 'download', 'print')),
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  changes_before JSONB,
  changes_after JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_resource_type_idx ON audit_logs (resource_type);
CREATE INDEX IF NOT EXISTS audit_logs_resource_id_idx ON audit_logs (resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_timestamp_idx ON audit_logs (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs (resource_type, resource_id);

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS audit_logs_metadata_idx ON audit_logs USING GIN (metadata);

-- ============================================================================
-- Consent Records
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'personalization', 'third_party_sharing', 'cookies')),
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  version TEXT NOT NULL,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for consent records
CREATE INDEX IF NOT EXISTS consent_records_user_id_idx ON consent_records (user_id);
CREATE INDEX IF NOT EXISTS consent_records_consent_type_idx ON consent_records (consent_type);
CREATE INDEX IF NOT EXISTS consent_records_granted_idx ON consent_records (granted);
CREATE INDEX IF NOT EXISTS consent_records_user_id_type_idx ON consent_records (user_id, consent_type);
CREATE INDEX IF NOT EXISTS consent_records_created_at_idx ON consent_records (created_at DESC);

-- Partial index for active consents
CREATE INDEX IF NOT EXISTS consent_records_active_idx
  ON consent_records (user_id, consent_type)
  WHERE granted = true AND revoked_at IS NULL;

-- ============================================================================
-- GDPR Requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  data JSONB,
  notes TEXT,
  processed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for GDPR requests
CREATE INDEX IF NOT EXISTS gdpr_requests_user_id_idx ON gdpr_requests (user_id);
CREATE INDEX IF NOT EXISTS gdpr_requests_request_type_idx ON gdpr_requests (request_type);
CREATE INDEX IF NOT EXISTS gdpr_requests_status_idx ON gdpr_requests (status);
CREATE INDEX IF NOT EXISTS gdpr_requests_requested_at_idx ON gdpr_requests (requested_at DESC);

-- Partial index for pending requests
CREATE INDEX IF NOT EXISTS gdpr_requests_pending_idx
  ON gdpr_requests (requested_at DESC)
  WHERE status = 'pending';

-- ============================================================================
-- Data Retention Policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL CHECK (retention_period_days > 0),
  classification TEXT NOT NULL CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')),
  auto_delete BOOLEAN DEFAULT false,
  legal_basis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data_type)
);

-- Indexes for retention policies
CREATE INDEX IF NOT EXISTS retention_policies_data_type_idx ON retention_policies (data_type);
CREATE INDEX IF NOT EXISTS retention_policies_classification_idx ON retention_policies (classification);
CREATE INDEX IF NOT EXISTS retention_policies_auto_delete_idx ON retention_policies (auto_delete) WHERE auto_delete = true;

-- ============================================================================
-- Privacy Policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS privacy_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT false,
  changes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for privacy policies
CREATE INDEX IF NOT EXISTS privacy_policies_version_idx ON privacy_policies (version);
CREATE INDEX IF NOT EXISTS privacy_policies_effective_date_idx ON privacy_policies (effective_date DESC);
CREATE INDEX IF NOT EXISTS privacy_policies_is_active_idx ON privacy_policies (is_active) WHERE is_active = true;

-- ============================================================================
-- Data Subjects (GDPR data inventory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_subjects (
  user_id TEXT PRIMARY KEY,
  personal_data JSONB DEFAULT '{}'::jsonb,
  retention_policies TEXT[] DEFAULT '{}',
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data subjects
CREATE INDEX IF NOT EXISTS data_subjects_last_accessed_at_idx ON data_subjects (last_accessed_at DESC);

-- GIN index for personal data queries
CREATE INDEX IF NOT EXISTS data_subjects_personal_data_idx ON data_subjects USING GIN (personal_data);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get audit trail for user
CREATE OR REPLACE FUNCTION get_user_audit_trail(
  user_id_param TEXT,
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL,
  limit_param INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  timestamp TIMESTAMPTZ,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.timestamp,
    al.action,
    al.resource_type,
    al.resource_id,
    al.ip_address
  FROM audit_logs al
  WHERE al.user_id = user_id_param
    AND (start_time IS NULL OR al.timestamp >= start_time)
    AND (end_time IS NULL OR al.timestamp <= end_time)
  ORDER BY al.timestamp DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get active consents for user
CREATE OR REPLACE FUNCTION get_user_active_consents(user_id_param TEXT)
RETURNS TABLE (
  id UUID,
  consent_type TEXT,
  granted_at TIMESTAMPTZ,
  version TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.consent_type,
    cr.granted_at,
    cr.version
  FROM consent_records cr
  WHERE cr.user_id = user_id_param
    AND cr.granted = true
    AND cr.revoked_at IS NULL
  ORDER BY cr.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Check if user has granted consent
CREATE OR REPLACE FUNCTION has_user_consent(
  user_id_param TEXT,
  consent_type_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  has_consent BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM consent_records
    WHERE user_id = user_id_param
      AND consent_type = consent_type_param
      AND granted = true
      AND revoked_at IS NULL
  ) INTO has_consent;

  RETURN has_consent;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get pending GDPR requests
CREATE OR REPLACE FUNCTION get_pending_gdpr_requests()
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  request_type TEXT,
  requested_at TIMESTAMPTZ,
  days_pending INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.id,
    gr.user_id,
    gr.request_type,
    gr.requested_at,
    EXTRACT(DAY FROM NOW() - gr.requested_at)::INTEGER as days_pending
  FROM gdpr_requests gr
  WHERE gr.status = 'pending'
  ORDER BY gr.requested_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get retention policy for data type
CREATE OR REPLACE FUNCTION get_retention_policy(data_type_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  retention_period_days INTEGER,
  auto_delete BOOLEAN,
  legal_basis TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rp.id,
    rp.name,
    rp.retention_period_days,
    rp.auto_delete,
    rp.legal_basis
  FROM retention_policies rp
  WHERE rp.data_type = data_type_param
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get compliance statistics
CREATE OR REPLACE FUNCTION get_compliance_statistics(
  start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_audit_logs BIGINT,
  total_consents BIGINT,
  active_consents BIGINT,
  total_gdpr_requests BIGINT,
  pending_gdpr_requests BIGINT,
  completed_gdpr_requests BIGINT,
  total_data_subjects BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM audit_logs WHERE timestamp >= start_time AND timestamp <= end_time),
    (SELECT COUNT(*) FROM consent_records WHERE created_at >= start_time AND created_at <= end_time),
    (SELECT COUNT(*) FROM consent_records WHERE granted = true AND revoked_at IS NULL),
    (SELECT COUNT(*) FROM gdpr_requests WHERE requested_at >= start_time AND requested_at <= end_time),
    (SELECT COUNT(*) FROM gdpr_requests WHERE status = 'pending'),
    (SELECT COUNT(*) FROM gdpr_requests WHERE status = 'completed' AND completed_at >= start_time),
    (SELECT COUNT(*) FROM data_subjects);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER DEFAULT 730)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

  DELETE FROM audit_logs
  WHERE timestamp < cutoff_date;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Anonymize user data (for GDPR erasure)
CREATE OR REPLACE FUNCTION anonymize_user_data(user_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  anonymized_id TEXT;
BEGIN
  -- Generate anonymized ID
  anonymized_id := 'anonymized_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 16);

  -- Update audit logs
  UPDATE audit_logs
  SET user_id = anonymized_id,
      metadata = metadata - 'email' - 'name' - 'phone'
  WHERE user_id = user_id_param;

  -- Delete consent records
  DELETE FROM consent_records WHERE user_id = user_id_param;

  -- Update GDPR requests
  UPDATE gdpr_requests
  SET user_id = anonymized_id,
      data = NULL
  WHERE user_id = user_id_param;

  -- Delete data subject
  DELETE FROM data_subjects WHERE user_id = user_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function: Export user data (for GDPR portability)
CREATE OR REPLACE FUNCTION export_user_data(user_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  export_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'userId', user_id_param,
    'personalData', ds.personal_data,
    'consents', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', consent_type,
          'granted', granted,
          'grantedAt', granted_at,
          'revokedAt', revoked_at,
          'version', version
        )
      )
      FROM consent_records
      WHERE user_id = user_id_param
    ),
    'auditTrail', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'timestamp', timestamp,
          'action', action,
          'resourceType', resource_type,
          'resourceId', resource_id
        )
      )
      FROM audit_logs
      WHERE user_id = user_id_param
      ORDER BY timestamp DESC
      LIMIT 1000
    ),
    'exportedAt', NOW()
  )
  INTO export_data
  FROM data_subjects ds
  WHERE ds.user_id = user_id_param;

  RETURN export_data;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at timestamp on consent_records
CREATE OR REPLACE FUNCTION update_consent_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_records_updated_at
  BEFORE UPDATE ON consent_records
  FOR EACH ROW
  EXECUTE FUNCTION update_consent_records_updated_at();

-- Trigger: Update updated_at timestamp on gdpr_requests
CREATE OR REPLACE FUNCTION update_gdpr_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gdpr_requests_updated_at
  BEFORE UPDATE ON gdpr_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_requests_updated_at();

-- Trigger: Update updated_at timestamp on retention_policies
CREATE OR REPLACE FUNCTION update_retention_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER retention_policies_updated_at
  BEFORE UPDATE ON retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_retention_policies_updated_at();

-- Trigger: Update updated_at timestamp on data_subjects
CREATE OR REPLACE FUNCTION update_data_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_subjects_updated_at
  BEFORE UPDATE ON data_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_data_subjects_updated_at();

-- Trigger: Ensure only one active privacy policy
CREATE OR REPLACE FUNCTION ensure_single_active_privacy_policy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other privacy policies
    UPDATE privacy_policies
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER privacy_policy_activation
  AFTER INSERT OR UPDATE OF is_active ON privacy_policies
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_privacy_policy();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all user actions';
COMMENT ON TABLE consent_records IS 'User consent records for GDPR compliance';
COMMENT ON TABLE gdpr_requests IS 'GDPR data subject requests (access, erasure, etc.)';
COMMENT ON TABLE retention_policies IS 'Data retention policies by data type';
COMMENT ON TABLE privacy_policies IS 'Privacy policy versions and history';
COMMENT ON TABLE data_subjects IS 'GDPR data inventory of personal data';

COMMENT ON FUNCTION get_user_audit_trail IS 'Get audit trail for a specific user';
COMMENT ON FUNCTION get_user_active_consents IS 'Get all active consents for a user';
COMMENT ON FUNCTION has_user_consent IS 'Check if user has granted a specific consent';
COMMENT ON FUNCTION get_pending_gdpr_requests IS 'Get all pending GDPR requests';
COMMENT ON FUNCTION get_retention_policy IS 'Get retention policy for a data type';
COMMENT ON FUNCTION get_compliance_statistics IS 'Get comprehensive compliance statistics';
COMMENT ON FUNCTION cleanup_audit_logs IS 'Cleanup old audit logs according to retention policy';
COMMENT ON FUNCTION anonymize_user_data IS 'Anonymize user data for GDPR erasure requests';
COMMENT ON FUNCTION export_user_data IS 'Export all user data for GDPR portability requests';
