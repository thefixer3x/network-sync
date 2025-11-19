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
