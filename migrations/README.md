# Database Migrations

This directory contains SQL migration files for setting up and updating the database schema.

## Running Migrations

### Using Supabase SQL Editor (recommended)

All migrations target the dedicated schema `network_sync`. Copy each file into the Supabase SQL Editor and run them in order (001 → 003).

### Using Supabase CLI or psql

```bash
# Run specific migration
psql $DATABASE_URL -f migrations/001_create_vector_store.sql
psql $DATABASE_URL -f migrations/002_create_social_accounts.sql
psql $DATABASE_URL -f migrations/003_create_workflows.sql
```

## Migration Files

- **001_create_vector_store.sql**  
  - Creates schema `network_sync`, pgvector extension, shared `update_updated_at_column` trigger, `network_sync.vector_documents`, similarity indexes, RLS, and the RPC pair `network_sync.search_vectors`/`public.search_vectors`.
- **002_create_social_accounts.sql**  
  - Adds `network_sync.social_accounts` with credentials JSON ownership, indexes (including user_id lookup), trigger, and RLS policies.
- **003_create_workflows.sql**  
  - Adds `network_sync.workflows` with scheduling fields, partial next_run index, trigger, ownership index, and RLS policies.

Migrations are idempotent via `IF NOT EXISTS`.

## Verification

After running migrations, verify the setup:

```sql
-- Extension
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- Tables
SELECT table_schema, table_name FROM information_schema.tables
WHERE table_schema = 'network_sync'
AND table_name IN ('vector_documents', 'social_accounts', 'workflows');

-- Indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'network_sync';

-- Functions
SELECT routine_schema, routine_name
FROM information_schema.routines
WHERE routine_schema IN ('network_sync', 'public')
AND routine_name = 'search_vectors';
```

## Rollback (example for vector store)

```sql
DROP TRIGGER IF EXISTS update_vector_documents_updated_at ON network_sync.vector_documents;
DROP FUNCTION IF EXISTS network_sync.search_vectors(vector, float, int);
DROP FUNCTION IF EXISTS public.search_vectors(vector, float, int);
DROP FUNCTION IF EXISTS network_sync.update_updated_at_column();
DROP INDEX IF EXISTS vector_documents_metadata_user_idx;
DROP INDEX IF EXISTS vector_documents_metadata_idx;
DROP INDEX IF EXISTS vector_documents_created_at_idx;
DROP INDEX IF EXISTS vector_documents_embedding_idx;
DROP TABLE IF EXISTS network_sync.vector_documents;
DROP SCHEMA IF EXISTS network_sync;
DROP EXTENSION IF EXISTS vector;
```

## Notes

- All grants assume roles `anon` and `authenticated` are present (Supabase defaults).
- Row Level Security enforces ownership via JSONB `user_id` fields on each table.
- If you expose RPCs via PostgREST, use `public.search_vectors` (`/rest/v1/rpc/search_vectors`).
