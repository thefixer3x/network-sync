import { AccountMetrics, CompetitorAnalysis, SocialPlatform } from '@/types';
export declare class AnalyticsCollector {
    private readonly logger;
    private readonly aiService;
    collectPlatformMetrics(platform: SocialPlatform): Promise<AccountMetrics | null>;
    analyzeCompetitor(competitorName: string, platform: SocialPlatform, handle: string): Promise<CompetitorAnalysis>;
    calculateGrowthRate(currentMetrics: AccountMetrics, previousMetrics: AccountMetrics): Promise<number>;
    generateAnalyticsReport(metrics: AccountMetrics[]): Promise<string>;
    private generateCompetitorInsights;
}
//# sourceMappingURL=AnalyticsCollector.d.ts.map