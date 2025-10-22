import { Trend } from '@/types';
export declare class TrendAnalyzer {
    private readonly logger;
    private readonly aiService;
    getTrendingTopics(keywords: string[], industries?: string[]): Promise<Trend[]>;
    analyzeTrendRelevance(trends: Trend[], context: string): Promise<Trend[]>;
    getRelatedKeywords(topic: string): Promise<string[]>;
    private getGoogleTrends;
    private getTwitterTrends;
    private getIndustryTrends;
    private volumeToNumber;
}
//# sourceMappingURL=TrendAnalyzer.d.ts.map