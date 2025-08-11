// services/platforms/TwitterService.ts
import { TwitterApi } from 'twitter-api-v2';
import { 
  SocialMediaService, 
  Content, 
  AccountMetrics, 
  SocialMediaError,
  RateLimitError,
  AuthenticationError 
} from '../../types/typescript-types';
import { Logger } from '../../utils/Logger';

export class TwitterService implements SocialMediaService {
  platform = 'twitter' as const;
  private client: TwitterApi;
  private logger: Logger;

  constructor(apiKey: string, apiSecret: string, accessToken: string, accessSecret: string) {
    this.client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });
    this.logger = new Logger('TwitterService');
  }

  async authenticate(): Promise<boolean> {
    try {
      const user = await this.client.v2.me();
      this.logger.info(`Authenticated as ${user.data.username}`);
      return true;
    } catch (error) {
      this.handleTwitterError(error);
      return false;
    }
  }

  async post(content: Content): Promise<string> {
    try {
      this.validateContent(content);

      let mediaIds: string[] = [];

      // Upload media if present
      if (content.mediaUrls && content.mediaUrls.length > 0) {
        mediaIds = await this.uploadMedia(content.mediaUrls);
      }

      const tweetOptions: any = {
        text: content.content
      };

      if (mediaIds.length > 0) {
        tweetOptions.media = { media_ids: mediaIds };
      }

      const tweet = await this.client.v2.tweet(tweetOptions);
      
      this.logger.info(`Tweet posted successfully: ${tweet.data.id}`);
      return tweet.data.id;
    } catch (error) {
      this.handleTwitterError(error);
      throw error;
    }
  }

  async getMetrics(): Promise<AccountMetrics> {
    try {
      const user = await this.client.v2.me({
        'user.fields': ['public_metrics']
      });

      const metrics = user.data.public_metrics;

      return {
        id: `twitter-metrics-${Date.now()}`,
        platform: 'twitter',
        followersCount: metrics?.followers_count || 0,
        followingCount: metrics?.following_count || 0,
        postsCount: metrics?.tweet_count || 0,
        engagementRate: await this.calculateEngagementRate(),
        growthRate: 0, // Requires historical data
        averageLikes: await this.calculateAverageLikes(),
        averageComments: await this.calculateAverageComments(),
        averageShares: await this.calculateAverageShares(),
        topPerformingContent: await this.getTopPerformingPosts(),
        recordedAt: new Date(),
      };
    } catch (error) {
      this.handleTwitterError(error);
      throw error;
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.client.v2.deleteTweet(postId);
      this.logger.info(`Tweet ${postId} deleted successfully`);
      return true;
    } catch (error) {
      this.handleTwitterError(error);
      throw error;
    }
  }

  async schedulePost(content: Content): Promise<string> {
    // Twitter API v2 doesn't support native scheduling
    throw new Error('Twitter API does not support native tweet scheduling');
  }

  private validateContent(content: Content): void {
    if (content.content.length > 280) {
      throw new SocialMediaError(
        'Tweet exceeds 280 character limit',
        'twitter',
        'CONTENT_TOO_LONG'
      );
    }
  }

  private async uploadMedia(mediaUrls: string[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const url of mediaUrls) {
      try {
        // Fetch the media from URL
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();

        // Upload media to Twitter
        const mediaId = await this.client.v1.uploadMedia(Buffer.from(buffer), {
          mimeType: response.headers.get('content-type') || 'image/jpeg'
        });

        mediaIds.push(mediaId);
      } catch (error) {
        this.logger.error(`Failed to upload media ${url}:`, error);
      }
    }

    return mediaIds;
  }

  private async calculateEngagementRate(): Promise<number> {
    // Would need to analyze recent tweets and their engagement
    // This requires fetching tweets and their metrics
    return 0;
  }

  private async calculateAverageLikes(): Promise<number> {
    return 0;
  }

  private async calculateAverageComments(): Promise<number> {
    return 0;
  }

  private async calculateAverageShares(): Promise<number> {
    return 0;
  }

  private async getTopPerformingPosts(): Promise<string[]> {
    return [];
  }

  private handleTwitterError(error: any): void {
    if (error.code === 429 || error.status === 429) {
      const resetTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      throw new RateLimitError('twitter', resetTime);
    }

    if (error.code === 401 || error.status === 401) {
      throw new AuthenticationError('twitter', 'Invalid credentials');
    }

    if (error.code === 403) {
      throw new SocialMediaError(
        'Forbidden: Check your Twitter API permissions',
        'twitter',
        '403'
      );
    }

    throw new SocialMediaError(
      error.message || 'Unknown Twitter API error',
      'twitter',
      error.code?.toString() || error.status?.toString()
    );
  }
}