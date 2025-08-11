import { z } from 'zod';
export type SocialPlatform = 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok';
export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'archived';
export type PostType = 'text' | 'image' | 'video' | 'carousel' | 'story' | 'reel';
export declare const SocialPlatformSchema: z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>;
export declare const ContentStatusSchema: z.ZodEnum<["draft", "scheduled", "published", "failed", "archived"]>;
export declare const ContentSchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    platform: z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>;
    status: z.ZodEnum<["draft", "scheduled", "published", "failed", "archived"]>;
    scheduledTime: z.ZodOptional<z.ZodDate>;
    publishedTime: z.ZodOptional<z.ZodDate>;
    hashtags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    mentions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    mediaUrls: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metrics: z.ZodOptional<z.ZodObject<{
        views: z.ZodDefault<z.ZodNumber>;
        likes: z.ZodDefault<z.ZodNumber>;
        shares: z.ZodDefault<z.ZodNumber>;
        comments: z.ZodDefault<z.ZodNumber>;
        clicks: z.ZodDefault<z.ZodNumber>;
        engagementRate: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        views: number;
        likes: number;
        shares: number;
        comments: number;
        clicks: number;
        engagementRate: number;
    }, {
        views?: number | undefined;
        likes?: number | undefined;
        shares?: number | undefined;
        comments?: number | undefined;
        clicks?: number | undefined;
        engagementRate?: number | undefined;
    }>>;
    aiGenerated: z.ZodDefault<z.ZodBoolean>;
    originalTopic: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    content: string;
    platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
    status: "draft" | "scheduled" | "published" | "failed" | "archived";
    hashtags: string[];
    mentions: string[];
    mediaUrls: string[];
    aiGenerated: boolean;
    createdAt: Date;
    updatedAt: Date;
    scheduledTime?: Date | undefined;
    publishedTime?: Date | undefined;
    metrics?: {
        views: number;
        likes: number;
        shares: number;
        comments: number;
        clicks: number;
        engagementRate: number;
    } | undefined;
    originalTopic?: string | undefined;
}, {
    id: string;
    content: string;
    platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
    status: "draft" | "scheduled" | "published" | "failed" | "archived";
    createdAt: Date;
    updatedAt: Date;
    scheduledTime?: Date | undefined;
    publishedTime?: Date | undefined;
    hashtags?: string[] | undefined;
    mentions?: string[] | undefined;
    mediaUrls?: string[] | undefined;
    metrics?: {
        views?: number | undefined;
        likes?: number | undefined;
        shares?: number | undefined;
        comments?: number | undefined;
        clicks?: number | undefined;
        engagementRate?: number | undefined;
    } | undefined;
    aiGenerated?: boolean | undefined;
    originalTopic?: string | undefined;
}>;
export type Content = z.infer<typeof ContentSchema>;
export declare const TrendSchema: z.ZodObject<{
    id: z.ZodString;
    topic: z.ZodString;
    platform: z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>;
    volume: z.ZodNumber;
    sentimentScore: z.ZodNumber;
    relevanceScore: z.ZodNumber;
    keywords: z.ZodArray<z.ZodString, "many">;
    discoveredAt: z.ZodDate;
    expiresAt: z.ZodOptional<z.ZodDate>;
    sourceUrls: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    topic: string;
    platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
    volume: number;
    sentimentScore: number;
    relevanceScore: number;
    keywords: string[];
    discoveredAt: Date;
    sourceUrls: string[];
    expiresAt?: Date | undefined;
}, {
    id: string;
    topic: string;
    platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
    volume: number;
    sentimentScore: number;
    relevanceScore: number;
    keywords: string[];
    discoveredAt: Date;
    expiresAt?: Date | undefined;
    sourceUrls?: string[] | undefined;
}>;
export type Trend = z.infer<typeof TrendSchema>;
export type TrendData = Trend;
export declare const AccountMetricsSchema: z.ZodObject<{
    id: z.ZodString;
    platform: z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>;
    followersCount: z.ZodNumber;
    followingCount: z.ZodNumber;
    postsCount: z.ZodNumber;
    engagementRate: z.ZodNumber;
    growthRate: z.ZodNumber;
    averageLikes: z.ZodNumber;
    averageComments: z.ZodNumber;
    averageShares: z.ZodNumber;
    topPerformingContent: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    recordedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
    engagementRate: number;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    growthRate: number;
    averageLikes: number;
    averageComments: number;
    averageShares: number;
    topPerformingContent: string[];
    recordedAt: Date;
}, {
    id: string;
    platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
    engagementRate: number;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    growthRate: number;
    averageLikes: number;
    averageComments: number;
    averageShares: number;
    recordedAt: Date;
    topPerformingContent?: string[] | undefined;
}>;
export type AccountMetrics = z.infer<typeof AccountMetricsSchema>;
export declare const CompetitorAnalysisSchema: z.ZodObject<{
    id: z.ZodString;
    competitorName: z.ZodString;
    platform: z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>;
    handle: z.ZodString;
    content: z.ZodString;
    engagementRate: z.ZodNumber;
    postTime: z.ZodDate;
    hashtags: z.ZodArray<z.ZodString, "many">;
    contentType: z.ZodEnum<["text", "image", "video", "carousel"]>;
    metrics: z.ZodObject<{
        likes: z.ZodNumber;
        comments: z.ZodNumber;
        shares: z.ZodNumber;
        views: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        likes: number;
        shares: number;
        comments: number;
        views?: number | undefined;
    }, {
        likes: number;
        shares: number;
        comments: number;
        views?: number | undefined;
    }>;
    insights: z.ZodOptional<z.ZodString>;
    analyzedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    content: string;
    platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
    hashtags: string[];
    engagementRate: number;
    metrics: {
        likes: number;
        shares: number;
        comments: number;
        views?: number | undefined;
    };
    competitorName: string;
    handle: string;
    postTime: Date;
    contentType: "text" | "image" | "video" | "carousel";
    analyzedAt: Date;
    insights?: string | undefined;
}, {
    id: string;
    content: string;
    platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
    hashtags: string[];
    engagementRate: number;
    metrics: {
        likes: number;
        shares: number;
        comments: number;
        views?: number | undefined;
    };
    competitorName: string;
    handle: string;
    postTime: Date;
    contentType: "text" | "image" | "video" | "carousel";
    analyzedAt: Date;
    insights?: string | undefined;
}>;
export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;
export declare const AutomationConfigSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
    platforms: z.ZodArray<z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>, "many">;
    postingSchedule: z.ZodObject<{
        timezone: z.ZodDefault<z.ZodString>;
        daysOfWeek: z.ZodArray<z.ZodNumber, "many">;
        timesOfDay: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        timezone: string;
        daysOfWeek: number[];
        timesOfDay: string[];
    }, {
        daysOfWeek: number[];
        timesOfDay: string[];
        timezone?: string | undefined;
    }>;
    contentRules: z.ZodObject<{
        minCharacters: z.ZodDefault<z.ZodNumber>;
        maxCharacters: z.ZodDefault<z.ZodNumber>;
        requiredHashtags: z.ZodDefault<z.ZodNumber>;
        maxHashtags: z.ZodDefault<z.ZodNumber>;
        aiEnhancementEnabled: z.ZodDefault<z.ZodBoolean>;
        duplicateContentCheck: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        minCharacters: number;
        maxCharacters: number;
        requiredHashtags: number;
        maxHashtags: number;
        aiEnhancementEnabled: boolean;
        duplicateContentCheck: boolean;
    }, {
        minCharacters?: number | undefined;
        maxCharacters?: number | undefined;
        requiredHashtags?: number | undefined;
        maxHashtags?: number | undefined;
        aiEnhancementEnabled?: boolean | undefined;
        duplicateContentCheck?: boolean | undefined;
    }>;
    trendMonitoring: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        keywords: z.ZodArray<z.ZodString, "many">;
        industries: z.ZodArray<z.ZodString, "many">;
        locations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        minimumVolume: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        keywords: string[];
        enabled: boolean;
        industries: string[];
        locations: string[];
        minimumVolume: number;
    }, {
        keywords: string[];
        industries: string[];
        enabled?: boolean | undefined;
        locations?: string[] | undefined;
        minimumVolume?: number | undefined;
    }>;
    competitorTracking: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        competitors: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            handles: z.ZodRecord<z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>, z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
        }, {
            name: string;
            handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        competitors: {
            name: string;
            handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
        }[];
    }, {
        competitors: {
            name: string;
            handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
        }[];
        enabled?: boolean | undefined;
    }>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    enabled: boolean;
    platforms: ("twitter" | "linkedin" | "instagram" | "tiktok" | "facebook")[];
    postingSchedule: {
        timezone: string;
        daysOfWeek: number[];
        timesOfDay: string[];
    };
    contentRules: {
        minCharacters: number;
        maxCharacters: number;
        requiredHashtags: number;
        maxHashtags: number;
        aiEnhancementEnabled: boolean;
        duplicateContentCheck: boolean;
    };
    trendMonitoring: {
        keywords: string[];
        enabled: boolean;
        industries: string[];
        locations: string[];
        minimumVolume: number;
    };
    competitorTracking: {
        enabled: boolean;
        competitors: {
            name: string;
            handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
        }[];
    };
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    platforms: ("twitter" | "linkedin" | "instagram" | "tiktok" | "facebook")[];
    postingSchedule: {
        daysOfWeek: number[];
        timesOfDay: string[];
        timezone?: string | undefined;
    };
    contentRules: {
        minCharacters?: number | undefined;
        maxCharacters?: number | undefined;
        requiredHashtags?: number | undefined;
        maxHashtags?: number | undefined;
        aiEnhancementEnabled?: boolean | undefined;
        duplicateContentCheck?: boolean | undefined;
    };
    trendMonitoring: {
        keywords: string[];
        industries: string[];
        enabled?: boolean | undefined;
        locations?: string[] | undefined;
        minimumVolume?: number | undefined;
    };
    competitorTracking: {
        competitors: {
            name: string;
            handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
        }[];
        enabled?: boolean | undefined;
    };
    enabled?: boolean | undefined;
}>;
export type AutomationConfig = z.infer<typeof AutomationConfigSchema>;
export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
}
export interface PaginatedResponse<T> extends APIResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}
export interface SocialMediaService {
    platform: SocialPlatform;
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
    getMetrics(): Promise<AccountMetrics>;
    deletePost(postId: string): Promise<boolean>;
    schedulePost(content: Content): Promise<string>;
}
export interface AIService {
    generateContent(prompt: string, context?: any): Promise<string>;
    enhanceContent(content: string, platform: SocialPlatform): Promise<string>;
    analyzeTrends(trends: string[]): Promise<Trend[]>;
    optimizeForPlatform(content: string, platform: SocialPlatform): Promise<string>;
}
export interface TrendService {
    getGoogleTrends(keywords: string[]): Promise<Trend[]>;
    getTwitterTrends(location?: string): Promise<Trend[]>;
    analyzeTrendRelevance(trends: Trend[], context: string): Promise<Trend[]>;
}
export declare const WebhookEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["post_published", "post_failed", "metric_updated", "trend_detected"]>;
    platform: z.ZodOptional<z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>>;
    data: z.ZodRecord<z.ZodString, z.ZodAny>;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    data: Record<string, any>;
    timestamp: Date;
    type: "post_published" | "post_failed" | "metric_updated" | "trend_detected";
    platform?: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook" | undefined;
}, {
    id: string;
    data: Record<string, any>;
    timestamp: Date;
    type: "post_published" | "post_failed" | "metric_updated" | "trend_detected";
    platform?: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook" | undefined;
}>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export interface AnalyticsDashboard {
    totalPosts: number;
    totalEngagement: number;
    averageEngagementRate: number;
    followerGrowth: number;
    topPerformingPlatform: SocialPlatform;
    topPerformingContent: Content[];
    weeklyGrowth: number[];
    platformBreakdown: Record<SocialPlatform, {
        posts: number;
        engagement: number;
        followers: number;
    }>;
}
export declare class SocialMediaError extends Error {
    platform: SocialPlatform;
    code?: string | undefined;
    retryable: boolean;
    constructor(message: string, platform: SocialPlatform, code?: string | undefined, retryable?: boolean);
}
export declare class RateLimitError extends SocialMediaError {
    resetTime: Date;
    constructor(platform: SocialPlatform, resetTime: Date, message?: string);
}
export declare class AuthenticationError extends SocialMediaError {
    constructor(platform: SocialPlatform, message?: string);
}
export interface DatabaseConfig {
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceRoleKey: string;
}
export interface SocialConfig {
    twitter: {
        apiKey: string;
        apiSecret: string;
        accessToken: string;
        accessTokenSecret: string;
    };
    linkedin: {
        clientId: string;
        clientSecret: string;
        accessToken: string;
    };
    facebook: {
        accessToken: string;
        pageId?: string;
    };
    instagram: {
        accessToken: string;
        businessAccountId?: string;
    };
}
export interface AIConfig {
    openai: {
        apiKey: string;
        model: string;
        maxTokens: number;
        temperature: number;
    };
    perplexity?: {
        apiKey: string;
        model: string;
    };
}
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];
export declare const schemas: {
    Content: z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        platform: z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>;
        status: z.ZodEnum<["draft", "scheduled", "published", "failed", "archived"]>;
        scheduledTime: z.ZodOptional<z.ZodDate>;
        publishedTime: z.ZodOptional<z.ZodDate>;
        hashtags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        mentions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        mediaUrls: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        metrics: z.ZodOptional<z.ZodObject<{
            views: z.ZodDefault<z.ZodNumber>;
            likes: z.ZodDefault<z.ZodNumber>;
            shares: z.ZodDefault<z.ZodNumber>;
            comments: z.ZodDefault<z.ZodNumber>;
            clicks: z.ZodDefault<z.ZodNumber>;
            engagementRate: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            views: number;
            likes: number;
            shares: number;
            comments: number;
            clicks: number;
            engagementRate: number;
        }, {
            views?: number | undefined;
            likes?: number | undefined;
            shares?: number | undefined;
            comments?: number | undefined;
            clicks?: number | undefined;
            engagementRate?: number | undefined;
        }>>;
        aiGenerated: z.ZodDefault<z.ZodBoolean>;
        originalTopic: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content: string;
        platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
        status: "draft" | "scheduled" | "published" | "failed" | "archived";
        hashtags: string[];
        mentions: string[];
        mediaUrls: string[];
        aiGenerated: boolean;
        createdAt: Date;
        updatedAt: Date;
        scheduledTime?: Date | undefined;
        publishedTime?: Date | undefined;
        metrics?: {
            views: number;
            likes: number;
            shares: number;
            comments: number;
            clicks: number;
            engagementRate: number;
        } | undefined;
        originalTopic?: string | undefined;
    }, {
        id: string;
        content: string;
        platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
        status: "draft" | "scheduled" | "published" | "failed" | "archived";
        createdAt: Date;
        updatedAt: Date;
        scheduledTime?: Date | undefined;
        publishedTime?: Date | undefined;
        hashtags?: string[] | undefined;
        mentions?: string[] | undefined;
        mediaUrls?: string[] | undefined;
        metrics?: {
            views?: number | undefined;
            likes?: number | undefined;
            shares?: number | undefined;
            comments?: number | undefined;
            clicks?: number | undefined;
            engagementRate?: number | undefined;
        } | undefined;
        aiGenerated?: boolean | undefined;
        originalTopic?: string | undefined;
    }>;
    Trend: z.ZodObject<{
        id: z.ZodString;
        topic: z.ZodString;
        platform: z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>;
        volume: z.ZodNumber;
        sentimentScore: z.ZodNumber;
        relevanceScore: z.ZodNumber;
        keywords: z.ZodArray<z.ZodString, "many">;
        discoveredAt: z.ZodDate;
        expiresAt: z.ZodOptional<z.ZodDate>;
        sourceUrls: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        topic: string;
        platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
        volume: number;
        sentimentScore: number;
        relevanceScore: number;
        keywords: string[];
        discoveredAt: Date;
        sourceUrls: string[];
        expiresAt?: Date | undefined;
    }, {
        id: string;
        topic: string;
        platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
        volume: number;
        sentimentScore: number;
        relevanceScore: number;
        keywords: string[];
        discoveredAt: Date;
        expiresAt?: Date | undefined;
        sourceUrls?: string[] | undefined;
    }>;
    AccountMetrics: z.ZodObject<{
        id: z.ZodString;
        platform: z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>;
        followersCount: z.ZodNumber;
        followingCount: z.ZodNumber;
        postsCount: z.ZodNumber;
        engagementRate: z.ZodNumber;
        growthRate: z.ZodNumber;
        averageLikes: z.ZodNumber;
        averageComments: z.ZodNumber;
        averageShares: z.ZodNumber;
        topPerformingContent: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        recordedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
        engagementRate: number;
        followersCount: number;
        followingCount: number;
        postsCount: number;
        growthRate: number;
        averageLikes: number;
        averageComments: number;
        averageShares: number;
        topPerformingContent: string[];
        recordedAt: Date;
    }, {
        id: string;
        platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
        engagementRate: number;
        followersCount: number;
        followingCount: number;
        postsCount: number;
        growthRate: number;
        averageLikes: number;
        averageComments: number;
        averageShares: number;
        recordedAt: Date;
        topPerformingContent?: string[] | undefined;
    }>;
    CompetitorAnalysis: z.ZodObject<{
        id: z.ZodString;
        competitorName: z.ZodString;
        platform: z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>;
        handle: z.ZodString;
        content: z.ZodString;
        engagementRate: z.ZodNumber;
        postTime: z.ZodDate;
        hashtags: z.ZodArray<z.ZodString, "many">;
        contentType: z.ZodEnum<["text", "image", "video", "carousel"]>;
        metrics: z.ZodObject<{
            likes: z.ZodNumber;
            comments: z.ZodNumber;
            shares: z.ZodNumber;
            views: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            likes: number;
            shares: number;
            comments: number;
            views?: number | undefined;
        }, {
            likes: number;
            shares: number;
            comments: number;
            views?: number | undefined;
        }>;
        insights: z.ZodOptional<z.ZodString>;
        analyzedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content: string;
        platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
        hashtags: string[];
        engagementRate: number;
        metrics: {
            likes: number;
            shares: number;
            comments: number;
            views?: number | undefined;
        };
        competitorName: string;
        handle: string;
        postTime: Date;
        contentType: "text" | "image" | "video" | "carousel";
        analyzedAt: Date;
        insights?: string | undefined;
    }, {
        id: string;
        content: string;
        platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook";
        hashtags: string[];
        engagementRate: number;
        metrics: {
            likes: number;
            shares: number;
            comments: number;
            views?: number | undefined;
        };
        competitorName: string;
        handle: string;
        postTime: Date;
        contentType: "text" | "image" | "video" | "carousel";
        analyzedAt: Date;
        insights?: string | undefined;
    }>;
    AutomationConfig: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        enabled: z.ZodDefault<z.ZodBoolean>;
        platforms: z.ZodArray<z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>, "many">;
        postingSchedule: z.ZodObject<{
            timezone: z.ZodDefault<z.ZodString>;
            daysOfWeek: z.ZodArray<z.ZodNumber, "many">;
            timesOfDay: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            timezone: string;
            daysOfWeek: number[];
            timesOfDay: string[];
        }, {
            daysOfWeek: number[];
            timesOfDay: string[];
            timezone?: string | undefined;
        }>;
        contentRules: z.ZodObject<{
            minCharacters: z.ZodDefault<z.ZodNumber>;
            maxCharacters: z.ZodDefault<z.ZodNumber>;
            requiredHashtags: z.ZodDefault<z.ZodNumber>;
            maxHashtags: z.ZodDefault<z.ZodNumber>;
            aiEnhancementEnabled: z.ZodDefault<z.ZodBoolean>;
            duplicateContentCheck: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            minCharacters: number;
            maxCharacters: number;
            requiredHashtags: number;
            maxHashtags: number;
            aiEnhancementEnabled: boolean;
            duplicateContentCheck: boolean;
        }, {
            minCharacters?: number | undefined;
            maxCharacters?: number | undefined;
            requiredHashtags?: number | undefined;
            maxHashtags?: number | undefined;
            aiEnhancementEnabled?: boolean | undefined;
            duplicateContentCheck?: boolean | undefined;
        }>;
        trendMonitoring: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            keywords: z.ZodArray<z.ZodString, "many">;
            industries: z.ZodArray<z.ZodString, "many">;
            locations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            minimumVolume: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            keywords: string[];
            enabled: boolean;
            industries: string[];
            locations: string[];
            minimumVolume: number;
        }, {
            keywords: string[];
            industries: string[];
            enabled?: boolean | undefined;
            locations?: string[] | undefined;
            minimumVolume?: number | undefined;
        }>;
        competitorTracking: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            competitors: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                handles: z.ZodRecord<z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>, z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                name: string;
                handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
            }, {
                name: string;
                handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            competitors: {
                name: string;
                handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
            }[];
        }, {
            competitors: {
                name: string;
                handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
            }[];
            enabled?: boolean | undefined;
        }>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        enabled: boolean;
        platforms: ("twitter" | "linkedin" | "instagram" | "tiktok" | "facebook")[];
        postingSchedule: {
            timezone: string;
            daysOfWeek: number[];
            timesOfDay: string[];
        };
        contentRules: {
            minCharacters: number;
            maxCharacters: number;
            requiredHashtags: number;
            maxHashtags: number;
            aiEnhancementEnabled: boolean;
            duplicateContentCheck: boolean;
        };
        trendMonitoring: {
            keywords: string[];
            enabled: boolean;
            industries: string[];
            locations: string[];
            minimumVolume: number;
        };
        competitorTracking: {
            enabled: boolean;
            competitors: {
                name: string;
                handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
            }[];
        };
    }, {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        platforms: ("twitter" | "linkedin" | "instagram" | "tiktok" | "facebook")[];
        postingSchedule: {
            daysOfWeek: number[];
            timesOfDay: string[];
            timezone?: string | undefined;
        };
        contentRules: {
            minCharacters?: number | undefined;
            maxCharacters?: number | undefined;
            requiredHashtags?: number | undefined;
            maxHashtags?: number | undefined;
            aiEnhancementEnabled?: boolean | undefined;
            duplicateContentCheck?: boolean | undefined;
        };
        trendMonitoring: {
            keywords: string[];
            industries: string[];
            enabled?: boolean | undefined;
            locations?: string[] | undefined;
            minimumVolume?: number | undefined;
        };
        competitorTracking: {
            competitors: {
                name: string;
                handles: Partial<Record<"twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", string>>;
            }[];
            enabled?: boolean | undefined;
        };
        enabled?: boolean | undefined;
    }>;
    WebhookEvent: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["post_published", "post_failed", "metric_updated", "trend_detected"]>;
        platform: z.ZodOptional<z.ZodEnum<["twitter", "linkedin", "facebook", "instagram", "tiktok"]>>;
        data: z.ZodRecord<z.ZodString, z.ZodAny>;
        timestamp: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        data: Record<string, any>;
        timestamp: Date;
        type: "post_published" | "post_failed" | "metric_updated" | "trend_detected";
        platform?: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook" | undefined;
    }, {
        id: string;
        data: Record<string, any>;
        timestamp: Date;
        type: "post_published" | "post_failed" | "metric_updated" | "trend_detected";
        platform?: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook" | undefined;
    }>;
};
//# sourceMappingURL=typescript-types.d.ts.map