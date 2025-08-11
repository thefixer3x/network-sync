import { SocialPlatform, Content, SocialMediaError } from '../types/typescript-types';
import { Logger } from '@/utils/Logger';
import { SocialMediaFactory } from './SocialMediaFactory';
import { OpenAIService } from './OpenAIService';
import { TwitterApi } from 'twitter-api-v2';

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
    timeWindow?: number; // hours
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

export class EngagementAutomator {
  private logger = new Logger('EngagementAutomator');
  private aiService = new OpenAIService();
  private socialServices = new Map();
  private activeRules: EngagementRule[] = [];
  private actionLog: Map<string, Date> = new Map();
  private dailyActionCounts: Map<string, number> = new Map();

  constructor() {
    this.initializeSocialServices();
  }
  private getServiceConfig(platform: SocialPlatform): any {
      switch (platform) {
          case 'twitter':
              return {
                  apiKey: process.env['TWITTER_API_KEY'],
                  apiSecret: process.env['TWITTER_API_SECRET'],
                  accessToken: process.env['TWITTER_ACCESS_TOKEN'],
                  accessSecret: process.env['TWITTER_ACCESS_SECRET']
              };
          case 'linkedin':
              return {
                  accessToken: process.env['LINKEDIN_ACCESS_TOKEN'],
                  personId: process.env['LINKEDIN_PERSON_ID']
              };
          case 'facebook':
              return {
                  accessToken: process.env['FACEBOOK_ACCESS_TOKEN'],
                  pageId: process.env['FACEBOOK_PAGE_ID']
              };
          case 'instagram':
              return {
                  accessToken: process.env['INSTAGRAM_ACCESS_TOKEN'],
                  instagramAccountId: process.env['INSTAGRAM_ACCOUNT_ID']
              };
          default:
              throw new Error(`Unsupported platform: ${platform}`);
      }
  }


  private async initializeSocialServices(): Promise<void> {
    const platforms: SocialPlatform[] = ['twitter', 'linkedin', 'facebook', 'instagram'];
    
    for (const platform of platforms) {
      try {
        const service = SocialMediaFactory.create(platform, {
          apiKey: process.env['TWITTER_API_KEY'],
          apiSecret: process.env['TWITTER_API_SECRET'],
          accessToken: process.env['TWITTER_ACCESS_TOKEN'],
          accessSecret: process.env['TWITTER_ACCESS_SECRET'],
          personId: process.env['LINKEDIN_PERSON_ID'], // For LinkedIn
          pageId: process.env['FACEBOOK_PAGE_ID'],     // For Facebook
          instagramAccountId: process.env['INSTAGRAM_ACCOUNT_ID'] // For Instagram
        });
        await service.authenticate();
        this.socialServices.set(platform, service);
        this.logger.info(`${platform} service initialized for engagement`);
      } catch (error) {
        this.logger.error(`Failed to initialize ${platform} for engagement:`, error);
      }
    }
  }

