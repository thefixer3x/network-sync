import { SocialPlatform } from '../types/typescript-types';
export interface EngagementRule {
    id: string;
    platform: SocialPlatform;
    type: 'auto_reply' | 'auto_like' | 'auto_retweet' | 'auto_follow' | 'mention_response';
    enabled: boolean;
    conditions: {
        keywords?: string[];
        hashtags?: string[];
        mentions?: string[];
        followerCountMin?: number;
        followerCountMax?: number;
        excludeVerified?: boolean;
        minEngagement?: number;
        timeWindow?: number;
    };
    actions: {
        reply?: boolean;
        like?: boolean;
        retweet?: boolean;
        follow?: boolean;
        customMessage?: string;
    };
    limits: {
        maxActionsPerHour?: number;
        maxActionsPerDay?: number;
        cooldownMinutes?: number;
    };
    aiGenerated?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface EngagementOpportunity {
    id: string;
    platform: SocialPlatform;
    postId: string;
    authorHandle: string;
    authorId: string;
    content: string;
    metrics: {
        likes: number;
        comments: number;
        shares: number;
        views?: number;
    };
    relevanceScore: number;
    engagementScore: number;
    authorMetrics: {
        followers: number;
        verified: boolean;
        engagementRate: number;
    };
    matchedRules: string[];
    recommendedActions: ('reply' | 'like' | 'retweet' | 'follow')[];
    discoveredAt: Date;
    actedAt?: Date;
}
export declare class EngagementAutomator {
    private logger;
    private aiService;
    private socialServices;
    private activeRules;
    private actionLog;
    private dailyActionCounts;
    constructor();
    private getServiceConfig;
    private initializeSocialServices;
    private resolvePlatformCredentials;
    addEngagementRule(rule: Omit<EngagementRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<EngagementRule>;
    findEngagementOpportunities(platform: SocialPlatform): Promise<EngagementOpportunity[]>;
    private findTwitterOpportunities;
    private findLinkedInOpportunities;
    private matchesRuleConditions;
    private calculateRelevanceScore;
    private calculateEngagementScore;
    private calculateAuthorEngagementRate;
    private getRecommendedActions;
    executeEngagementAction(opportunity: EngagementOpportunity, action: 'reply' | 'like' | 'retweet' | 'follow'): Promise<boolean>;
    private performLike;
    private performReply;
    private performRetweet;
    private performFollow;
    private generateReply;
    private canPerformAction;
    private recordAction;
    getEngagementStats(platform?: SocialPlatform): Promise<Record<string, any>>;
    cleanupOldData(): Promise<void>;
}
//# sourceMappingURL=EngagementAutomator.d.ts.map