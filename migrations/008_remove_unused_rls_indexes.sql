-- Migration: Remove Unused RLS User ID Functional Indexes
-- Description: Remove functional indexes on user_id JSONB columns that are not used by queries
--              RLS policies enforce access control independently without needing these indexes
-- Date: December 23, 2025
-- Risk: Very Low - No application queries directly filter by user_id in WHERE clauses

BEGIN;

-- Summary of indexes to be removed:
-- 1. vector_documents_user_id_idx - Functional index on metadata->>'user_id'
--    Status: UNUSED - Queries use vector similarity search, not user filtering
--    RLS Policy: vector_documents_select enforces user access via RLS
--
-- 2. social_accounts_user_id_idx - Functional index on credentials->>'user_id'
--    Status: UNUSED - Queries filter by platform, status, is_active
--    RLS Policy: social_accounts_select enforces user access via RLS
--
-- 3. workflows_user_id_idx - Functional index on config->>'user_id'
--    Status: UNUSED - Queries filter by status, type, next_run
--    RLS Policy: workflows_select enforces user access via RLS

-- Remove unused functional indexes
DROP INDEX IF EXISTS network_sync.vector_documents_user_id_idx;
DROP INDEX IF EXISTS network_sync.social_accounts_user_id_idx;
DROP INDEX IF EXISTS network_sync.workflows_user_id_idx;

-- Verify RLS policies remain in place (no changes needed)
-- SELECT * FROM pg_policies WHERE schemaname = 'network_sync';

-- Performance benefits:
-- - Reduced write overhead: INSERT/UPDATE no longer evaluates functional expressions
-- - Reduced storage: ~2-5 MB freed (functional indexes are more expensive than simple BTREE)
-- - Simplified maintenance: Fewer indexes to manage
-- - No impact on query performance: RLS policies handle access control automatically

-- Query patterns that DON'T use user_id filtering (per codebase analysis):
-- - Vector search: uses embedding similarity (IVFFLAT index)
-- - Social accounts: filters by platform, status, is_active (BTREE indexes)
-- - Workflows: filters by status, type, next_run (BTREE and partial indexes)

-- Future optimization (if needed):
-- Consider adding explicit user_id UUID columns instead of JSONB metadata
-- This would enable simpler, more efficient indexes:
--
-- ALTER TABLE network_sync.vector_documents ADD COLUMN user_id UUID NOT NULL;
-- ALTER TABLE network_sync.social_accounts ADD COLUMN user_id UUID NOT NULL;
-- ALTER TABLE network_sync.workflows ADD COLUMN user_id UUID NOT NULL;
--
-- CREATE INDEX idx_vector_documents_user_id ON network_sync.vector_documents(user_id);
-- CREATE INDEX idx_social_accounts_user_id ON network_sync.social_accounts(user_id);
-- CREATE INDEX idx_workflows_user_id ON network_sync.workflows(user_id);

COMMIT;
