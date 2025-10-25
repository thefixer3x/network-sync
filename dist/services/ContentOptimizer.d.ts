import { SocialPlatform } from '@/types';
export interface OptimizedContent {
    text: string;
    hashtags: string[];
    mentions: string[];
    characterCount: number;
    readabilityScore: number;
    sentimentScore: number;
}
export declare class ContentOptimizer {
    private readonly logger;
    private readonly aiService;
    optimizeForPlatform(content: string, platform: SocialPlatform): Promise<OptimizedContent>;
    generateHashtagSuggestions(content: string, platform: SocialPlatform, count?: number): Promise<string[]>;
    optimizePostingTime(_content: string, platform: SocialPlatform, timezone?: string): Promise<Date[]>;
    private extractHashtags;
    private extractMentions;
    private calculateReadabilityScore;
    private countSyllables;
    private calculateSentimentScore;
    private validatePlatformConstraints;
}
//# sourceMappingURL=ContentOptimizer.d.ts.map