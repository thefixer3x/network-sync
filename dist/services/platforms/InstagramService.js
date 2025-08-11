// services/platforms/InstagramService.ts
import axios from 'axios';
import { SocialMediaError, RateLimitError, AuthenticationError } from '../../types/typescript-types';
import { Logger } from '../../utils/Logger';
export class InstagramService {
    constructor(accessToken, instagramAccountId) {
        this.platform = 'instagram';
        this.baseURL = 'https://graph.facebook.com/v18.0';
        this.accessToken = accessToken;
        this.instagramAccountId = instagramAccountId;
        this.logger = new Logger('InstagramService');
    }
    async authenticate() {
        try {
            const response = await axios.get(`${this.baseURL}/me/accounts`, {
                params: {
                    access_token: this.accessToken,
                    fields: 'instagram_business_account'
                }
            });
            this.logger.info('Instagram authentication successful');
            return true;
        }
        catch (error) {
            this.handleInstagramError(error);
            return false;
        }
    }
    async post(content) {
        this.validateContent(content);
        if (!this.instagramAccountId) {
            throw new SocialMediaError('Instagram account ID is required for posting', 'instagram', 'MISSING_ACCOUNT_ID');
        }
        try {
            let mediaContainerId;
            if (content.mediaUrls && content.mediaUrls.length > 0) {
                // Create media container
                const containerResponse = await axios.post(`${this.baseURL}/${this.instagramAccountId}/media`, {
                    image_url: content.mediaUrls[0],
                    caption: content.content,
                    access_token: this.accessToken
                });
                mediaContainerId = containerResponse.data.id;
            }
            else {
                throw new SocialMediaError('Instagram posts require media content', 'instagram', 'NO_MEDIA');
            }
            // Publish the media
            const publishResponse = await axios.post(`${this.baseURL}/${this.instagramAccountId}/media_publish`, {
                creation_id: mediaContainerId,
                access_token: this.accessToken
            });
            const postId = publishResponse.data.id;
            this.logger.info(`Instagram post published successfully: ${postId}`);
            return postId;
        }
        catch (error) {
            this.handleInstagramError(error);
            throw error;
        }
    }
    async getMetrics() {
        if (!this.instagramAccountId) {
            throw new SocialMediaError('Instagram account ID is required for metrics', 'instagram', 'MISSING_ACCOUNT_ID');
        }
        try {
            const accountResponse = await axios.get(`${this.baseURL}/${this.instagramAccountId}`, {
                params: {
                    access_token: this.accessToken,
                    fields: 'account_type,media_count,followers_count,follows_count'
                }
            });
            const accountData = accountResponse.data;
            return {
                id: `ig-metrics-${Date.now()}`,
                platform: 'instagram',
                followersCount: accountData.followers_count || 0,
                followingCount: accountData.follows_count || 0,
                postsCount: accountData.media_count || 0,
                engagementRate: await this.calculateEngagementRate(),
                growthRate: 0,
                averageLikes: await this.calculateAverageLikes(),
                averageComments: await this.calculateAverageComments(),
                averageShares: 0,
                topPerformingContent: await this.getTopPerformingPosts(),
                recordedAt: new Date(),
            };
        }
        catch (error) {
            this.handleInstagramError(error);
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
            this.logger.info(`Instagram post ${postId} deleted successfully`);
            return true;
        }
        catch (error) {
            this.handleInstagramError(error);
            throw error;
        }
    }
    async schedulePost(content) {
        throw new Error('Instagram post scheduling requires Business API with publish permissions');
    }
    validateContent(content) {
        if (content.content.length > 2200) {
            throw new SocialMediaError('Instagram caption exceeds 2200 character limit', 'instagram', 'CONTENT_TOO_LONG');
        }
        if (!content.mediaUrls || content.mediaUrls.length === 0) {
            throw new SocialMediaError('Instagram posts require at least one media file', 'instagram', 'NO_MEDIA_REQUIRED');
        }
    }
    async calculateEngagementRate() {
        return 0;
    }
    async calculateAverageLikes() {
        return 0;
    }
    async calculateAverageComments() {
        return 0;
    }
    async getTopPerformingPosts() {
        return [];
    }
    handleInstagramError(error) {
        const errorData = error.response?.data?.error;
        if (error.response?.status === 429 || errorData?.code === 4) {
            const resetTime = new Date(Date.now() + 60 * 60 * 1000);
            throw new RateLimitError('instagram', resetTime);
        }
        if (error.response?.status === 401 || errorData?.code === 190) {
            throw new AuthenticationError('instagram', 'Invalid access token');
        }
        if (errorData?.code === 100) {
            throw new SocialMediaError('Invalid parameter or missing permission', 'instagram', errorData.code.toString());
        }
        throw new SocialMediaError(errorData?.message || error.message || 'Unknown Instagram API error', 'instagram', errorData?.code?.toString() || error.response?.status?.toString());
    }
}
//# sourceMappingURL=InstagramService.js.map