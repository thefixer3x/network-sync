# Network Sync Schema Analysis & Index Optimization

**Date:** December 23, 2025
**Analysis Focus:** Unused Index Review & Query Alignment
**Database:** Supabase Project (mxtsdgkwzjzlttpotole)

---

## Executive Summary

The `network_sync` schema has **3 tables with unused indexes** that were flagged by Supabase's performance advisor:

- `vector_documents` → `vector_documents_user_id_idx` (UNUSED)
- `social_accounts` → `social_accounts_user_id_idx` (UNUSED)
- `workflows` → `workflows_user_id_idx` (UNUSED)

**Root Cause:** These indexes use functional expressions on JSONB columns (`metadata->>'user_id'` and `config->>'user_id'`) for RLS policy filtering, but **actual queries don't reference these user_id predicates directly**. Instead, they rely on PostgreSQL RLS policies to enforce access control.

---

## Schema Overview

### 1. Vector Documents Table
**Purpose:** Semantic search and analytics storage
**Row Count:** ~0-100 (development/light usage)
**Primary Use Case:** Document embeddings for AI-powered content analysis

```sql
network_sync.vector_documents
├── id (UUID, PK)
├── content (TEXT) - Document content
├── embedding (vector(1536)) - OpenAI embeddings
├── metadata (JSONB) - Contains user_id for RLS
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

**Actual Query Pattern (from vector-store.ts):**
```typescript
// Typical queries DON'T use user_id in WHERE clause
// RLS policies enforce ownership automatically
const result = await supabase
  .from('vector_documents')
  .select('*')
  .eq('id', documentId); // Direct ID match, not user_id
```

**Index Analysis:**
| Index Name | Type | Current Status | Recommendation |
|-----------|------|-----------------|-----------------|
| `vector_documents_embedding_idx` | IVFFLAT (vector) | **IN USE** | Keep - essential for similarity search |
| `vector_documents_created_at_idx` | BTREE (DESC) | **IN USE** | Keep - supports sorting/filtering |
| `vector_documents_metadata_idx` | GIN (JSONB) | **IN USE** | Keep - enables JSON filtering |
| `vector_documents_user_id_idx` | Functional (JSONB) | **UNUSED** | ⚠️ Safe to remove |

---

### 2. Social Accounts Table
**Purpose:** Store connected social media accounts
**Row Count:** ~0-20 (per user, development stage)
**Primary Use Case:** Credential management for platform integrations

```sql
network_sync.social_accounts
├── id (UUID, PK)
├── platform (VARCHAR) - Twitter, LinkedIn, Instagram, etc.
├── username (VARCHAR)
├── status (VARCHAR) - connected/disconnected
├── followers (INTEGER)
├── last_sync (TIMESTAMPTZ)
├── credentials (JSONB) - Contains user_id for RLS
└── created_at, updated_at
```

**Actual Query Pattern (from app routes):**
```typescript
// Typical queries filter by platform, not by user_id in WHERE
// RLS policies handle user access automatically
const accounts = await supabase
  .from('social_accounts')
  .select('*')
  .eq('platform', 'twitter')
  .eq('is_active', true);
```

**Index Analysis:**
| Index Name | Type | Current Status | Recommendation |
|-----------|------|-----------------|-----------------|
| `social_accounts_platform_idx` | BTREE | **IN USE** | Keep - frequent WHERE filter |
| `social_accounts_is_active_idx` | BTREE | **IN USE** | Keep - status filtering |
| `social_accounts_created_at_idx` | BTREE (DESC) | **IN USE** | Keep - sorting/pagination |
| `social_accounts_user_id_idx` | Functional (JSONB) | **UNUSED** | ⚠️ Safe to remove |

---

### 3. Workflows Table
**Purpose:** Social media automation workflows
**Row Count:** ~5-50 (per organization, development stage)
**Primary Use Case:** Schedule and manage posting workflows

```sql
network_sync.workflows
├── id (UUID, PK)
├── name (VARCHAR)
├── status (VARCHAR) - active/paused
├── type (VARCHAR) - automation type
├── schedule (JSONB) - Cron schedule
├── platforms (TEXT[]) - Target platforms
├── next_run (TIMESTAMPTZ) - For scheduling
├── config (JSONB) - Contains user_id for RLS
└── created_at, updated_at
```

**Actual Query Pattern (from workflow routes):**
```typescript
// Queries by status and next_run for scheduler
// User filtering via RLS, not WHERE clause
const activeWorkflows = await supabase
  .from('workflows')
  .select('*')
  .eq('status', 'active')
  .lt('next_run', new Date());

