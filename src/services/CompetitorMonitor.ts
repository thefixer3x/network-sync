import { SocialPlatform, CompetitorAnalysis } from '../types/typescript-types';
import { Logger } from '@/utils/Logger';
import { TwitterApi } from 'twitter-api-v2';
import { OpenAIService } from './OpenAIService';
import { HashtagResearcher } from './HashtagResearcher';
import axios from 'axios';

export interface CompetitorProfile {
  id: string;
  name: string;
  handles: Record<SocialPlatform, string>;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  monitoringEnabled: boolean;
  trackingMetrics: string[];
  alertThresholds: {
    followerGrowth?: number; // percentage
    engagementIncrease?: number; // percentage
    viralPostThreshold?: number; // engagement count
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

export class CompetitorMonitor {
  private logger = new Logger('CompetitorMonitor');
  private aiService = new OpenAIService();
  private hashtagResearcher = new HashtagResearcher();
  private competitors: Map<string, CompetitorProfile> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertQueue: CompetitorAlert[] = [];

  constructor() {
    this.loadCompetitors();
  }

  private async loadCompetitors(): Promise<void> {
    // In a real implementation, this would load from database
    // For now, initialize with empty map
    this.logger.info('Competitor monitor initialized');
  }

  async addCompetitor(competitor: Omit<CompetitorProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const competitorId = crypto.randomUUID();
    const profile: CompetitorProfile = {
      ...competitor,
      id: competitorId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.competitors.set(competitorId, profile);
    this.logger.info(`Added competitor: ${competitor.name}`);

    return competitorId;
  }

  async startMonitoring(intervalMinutes = 60): Promise<void> {
    if (this.monitoringInterval) {
      this.logger.warn('Monitoring already active');
      return;
    }

    this.logger.info(`Starting competitor monitoring (every ${intervalMinutes} minutes)`);

    // Initial analysis
    await this.analyzeAllCompetitors();

    // Set up recurring monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.analyzeAllCompetitors();
    }, intervalMinutes * 60 * 1000);
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('Stopped competitor monitoring');
    }
  }

  private async analyzeAllCompetitors(): Promise<void> {
    const activeCompetitors = Array.from(this.competitors.values()).filter(c => c.monitoringEnabled);
    
    if (activeCompetitors.length === 0) {
      this.logger.info('No active competitors to monitor');
      return;
    }

    this.logger.info(`Analyzing ${activeCompetitors.length} competitors`);

    for (const competitor of activeCompetitors) {
      try {
        await this.analyzeCompetitor(competitor);
      } catch (error) {
        this.logger.error(`Failed to analyze competitor ${competitor.name}:`, error);
      }
    }

    // Process alerts
    await this.processAlerts();
  }

  private async analyzeCompetitor(competitor: CompetitorProfile): Promise<void> {
    const insights: Record<SocialPlatform, CompetitorInsight> = {} as any;

    // Analyze each platform
    for (const [platform, handle] of Object.entries(competitor.handles)) {
      if (!handle) continue;

      try {
        const platformInsight = await this.analyzePlatform(
          competitor,
          platform as SocialPlatform,
          handle
        );
        insights[platform as SocialPlatform] = platformInsight;
      } catch (error) {
        this.logger.error(`Failed to analyze ${competitor.name} on ${platform}:`, error);
      }
    }

    // Generate alerts based on insights
    await this.generateAlerts(competitor, insights);
  }

  private async analyzePlatform(
    competitor: CompetitorProfile,
    platform: SocialPlatform,
    handle: string
  ): Promise<CompetitorInsight> {
    
    switch (platform) {
      case 'twitter':
        return await this.analyzeTwitterCompetitor(competitor, handle);
      case 'linkedin':
        return await this.analyzeLinkedInCompetitor(competitor, handle);
      case 'instagram':
        return await this.analyzeInstagramCompetitor(competitor, handle);
      default:
        throw new Error(`Platform analysis not implemented: ${platform}`);
    }
  }

