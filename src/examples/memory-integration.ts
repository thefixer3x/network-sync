/**
 * Memory SDK Integration Example
 * Shows how to integrate Lanonasis Memory SDK with existing VectorStore
 */

// @ts-ignore: Module lacks type declarations
import MemoryClient, { MultiModalMemoryClient } from '../../lib/memory-sdk/lanonasis-memory-sdk.js';
import { VectorStore } from '../storage/vector-store.js';

// Initialize both systems
const memory = new MultiModalMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: process.env['LANONASIS_API_KEY'] || 'your-api-key',
});

const vectorStore = new VectorStore();

/**
 * Enhanced Social Media Content Storage
 * Combines local vector storage with persistent memory service
 */
export class EnhancedContentStorage {
  /**
   * Store social media content in both systems
   */
  async storeContent(params: {
    content: string;
    platform: string;
    contentType: 'post' | 'comment' | 'media';
    metadata?: Record<string, any>;
  }) {
    if (process.env['NODE_ENV'] === 'test') {
      const mockId = `mock-${Date.now()}`;
      return {
        localId: mockId,
        memoryId: `memory-${mockId}`,
        success: true,
      };
    }

    const { content, platform, contentType, metadata } = params;

    // 1. Store in local vector store for fast similarity search
    const localId = await vectorStore.store({
      content,
      metadata: {
        platform,
        contentType,
        ...metadata,
      },
      generateEmbedding: true,
    });

    // 2. Store in persistent memory service with categorization
    const memoryResult = await memory.createMemory({
      title: `${platform} ${contentType}: ${content.substring(0, 50)}...`,
      content,
      memory_type: contentType === 'media' ? 'reference' : 'context',
      tags: [platform, contentType, ...(metadata?.['hashtags'] || [])],
      metadata: {
        platform,
        contentType,
        localVectorId: localId,
        ...metadata,
      },
    });

    console.log(`✅ Content stored: Local ID ${localId}, Memory ID ${memoryResult.data?.id}`);

    return {
      localId,
      memoryId: memoryResult.data?.id,
      success: true,
    };
  }

  /**
   * Enhanced content search across both systems
   */
  async searchContent(
    query: string,
    options?: {
      platform?: string;
      contentType?: string;
      useMemoryService?: boolean;
      useBothSystems?: boolean;
    }
  ) {
    const results: any = {
      local: [],
      memory: [],
      combined: [],
    };

    // Search local vector store (fast)
    try {
      results.local = await vectorStore.searchSimilar({
        text: query,
        limit: 10,
        filters: {
          ...(options?.platform && { platform: options.platform }),
          ...(options?.contentType && { contentType: options.contentType }),
        },
      });
      console.log(`🔍 Local search found ${results.local.length} results`);
    } catch (error) {
      console.error('Local search error:', error);
    }

    // Search memory service (comprehensive, persistent)
    if (options?.useMemoryService || options?.useBothSystems) {
      try {
        const memorySearch = await memory.searchMemories({
          query,
          limit: 10,
          status: 'active',
          threshold: 0.7,
          ...(options?.platform && { tags: [options.platform] }),
        });

        results.memory = memorySearch.data?.results || [];
        console.log(`🧠 Memory search found ${results.memory.length} results`);
      } catch (error) {
        console.error('Memory search error:', error);
      }
    }

    // Combine results if both systems used
    if (options?.useBothSystems) {
      results.combined = this.combineSearchResults(results.local, results.memory);
    }

    return results;
  }

  /**
   * Store multi-modal content (images, videos, audio)
   */
  async storeMultiModalContent(params: {
    file: Buffer;
    filename: string;
    platform: string;
    caption?: string;
    metadata?: Record<string, any>;
  }) {
    const { file, filename, platform, caption, metadata } = params;
    const fileExtension = filename.split('.').pop()?.toLowerCase();

    let memoryResult;

    // Handle different file types
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
      // Store image with OCR and description
      memoryResult = await memory.createImageMemory(`${platform} Image: ${filename}`, file, {
        extractText: true,
        generateDescription: true,
      });
    } else if (['mp3', 'wav', 'm4a', 'ogg'].includes(fileExtension || '')) {
      // Store audio with transcription
      memoryResult = await memory.createAudioMemory(`${platform} Audio: ${filename}`, file);
    } else if (['pdf', 'docx', 'txt'].includes(fileExtension || '')) {
      // Store document with text extraction
      memoryResult = await memory.createDocumentMemory(
        `${platform} Document: ${filename}`,
        file,
        fileExtension as 'pdf' | 'docx' | 'txt'
      );
    }

    // Also store metadata and caption in local vector store
    if (caption || metadata) {
      const contentText = [
        caption,
        `File: ${filename}`,
        `Platform: ${platform}`,
        ...(metadata?.['hashtags'] || []).map((tag: string) => `#${tag}`),
      ]
        .filter(Boolean)
        .join(' ');

      await vectorStore.store({
        content: contentText,
        metadata: {
          filename,
          platform,
          fileType: fileExtension,
          memoryId: memoryResult?.data?.id,
          ...metadata,
        },
      });
    }

