import { AIService, SocialPlatform } from '@/types';
export declare class OpenAIService implements AIService {
    private client;
    private logger;
    constructor();
    generateContent(prompt: string, context?: any): Promise<string>;
    enhanceContent(content: string, platform: SocialPlatform): Promise<string>;
    analyzeTrends(trends: string[]): Promise<any[]>;
    optimizeForPlatform(content: string, platform: SocialPlatform): Promise<string>;
    private getPlatformSpecifications;
}
interface OptimizedContent {
    text: string;
    hashtags: string[];
    mentions: string[];
    characterCount: number;
    readabilityScore: number;
    sentimentScore: number;
}
export declare class ContentOptimizer {
    private logger;
    private aiService;
    optimizeForPlatform(content: string, platform: SocialPlatform): Promise<OptimizedContent>;
    private extractHashtags;
    private extractMentions;
    private calculateReadabilityScore;
    private countSyllables;
    private calculateSentimentScore;
    private validatePlatformConstraints;
    generateHashtagSuggestions(content: string, platform: SocialPlatform, count?: number): Promise<string[]>;
    optimizePostingTime(content: string, platform: SocialPlatform, timezone?: string): Promise<Date[]>;
}
import { Trend } from '@/types';
export declare class TrendAnalyzer {
    private logger;
    private aiService;
    getTrendingTopics(keywords: string[], industries?: string[]): Promise<Trend[]>;
    private getGoogleTrends;
    private getTwitterTrends;
    private getIndustryTrends;
    private volumeToNumber;
    analyzeTrendRelevance(trends: Trend[], context: string): Promise<Trend[]>;
    getRelatedKeywords(topic: string): Promise<string[]>;
}
import { AccountMetrics, CompetitorAnalysis } from '@/types';
export declare class AnalyticsCollector {
    private logger;
    private aiService;
    collectPlatformMetrics(platform: SocialPlatform): Promise<AccountMetrics | null>;
    analyzeCompetitor(competitorName: string, platform: SocialPlatform, handle: string): Promise<CompetitorAnalysis>;
    private generateCompetitorInsights;
    calculateGrowthRate(currentMetrics: AccountMetrics, previousMetrics: AccountMetrics): Promise<number>;
    generateAnalyticsReport(metrics: AccountMetrics[]): Promise<string>;
}
export {};
//# sourceMappingURL=ai-content-services.d.ts.map