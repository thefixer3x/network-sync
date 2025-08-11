import { SocialPlatform, AccountMetrics, Content } from '../types/typescript-types';
export declare class AnalyticsCollector {
    private logger;
    collectMetrics(platform: SocialPlatform, accountId: string): Promise<AccountMetrics>;
    collectContentMetrics(content: Content, platform: SocialPlatform): Promise<any>;
    getEngagementTrends(platform: SocialPlatform, days?: number): Promise<any[]>;
    analyzeCompetitor(competitorId: string, platform: SocialPlatform): Promise<any>;
    generateReport(platform: SocialPlatform, period?: string): Promise<any>;
}
//# sourceMappingURL=AnalyticsCollector.d.ts.map