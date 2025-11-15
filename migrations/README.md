# Database Migrations

This directory contains SQL migration files for setting up and updating the database schema.

## Running Migrations

### Using Supabase CLI

```bash
# Run all pending migrations
supabase db push

# Or run specific migration
psql $DATABASE_URL -f migrations/001_create_vector_store.sql
```

### Using SQL Editor (Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of the migration file
4. Execute the SQL

## Migration Files

- **001_create_vector_store.sql** - Creates vector store tables, indexes, and RPC functions for semantic search
  - Required for: VectorStore class
  - Creates: `vector_documents` table, `search_vectors()` function
  - Enables: pgvector extension

## Migration Order

Migrations should be run in numerical order (001, 002, 003, etc.)

## Verification

After running migrations, verify the setup:

```sql
-- Check if vector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check if table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'vector_documents';

-- Check if indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'vector_documents';

-- Test search function
SELECT search_vectors(
  '{0.1, 0.2, ...}'::vector(1536),  -- test embedding
  0.5,  -- threshold
  5     -- limit
);
```

## Rollback

If you need to rollback the vector store migration:

```sql
-- Drop in reverse order
DROP TRIGGER IF EXISTS update_vector_documents_updated_at ON vector_documents;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS search_vectors(vector, float, int);
DROP INDEX IF EXISTS vector_documents_metadata_idx;
DROP INDEX IF EXISTS vector_documents_created_at_idx;
DROP INDEX IF EXISTS vector_documents_embedding_idx;
DROP TABLE IF EXISTS vector_documents;
DROP EXTENSION IF EXISTS vector;
```

## Notes

- Always backup your database before running migrations in production
- Test migrations in a staging environment first
- Migrations are idempotent (can be run multiple times safely due to IF NOT EXISTS clauses)
