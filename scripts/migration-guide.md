# 🚀 Database Migration Guide (network_sync schema)

This guide explains how to apply and verify the Supabase migrations that now live in the dedicated `network_sync` schema.

## 📋 Migration Overview

Run the files in this order:

1. **001_create_vector_store.sql** – creates `network_sync` schema, pgvector, shared trigger, `vector_documents`, indexes, RLS, and the public RPC wrapper.
2. **002_create_social_accounts.sql** – creates `network_sync.social_accounts` with RLS and ownership lookup indexes.
3. **003_create_workflows.sql** – creates `network_sync.workflows` with scheduling indexes, partial next_run index, and RLS.

All migrations are idempotent (`IF NOT EXISTS`).

## 🔧 Apply Migrations (SQL Editor)

1. Open Supabase Dashboard → **SQL Editor**.
2. Paste the contents of each migration file in order and run it.
3. Confirm that the statements complete successfully before moving to the next file.

## 🔍 Verification Queries

Run the following after all migrations:

```sql
-- Extensions
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- Tables present in network_sync
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'network_sync'
  AND table_name IN ('vector_documents', 'social_accounts', 'workflows');

-- Indexes (performance + RLS predicates)
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'network_sync'
ORDER BY tablename, indexname;

-- Functions (namespaced function + public RPC wrapper)
SELECT routine_schema, routine_name
FROM information_schema.routines
WHERE routine_schema IN ('network_sync', 'public')
  AND routine_name = 'search_vectors';

-- RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'network_sync'
  AND tablename IN ('vector_documents', 'social_accounts', 'workflows');
```

Expected highlights:
- Schema `network_sync` exists and is granted to `anon`/`authenticated`.
- Tables: `vector_documents`, `social_accounts`, `workflows` with their indexes (including `*_user_idx` for policy predicates).
- Functions: `network_sync.search_vectors` and `public.search_vectors`.
- RLS enabled on all three tables.

## 🛡️ RLS Ownership Model

RLS policies rely on JSONB ownership fields:
- `vector_documents.metadata.user_id`
- `social_accounts.credentials.user_id`
- `workflows.config.user_id`

Authenticated users must match `auth.uid()` for SELECT/INSERT/UPDATE/DELETE. Inserts/updates must preserve the same owner. The indexes `*_user_idx` support these predicates.

## 🌐 RPC Exposure

`public.search_vectors` proxies to `network_sync.search_vectors` and is executable by `anon` and `authenticated`.
- HTTP: `POST /rest/v1/rpc/search_vectors`
- Body: `{ "query_embedding": [...1536 floats...], "similarity_threshold": 0.7, "match_count": 5 }`

## 🧭 Notes & Next Steps

- Ensure your application sets `user_id` inside the JSONB fields listed above when writing rows.
- Supabase clients should target the `network_sync` schema (or prefix tables with `network_sync.`).
- If you need a text-to-embedding wrapper, build an Edge Function that computes the embedding then calls the RPC.
- For future tables, default privileges in the migration already grant `SELECT` (anon) and `SELECT/INSERT/UPDATE/DELETE` (authenticated) within `network_sync`.