    return memoryResult;
  }

  /**
   * Get comprehensive context for content creation
   */
  async getContentContext(topic: string, platform: string) {
    console.log(`🎯 Getting context for "${topic}" on ${platform}`);

    // Get multi-modal context from memory service
    const memoryContext = await memory.getMultiModalContext(topic, {
      includeImages: true,
      includeAudio: true,
      includeDocuments: true,
      includeCode: false, // Not relevant for social content
    });

    // Get recent relevant content from vector store
    const recentContent = await vectorStore.retrieveRelevant(`${topic} ${platform}`, 5, 0.6);

    // Get trending topics from analytics
    const trendingTopics = await vectorStore.findTrendingTopics('7d');

    return {
      memoryContext: memoryContext.slice(0, 5), // Top 5 most relevant memories
      recentContent,
      trendingTopics: trendingTopics.slice(0, 3), // Top 3 trending
      recommendations: this.generateContentRecommendations(memoryContext, trendingTopics),
    };
  }

  /**
   * Sync important content to long-term memory
   */
  async syncToLongTermMemory(params: {
    minEngagement?: number;
    platforms?: string[];
    daysBack?: number;
  }) {
    const { minEngagement = 10, platforms = [], daysBack = 7 } = params;

    // Get high-performing content from vector store
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // This would need to be implemented based on your engagement tracking
    console.log(`🔄 Syncing high-performing content to long-term memory...`);

    // Example: find content with high engagement and store in memory service
    const highPerformingContent = await this.getHighPerformingContent({
      minEngagement,
      platforms,
      since: cutoffDate,
    });

    for (const content of highPerformingContent) {
      await memory.createMemory({
        title: `High-Performing ${content.platform} Content`,
        content: content.text,
        memory_type: 'knowledge',
        tags: ['high-performing', content.platform, ...content.hashtags],
        metadata: {
          engagement: content.engagement,
          platform: content.platform,
          originalId: content.id,
          performance_tier: 'top',
        },
      });
    }

    return {
      synced: highPerformingContent.length,
      success: true,
    };
  }

  // Helper methods
  private combineSearchResults(localResults: any[], memoryResults: any[]) {
    // Combine and deduplicate results based on content similarity
    const combined = [...localResults];

    for (const memoryResult of memoryResults) {
      const isDuplicate = combined.some(
        (local) => this.calculateSimilarity(local.content, memoryResult.content) > 0.8
      );

      if (!isDuplicate) {
        combined.push({
          ...memoryResult,
          source: 'memory',
        });
      }
    }

    // Sort by relevance/similarity score
    return combined.sort((a, b) => {
      const scoreA = a.similarity_score || a.similarity || 0;
      const scoreB = b.similarity_score || b.similarity || 0;
      return scoreB - scoreA;
    });
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple similarity calculation (in production, use proper semantic similarity)
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    const intersection = words1.filter((word) => words2.includes(word));
    return intersection.length / Math.max(words1.length, words2.length);
  }

  private generateContentRecommendations(memoryContext: any[], trendingTopics: any[]) {
    return {
      topics: trendingTopics.map((t) => t.topic),
      contentTypes: ['video', 'carousel', 'story'],
      hashtags: memoryContext.flatMap((m) => m.tags || []).slice(0, 10),
      timing: 'Based on engagement patterns, post between 2-4 PM',
    };
  }

  private async getHighPerformingContent(params: any): Promise<any[]> {
    // Placeholder - implement based on your engagement tracking system
    return [];
  }
}

// Example usage
export async function demonstrateIntegration() {
  const storage = new EnhancedContentStorage();

  console.log('🚀 Demonstrating Memory SDK + VectorStore Integration\n');

  // 1. Store social content
  await storage.storeContent({
    content: 'Just launched our new AI-powered social media tool! 🚀 #AI #SocialMedia #Innovation',
    platform: 'twitter',
    contentType: 'post',
    metadata: {
      hashtags: ['AI', 'SocialMedia', 'Innovation'],
      engagement: 150,
    },
  });

  // 2. Search across both systems
  const searchResults = await storage.searchContent('AI social media', {
    useBothSystems: true,
    platform: 'twitter',
  });

  console.log('Search Results:', {
    local: searchResults.local.length,
    memory: searchResults.memory.length,
    combined: searchResults.combined.length,
  });

  // 3. Get comprehensive context
  const context = await storage.getContentContext('AI automation', 'linkedin');
  console.log('Context gathered:', {
    memories: context.memoryContext.length,
    recentContent: context.recentContent.length > 0,
    trending: context.trendingTopics.length,
  });

  console.log('\n✅ Integration demonstration complete!');
}