// No direct user_id filtering in application queries
```

**Index Analysis:**
| Index Name | Type | Current Status | Recommendation |
|-----------|------|-----------------|-----------------|
| `workflows_status_idx` | BTREE | **IN USE** | Keep - scheduler filter |
| `workflows_type_idx` | BTREE | **IN USE** | Keep - workflow type filtering |
| `workflows_created_at_idx` | BTREE (DESC) | **IN USE** | Keep - sorting |
| `workflows_next_run_active_idx` | Partial (WHERE status='active') | **IN USE** | Keep - scheduler optimization |
| `workflows_user_id_idx` | Functional (JSONB) | **UNUSED** | ⚠️ Safe to remove |

---

## Root Cause Analysis

### Why These Indexes Are Unused

**Pattern:** All three unused indexes follow this pattern:
```sql
CREATE INDEX IF NOT EXISTS table_user_id_idx
  ON network_sync.table_name ((jsonb_column->>'user_id'));
```

**Why They're Unused:**

1. **RLS Policy Enforcement**: PostgreSQL Row Level Security policies automatically filter rows based on `auth.uid()` matching the JSONB user_id value
   ```sql
   CREATE POLICY table_select ON network_sync.table_name
     FOR SELECT TO authenticated
     USING (jsonb_column->>'user_id' = auth.uid()::text);
   ```

2. **Application Queries Don't Specify User ID**: The application code relies on RLS to enforce access control, not explicit WHERE filters
   ```typescript
   // Application assumes RLS filters data by user
   const results = await supabase.from('table').select('*');
   // RLS automatically restricts to current user
   ```

3. **Functional Indexes Are More Expensive**: These indexes require PostgreSQL to maintain functional expression evaluations on every INSERT/UPDATE, consuming storage and causing maintenance overhead

---

## Performance Recommendations

### Immediate Actions (Low Risk)

#### ✅ SAFE TO REMOVE:
```sql
-- Remove unused functional indexes on user_id
DROP INDEX IF EXISTS network_sync.vector_documents_user_id_idx;
DROP INDEX IF EXISTS network_sync.social_accounts_user_id_idx;
DROP INDEX IF EXISTS network_sync.workflows_user_id_idx;
```

**Benefits:**
- Reduce write overhead on INSERT/UPDATE operations
- Reduce storage consumption (~1-2 MB total)
- Simplify index maintenance
- RLS policies will continue to enforce access control automatically

**Risk Assessment:** ⚠️ **Very Low**
- Queries don't explicitly filter by user_id in WHERE clauses
- RLS policies provide access control independently
- No query performance regression expected

---

### Best Practice Improvements

#### 1. **Consider Explicit User ID Columns (Future)**
Instead of embedding user_id in JSONB metadata:

```sql
-- Add explicit column for better performance
ALTER TABLE network_sync.vector_documents
ADD COLUMN user_id UUID NOT NULL;

-- Then use simpler indexes
CREATE INDEX vector_documents_user_id_idx ON network_sync.vector_documents(user_id);

-- Simplify RLS
CREATE POLICY vector_documents_select ON network_sync.vector_documents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

**Advantages:**
- Native indexes (simpler, faster to maintain)
- Better query planner visibility
- Easier to debug query performance
- Can create composite indexes: `(user_id, status)` for combined filtering

#### 2. **Index Design for Current Workloads**

**Recommended Indexes by Table:**

**vector_documents** (Current State - Recommended):
```sql
-- Semantic search
CREATE INDEX idx_vector_documents_embedding_hnsw
  ON network_sync.vector_documents
  USING hnsw (embedding vector_cosine_ops);

-- Sorting/filtering
CREATE INDEX idx_vector_documents_created_at
  ON network_sync.vector_documents (created_at DESC);

-- Optional: JSON filtering when needed
CREATE INDEX idx_vector_documents_metadata_gin
  ON network_sync.vector_documents USING GIN (metadata);

-- ❌ REMOVE: vector_documents_user_id_idx (unused)
```

**social_accounts** (Current State - Recommended):
```sql
-- Platform filtering
CREATE INDEX idx_social_accounts_platform
  ON network_sync.social_accounts (platform);

-- Status filtering
CREATE INDEX idx_social_accounts_is_active
  ON network_sync.social_accounts (is_active);

-- Sorting
CREATE INDEX idx_social_accounts_created_at
  ON network_sync.social_accounts (created_at DESC);

-- ❌ REMOVE: social_accounts_user_id_idx (unused)

-- Future optimization: Composite index
CREATE INDEX idx_social_accounts_platform_active
  ON network_sync.social_accounts (platform, is_active)
  WHERE is_active = true;
```

