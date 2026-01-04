-- Migration: Create network_sync schema and vector store
-- Description: Sets up dedicated schema, pgvector, shared trigger, vector documents table, indexes, and RPC
-- Date: 2025-11-15

BEGIN;

-- Dedicated schema for isolation
CREATE SCHEMA IF NOT EXISTS network_sync;

-- Ensure pgvector is available
CREATE EXTENSION IF NOT EXISTS vector;

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION network_sync.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vector documents table
CREATE TABLE IF NOT EXISTS network_sync.vector_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS vector_documents_embedding_idx
  ON network_sync.vector_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS vector_documents_created_at_idx
  ON network_sync.vector_documents (created_at DESC);

CREATE INDEX IF NOT EXISTS vector_documents_metadata_idx
  ON network_sync.vector_documents USING GIN (metadata);

-- RLS support index for ownership lookups
CREATE INDEX IF NOT EXISTS vector_documents_metadata_user_idx
  ON network_sync.vector_documents ((metadata->>'user_id'));

-- Vector search RPC (schema-local)
CREATE OR REPLACE FUNCTION network_sync.search_vectors(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vd.id,
    vd.content,
    vd.metadata,
    1 - (vd.embedding <=> query_embedding) AS similarity,
    vd.created_at
  FROM network_sync.vector_documents vd
  WHERE 1 - (vd.embedding <=> query_embedding) > similarity_threshold
  ORDER BY vd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Public wrapper for PostgREST /rpc exposure
CREATE OR REPLACE FUNCTION public.search_vectors(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM network_sync.search_vectors(query_embedding, similarity_threshold, match_count);
END;
$$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_vector_documents_updated_at ON network_sync.vector_documents;
CREATE TRIGGER update_vector_documents_updated_at
  BEFORE UPDATE ON network_sync.vector_documents
  FOR EACH ROW
  EXECUTE FUNCTION network_sync.update_updated_at_column();

-- Grants
GRANT USAGE ON SCHEMA network_sync TO anon, authenticated;
GRANT EXECUTE ON FUNCTION network_sync.search_vectors(vector(1536), float, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_vectors(vector(1536), float, int) TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA network_sync TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA network_sync TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA network_sync GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA network_sync GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- RLS policies (ownership via metadata->>'user_id')
ALTER TABLE network_sync.vector_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vector_documents_select ON network_sync.vector_documents;
CREATE POLICY vector_documents_select ON network_sync.vector_documents
  FOR SELECT TO authenticated
  USING (metadata->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS vector_documents_insert ON network_sync.vector_documents;
CREATE POLICY vector_documents_insert ON network_sync.vector_documents
  FOR INSERT TO authenticated
  WITH CHECK (metadata->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS vector_documents_update ON network_sync.vector_documents;
CREATE POLICY vector_documents_update ON network_sync.vector_documents
  FOR UPDATE TO authenticated
  USING (metadata->>'user_id' = auth.uid()::text)
  WITH CHECK (metadata->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS vector_documents_delete ON network_sync.vector_documents;
CREATE POLICY vector_documents_delete ON network_sync.vector_documents
  FOR DELETE TO authenticated
  USING (metadata->>'user_id' = auth.uid()::text);

COMMENT ON SCHEMA network_sync IS 'Isolated schema for social network sync domain tables and functions';
COMMENT ON TABLE network_sync.vector_documents IS 'Stores document embeddings for semantic search and analytics';
COMMENT ON COLUMN network_sync.vector_documents.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
COMMENT ON FUNCTION network_sync.search_vectors IS 'Search for similar documents using cosine similarity (schema-local)';

COMMIT;
-- Migration: Create Social Accounts Table (network_sync schema)
-- Description: Sets up the social_accounts table inside the dedicated schema with RLS
-- Date: 2025-11-15

BEGIN;

-- Table definition
CREATE TABLE IF NOT EXISTS network_sync.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_image TEXT,
  status VARCHAR(50) DEFAULT 'connected',
  followers INTEGER DEFAULT 0,
  last_sync TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  credentials JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(platform, username)
);

-- Indexes
CREATE INDEX IF NOT EXISTS social_accounts_platform_idx ON network_sync.social_accounts(platform);
CREATE INDEX IF NOT EXISTS social_accounts_is_active_idx ON network_sync.social_accounts(is_active);
CREATE INDEX IF NOT EXISTS social_accounts_created_at_idx ON network_sync.social_accounts(created_at DESC);
-- RLS predicate support
CREATE INDEX IF NOT EXISTS social_accounts_credentials_user_idx
  ON network_sync.social_accounts ((credentials->>'user_id'));

-- Trigger
DROP TRIGGER IF EXISTS update_social_accounts_updated_at ON network_sync.social_accounts;
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON network_sync.social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION network_sync.update_updated_at_column();

-- RLS policies (ownership via credentials->>'user_id')
ALTER TABLE network_sync.social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_accounts_select ON network_sync.social_accounts;
CREATE POLICY social_accounts_select ON network_sync.social_accounts
  FOR SELECT TO authenticated
  USING (credentials->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS social_accounts_insert ON network_sync.social_accounts;
CREATE POLICY social_accounts_insert ON network_sync.social_accounts
  FOR INSERT TO authenticated
  WITH CHECK (credentials->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS social_accounts_update ON network_sync.social_accounts;
CREATE POLICY social_accounts_update ON network_sync.social_accounts
  FOR UPDATE TO authenticated
  USING (credentials->>'user_id' = auth.uid()::text)
  WITH CHECK (credentials->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS social_accounts_delete ON network_sync.social_accounts;
CREATE POLICY social_accounts_delete ON network_sync.social_accounts
  FOR DELETE TO authenticated
  USING (credentials->>'user_id' = auth.uid()::text);

COMMENT ON TABLE network_sync.social_accounts IS 'Stores connected social media accounts and their metadata (namespaced)';
COMMENT ON COLUMN network_sync.social_accounts.credentials IS 'Encrypted credentials and user ownership metadata';

COMMIT;
-- Migration: Create Workflows Table (network_sync schema)
-- Description: Sets up the workflows table with scheduling metadata, indexes, and RLS
-- Date: 2025-11-15

BEGIN;

CREATE TABLE IF NOT EXISTS network_sync.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'paused',
  type VARCHAR(100),
  schedule JSONB,
  platforms TEXT[] DEFAULT '{}',
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  total_runs INTEGER DEFAULT 0,
  success_rate FLOAT DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes
CREATE INDEX IF NOT EXISTS workflows_status_idx ON network_sync.workflows(status);
CREATE INDEX IF NOT EXISTS workflows_type_idx ON network_sync.workflows(type);
CREATE INDEX IF NOT EXISTS workflows_created_at_idx ON network_sync.workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS workflows_next_run_active_idx ON network_sync.workflows(next_run) WHERE status = 'active';
-- RLS predicate support
CREATE INDEX IF NOT EXISTS workflows_config_user_idx
  ON network_sync.workflows ((config->>'user_id'));

-- Trigger
DROP TRIGGER IF EXISTS update_workflows_updated_at ON network_sync.workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON network_sync.workflows
  FOR EACH ROW
  EXECUTE FUNCTION network_sync.update_updated_at_column();

-- RLS policies (ownership via config->>'user_id')
ALTER TABLE network_sync.workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflows_select ON network_sync.workflows;
CREATE POLICY workflows_select ON network_sync.workflows
  FOR SELECT TO authenticated
  USING (config->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS workflows_insert ON network_sync.workflows;
CREATE POLICY workflows_insert ON network_sync.workflows
  FOR INSERT TO authenticated
  WITH CHECK (config->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS workflows_update ON network_sync.workflows;
CREATE POLICY workflows_update ON network_sync.workflows
  FOR UPDATE TO authenticated
  USING (config->>'user_id' = auth.uid()::text)
  WITH CHECK (config->>'user_id' = auth.uid()::text);

DROP POLICY IF EXISTS workflows_delete ON network_sync.workflows;
CREATE POLICY workflows_delete ON network_sync.workflows
  FOR DELETE TO authenticated
  USING (config->>'user_id' = auth.uid()::text);

COMMENT ON TABLE network_sync.workflows IS 'Stores social media automation workflows and their execution history (namespaced)';
COMMENT ON COLUMN network_sync.workflows.schedule IS 'Cron schedule or time-based scheduling configuration';
COMMENT ON COLUMN network_sync.workflows.platforms IS 'Array of social media platforms this workflow applies to';
COMMENT ON COLUMN network_sync.workflows.config IS 'Workflow-specific configuration, including user ownership metadata';

COMMIT;
