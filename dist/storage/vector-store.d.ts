/**
 * Vector Store for Semantic Search and Analytics
 */
export declare class VectorStore {
    private supabase;
    private embeddingDimension;
    constructor();
    /**
     * Initialize vector database schema
     */
    private initializeDatabase;
    /**
     * Store document with embeddings
     */
    store(params: {
        content: any;
        metadata?: Record<string, any>;
        generateEmbedding?: boolean;
    }): Promise<string>;
    /**
     * Store pre-computed embeddings
     */
    storeEmbeddings(embeddings: Array<{
        content: string;
        embedding: number[];
        metadata?: any;
    }>): Promise<any>;
    /**
     * Retrieve relevant documents using semantic search
     */
    retrieveRelevant(query: string, limit?: number, threshold?: number): Promise<string>;
    /**
     * Semantic similarity search
     */
    searchSimilar(params: {
        embedding?: number[];
        text?: string;
        limit?: number;
        filters?: Record<string, any>;
    }): Promise<any>;
    /**
     * Analytics: Cluster similar documents
     */
    clusterDocuments(params: {
        minClusterSize?: number;
        maxClusters?: number;
    }): Promise<any[]>;
    /**
     * Analytics: Find trending topics
     */
    findTrendingTopics(timeframe?: string): Promise<{
        topic: string;
        count: number;
    }[]>;
    /**
     * Generate embedding using OpenAI
     */
    private generateEmbedding;
    /**
     * Simple k-means clustering
     */
    private performClustering;
    /**
     * Calculate cutoff date for timeframe
     */
    private calculateCutoffDate;
    /**
     * Delete old documents
     */
    cleanup(olderThanDays?: number): Promise<any>;
}
//# sourceMappingURL=vector-store.d.ts.map