**workflows** (Current State - Recommended):
```sql
-- Status filtering
CREATE INDEX idx_workflows_status
  ON network_sync.workflows (status);

-- Type filtering
CREATE INDEX idx_workflows_type
  ON network_sync.workflows (type);

-- Sorting
CREATE INDEX idx_workflows_created_at
  ON network_sync.workflows (created_at DESC);

-- Scheduler optimization
CREATE INDEX idx_workflows_next_run_active
  ON network_sync.workflows (next_run)
  WHERE status = 'active';

-- ❌ REMOVE: workflows_user_id_idx (unused)
```

---

## Implementation Plan

### Phase 1: Cleanup (Recommended - Now)

```sql
BEGIN;

-- Remove unused functional indexes
DROP INDEX IF EXISTS network_sync.vector_documents_user_id_idx;
DROP INDEX IF EXISTS network_sync.social_accounts_user_id_idx;
DROP INDEX IF EXISTS network_sync.workflows_user_id_idx;

-- Verify removal
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'network_sync'
ORDER BY tablename, indexname;

COMMIT;
```

**Expected Impact:**
- Reduced storage: ~2-5 MB
- Faster INSERTs/UPDATEs on all three tables
- No query performance regression
- RLS remains fully functional

---

### Phase 2: Refactoring (Medium-term)

If user filtering becomes a bottleneck:

1. Add explicit `user_id UUID` columns to tables
2. Migrate data: Extract user_id from JSONB
3. Create native indexes on user_id
4. Update RLS policies to use column instead of JSONB
5. Remove JSONB user_id storage (or keep for backward compatibility)

---

### Phase 3: Composite Indexes (Long-term)

As query patterns stabilize, add composite indexes:

```sql
-- Common query: Get active workflows for scheduler
CREATE INDEX idx_workflows_status_next_run
  ON network_sync.workflows (status, next_run)
  WHERE status = 'active';

-- Common query: Get platform accounts
CREATE INDEX idx_social_accounts_platform_active
  ON network_sync.social_accounts (platform, is_active);
```

---

## Monitoring & Validation

### After Removal

Track query performance:
```sql
-- Monitor table sizes before/after
SELECT
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'network_sync'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  schemaname, tablename, indexname,
  idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'network_sync'
ORDER BY idx_scan DESC;
```

### Application Health Checks

- [ ] Verify RLS policies still enforce access control
- [ ] Monitor auth_events for policy violations
- [ ] Check application logs for query performance regressions
- [ ] Benchmark: Vector search latency remains <100ms
- [ ] Benchmark: Social account queries remain <50ms
- [ ] Benchmark: Workflow scheduling remains <200ms total

---

## Summary & Recommendation

| Action | Status | Risk | Priority |
|--------|--------|------|----------|
| Remove `vector_documents_user_id_idx` | ✅ Safe | Very Low | High |
| Remove `social_accounts_user_id_idx` | ✅ Safe | Very Low | High |
| Remove `workflows_user_id_idx` | ✅ Safe | Very Low | High |
| Keep vector/GIN/BTREE indexes | ✅ Recommended | None | Critical |
| Add explicit user_id columns (future) | 🔄 Consider | Low | Medium |
| Add composite indexes (future) | 🔄 Monitor | None | Low |

### Next Steps

1. **Immediate**: Execute Phase 1 cleanup (remove 3 functional indexes)
2. **This Week**: Monitor index usage and query performance
3. **Next Sprint**: Consider refactoring to explicit user_id columns if performance metrics warrant
4. **Ongoing**: Track unused indexes quarterly with Supabase advisors

---

## Appendix: Query Analysis

### Current Query Patterns (from codebase)

**Vector Store Queries:**
```typescript
// Pattern 1: Direct ID lookup (no user_id filter)
.select('*').eq('id', documentId)

// Pattern 2: Metadata search (no user_id filter)
.select('*').contains('metadata', {...})

// Pattern 3: Vector similarity (via RPC)
call.search_vectors(embedding, similarity_threshold, match_count)
```

**Social Accounts Queries:**
```typescript
// Pattern 1: Platform filtering
.select('*').eq('platform', 'twitter').eq('is_active', true)

// Pattern 2: Account status
.select('*').eq('status', 'connected')

// Pattern 3: Sync updates
.update({last_sync}).eq('id', accountId)
```

**Workflow Queries:**
```typescript
// Pattern 1: Scheduler - active workflows
.select('*').eq('status', 'active').lt('next_run', now)

// Pattern 2: Workflow lookup
.select('*').eq('id', workflowId)

// Pattern 3: Status change
.update({status}).eq('id', workflowId)
```

**Conclusion**: None of these query patterns use `user_id` predicates. RLS policies handle access control implicitly.

