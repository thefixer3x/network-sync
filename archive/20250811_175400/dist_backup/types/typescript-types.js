// types/index.ts
import { z } from 'zod';
// Zod Schemas for Runtime Validation
export const SocialPlatformSchema = z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok']);
export const ContentStatusSchema = z.enum(['draft', 'scheduled', 'published', 'failed', 'archived']);
// Content Schema
export const ContentSchema = z.object({
    id: z.string().uuid(),
    content: z.string().min(1).max(4000),
    platform: SocialPlatformSchema,
    status: ContentStatusSchema,
    scheduledTime: z.date().optional(),
    publishedTime: z.date().optional(),
    hashtags: z.array(z.string()).default([]),
    mentions: z.array(z.string()).default([]),
    mediaUrls: z.array(z.string().url()).default([]),
    metrics: z.object({
        views: z.number().default(0),
        likes: z.number().default(0),
        shares: z.number().default(0),
        comments: z.number().default(0),
        clicks: z.number().default(0),
        engagementRate: z.number().default(0),
    }).optional(),
    aiGenerated: z.boolean().default(false),
    originalTopic: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
// Trend Analysis Schema
export const TrendSchema = z.object({
    id: z.string().uuid(),
    topic: z.string(),
    platform: SocialPlatformSchema,
    volume: z.number(),
    sentimentScore: z.number().min(-1).max(1),
    relevanceScore: z.number().min(0).max(1),
    keywords: z.array(z.string()),
    discoveredAt: z.date(),
    expiresAt: z.date().optional(),
    sourceUrls: z.array(z.string().url()).default([]),
});
// Account Metrics Schema
export const AccountMetricsSchema = z.object({
    id: z.string().uuid(),
    platform: SocialPlatformSchema,
    followersCount: z.number(),
    followingCount: z.number(),
    postsCount: z.number(),
    engagementRate: z.number(),
    growthRate: z.number(),
    averageLikes: z.number(),
    averageComments: z.number(),
    averageShares: z.number(),
    topPerformingContent: z.array(z.string()).default([]),
    recordedAt: z.date(),
});
// Competitor Analysis Schema
export const CompetitorAnalysisSchema = z.object({
    id: z.string().uuid(),
    competitorName: z.string(),
    platform: SocialPlatformSchema,
    handle: z.string(),
    content: z.string(),
    engagementRate: z.number(),
    postTime: z.date(),
    hashtags: z.array(z.string()),
    contentType: z.enum(['text', 'image', 'video', 'carousel']),
    metrics: z.object({
        likes: z.number(),
        comments: z.number(),
        shares: z.number(),
        views: z.number().optional(),
    }),
    insights: z.string().optional(),
    analyzedAt: z.date(),
});
// Automation Configuration Schema
export const AutomationConfigSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    enabled: z.boolean().default(true),
    platforms: z.array(SocialPlatformSchema),
    postingSchedule: z.object({
        timezone: z.string().default('America/New_York'),
        daysOfWeek: z.array(z.number().min(0).max(6)),
        timesOfDay: z.array(z.string().regex(/^\d{2}:\d{2}$/)), // HH:MM format
    }),
    contentRules: z.object({
        minCharacters: z.number().default(10),
        maxCharacters: z.number().default(280),
        requiredHashtags: z.number().default(1),
        maxHashtags: z.number().default(5),
        aiEnhancementEnabled: z.boolean().default(true),
        duplicateContentCheck: z.boolean().default(true),
    }),
    trendMonitoring: z.object({
        enabled: z.boolean().default(true),
        keywords: z.array(z.string()),
        industries: z.array(z.string()),
        locations: z.array(z.string()).default([]),
        minimumVolume: z.number().default(100),
    }),
    competitorTracking: z.object({
        enabled: z.boolean().default(true),
        competitors: z.array(z.object({
            name: z.string(),
            handles: z.record(SocialPlatformSchema, z.string()),
        })),
    }),
    createdAt: z.date(),
    updatedAt: z.date(),
});
// Webhook & Event Types
export const WebhookEventSchema = z.object({
    id: z.string().uuid(),
    type: z.enum(['post_published', 'post_failed', 'metric_updated', 'trend_detected']),
    platform: SocialPlatformSchema.optional(),
    data: z.record(z.any()),
    timestamp: z.date(),
});
// Error Types
export class SocialMediaError extends Error {
    constructor(message, platform, code, retryable = false) {
        super(message);
        this.platform = platform;
        this.code = code;
        this.retryable = retryable;
        this.name = 'SocialMediaError';
    }
}
export class RateLimitError extends SocialMediaError {
    constructor(platform, resetTime, message = 'Rate limit exceeded') {
        super(message, platform, 'RATE_LIMIT', true);
        this.resetTime = resetTime;
        this.name = 'RateLimitError';
    }
}
export class AuthenticationError extends SocialMediaError {
    constructor(platform, message = 'Authentication failed') {
        super(message, platform, 'AUTH_ERROR', false);
        this.name = 'AuthenticationError';
    }
}
// Export all schemas for validation
export const schemas = {
    Content: ContentSchema,
    Trend: TrendSchema,
    AccountMetrics: AccountMetricsSchema,
    CompetitorAnalysis: CompetitorAnalysisSchema,
    AutomationConfig: AutomationConfigSchema,
    WebhookEvent: WebhookEventSchema,
};
//# sourceMappingURL=typescript-types.js.map