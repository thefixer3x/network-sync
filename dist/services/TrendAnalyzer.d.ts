import { SocialPlatform, TrendData } from '../types/typescript-types';
export declare class TrendAnalyzer {
    private logger;
    analyzeTrends(platform: SocialPlatform, timeframe?: string): Promise<TrendData[]>;
    getTopTrends(platform: SocialPlatform, limit?: number): Promise<TrendData[]>;
    getTrendingSentiment(keyword: string, platform: SocialPlatform): Promise<number>;
    getTrendingTopics(keywords: string[], limit?: number): Promise<TrendData[]>;
}
//# sourceMappingURL=TrendAnalyzer.d.ts.map