import { SocialPlatform } from '../types/typescript-types';
export interface HashtagAnalysis {
    hashtag: string;
    platform: SocialPlatform;
    volume: number;
    trendingScore: number;
    difficultyScore: number;
    engagementRate: number;
    relatedHashtags: string[];
    topPosts: {
        id: string;
        content: string;
        engagement: number;
        author: string;
    }[];
    demographics: {
        topCountries?: string[];
        ageGroups?: string[];
        interests?: string[];
    };
    bestPostingTimes: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    seasonality?: {
        trend: 'rising' | 'falling' | 'stable';
        peakTimes?: string[];
    };
    analyzedAt: Date;
}
export interface HashtagStrategy {
    primary: string[];
    secondary: string[];
    long_tail: string[];
    branded: string[];
    trending: string[];
    community: string[];
    optimal_count: number;
    platform_specific_tips: string[];
}
export interface HashtagResearchRequest {
    topic: string;
    platform: SocialPlatform;
    industry?: string;
    targetAudience?: string;
    contentType?: 'educational' | 'promotional' | 'entertaining' | 'news';
    competitorHashtags?: string[];
    desiredDifficulty?: 'easy' | 'medium' | 'hard';
}
export declare class HashtagResearcher {
    private logger;
    private aiService;
    private cache;
    private cacheExpiry;
    researchHashtags(request: HashtagResearchRequest): Promise<HashtagStrategy>;
    private getTrendingHashtags;
    private getTwitterTrendingHashtags;
    private getInstagramTrendingHashtags;
    private getGenericTrendingHashtags;
    private generateAIHashtags;
    private analyzeCompetitorHashtags;
    private getRelatedHashtags;
    analyzeHashtag(hashtag: string, platform: SocialPlatform): Promise<HashtagAnalysis>;
    private getHashtagMetrics;
    private getTwitterHashtagMetrics;
    private getInstagramHashtagMetrics;
    private getEstimatedMetrics;
    private getTopPostsForHashtag;
    private calculateTrendingScore;
    private calculateDifficultyScore;
    private getBestPostingTimes;
    private determineTrend;
    private getPeakTimes;
    private categorizeHashtags;
    private generateBrandedHashtags;
    private getCommunityHashtags;
    private getPlatformTips;
    getHashtagPerformanceReport(hashtags: string[], platform: SocialPlatform): Promise<any>;
    private generateHashtagRecommendations;
    clearCache(): void;
}
//# sourceMappingURL=HashtagResearcher.d.ts.map