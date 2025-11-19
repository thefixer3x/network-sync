/**
 * Content Management Enhancement Migration
 *
 * Adds support for:
 * - Content versioning
 * - Content templates
 * - Content variations (A/B testing)
 * - Approval workflows
 * - Media attachments
 */

-- ============================================================================
-- Content Versions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  changelog TEXT,
  created_by TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_id, version)
);

-- Index for version queries
CREATE INDEX IF NOT EXISTS content_versions_content_idx
  ON content_versions (content_id, version DESC);

-- Index for active versions
CREATE INDEX IF NOT EXISTS content_versions_active_idx
  ON content_versions (content_id)
  WHERE is_active = true;

-- ============================================================================
-- Content Templates Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  platform TEXT,
  category TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(name, platform)
);

-- Index for template queries
CREATE INDEX IF NOT EXISTS templates_platform_idx
  ON content_templates (platform);

CREATE INDEX IF NOT EXISTS templates_category_idx
  ON content_templates (category);

-- GIN index for metadata search
CREATE INDEX IF NOT EXISTS templates_metadata_idx
  ON content_templates USING GIN (metadata);

-- ============================================================================
-- Content Variations Table (A/B Testing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content_text TEXT NOT NULL,
  weight INTEGER DEFAULT 50, -- Percentage 0-100
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0, -- Click-through rate
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_id, name)
);

-- Index for variation queries
CREATE INDEX IF NOT EXISTS variations_content_idx
  ON content_variations (content_id);

-- Index for active variations
CREATE INDEX IF NOT EXISTS variations_active_idx
  ON content_variations (content_id)
  WHERE is_active = true;

-- Index for performance sorting
CREATE INDEX IF NOT EXISTS variations_performance_idx
  ON content_variations (content_id, ctr DESC, conversion_rate DESC);

-- ============================================================================
-- Approval Requests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, changes_requested
  required_approvals INTEGER DEFAULT 1,
  current_approvals INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_id)
);

-- Index for approval queries
CREATE INDEX IF NOT EXISTS approvals_content_idx
  ON approval_requests (content_id);

-- Index for pending approvals
CREATE INDEX IF NOT EXISTS approvals_pending_idx
  ON approval_requests (status)
  WHERE status = 'pending';

-- ============================================================================
-- Approvers Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, changes_requested
  comment TEXT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(request_id, user_id)
);

-- Index for approver queries
CREATE INDEX IF NOT EXISTS approvers_request_idx
  ON approval_approvers (request_id);

CREATE INDEX IF NOT EXISTS approvers_user_idx
  ON approval_approvers (user_id, status);

-- ============================================================================
-- Media Attachments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS media_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- image, video, gif, document
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL, -- bytes
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- seconds for video
  alt_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for media queries
CREATE INDEX IF NOT EXISTS media_content_idx
  ON media_attachments (content_id);

CREATE INDEX IF NOT EXISTS media_type_idx
  ON media_attachments (type);

-- GIN index for metadata search
CREATE INDEX IF NOT EXISTS media_metadata_idx
  ON media_attachments USING GIN (metadata);

-- ============================================================================
-- Content Analytics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement DECIMAL(5,2) DEFAULT 0, -- Engagement rate percentage
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_id, recorded_at)
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS analytics_content_idx
  ON content_analytics (content_id, recorded_at DESC);

-- Index for engagement sorting
CREATE INDEX IF NOT EXISTS analytics_engagement_idx
  ON content_analytics (engagement DESC);

-- Time-series index for time-based queries
CREATE INDEX IF NOT EXISTS analytics_time_idx
  ON content_analytics (recorded_at DESC);

-- ============================================================================
-- Update Triggers
-- ============================================================================

-- Trigger to update content.updated_at
CREATE OR REPLACE FUNCTION update_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_content_updated_at();

-- Trigger to update templates.updated_at
CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER template_updated_at
  BEFORE UPDATE ON content_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_updated_at();

-- Trigger to update approval_requests.updated_at
CREATE OR REPLACE FUNCTION update_approval_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_approval_updated_at();

-- ============================================================================
-- Helper Functions
-- ============================================================================

/**
 * Get content with latest version
 */
CREATE OR REPLACE FUNCTION get_content_with_version(content_uuid UUID)
RETURNS TABLE (
  id UUID,
  workflow_id UUID,
  platform TEXT,
  content_text TEXT,
  status TEXT,
  current_version INTEGER,
  version_changelog TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.workflow_id,
    c.platform,
    COALESCE(cv.content_text, c.content_text) as content_text,
    c.status,
    COALESCE(cv.version, 0) as current_version,
    cv.changelog as version_changelog,
    c.created_at,
    c.updated_at
  FROM content c
  LEFT JOIN content_versions cv ON c.id = cv.content_id AND cv.is_active = true
  WHERE c.id = content_uuid;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get pending approvals for user
 */
CREATE OR REPLACE FUNCTION get_pending_approvals(user_id_param TEXT)
RETURNS TABLE (
  request_id UUID,
  content_id UUID,
  platform TEXT,
  requested_by TEXT,
  required_approvals INTEGER,
  current_approvals INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id as request_id,
    ar.content_id,
    c.platform,
    ar.requested_by,
    ar.required_approvals,
    ar.current_approvals,
    ar.created_at
  FROM approval_requests ar
  JOIN content c ON ar.content_id = c.id
  JOIN approval_approvers aa ON ar.id = aa.request_id
  WHERE aa.user_id = user_id_param
    AND aa.status = 'pending'
    AND ar.status = 'pending'
  ORDER BY ar.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get top performing content variations
 */
CREATE OR REPLACE FUNCTION get_top_variations(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  variation_id UUID,
  content_id UUID,
  name TEXT,
  impressions INTEGER,
  ctr DECIMAL(5,2),
  conversion_rate DECIMAL(5,2),
  score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cv.id as variation_id,
    cv.content_id,
    cv.name,
    cv.impressions,
    cv.ctr,
    cv.conversion_rate,
    (cv.ctr * 0.5 + cv.conversion_rate * 0.5) as score
  FROM content_variations cv
  WHERE cv.is_active = true
    AND cv.impressions > 100 -- Min threshold
  ORDER BY score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get content performance summary
 */
CREATE OR REPLACE FUNCTION get_content_performance(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  platform TEXT,
  total_content BIGINT,
  total_views BIGINT,
  total_engagement BIGINT,
  avg_engagement DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.platform,
    COUNT(DISTINCT c.id) as total_content,
    COALESCE(SUM(ca.views), 0) as total_views,
    COALESCE(SUM(ca.likes + ca.shares + ca.comments), 0) as total_engagement,
    COALESCE(AVG(ca.engagement), 0) as avg_engagement
  FROM content c
  LEFT JOIN content_analytics ca ON c.id = ca.content_id
  WHERE ca.recorded_at >= start_date
    AND ca.recorded_at <= end_date
  GROUP BY c.platform
  ORDER BY total_engagement DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE content_versions IS 'Content version history for tracking changes';
COMMENT ON TABLE content_templates IS 'Reusable content templates with variables';
COMMENT ON TABLE content_variations IS 'Content variations for A/B testing';
COMMENT ON TABLE approval_requests IS 'Content approval workflow requests';
COMMENT ON TABLE approval_approvers IS 'Approvers for approval requests';
COMMENT ON TABLE media_attachments IS 'Media files attached to content';
COMMENT ON TABLE content_analytics IS 'Content performance analytics';