  async addEngagementRule(rule: Omit<EngagementRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<EngagementRule> {
    const newRule: EngagementRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activeRules.push(newRule);
    this.logger.info(`Added engagement rule for ${rule.platform}: ${rule.type}`);
    
    return newRule;
  }

  async findEngagementOpportunities(platform: SocialPlatform): Promise<EngagementOpportunity[]> {
    try {
      const service = this.socialServices.get(platform);
      if (!service) {
        throw new Error(`No service available for platform: ${platform}`);
      }

      const opportunities: EngagementOpportunity[] = [];
      const platformRules = this.activeRules.filter(r => r.platform === platform && r.enabled);

      if (platformRules.length === 0) {
        this.logger.info(`No active engagement rules for ${platform}`);
        return [];
      }

      // Platform-specific opportunity discovery
      switch (platform) {
        case 'twitter':
          const twitterOpportunities = await this.findTwitterOpportunities(platformRules);
          opportunities.push(...twitterOpportunities);
          break;
        
        case 'linkedin':
          const linkedinOpportunities = await this.findLinkedInOpportunities(platformRules);
          opportunities.push(...linkedinOpportunities);
          break;
        
        // Add other platforms as needed
        default:
          this.logger.warn(`Engagement automation not implemented for ${platform}`);
      }

      this.logger.info(`Found ${opportunities.length} engagement opportunities on ${platform}`);
      return opportunities;

    } catch (error) {
      this.logger.error(`Failed to find engagement opportunities on ${platform}:`, error);
      return [];
    }
  }

  private async findTwitterOpportunities(rules: EngagementRule[]): Promise<EngagementOpportunity[]> {
    const opportunities: EngagementOpportunity[] = [];
    const twitterClient = new TwitterApi({
      appKey: process.env['TWITTER_API_KEY']!,
      appSecret: process.env['TWITTER_API_SECRET']!,
      accessToken: process.env['TWITTER_ACCESS_TOKEN']!,
      accessSecret: process.env['TWITTER_ACCESS_TOKEN_SECRET']!,
    });

    try {
      for (const rule of rules) {
        // Build search query based on rule conditions
        let searchQuery = '';
        
        if (rule.conditions.keywords) {
          searchQuery += rule.conditions.keywords.join(' OR ') + ' ';
        }
        
        if (rule.conditions.hashtags) {
          searchQuery += rule.conditions.hashtags.map(h => `#${h}`).join(' OR ') + ' ';
        }

        // Add filters
        searchQuery += '-is:retweet '; // Exclude retweets
        if (rule.conditions.minEngagement) {
          searchQuery += `min_retweets:${rule.conditions.minEngagement} OR min_faves:${rule.conditions.minEngagement} `;
        }

        // Search for tweets
        const searchResults = await twitterClient.v2.search(searchQuery.trim(), {
          max_results: 50,
          'tweet.fields': ['public_metrics', 'author_id', 'created_at', 'context_annotations'],
          'user.fields': ['public_metrics', 'verified'],
          expansions: ['author_id']
        });

        if (!searchResults.data) continue;

        // Process each tweet
        const tweetData = Array.isArray(searchResults.data) ? searchResults.data : [];
        for (const tweet of tweetData) {
          const author = searchResults.includes?.users?.find(u => u.id === tweet.author_id);
          if (!author) continue;

          // Apply rule conditions
          if (!this.matchesRuleConditions(rule, tweet, author)) continue;

          // Calculate scores
          const relevanceScore = this.calculateRelevanceScore(tweet.text, rule.conditions.keywords || []);
          const engagementScore = this.calculateEngagementScore(tweet.public_metrics);

          const opportunity: EngagementOpportunity = {
            id: crypto.randomUUID(),
            platform: 'twitter',
            postId: tweet.id,
            authorHandle: author.username,
            authorId: author.id,
            content: tweet.text,
            metrics: {
              likes: tweet.public_metrics.like_count,
              comments: tweet.public_metrics.reply_count,
              shares: tweet.public_metrics.retweet_count,
              views: tweet.public_metrics.impression_count
            },
            relevanceScore,
            engagementScore,
            authorMetrics: {
              followers: author.public_metrics?.followers_count ?? 0,
              verified: author.verified || false,
              engagementRate: this.calculateAuthorEngagementRate(author)
            },
            matchedRules: [rule.id],
            recommendedActions: this.getRecommendedActions(rule),
            discoveredAt: new Date()
          };

          opportunities.push(opportunity);
        }
      }

      return opportunities;

    } catch (error) {
      this.logger.error('Failed to find Twitter opportunities:', error);
      return [];
    }
  }

  private async findLinkedInOpportunities(rules: EngagementRule[]): Promise<EngagementOpportunity[]> {
    // LinkedIn API has limited search capabilities for non-partner applications
    // This would typically require LinkedIn Partner Program access
    this.logger.info('LinkedIn engagement opportunities require partner access');
    return [];
  }

  private matchesRuleConditions(rule: EngagementRule, tweet: any, author: any): boolean {
    // Check follower count limits
    if (rule.conditions.followerCountMin && author.public_metrics.followers_count < rule.conditions.followerCountMin) {
      return false;
    }
    
    if (rule.conditions.followerCountMax && author.public_metrics.followers_count > rule.conditions.followerCountMax) {
      return false;
    }

    // Check if we should exclude verified accounts
    if (rule.conditions.excludeVerified && author.verified) {
      return false;
    }

    // Check minimum engagement
    if (rule.conditions.minEngagement) {
      const totalEngagement = tweet.public_metrics.like_count + 
                             tweet.public_metrics.reply_count + 
                             tweet.public_metrics.retweet_count;
      if (totalEngagement < rule.conditions.minEngagement) {
        return false;
      }
    }

    // Check if we've recently interacted with this author
    const cooldownKey = `${rule.platform}:${author.id}`;
    const lastAction = this.actionLog.get(cooldownKey);
    if (lastAction && rule.limits.cooldownMinutes) {
      const cooldownMs = rule.limits.cooldownMinutes * 60 * 1000;
      if (Date.now() - lastAction.getTime() < cooldownMs) {
        return false;
      }
    }

    return true;
  }

  private calculateRelevanceScore(content: string, keywords: string[]): number {
    if (keywords.length === 0) return 0.5;
    
    const lowercaseContent = content.toLowerCase();
    const matchedKeywords = keywords.filter(keyword => 
      lowercaseContent.includes(keyword.toLowerCase())
    );
    
    return Math.min(matchedKeywords.length / keywords.length, 1);
  }

  private calculateEngagementScore(metrics: any): number {
    const totalEngagement = metrics.like_count + metrics.reply_count + metrics.retweet_count;
    const impressions = metrics.impression_count || 1;
    
    return Math.min((totalEngagement / impressions) * 100, 1);
  }

  private calculateAuthorEngagementRate(author: any): number {
    // Simplified engagement rate calculation
    // In practice, this would analyze recent tweets
    const followers = author.public_metrics.followers_count;
    return Math.min((100 / Math.sqrt(followers)) * 10, 10); // Estimated percentage
  }

  private getRecommendedActions(rule: EngagementRule): ('reply' | 'like' | 'retweet' | 'follow')[] {
    const actions: ('reply' | 'like' | 'retweet' | 'follow')[] = [];
    
    if (rule.actions.like) actions.push('like');
    if (rule.actions.reply) actions.push('reply');
    if (rule.actions.retweet) actions.push('retweet');
    if (rule.actions.follow) actions.push('follow');
    
    return actions;
  }

  async executeEngagementAction(
    opportunity: EngagementOpportunity,
    action: 'reply' | 'like' | 'retweet' | 'follow'
  ): Promise<boolean> {
    try {
      // Check rate limits
      if (!this.canPerformAction(opportunity.platform, action)) {
        this.logger.warn(`Rate limit exceeded for ${action} on ${opportunity.platform}`);
        return false;
      }

      const service = this.socialServices.get(opportunity.platform);
      if (!service) {
        throw new Error(`No service available for platform: ${opportunity.platform}`);
      }

      let success = false;

      switch (action) {
        case 'like':
          success = await this.performLike(opportunity);
          break;
        case 'reply':
          success = await this.performReply(opportunity);
          break;
        case 'retweet':
          success = await this.performRetweet(opportunity);
          break;
        case 'follow':
          success = await this.performFollow(opportunity);
          break;
      }

      if (success) {
        this.recordAction(opportunity.platform, action);
        opportunity.actedAt = new Date();
        this.logger.success(`Executed ${action} on ${opportunity.platform} post ${opportunity.postId}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`Failed to execute ${action} on ${opportunity.platform}:`, error);
      return false;
    }
  }

  private async performLike(opportunity: EngagementOpportunity): Promise<boolean> {
    if (opportunity.platform === 'twitter') {
      const twitterClient = this.socialServices.get('twitter') as TwitterApi;
      try {
        await twitterClient.v2.like((await twitterClient.currentUserV2()).data.id, opportunity.postId);
        return true;
      } catch (error) {
        this.logger.error('Failed to like Twitter post:', error);
        return false;
      }
    }
    
    return false;
  }

  private async performReply(opportunity: EngagementOpportunity): Promise<boolean> {
    try {
      // Generate AI response
      const replyText = await this.generateReply(opportunity);
      
      if (opportunity.platform === 'twitter') {
        const twitterClient = this.socialServices.get('twitter') as TwitterApi;
        await twitterClient.v2.reply(replyText, opportunity.postId);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Failed to reply to post:', error);
      return false;
    }
  }

  private async performRetweet(opportunity: EngagementOpportunity): Promise<boolean> {
    if (opportunity.platform === 'twitter') {
      const twitterClient = this.socialServices.get('twitter') as TwitterApi;
      try {
        await twitterClient.v2.retweet((await twitterClient.currentUserV2()).data.id, opportunity.postId);
        return true;
      } catch (error) {
        this.logger.error('Failed to retweet:', error);
        return false;
      }
    }
    
    return false;
  }

  private async performFollow(opportunity: EngagementOpportunity): Promise<boolean> {
    if (opportunity.platform === 'twitter') {
      const twitterClient = this.socialServices.get('twitter') as TwitterApi;
      try {
        await twitterClient.v2.follow((await twitterClient.currentUserV2()).data.id, opportunity.authorId);
        return true;
      } catch (error) {
        this.logger.error('Failed to follow user:', error);
        return false;
      }
    }
    
    return false;
  }

  private async generateReply(opportunity: EngagementOpportunity): Promise<string> {
    const prompt = `Generate an engaging and valuable response to the following social media post:

ORIGINAL POST:
"${opportunity.content}"
BY: @${opportunity.authorHandle} on ${opportunity.platform}

Requirements:
1. Be helpful and add value to the conversation
2. Stay professional and authentic
3. Don't be promotional or spammy
4. Keep it under 280 characters for Twitter
5. Ask a thoughtful follow-up question or provide insight
6. Match the tone of the original post

Generate only the reply text, ready to post:`;

    try {
      const reply = await this.aiService.generateContent(prompt);
      return reply.trim();
    } catch (error) {
      this.logger.error('Failed to generate AI reply:', error);
      // Fallback to generic responses
      const genericReplies = [
        "Great insight! What's been your experience with this?",
        "Thanks for sharing this perspective! Really valuable.",
        "This is spot on. Have you found any other approaches that work?",
        "Interesting point! I'd love to hear more about your thoughts on this."
      ];
      const randomIndex = Math.floor(Math.random() * genericReplies.length);
      return genericReplies[randomIndex] || 'Thank you for your feedback!';
    }
  }

  private canPerformAction(platform: SocialPlatform, action: string): boolean {
    const hourlyKey = `${platform}:${action}:${new Date().getHours()}`;
    const dailyKey = `${platform}:${action}:${new Date().getDate()}`;
    
    // Simple rate limiting - in production, use Redis or similar
    const hourlyCount = this.dailyActionCounts.get(hourlyKey) || 0;
    const dailyCount = this.dailyActionCounts.get(dailyKey) || 0;
    
    // Conservative limits to avoid hitting API limits
    const hourlyLimits: Record<string, number> = {
      like: 50,
      reply: 20,
      retweet: 25,
      follow: 10
    };
    
    const dailyLimits: Record<string, number> = {
      like: 400,
      reply: 150,
      retweet: 200,
      follow: 50
    };
    
    return hourlyCount < (hourlyLimits[action] || 10) && 
           dailyCount < (dailyLimits[action] || 100);
  }

  private recordAction(platform: SocialPlatform, action: string): void {
    const hourlyKey = `${platform}:${action}:${new Date().getHours()}`;
    const dailyKey = `${platform}:${action}:${new Date().getDate()}`;
    
    this.dailyActionCounts.set(hourlyKey, (this.dailyActionCounts.get(hourlyKey) || 0) + 1);
    this.dailyActionCounts.set(dailyKey, (this.dailyActionCounts.get(dailyKey) || 0) + 1);
    
    // Record timestamp for cooldown tracking
    this.actionLog.set(`${platform}:${action}`, new Date());
  }

  async getEngagementStats(platform?: SocialPlatform): Promise<Record<string, any>> {
    const stats: {
        totalRules: number;
        activeRules: number;
        dailyActions: Record<string, Record<string, number>>;
        recentActions: any[];
    } = {
      totalRules: this.activeRules.length,
      activeRules: this.activeRules.filter(r => r.enabled).length,
      dailyActions: {
          twitter: {},
          linkedin: {},
          facebook: {},
          instagram: {}
      } as Record<SocialPlatform, Record<string, number>>,
      recentActions: []
    };

    // Calculate daily action counts
    const today = new Date().getDate();
    for (const [key, count] of this.dailyActionCounts.entries()) {
      if (key.endsWith(`:${today}`)) {
        const [plat, action] = key.split(':') as [SocialPlatform, string];
        if (!platform || plat === platform) {
          if (!stats['dailyActions'][plat]) {
            stats['dailyActions'][plat] = {};
          }
          stats['dailyActions'][plat]![action] = count;
        }
      }
    }

    return stats;
  }

  async cleanupOldData(): Promise<void> {
    // Clean up old action logs and counts
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [key, timestamp] of this.actionLog.entries()) {
      if (timestamp.getTime() < oneDayAgo) {
        this.actionLog.delete(key);
      }
    }

    // Clean up old daily counts
    const today = new Date().getDate();
    for (const key of this.dailyActionCounts.keys()) {
      const [, , day] = key.split(':');
      if (day && parseInt(day) !== today && parseInt(day) !== today - 1) {
        this.dailyActionCounts.delete(key);
      }
    }

    this.logger.info('Cleaned up old engagement automation data');
  }
}