  private async analyzeTwitterCompetitor(competitor: CompetitorProfile, handle: string): Promise<CompetitorInsight> {
    try {
      const twitterClient = new TwitterApi({
        appKey: process.env['TWITTER_API_KEY']!,
        appSecret: process.env['TWITTER_API_SECRET']!,
        accessToken: process.env['TWITTER_ACCESS_TOKEN']!,
        accessSecret: process.env['TWITTER_ACCESS_TOKEN_SECRET']!,
      });

      // Get user info
      const user = await twitterClient.v2.userByUsername(handle, {
        'user.fields': ['public_metrics', 'created_at', 'verified']
      });

      if (!user.data) {
        throw new Error(`Twitter user not found: ${handle}`);
      }

      // Get recent tweets
      const tweets = await twitterClient.v2.userTimeline(user.data.id, {
        max_results: 100,
        'tweet.fields': ['public_metrics', 'created_at', 'entities'],
        exclude: ['retweets']
      });

      // Analyze tweets
      const tweetData = tweets.data || [];
      const analysis = this.analyzeTweetData(tweetData);

      // Get follower growth (would require historical data in practice)
      const followerGrowthRate = this.estimateGrowthRate(user.data.public_metrics);

      const insight: CompetitorInsight = {
        competitorName: competitor.name,
        platform: 'twitter',
        insights: {
          postingFrequency: {
            daily: analysis.dailyPostCount,
            weekly: analysis.weeklyPostCount,
            optimalTimes: analysis.optimalTimes
          },
          contentStrategy: {
            types: analysis.contentTypes,
            themes: analysis.themes,
            averageLength: analysis.avgLength,
            hashtagUsage: analysis.avgHashtags
          },
          engagement: {
            averageRate: analysis.avgEngagementRate,
            topPerformingTypes: analysis.topPerformingTypes,
            audienceResponse: analysis.audienceResponse
          },
          growth: {
            followerGrowthRate,
            engagementTrend: analysis.engagementTrend,
            contentVelocity: analysis.dailyPostCount
          }
        },
        recommendations: await this.generateRecommendations(analysis, 'twitter'),
        opportunities: await this.identifyOpportunities(analysis, competitor),
        threats: await this.identifyThreats(analysis, competitor),
        analyzedAt: new Date()
      };

      return insight;

    } catch (error) {
      this.logger.error(`Failed to analyze Twitter competitor ${handle}:`, error);
      throw error;
    }
  }

  private analyzeTweetData(tweets: any[]): any {
    if (tweets.length === 0) {
      return {
        dailyPostCount: 0,
        weeklyPostCount: 0,
        avgEngagementRate: 0,
        avgLength: 0,
        avgHashtags: 0,
        contentTypes: [],
        themes: [],
        topPerformingTypes: [],
        audienceResponse: [],
        optimalTimes: [],
        engagementTrend: 'stable'
      };
    }

    // Calculate posting frequency
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentTweets = tweets.filter(t => new Date(t.created_at) > oneWeekAgo);
    const dailyPostCount = Math.round(recentTweets.length / 7);
    const weeklyPostCount = recentTweets.length;

    // Calculate engagement metrics
    const engagementRates = tweets.map(tweet => {
      const engagement = tweet.public_metrics.like_count + 
                       tweet.public_metrics.reply_count + 
                       tweet.public_metrics.retweet_count;
      const impressions = tweet.public_metrics.impression_count || 1;
      return (engagement / impressions) * 100;
    });

    const avgEngagementRate = engagementRates.reduce((sum, rate) => sum + rate, 0) / engagementRates.length;

    // Analyze content
    const avgLength = tweets.reduce((sum, tweet) => sum + tweet.text.length, 0) / tweets.length;
    const hashtagCounts = tweets.map(tweet => (tweet.entities?.hashtags?.length || 0));
    const avgHashtags = hashtagCounts.reduce((sum, count) => sum + count, 0) / hashtagCounts.length;

    // Analyze posting times
    const postingHours = tweets.map(tweet => new Date(tweet.created_at).getHours());
    const hourCounts = postingHours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const optimalTimes = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);

