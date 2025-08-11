import { SocialPlatform } from '../types/typescript-types';
export interface CompetitorProfile {
    id: string;
    name: string;
    handles: Record<SocialPlatform, string>;
    industry: string;
    size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    monitoringEnabled: boolean;
    trackingMetrics: string[];
    alertThresholds: {
        followerGrowth?: number;
        engagementIncrease?: number;
        viralPostThreshold?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface CompetitorAlert {
    id: string;
    competitorId: string;
    competitorName: string;
    platform: SocialPlatform;
    alertType: 'follower_spike' | 'viral_post' | 'engagement_surge' | 'new_campaign' | 'hashtag_trending';
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    data: any;
    actionRecommended: string;
    createdAt: Date;
}
export interface CompetitorInsight {
    competitorName: string;
    platform: SocialPlatform;
    insights: {
        postingFrequency: {
            daily: number;
            weekly: number;
            optimalTimes: string[];
        };
        contentStrategy: {
            types: string[];
            themes: string[];
            averageLength: number;
            hashtagUsage: number;
        };
        engagement: {
            averageRate: number;
            topPerformingTypes: string[];
            audienceResponse: string[];
        };
        growth: {
            followerGrowthRate: number;
            engagementTrend: 'rising' | 'falling' | 'stable';
            contentVelocity: number;
        };
    };
    recommendations: string[];
    opportunities: string[];
    threats: string[];
    analyzedAt: Date;
}
export declare class CompetitorMonitor {
    private logger;
    private aiService;
    private hashtagResearcher;
    private competitors;
    private monitoringInterval;
    private alertQueue;
    constructor();
    private loadCompetitors;
    addCompetitor(competitor: Omit<CompetitorProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
    startMonitoring(intervalMinutes?: number): Promise<void>;
    stopMonitoring(): Promise<void>;
    private analyzeAllCompetitors;
    private analyzeCompetitor;
    private analyzePlatform;
    private analyzeTwitterCompetitor;
    private analyzeTweetData;
    private extractThemes;
    private estimateGrowthRate;
    private analyzeLinkedInCompetitor;
    private analyzeInstagramCompetitor;
    private generateRecommendations;
    private identifyOpportunities;
    private identifyThreats;
    private generateAlerts;
    private processAlerts;
    getCompetitorReport(competitorId: string): Promise<any>;
    getAlerts(severity?: 'low' | 'medium' | 'high'): Promise<CompetitorAlert[]>;
    getCompetitors(): Promise<CompetitorProfile[]>;
    removeCompetitor(competitorId: string): Promise<boolean>;
}
//# sourceMappingURL=CompetitorMonitor.d.ts.map