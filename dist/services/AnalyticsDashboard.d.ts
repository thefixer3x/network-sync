import { SocialPlatform } from '@/types';
export interface DashboardWidget {
    id: string;
    title: string;
    type: 'metric' | 'chart' | 'table' | 'list' | 'gauge';
    data: any;
    config: {
        size: 'small' | 'medium' | 'large';
        refreshInterval?: number;
        chartType?: 'line' | 'bar' | 'pie' | 'area' | 'donut';
        color?: string;
        target?: number;
    };
    lastUpdated: Date;
}
export interface DashboardReport {
    id: string;
    title: string;
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    dateRange: {
        start: Date;
        end: Date;
    };
    platforms: SocialPlatform[];
    sections: {
        executive_summary: string;
        performance_metrics: any;
        content_analysis: any;
        competitor_insights: any;
        recommendations: string[];
        growth_opportunities: string[];
    };
    generatedAt: Date;
    charts: {
        engagement_trends: any[];
        follower_growth: any[];
        content_performance: any[];
        platform_comparison: any[];
    };
}
export interface AnalyticsFilter {
    platforms?: SocialPlatform[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    contentTypes?: string[];
    metrics?: string[];
}
export declare class AnalyticsDashboard {
    private logger;
    private supabase;
    private aiService;
    private widgets;
    private refreshIntervals;
    constructor();
    private initializeDefaultWidgets;
    addWidget(widget: Omit<DashboardWidget, 'id' | 'lastUpdated'>): string;
    refreshWidget(widgetId: string): Promise<void>;
    private getTotalFollowersData;
    private getEngagementRateData;
    private getWeeklyGrowthData;
    private getTopPerformingPostsData;
    private getPlatformPerformanceData;
    generateReport(type: 'daily' | 'weekly' | 'monthly', platforms?: SocialPlatform[]): Promise<DashboardReport>;
    private getPerformanceMetrics;
    private calculateGrowthRate;
    private getContentAnalysis;
    private getCompetitorInsights;
    private generateCharts;
    private getEngagementTrendsChart;
    private getFollowerGrowthChart;
    private getContentPerformanceChart;
    private getPlatformComparisonChart;
    private generateExecutiveSummary;
    private generateRecommendations;
    private identifyGrowthOpportunities;
    getWidgets(): Promise<DashboardWidget[]>;
    refreshAllWidgets(): Promise<void>;
    removeWidget(widgetId: string): boolean;
    destroy(): void;
}
//# sourceMappingURL=AnalyticsDashboard.d.ts.map