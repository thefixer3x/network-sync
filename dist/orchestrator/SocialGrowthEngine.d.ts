import { EngagementRule } from '../services/EngagementAutomator';
import { WorkflowRequest } from './workflow-engine';
import { SocialPlatform } from '../types/typescript-types';
export interface SocialGrowthConfig {
    platforms: SocialPlatform[];
    goals: {
        follower_growth_rate: number;
        engagement_rate_target: number;
        content_frequency: number;
        automation_level: 'conservative' | 'moderate' | 'aggressive';
    };
    automation: {
        auto_engagement: boolean;
        auto_posting: boolean;
        competitor_monitoring: boolean;
        hashtag_optimization: boolean;
        analytics_reporting: boolean;
    };
    engagement_rules: Partial<EngagementRule>[];
    competitors: {
        name: string;
        handles: Record<SocialPlatform, string>;
        industry: string;
    }[];
    content_strategy: {
        topics: string[];
        brand_voice: string;
        target_audience: string;
        content_pillars: string[];
    };
}
export declare class SocialGrowthEngine {
    private logger;
    private automationEngine;
    private engagementAutomator;
    private hashtagResearcher;
    private competitorMonitor;
    private analyticsDashboard;
    private workflowEngine;
    private isRunning;
    private config;
    private scheduledTasks;
    constructor();
    /**
     * Initialize and start the complete social growth automation system
     */
    initialize(config: SocialGrowthConfig): Promise<void>;
    private setupEngagementAutomation;
    private setupCompetitorMonitoring;
    private setupAnalyticsReporting;
    private setupHashtagOptimization;
    private executeEngagementCycle;
    private getMaxActionsForLevel;
    private optimizeHashtagStrategy;
    private generateWeeklyReport;
    private generateMonthlyReport;
    /**
     * Generate comprehensive growth strategy using workflow engine
     */
    generateGrowthStrategy(): Promise<void>;
    /**
     * Execute a custom workflow (research, content creation, etc.)
     */
    executeWorkflow(request: WorkflowRequest): Promise<any>;
    /**
     * Get current system status
     */
    getStatus(): Promise<any>;
    /**
     * Pause all automation
     */
    pause(): Promise<void>;
    /**
     * Resume all automation
     */
    resume(): Promise<void>;
    /**
     * Stop and cleanup all resources
     */
    stop(): Promise<void>;
    /**
     * Generate a one-time content campaign
     */
    createContentCampaign(topic: string, platforms: SocialPlatform[], postCount?: number): Promise<any>;
    /**
     * Analyze competitors manually
     */
    analyzeCompetitors(): Promise<any>;
    /**
     * Get alerts and recommendations
     */
    getAlertsAndRecommendations(): Promise<any>;
}
//# sourceMappingURL=SocialGrowthEngine.d.ts.map