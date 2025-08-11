// services/platforms/FacebookService.ts
import axios from 'axios';
import { SocialMediaError, RateLimitError, AuthenticationError } from '../../types/typescript-types';
import { Logger } from '../../utils/Logger';
export class FacebookService {
    constructor(accessToken, pageId) {
        this.platform = 'facebook';
        this.baseURL = 'https://graph.facebook.com/v18.0';
        this.accessToken = accessToken;
        this.pageId = pageId;
        this.logger = new Logger('FacebookService');
    }
    async authenticate() {
        try {
            const response = await axios.get(`${this.baseURL}/me`, {
                params: {
                    access_token: this.accessToken,
                    fields: 'id,name'
                }
            });
            this.logger.info('Facebook authentication successful:', response.data.name);
            return true;
        }
        catch (error) {
            this.handleFacebookError(error);
            return false;
        }
    }
    async post(content) {
        this.validateContent(content);
        try {
            let mediaAssets = [];
            // Upload media if present
            if (content.mediaUrls && content.mediaUrls.length > 0) {
                mediaAssets = await this.uploadMedia(content.mediaUrls);
            }
            const endpoint = this.pageId
                ? `${this.baseURL}/${this.pageId}/feed`
                : `${this.baseURL}/me/feed`;
            const postData = {
                message: content.content,
                access_token: this.accessToken
            };
            // Add media if uploaded
            if (mediaAssets.length > 0) {
                postData.attached_media = mediaAssets.map(asset => ({ media_fbid: asset.id }));
            }
            const response = await axios.post(endpoint, postData);
            const postId = this.extractPostId(response.data.id);
            this.logger.info(`Facebook post published successfully: ${postId}`);
            return postId;
        }
        catch (error) {
            this.handleFacebookError(error);
            throw error;
        }
    }
    async getMetrics() {
        try {
            const endpoint = this.pageId
                ? `${this.baseURL}/${this.pageId}`
                : `${this.baseURL}/me`;
            // Get basic profile information
            const profileResponse = await axios.get(endpoint, {
                params: {
                    access_token: this.accessToken,
                    fields: 'id,name,followers_count,fan_count'
                }
            });
            const followersCount = profileResponse.data.followers_count || profileResponse.data.fan_count || 0;
            return {
                id: `fb-metrics-${Date.now()}`,
                platform: 'facebook',
                followersCount: followersCount,
                followingCount: 0, // Not available in Facebook API for pages
                postsCount: await this.getPostsCount(),
                engagementRate: await this.calculateEngagementRate(),
                growthRate: 0, // Requires historical data
                averageLikes: await this.calculateAverageLikes(),
                averageComments: await this.calculateAverageComments(),
                averageShares: await this.calculateAverageShares(),
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
                params: {
                    access_token: this.accessToken
                }
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
        this.validateContent(content);
        if (!content.scheduledTime) {
            throw new Error('Scheduled time is required for scheduling posts');
        }
        try {
            let mediaAssets = [];
            if (content.mediaUrls && content.mediaUrls.length > 0) {
                mediaAssets = await this.uploadMedia(content.mediaUrls);
            }
            const endpoint = this.pageId
                ? `${this.baseURL}/${this.pageId}/feed`
                : `${this.baseURL}/me/feed`;
            const postData = {
                message: content.content,
                published: false,
                scheduled_publish_time: Math.floor(content.scheduledTime.getTime() / 1000),
                access_token: this.accessToken
            };
            if (mediaAssets.length > 0) {
                postData.attached_media = mediaAssets.map(asset => ({ media_fbid: asset.id }));
            }
            const response = await axios.post(endpoint, postData);
            const postId = this.extractPostId(response.data.id);
            this.logger.info(`Facebook post scheduled successfully: ${postId}`);
            return postId;
        }
        catch (error) {
            this.handleFacebookError(error);
            throw error;
        }
    }
    validateContent(content) {
        if (content.content.length > 63206) {
            throw new SocialMediaError('Facebook post exceeds character limit', 'facebook', 'CONTENT_TOO_LONG');
        }
    }
    async uploadMedia(mediaUrls) {
        const mediaAssets = [];
        for (const url of mediaUrls) {
            try {
                const endpoint = this.pageId
                    ? `${this.baseURL}/${this.pageId}/photos`
                    : `${this.baseURL}/me/photos`;
                const response = await axios.post(endpoint, {
                    url: url,
                    published: false,
                    access_token: this.accessToken
                });
                mediaAssets.push(response.data);
            }
            catch (error) {
                this.logger.error(`Failed to upload media ${url}:`, error);
            }
        }
        return mediaAssets;
    }
    extractPostId(facebookId) {
        return facebookId.split('_').pop() || facebookId;
    }
    async getPostsCount() {
        try {
            const endpoint = this.pageId
                ? `${this.baseURL}/${this.pageId}/posts`
                : `${this.baseURL}/me/posts`;
            const response = await axios.get(endpoint, {
                params: {
                    access_token: this.accessToken,
                    limit: 0,
                    summary: true
                }
            });
            return response.data.summary?.total_count || 0;
        }
        catch (error) {
            return 0;
        }
    }
    async getTopPerformingPosts() {
        try {
            const endpoint = this.pageId
                ? `${this.baseURL}/${this.pageId}/posts`
                : `${this.baseURL}/me/posts`;
            const response = await axios.get(endpoint, {
                params: {
                    access_token: this.accessToken,
                    fields: 'id,reactions.summary(true),comments.summary(true),shares',
                    limit: 25
                }
            });
            const posts = response.data.data || [];
            return posts
                .map((post) => ({
                id: post.id,
                engagement: (post.reactions?.summary?.total_count || 0) +
                    (post.comments?.summary?.total_count || 0) +
                    (post.shares?.count || 0)
            }))
                .sort((a, b) => b.engagement - a.engagement)
                .slice(0, 5)
                .map((post) => post.id);
        }
        catch (error) {
            return [];
        }
    }
    async calculateEngagementRate() {
        // Calculate based on recent posts
        return 0;
    }
    async calculateAverageLikes() {
        return 0;
    }
    async calculateAverageComments() {
        return 0;
    }
    async calculateAverageShares() {
        return 0;
    }
    handleFacebookError(error) {
        const errorData = error.response?.data?.error;
        if (error.response?.status === 429 || errorData?.code === 4) {
            const resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            throw new RateLimitError('facebook', resetTime);
        }
        if (error.response?.status === 401 || errorData?.code === 190) {
            throw new AuthenticationError('facebook', 'Invalid access token');
        }
        if (errorData?.code === 100) {
            throw new SocialMediaError('Invalid parameter or missing permission', 'facebook', errorData.code.toString());
        }
        throw new SocialMediaError(errorData?.message || error.message || 'Unknown Facebook API error', 'facebook', errorData?.code?.toString() || error.response?.status?.toString());
    }
}
//# sourceMappingURL=FacebookService.js.map