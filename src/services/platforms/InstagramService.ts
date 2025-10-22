// services/platforms/InstagramService.ts
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

type InstagramCredentials = Partial<{
  accessToken: string;
  instagramAccountId: string;
}>;

export class InstagramService implements SocialMediaService {
  platform = 'instagram' as const;
  private accessToken: string;
  private businessAccountId: string;
  private logger = new Logger('InstagramService');
  private baseURL = 'https://graph.facebook.com/v18.0';

  constructor(credentials: InstagramCredentials = {}) {
    this.accessToken = credentials.accessToken ?? process.env['INSTAGRAM_ACCESS_TOKEN'] ?? '';
    this.businessAccountId =
      credentials.instagramAccountId ??
      process.env['INSTAGRAM_BUSINESS_ACCOUNT_ID'] ??
      process.env['INSTAGRAM_ACCOUNT_ID'] ??
      '';

    if (!this.accessToken || !this.businessAccountId) {
      throw new AuthenticationError('instagram', 'Missing Instagram credentials');
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/${this.businessAccountId}`, {
        params: {
          fields: 'name,username',
          access_token: this.accessToken
        }
      });

      this.logger.info(`Authenticated as @${response.data.username}`);
      return true;
    } catch (error: any) {
      this.logger.error('Instagram authentication failed:', error);
      throw new AuthenticationError('instagram', error.response?.data?.error?.message || error.message);
    }
  }

  async post(content: Content): Promise<string> {
    try {
      this.validateContent(content);

      if (content.mediaUrls.length === 0) {
        throw new SocialMediaError(
          'Instagram posts require at least one media attachment',
          'instagram',
          'NO_MEDIA'
        );
      }

      // Create media container(s)
      const mediaContainers = await this.createMediaContainers(content);

      // Publish the post
      const response = await axios.post(`${this.baseURL}/${this.businessAccountId}/media_publish`, {
        creation_id: mediaContainers[0], // For single media or carousel
        access_token: this.accessToken
      });

      this.logger.info(`Instagram post created successfully: ${response.data.id}`);
      return response.data.id;

    } catch (error: any) {
      this.handleInstagramError(error);
      throw error;
    }
  }

  private async createMediaContainers(content: Content): Promise<string[]> {
    const containers: string[] = [];

    if (content.mediaUrls.length === 1) {
      // Single media post
      const response = await axios.post(`${this.baseURL}/${this.businessAccountId}/media`, {
        image_url: content.mediaUrls[0],
        caption: content.content,
        access_token: this.accessToken
      });
      containers.push(response.data.id);
    } else {
      // Carousel post
      const childContainers: string[] = [];

      for (const mediaUrl of content.mediaUrls) {
        const childResponse = await axios.post(`${this.baseURL}/${this.businessAccountId}/media`, {
          image_url: mediaUrl,
          is_carousel_item: true,
          access_token: this.accessToken
        });
        childContainers.push(childResponse.data.id);
      }

      // Create carousel container
      const carouselResponse = await axios.post(`${this.baseURL}/${this.businessAccountId}/media`, {
        media_type: 'CAROUSEL',
        children: childContainers.join(','),
        caption: content.content,
        access_token: this.accessToken
      });

      containers.push(carouselResponse.data.id);
    }

    return containers;
  }

  async getMetrics(): Promise<AccountMetrics> {
    try {
      const response = await axios.get(`${this.baseURL}/${this.businessAccountId}`, {
        params: {
          fields: 'followers_count,follows_count,media_count,media.limit(10){like_count,comments_count}',
          access_token: this.accessToken
        }
      });

      const data = response.data;
      const media = data.media?.data || [];

      // Calculate engagement metrics
      let totalLikes = 0;
      let totalComments = 0;

      media.forEach((post: any) => {
        totalLikes += post.like_count || 0;
        totalComments += post.comments_count || 0;
      });

      return {
        id: randomUUID(),
        platform: 'instagram',
        followersCount: data.followers_count || 0,
        followingCount: data.follows_count || 0,
        postsCount: data.media_count || 0,
        engagementRate: media.length > 0 ? ((totalLikes + totalComments) / media.length) : 0,
        growthRate: 0, // Requires historical data
        averageLikes: media.length > 0 ? totalLikes / media.length : 0,
        averageComments: media.length > 0 ? totalComments / media.length : 0,
        averageShares: 0, // Instagram doesn't have shares
        topPerformingContent: await this.getTopPerformingPosts(),
        recordedAt: new Date(),
      };
    } catch (error: any) {
      this.handleInstagramError(error);
      throw error;
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.baseURL}/${postId}`, {
        params: { access_token: this.accessToken }
      });

      this.logger.info(`Instagram post ${postId} deleted successfully`);
      return true;
    } catch (error: any) {
      this.handleInstagramError(error);
      throw error;
    }
  }

  async schedulePost(content: Content): Promise<string> {
    // Instagram Basic Display API doesn't support scheduling
    // This would need to be handled by the automation engine
    throw new Error('Instagram API does not support native post scheduling');
  }

  private validateContent(content: Content): void {
    if (content.content.length > 2200) {
      throw new SocialMediaError(
        'Instagram caption exceeds 2200 character limit',
        'instagram',
        'CONTENT_TOO_LONG'
      );
    }

    if (content.mediaUrls.length > 10) {
      throw new SocialMediaError(
        'Instagram supports maximum 10 media attachments in carousel',
        'instagram',
        'TOO_MANY_MEDIA'
      );
    }
  }

  private async getTopPerformingPosts(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseURL}/${this.businessAccountId}/media`, {
        params: {
          fields: 'id,like_count,comments_count',
          limit: 20,
          access_token: this.accessToken
        }
      });

      const posts = response.data.data || [];

      return posts
        .map((post: any) => ({
          id: post.id,
          engagement: (post.like_count || 0) + (post.comments_count || 0)
        }))
        .sort((a: any, b: any) => b.engagement - a.engagement)
        .slice(0, 5)
        .map((post: any) => post.id);
    } catch (error: any) {
      return [];
    }
  }

  private handleInstagramError(error: any): void {
    const errorData = error.response?.data?.error;

    if (error.response?.status === 429 || errorData?.code === 4) {
      const resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      throw new RateLimitError('instagram', resetTime);
    }

    if (error.response?.status === 401 || errorData?.code === 190) {
      throw new AuthenticationError('instagram', 'Invalid access token');
    }

    throw new SocialMediaError(
      errorData?.message || error.message || 'Unknown Instagram API error',
      'instagram',
      errorData?.code?.toString()
    );
  }
}
