// services/platforms/FacebookService.ts
import axios from 'axios';
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

type FacebookCredentials = Partial<{
  accessToken: string;
  pageId: string;
}>;

export class FacebookService implements SocialMediaService {
  platform = 'facebook' as const;
  private accessToken: string;
  private pageId: string;
  private logger = new Logger('FacebookService');
  private baseURL = 'https://graph.facebook.com/v18.0';

  constructor(credentials: FacebookCredentials = {}) {
    this.accessToken = credentials.accessToken ?? process.env['FACEBOOK_ACCESS_TOKEN'] ?? '';
    this.pageId = credentials.pageId ?? process.env['FACEBOOK_PAGE_ID'] ?? '';

    if (!this.accessToken) {
      throw new AuthenticationError('facebook', 'Missing Facebook access token');
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/me`, {
        params: { access_token: this.accessToken }
      });

      this.logger.info(`Authenticated as ${response.data.name}`);
      return true;
    } catch (error: any) {
      this.logger.error('Facebook authentication failed:', error);
      throw new AuthenticationError('facebook', error.response?.data?.error?.message || error.message);
    }
  }

  async post(content: Content): Promise<string> {
    try {
      this.validateContent(content);

      const postData: any = {
        message: content.content,
        access_token: this.accessToken
      };

      // Add media if present
      if (content.mediaUrls.length > 0) {
        // For single image
        if (content.mediaUrls.length === 1) {
          postData.url = content.mediaUrls[0];
        } else {
          // For multiple images, need to use different endpoint
          return await this.postMultipleImages(content);
        }
      }

      const endpoint = this.pageId
        ? `${this.baseURL}/${this.pageId}/posts`
        : `${this.baseURL}/me/feed`;

      const response = await axios.post(endpoint, postData);

      this.logger.info(`Facebook post created successfully: ${response.data.id}`);
      return response.data.id;

    } catch (error: any) {
      this.handleFacebookError(error);
      throw error;
    }
  }

  private async postMultipleImages(content: Content): Promise<string> {
    // Upload images first
    const mediaIds = [];

    for (const mediaUrl of content.mediaUrls) {
      try {
        const response = await axios.post(`${this.baseURL}/${this.pageId}/photos`, {
          url: mediaUrl,
          published: false, // Don't publish individual photos
          access_token: this.accessToken
        });
        mediaIds.push({ media_fbid: response.data.id });
      } catch (error: any) {
        this.logger.error(`Failed to upload image ${mediaUrl}:`, error);
      }
    }

    // Create post with multiple images
    const response = await axios.post(`${this.baseURL}/${this.pageId}/feed`, {
      message: content.content,
      attached_media: mediaIds,
      access_token: this.accessToken
    });

    return response.data.id;
  }

  async getMetrics(): Promise<AccountMetrics> {
    try {
      const endpoint = this.pageId
        ? `${this.baseURL}/${this.pageId}`
        : `${this.baseURL}/me`;

      const response = await axios.get(endpoint, {
        params: {
          fields: 'fan_count,posts.limit(10){likes.summary(true),comments.summary(true),shares}',
          access_token: this.accessToken
        }
      });

      const data = response.data;
      const posts = data.posts?.data || [];

      // Calculate engagement metrics
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;

      posts.forEach((post: any) => {
        totalLikes += post.likes?.summary?.total_count || 0;
        totalComments += post.comments?.summary?.total_count || 0;
        totalShares += post.shares?.count || 0;
      });

      return {
        id: randomUUID(),
        platform: 'facebook',
        followersCount: data.fan_count || 0,
        followingCount: 0, // Not available for pages
        postsCount: posts.length,
        engagementRate: posts.length > 0 ? ((totalLikes + totalComments + totalShares) / posts.length) : 0,
        growthRate: 0, // Requires historical data
        averageLikes: posts.length > 0 ? totalLikes / posts.length : 0,
        averageComments: posts.length > 0 ? totalComments / posts.length : 0,
        averageShares: posts.length > 0 ? totalShares / posts.length : 0,
        topPerformingContent: await this.getTopPerformingPosts(),
        recordedAt: new Date(),
      };
    } catch (error: any) {
      this.handleFacebookError(error);
      throw error;
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.baseURL}/${postId}`, {
        params: { access_token: this.accessToken }
      });

      this.logger.info(`Facebook post ${postId} deleted successfully`);
      return true;
    } catch (error: any) {
      this.handleFacebookError(error);
      throw error;
    }
  }

  async schedulePost(content: Content): Promise<string> {
    if (!content.scheduledTime) {
      throw new Error('Scheduled time is required for Facebook scheduling');
    }

    try {
      const postData: any = {
        message: content.content,
        scheduled_publish_time: Math.floor(content.scheduledTime.getTime() / 1000),
        published: false,
        access_token: this.accessToken
      };

      if (content.mediaUrls.length > 0) {
        postData.url = content.mediaUrls[0];
      }

      const endpoint = this.pageId
        ? `${this.baseURL}/${this.pageId}/posts`
        : `${this.baseURL}/me/feed`;

      const response = await axios.post(endpoint, postData);

      this.logger.info(`Facebook post scheduled successfully: ${response.data.id}`);
      return response.data.id;

    } catch (error: any) {
      this.handleFacebookError(error);
      throw error;
    }
  }

  private validateContent(content: Content): void {
    if (content.content.length > 63206) {
      throw new SocialMediaError(
        'Facebook post exceeds character limit',
        'facebook',
        'CONTENT_TOO_LONG'
      );
    }
  }

  private async getTopPerformingPosts(): Promise<string[]> {
    try {
      const endpoint = this.pageId
        ? `${this.baseURL}/${this.pageId}/posts`
        : `${this.baseURL}/me/posts`;

      const response = await axios.get(endpoint, {
        params: {
          fields: 'id,likes.summary(true),comments.summary(true),shares',
          limit: 20,
          access_token: this.accessToken
        }
      });

      const posts = response.data.data || [];

      return posts
        .map((post: any) => ({
          id: post.id,
          engagement: (post.likes?.summary?.total_count || 0) +
            (post.comments?.summary?.total_count || 0) +
            (post.shares?.count || 0)
        }))
        .sort((a: any, b: any) => b.engagement - a.engagement)
        .slice(0, 5)
        .map((post: any) => post.id);
    } catch (error: any) {
      return [];
    }
  }

  private handleFacebookError(error: any): void {
    const errorData = error.response?.data?.error;

    if (error.response?.status === 429 || errorData?.code === 4) {
      const resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      throw new RateLimitError('facebook', resetTime);
    }

    if (error.response?.status === 401 || errorData?.code === 190) {
      throw new AuthenticationError('facebook', 'Invalid access token');
    }

    throw new SocialMediaError(
      errorData?.message || error.message || 'Unknown Facebook API error',
      'facebook',
      errorData?.code?.toString()
    );
  }
}
