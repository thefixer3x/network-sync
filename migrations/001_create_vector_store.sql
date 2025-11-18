-- Migration: Create Vector Store Tables and Indexes
-- Description: Sets up pgvector extension and vector_documents table for semantic search
-- Date: 2025-11-15

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector documents table
CREATE TABLE IF NOT EXISTS vector_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
-- Using IVFFlat index for efficient approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS vector_documents_embedding_idx
  ON vector_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index on created_at for cleanup queries
CREATE INDEX IF NOT EXISTS vector_documents_created_at_idx
  ON vector_documents (created_at DESC);

-- Create index on metadata for filtering
CREATE INDEX IF NOT EXISTS vector_documents_metadata_idx
  ON vector_documents USING GIN (metadata);

-- Create RPC function for vector search
-- This function is called by VectorStore.retrieveRelevant()
CREATE OR REPLACE FUNCTION search_vectors(
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vector_documents.id,
    vector_documents.content,
    vector_documents.metadata,
    1 - (vector_documents.embedding <=> query_embedding) as similarity,
    vector_documents.created_at
  FROM vector_documents
  WHERE 1 - (vector_documents.embedding <=> query_embedding) > similarity_threshold
  ORDER BY vector_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_vector_documents_updated_at
  BEFORE UPDATE ON vector_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust based on your role setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON vector_documents TO authenticated;
-- GRANT EXECUTE ON FUNCTION search_vectors TO authenticated;

COMMENT ON TABLE vector_documents IS 'Stores document embeddings for semantic search and analytics';
COMMENT ON COLUMN vector_documents.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
COMMENT ON FUNCTION search_vectors IS 'Search for similar documents using cosine similarity';
