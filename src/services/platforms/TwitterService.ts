// services/platforms/TwitterService.ts
import { TwitterApi } from 'twitter-api-v2';
import { randomUUID } from 'crypto';
import {
  SocialMediaService,
  Content,
  AccountMetrics,
  SocialMediaError,
  RateLimitError,
  AuthenticationError
} from '../../types/typescript-types';
import { Logger } from '../../utils/Logger';

type TwitterCredentials = Partial<{
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}>;

export class TwitterService implements SocialMediaService {
  platform = 'twitter' as const;
  private client: TwitterApi;
  private logger = new Logger('TwitterService');

  constructor(credentials: TwitterCredentials = {}) {
    const appKey = credentials.apiKey ?? process.env['TWITTER_API_KEY'];
    const appSecret = credentials.apiSecret ?? process.env['TWITTER_API_SECRET'];
    const accessToken = credentials.accessToken ?? process.env['TWITTER_ACCESS_TOKEN'];
    const accessSecret =
      credentials.accessSecret ?? process.env['TWITTER_ACCESS_SECRET'] ?? process.env['TWITTER_ACCESS_TOKEN_SECRET'];

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
      throw new AuthenticationError('twitter', 'Missing Twitter API credentials');
    }

    this.client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret
    });
  }

  async authenticate(): Promise<boolean> {
    try {
      const user = await this.client.v2.me();
      this.logger.info(`Authenticated as @${user.data.username}`);
      return true;
    } catch (error: any) {
      this.logger.error('Twitter authentication failed:', error);
      throw new AuthenticationError('twitter', error.message);
    }
  }

  async post(content: Content): Promise<string> {
    try {
      this.validateContent(content);

      const tweetOptions: any = {
        text: content.content,
      };

      // Add media if present
      if (content.mediaUrls.length > 0) {
        const mediaIds = await this.uploadMedia(content.mediaUrls);
        tweetOptions.media = { media_ids: mediaIds };
      }

      // Create tweet
      const tweet = await this.client.v2.tweet(tweetOptions);

      this.logger.info(`Tweet posted successfully: ${tweet.data.id}`);
      return tweet.data.id;

    } catch (error: any) {
      this.handleTwitterError(error);
      throw error;
    }
  }

  async getMetrics(): Promise<AccountMetrics> {
    try {
      const user = await this.client.v2.me({
        'user.fields': ['public_metrics', 'created_at']
      });

      const metrics = user.data.public_metrics || {
        followers_count: 0,
        following_count: 0,
        tweet_count: 0
      };

      return {
        id: randomUUID(),
        platform: 'twitter',
        followersCount: metrics.followers_count || 0,
        followingCount: metrics.following_count || 0,
        postsCount: metrics.tweet_count || 0,
        engagementRate: await this.calculateEngagementRate(),
        growthRate: await this.calculateGrowthRate(),
        averageLikes: await this.calculateAverageLikes(),
        averageComments: await this.calculateAverageReplies(),
        averageShares: await this.calculateAverageRetweets(),
        topPerformingContent: await this.getTopPerformingTweets(),
        recordedAt: new Date(),
      };
    } catch (error: any) {
      this.handleTwitterError(error);
      throw error;
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.client.v2.deleteTweet(postId);
      this.logger.info(`Tweet ${postId} deleted successfully`);
      return true;
    } catch (error: any) {
      this.handleTwitterError(error);
      throw error;
    }
  }

  async schedulePost(content: Content): Promise<string> {
    // Twitter API doesn't support native scheduling
    // This would typically be handled by the automation engine
    throw new Error('Twitter API does not support native post scheduling');
  }

  private validateContent(content: Content): void {
    if (content.content.length > 280) {
      throw new SocialMediaError(
        'Tweet exceeds 280 character limit',
        'twitter',
        'CONTENT_TOO_LONG'
      );
    }

    if (content.mediaUrls.length > 4) {
      throw new SocialMediaError(
        'Twitter supports maximum 4 media attachments',
        'twitter',
        'TOO_MANY_MEDIA'
      );
    }
  }

  private async uploadMedia(mediaUrls: string[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const url of mediaUrls) {
      try {
        // Download media and upload to Twitter
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();

        const mediaId = await this.client.v1.uploadMedia(
          Buffer.from(buffer),
          { mimeType: response.headers.get('content-type') || 'image/jpeg' }
        );

        mediaIds.push(mediaId);
      } catch (error: any) {
        this.logger.error(`Failed to upload media ${url}:`, error);
      }
    }

    return mediaIds;
  }

  private async calculateEngagementRate(): Promise<number> {
    try {
      // Get recent tweets and calculate engagement
      const user = await this.client.v2.me();
      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: 10,
        'tweet.fields': ['public_metrics']
      });

      if (!tweets.data || !Array.isArray(tweets.data) || tweets.data.length === 0) return 0;

      const totalEngagement = tweets.data.reduce((sum: number, tweet: any) => {
        const metrics = tweet.public_metrics || {};
        return sum + (metrics.like_count || 0) + (metrics.reply_count || 0) + (metrics.retweet_count || 0);
      }, 0);

      const totalImpressions = tweets.data.reduce((sum: number, tweet: any) => {
        return sum + (tweet.public_metrics?.impression_count || 0);
      }, 0);

      return totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
    } catch (error: any) {
      this.logger.error('Failed to calculate engagement rate:', error);
      return 0;
    }
  }

  private async calculateGrowthRate(): Promise<number> {
    // This would require historical data tracking
    return 0;
  }

  private async calculateAverageLikes(): Promise<number> {
    try {
      const user = await this.client.v2.me();
      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: 10,
        'tweet.fields': ['public_metrics']
      });

      if (!tweets.data || !Array.isArray(tweets.data) || tweets.data.length === 0) return 0;

      const totalLikes = tweets.data.reduce((sum: number, tweet: any) => {
        return sum + (tweet.public_metrics?.like_count || 0);
      }, 0);

      return totalLikes / tweets.data.length;
    } catch (error: any) {
      return 0;
    }
  }

  private async calculateAverageReplies(): Promise<number> {
    try {
      const user = await this.client.v2.me();
      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: 10,
        'tweet.fields': ['public_metrics']
      });

      if (!tweets.data || !Array.isArray(tweets.data) || tweets.data.length === 0) return 0;

      const totalReplies = tweets.data.reduce((sum: number, tweet: any) => {
        return sum + (tweet.public_metrics?.reply_count || 0);
      }, 0);

      return totalReplies / tweets.data.length;
    } catch (error: any) {
      return 0;
    }
  }

  private async calculateAverageRetweets(): Promise<number> {
    try {
      const user = await this.client.v2.me();
      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: 10,
        'tweet.fields': ['public_metrics']
      });

      if (!tweets.data || !Array.isArray(tweets.data) || tweets.data.length === 0) return 0;

      const totalRetweets = tweets.data.reduce((sum: number, tweet: any) => {
        return sum + (tweet.public_metrics?.retweet_count || 0);
      }, 0);

      return totalRetweets / tweets.data.length;
    } catch (error: any) {
      return 0;
    }
  }

  private async getTopPerformingTweets(): Promise<string[]> {
    try {
      const user = await this.client.v2.me();
      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: 20,
        'tweet.fields': ['public_metrics']
      });

      if (!tweets.data || !Array.isArray(tweets.data) || tweets.data.length === 0) return [];

      return tweets.data
        .map((tweet: any) => ({
          id: tweet.id,
          engagement: (tweet.public_metrics?.like_count || 0) +
            (tweet.public_metrics?.reply_count || 0) +
            (tweet.public_metrics?.retweet_count || 0)
        }))
        .sort((a: any, b: any) => b.engagement - a.engagement)
        .slice(0, 5)
        .map((tweet: any) => tweet.id);
    } catch (error: any) {
      return [];
    }
  }

  private handleTwitterError(error: any): void {
    if (error.code === 429 || error.rateLimit) {
      const resetTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      throw new RateLimitError('twitter', resetTime);
    }

    if (error.code === 401) {
      throw new AuthenticationError('twitter', 'Invalid credentials');
    }

    throw new SocialMediaError(
      error.message || 'Unknown Twitter API error',
      'twitter',
      error.code?.toString()
    );
  }
}
