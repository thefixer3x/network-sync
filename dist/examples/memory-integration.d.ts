/**
 * Memory SDK Integration Example
 * Shows how to integrate Lanonasis Memory SDK with existing VectorStore
 */
/**
 * Enhanced Social Media Content Storage
 * Combines local vector storage with persistent memory service
 */
export declare class EnhancedContentStorage {
    /**
     * Store social media content in both systems
     */
    storeContent(params: {
        content: string;
        platform: string;
        contentType: 'post' | 'comment' | 'media';
        metadata?: Record<string, any>;
    }): Promise<{
        localId: string;
        memoryId: any;
        success: boolean;
    }>;
    /**
     * Enhanced content search across both systems
     */
    searchContent(query: string, options?: {
        platform?: string;
        contentType?: string;
        useMemoryService?: boolean;
        useBothSystems?: boolean;
    }): Promise<any>;
    /**
     * Store multi-modal content (images, videos, audio)
     */
    storeMultiModalContent(params: {
        file: Buffer;
        filename: string;
        platform: string;
        caption?: string;
        metadata?: Record<string, any>;
    }): Promise<any>;
    /**
     * Get comprehensive context for content creation
     */
    getContentContext(topic: string, platform: string): Promise<{
        memoryContext: any;
        recentContent: string;
        trendingTopics: {
            topic: string;
            count: number;
        }[];
        recommendations: {
            topics: any[];
            contentTypes: string[];
            hashtags: any[];
            timing: string;
        };
    }>;
    /**
     * Sync important content to long-term memory
     */
    syncToLongTermMemory(params: {
        minEngagement?: number;
        platforms?: string[];
        daysBack?: number;
    }): Promise<{
        synced: number;
        success: boolean;
    }>;
    private combineSearchResults;
    private calculateSimilarity;
    private generateContentRecommendations;
    private getHighPerformingContent;
}
export declare function demonstrateIntegration(): Promise<void>;
//# sourceMappingURL=memory-integration.d.ts.map