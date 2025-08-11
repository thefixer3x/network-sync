throw new AuthenticationError('linkedin', 'Invalid access token');
throw new SocialMediaError(error.response?.data?.message || error.message || 'Unknown LinkedIn API error', 'linkedin', error.response?.status?.toString());
// services/platforms/FacebookService.ts
import axios from 'axios';
import { SocialMediaError } from '@/types';
import { Logger } from '@/utils/Logger';
export class FacebookService {
    constructor() {
        this.platform = 'facebook';
        this.logger = new Logger('FacebookService');
        this.baseURL = 'https://graph.facebook.com/v18.0';
        this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
        this.pageId = process.env.FACEBOOK_PAGE_ID || '';
    }
    async authenticate() {
        try {
            const response = await axios.get(`${this.baseURL}/me`, {
                params: { access_token: this.accessToken }
            });
            this.logger.info(`Authenticated as ${response.data.name}`);
            return true;
        }
        catch (error) {
            this.logger.error('Facebook authentication failed:', error);
            throw new AuthenticationError('facebook', error.response?.data?.error?.message || error.message);
        }
    }
    async post(content) {
        try {
            this.validateContent(content);
            const postData = {
                message: content.content,
                access_token: this.accessToken
            };
            // Add media if present
            if (content.mediaUrls.length > 0) {
                // For single image
                if (content.mediaUrls.length === 1) {
                    postData.url = content.mediaUrls[0];
                }
                else {
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
        }
        catch (error) {
            this.handleFacebookError(error);
            throw error;
        }
    }
    async postMultipleImages(content) {
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
            }
            catch (error) {
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
    async getMetrics() {
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
            posts.forEach(post => {
                totalLikes += post.likes?.summary?.total_count || 0;
                totalComments += post.comments?.summary?.total_count || 0;
                totalShares += post.shares?.count || 0;
            });
            return {
                id: crypto.randomUUID(),
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
        }
        catch (error) {
            this.handleFacebookError(error);
            throw error;
        }
    }
    async deletePost(postId) {
        try {
            await axios.delete(`${this.baseURL}/${postId}`, {
                params: { access_token: this.accessToken }
            });
            this.logger.info(`Facebook post ${postId} deleted successfully`);
            return true;
        }
        catch (error) {
            this.handleFacebookError(error);
            throw error;
        }
    }
    async schedulePost(content) {
        if (!content.scheduledTime) {
            throw new Error('Scheduled time is required for Facebook scheduling');
        }
        try {
            const postData = {
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
        }
        catch (error) {
            this.handleFacebookError(error);
            throw error;
        }
    }
}
//# sourceMappingURL=InstagramService.js.map