    // Determine engagement trend
    const firstHalf = engagementRates.slice(0, Math.floor(engagementRates.length / 2));
    const secondHalf = engagementRates.slice(Math.floor(engagementRates.length / 2));
    const firstAvg = firstHalf.reduce((sum, rate) => sum + rate, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, rate) => sum + rate, 0) / secondHalf.length;
    
    const engagementTrend = secondAvg > firstAvg * 1.1 ? 'rising' : 
                          secondAvg < firstAvg * 0.9 ? 'falling' : 'stable';

    // Analyze content types (simplified)
    const contentTypes = ['text', 'image', 'video', 'link'].filter(() => Math.random() > 0.5);
    const themes = this.extractThemes(tweets.map(t => t.text));
    const topPerformingTypes = ['text', 'image']; // Simplified
    const audienceResponse = ['high_engagement', 'positive_sentiment']; // Simplified

    return {
      dailyPostCount,
      weeklyPostCount,
      avgEngagementRate,
      avgLength,
      avgHashtags,
      contentTypes,
      themes,
      topPerformingTypes,
      audienceResponse,
      optimalTimes,
      engagementTrend
    };
  }

  private extractThemes(texts: string[]): string[] {
    // Simplified theme extraction
    const commonWords = ['business', 'tech', 'marketing', 'growth', 'innovation', 'AI', 'startup'];
    const themes: string[] = [];

    commonWords.forEach(word => {
      const count = texts.filter(text => text.toLowerCase().includes(word)).length;
      if (count > texts.length * 0.1) { // Appears in >10% of tweets
        themes.push(word);
      }
    });

    return themes.slice(0, 5);
  }

  private estimateGrowthRate(metrics: any): number {
    // In practice, this would use historical data
    // For now, estimate based on follower count (simplified)
    const followers = metrics.followers_count;
    if (followers < 1000) return Math.random() * 10; // 0-10%
    if (followers < 10000) return Math.random() * 5; // 0-5%
    return Math.random() * 2; // 0-2%
  }

  private async analyzeLinkedInCompetitor(competitor: CompetitorProfile, handle: string): Promise<CompetitorInsight> {
    // LinkedIn analysis would require LinkedIn API access
    // Return simplified insight for now
    return {
      competitorName: competitor.name,
      platform: 'linkedin',
      insights: {
        postingFrequency: { daily: 1, weekly: 5, optimalTimes: ['8:00 AM', '12:00 PM'] },
        contentStrategy: { types: ['article', 'post'], themes: ['business'], averageLength: 500, hashtagUsage: 3 },
        engagement: { averageRate: 2.5, topPerformingTypes: ['article'], audienceResponse: ['professional'] },
        growth: { followerGrowthRate: 1.5, engagementTrend: 'stable', contentVelocity: 1 }
      },
      recommendations: ['Increase posting frequency', 'Focus on industry insights'],
      opportunities: ['LinkedIn article publishing', 'Professional networking content'],
      threats: ['Strong professional presence', 'High-quality content'],
      analyzedAt: new Date()
    };
  }

  private async analyzeInstagramCompetitor(competitor: CompetitorProfile, handle: string): Promise<CompetitorInsight> {
    // Instagram analysis would require Instagram Graph API access
    return {
      competitorName: competitor.name,
      platform: 'instagram',
      insights: {
        postingFrequency: { daily: 2, weekly: 14, optimalTimes: ['11:00 AM', '7:00 PM'] },
        contentStrategy: { types: ['image', 'video'], themes: ['lifestyle'], averageLength: 150, hashtagUsage: 15 },
        engagement: { averageRate: 4.2, topPerformingTypes: ['video'], audienceResponse: ['visual_focused'] },
        growth: { followerGrowthRate: 3.1, engagementTrend: 'rising', contentVelocity: 2 }
      },
      recommendations: ['Increase video content', 'Use trending hashtags'],
      opportunities: ['Instagram Reels', 'Story highlights'],
      threats: ['High visual quality', 'Strong brand presence'],
      analyzedAt: new Date()
    };
  }

  private async generateRecommendations(analysis: any, platform: SocialPlatform): Promise<string[]> {
    const prompt = `Based on this competitor analysis for ${platform}, provide 3-5 specific recommendations for improving our social media strategy:

Analysis: ${JSON.stringify(analysis, null, 2)}

Focus on:
- Content strategy improvements
- Posting optimization
- Engagement tactics
- Growth strategies

Return as JSON array of recommendation strings:`;

    try {
      const result = await this.aiService.generateContent(prompt);
      return JSON.parse(result);
    } catch (error) {
      this.logger.error('Failed to generate recommendations:', error);
      return ['Analyze competitor posting times', 'Study their content themes', 'Monitor their engagement rates'];
    }
  }

  private async identifyOpportunities(analysis: any, competitor: CompetitorProfile): Promise<string[]> {
    return [
      'Capitalize on content gaps in competitor strategy',
      'Engage with their highly engaged audience',
      'Use similar hashtags with better content',
      'Post during their low-activity periods'
    ];
  }

  private async identifyThreats(analysis: any, competitor: CompetitorProfile): Promise<string[]> {
    return [
      'High engagement rates on similar content',
      'Strong brand presence in target market',
      'Consistent posting schedule',
      'Growing follower base'
    ];
  }

  private async generateAlerts(
    competitor: CompetitorProfile,
    insights: Record<SocialPlatform, CompetitorInsight>
  ): Promise<void> {
    
    for (const [platform, insight] of Object.entries(insights)) {
      const thresholds = competitor.alertThresholds;

      // Check for follower growth spike
      if (thresholds.followerGrowth && insight.insights.growth.followerGrowthRate > thresholds.followerGrowth) {
        this.alertQueue.push({
          id: crypto.randomUUID(),
          competitorId: competitor.id,
          competitorName: competitor.name,
          platform: platform as SocialPlatform,
          alertType: 'follower_spike',
          title: `${competitor.name} experiencing rapid follower growth`,
          description: `Follower growth rate: ${insight.insights.growth.followerGrowthRate}% (threshold: ${thresholds.followerGrowth}%)`,
          severity: 'high',
          data: { growthRate: insight.insights.growth.followerGrowthRate },
          actionRecommended: 'Analyze their recent content strategy and viral posts',
          createdAt: new Date()
        });
      }

      // Check for engagement surge
      if (thresholds.engagementIncrease && insight.insights.engagement.averageRate > 5) {
        this.alertQueue.push({
          id: crypto.randomUUID(),
          competitorId: competitor.id,
          competitorName: competitor.name,
          platform: platform as SocialPlatform,
          alertType: 'engagement_surge',
          title: `${competitor.name} showing high engagement rates`,
          description: `Average engagement rate: ${insight.insights.engagement.averageRate}%`,
          severity: 'medium',
          data: { engagementRate: insight.insights.engagement.averageRate },
          actionRecommended: 'Study their top-performing content types and timing',
          createdAt: new Date()
        });
      }
    }
  }

  private async processAlerts(): Promise<void> {
    if (this.alertQueue.length === 0) return;

    this.logger.info(`Processing ${this.alertQueue.length} competitor alerts`);

    // In a real implementation, these would be saved to database and/or sent as notifications
    for (const alert of this.alertQueue) {
      this.logger.warn(`COMPETITOR ALERT: ${alert.title} - ${alert.description}`);
    }

    // Clear processed alerts
    this.alertQueue = [];
  }

  async getCompetitorReport(competitorId: string): Promise<any> {
    const competitor = this.competitors.get(competitorId);
    if (!competitor) {
      throw new Error(`Competitor not found: ${competitorId}`);
    }

    // Generate comprehensive report
    const report = {
      competitor: competitor.name,
      industry: competitor.industry,
      platforms: Object.keys(competitor.handles),
      summary: `Comprehensive analysis of ${competitor.name}'s social media presence`,
      last_analyzed: new Date(),
      // Additional report sections would be added here
    };

    return report;
  }

  async getAlerts(severity?: 'low' | 'medium' | 'high'): Promise<CompetitorAlert[]> {
    return severity 
      ? this.alertQueue.filter(alert => alert.severity === severity)
      : [...this.alertQueue];
  }

  async getCompetitors(): Promise<CompetitorProfile[]> {
    return Array.from(this.competitors.values());
  }

  async removeCompetitor(competitorId: string): Promise<boolean> {
    const removed = this.competitors.delete(competitorId);
    if (removed) {
      this.logger.info(`Removed competitor: ${competitorId}`);
    }
    return removed;
  }
}