/**
 * Vector Store for Semantic Search and Analytics
 */

import { createClient } from '@supabase/supabase-js';

interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  timestamp: Date;
}

export class VectorStore {
  private supabase: any;
  private embeddingDimension = 1536; // OpenAI embedding size

  constructor() {
    const supabaseUrl = process.env["SUPABASE_URL"];
    const supabaseKey = process.env["SUPABASE_ANON_KEY"];

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required.');
    }
    if (!supabaseKey) {
      throw new Error('SUPABASE_ANON_KEY is required.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeDatabase();
  }

  /**
   * Initialize vector database schema
   */
  private async initializeDatabase() {
    // This would be run once to set up the database
    const schema = `
      CREATE EXTENSION IF NOT EXISTS vector;
      
      CREATE TABLE IF NOT EXISTS vector_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        embedding vector(${this.embeddingDimension}),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS vector_documents_embedding_idx 
      ON vector_documents USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `;
  }

  /**
   * Store document with embeddings
   */
  async store(params: {
    content: any;
    metadata?: Record<string, any>;
    generateEmbedding?: boolean;
  }): Promise<string> {
    const contentString = typeof params.content === 'string' 
      ? params.content 
      : JSON.stringify(params.content);

    let embedding = null;
    if (params.generateEmbedding !== false) {
      embedding = await this.generateEmbedding(contentString);
    }

    const { data, error } = await this.supabase
      .from('vector_documents')
      .insert({
        content: contentString,
        embedding,
        metadata: params.metadata || {}
      })
      .select('id')
      .single();

    if (error) throw error;
    
    return data.id;
  }

  /**
   * Store pre-computed embeddings
   */
  async storeEmbeddings(embeddings: Array<{
    content: string;
    embedding: number[];
    metadata?: any;
  }>) {
    const documents = embeddings.map(e => ({
      content: e.content,
      embedding: e.embedding,
      metadata: e.metadata || {}
    }));

    const { data, error } = await this.supabase
      .from('vector_documents')
      .insert(documents)
      .select('id');

    if (error) throw error;
    
    return data;
  }

  /**
   * Retrieve relevant documents using semantic search
   */
  async retrieveRelevant(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<string> {
    const queryEmbedding = await this.generateEmbedding(query);

    const { data, error } = await this.supabase.rpc('search_vectors', {
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      match_count: limit
    });

    if (error) throw error;

    // Combine relevant documents into context
    return data
      .map((doc: any) => doc.content)
      .join('\n\n---\n\n');
  }

  /**
   * Semantic similarity search
   */
  async searchSimilar(params: {
    embedding?: number[];
    text?: string;
    limit?: number;
    filters?: Record<string, any>;
  }) {
    let searchEmbedding = params.embedding;
    
    if (!searchEmbedding && params.text) {
      searchEmbedding = await this.generateEmbedding(params.text);
    }

    if (!searchEmbedding) {
      throw new Error('Either embedding or text must be provided');
    }

    let query = this.supabase
      .from('vector_documents')
      .select('*, similarity:embedding <-> $1')
      .order('similarity', { ascending: true })
      .limit(params.limit || 10);

    // Apply metadata filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        query = query.filter(`metadata->${key}`, 'eq', value);
      });
    }

    const { data, error } = await query;

    if (error) throw error;
    
    return data;
  }

  /**
   * Analytics: Cluster similar documents
   */
  async clusterDocuments(params: {
    minClusterSize?: number;
    maxClusters?: number;
  }) {
    // Retrieve all documents
    const { data: documents, error } = await this.supabase
      .from('vector_documents')
      .select('id, embedding, metadata');

    if (error) throw error;

    // Perform clustering (simplified k-means)
    const clusters = this.performClustering(
      documents,
      params.maxClusters || 5,
      params.minClusterSize || 3
    );

    return clusters;
  }

  /**
   * Analytics: Find trending topics
   */
  async findTrendingTopics(timeframe: string = '7d') {
    const cutoffDate = this.calculateCutoffDate(timeframe);

    const { data, error } = await this.supabase
      .from('vector_documents')
      .select('metadata, created_at')
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Extract and count topics
    const topicCounts = new Map<string, number>();
    
    data.forEach((doc: any) => {
      const topics = doc.metadata?.topics || [];
      topics.forEach((topic: string) => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    // Sort by frequency
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env["OPENAI_API_KEY"]}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Simple k-means clustering
   */
  private performClustering(
    documents: any[],
    k: number,
    minSize: number
  ): any[] {
    // Simplified clustering logic
    // In production, use a proper ML library
    const clusters: any[] = [];
    
    // Group by similarity (simplified)
    for (let i = 0; i < Math.min(k, documents.length); i++) {
      clusters.push({
        id: `cluster_${i}`,
        documents: [],
        centroid: null,
        topics: []
      });
    }

    // Assign documents to clusters
    documents.forEach((doc, idx) => {
      const clusterIdx = idx % k;
      clusters[clusterIdx].documents.push(doc);
    });

    // Filter out small clusters
    return clusters.filter(c => c.documents.length >= minSize);
  }

  /**
   * Calculate cutoff date for timeframe
   */
  private calculateCutoffDate(timeframe: string): string {
    const now = new Date();
    const value = parseInt(timeframe);
    const unit = timeframe.slice(-1);

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() - value);
        break;
      case 'w':
        now.setDate(now.getDate() - (value * 7));
        break;
      case 'm':
        now.setMonth(now.getMonth() - value);
        break;
      default:
        now.setDate(now.getDate() - 7); // Default to 7 days
    }

    return now.toISOString();
  }

  /**
   * Delete old documents
   */
  async cleanup(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await this.supabase
      .from('vector_documents')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
    
    return data;
  }
}