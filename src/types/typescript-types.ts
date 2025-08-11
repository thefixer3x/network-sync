// types/index.ts
import { z } from 'zod';

// Platform Types
export type SocialPlatform = 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok';
export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'archived';
export type PostType = 'text' | 'image' | 'video' | 'carousel' | 'story' | 'reel';

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

export type Content = z.infer<typeof ContentSchema>;

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

export type Trend = z.infer<typeof TrendSchema>;

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

export type AccountMetrics = z.infer<typeof AccountMetricsSchema>;

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

export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;

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

export type AutomationConfig = z.infer<typeof AutomationConfigSchema>;

// API Response Types
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

// Service Interfaces
export interface SocialMediaService {
  platform: SocialPlatform;
  authenticate(): Promise<boolean>;
  post(content: Content): Promise<string>; // Returns post ID
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

// Webhook & Event Types
export const WebhookEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['post_published', 'post_failed', 'metric_updated', 'trend_detected']),
  platform: SocialPlatformSchema.optional(),
  data: z.record(z.any()),
  timestamp: z.date(),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

// Analytics Types
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

// Error Types
export class SocialMediaError extends Error {
  constructor(
    message: string,
    public platform: SocialPlatform,
    public code?: string,
    public retryable = false
  ) {
    super(message);
    this.name = 'SocialMediaError';
  }
}

export class RateLimitError extends SocialMediaError {
  constructor(
    platform: SocialPlatform,
    public resetTime: Date,
    message = 'Rate limit exceeded'
  ) {
    super(message, platform, 'RATE_LIMIT', true);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends SocialMediaError {
  constructor(platform: SocialPlatform, message = 'Authentication failed') {
    super(message, platform, 'AUTH_ERROR', false);
    this.name = 'AuthenticationError';
  }
}

// Configuration Types
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

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// Export all schemas for validation
export const schemas = {
  Content: ContentSchema,
  Trend: TrendSchema,
  AccountMetrics: AccountMetricsSchema,
  CompetitorAnalysis: CompetitorAnalysisSchema,
  AutomationConfig: AutomationConfigSchema,
  WebhookEvent: WebhookEventSchema,
};