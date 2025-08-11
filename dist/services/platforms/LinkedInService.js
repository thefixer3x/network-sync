// services/platforms/LinkedInService.ts
import axios from 'axios';
import { SocialMediaError, RateLimitError, AuthenticationError } from '../../types/typescript-types';
import { Logger } from '../../utils/Logger';
export class LinkedInService {
    constructor(accessToken, personId) {
        this.platform = 'linkedin';
        this.baseURL = 'https://api.linkedin.com/v2';
        this.accessToken = accessToken;
        this.personId = personId;
        this.logger = new Logger('LinkedInService');
    }
    async authenticate() {
        try {
            const response = await axios.get(`${this.baseURL}/me`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            this.personId = response.data.id;
            this.logger.info(`Authenticated as ${response.data.firstName} ${response.data.lastName}`);
            return true;
        }
        catch (error) {
            this.handleLinkedInError(error);
            return false;
        }
    }
    async post(content) {
        this.validateContent(content);
        if (!this.personId) {
            throw new SocialMediaError('Person ID is required. Please authenticate first.', 'linkedin', 'MISSING_PERSON_ID');
        }
        try {
            let mediaAssets = [];
            // Upload media if present
            if (content.mediaUrls && content.mediaUrls.length > 0) {
                mediaAssets = await this.uploadMedia(content.mediaUrls);
            }
            const postData = {
                author: `urn:li:person:${this.personId}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: content.content
                        },
                        shareMediaCategory: mediaAssets.length > 0 ? 'IMAGE' : 'NONE'
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            };
            if (mediaAssets.length > 0) {
                postData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets;
            }
            const response = await axios.post(`${this.baseURL}/ugcPosts`, postData, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            const postId = this.extractPostId(response.data.id);
            this.logger.info(`LinkedIn post published successfully: ${postId}`);
            return postId;
        }
        catch (error) {
            this.handleLinkedInError(error);
            throw error;
        }
    }
    async getMetrics() {
        try {
            // Get basic profile information
            const profileResponse = await axios.get(`${this.baseURL}/me`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            // Get connection count (this requires additional permissions)
            let connectionsCount = 0;
            try {
                const connectionsResponse = await axios.get(`${this.baseURL}/connections?q=viewer&count=0`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                });
                connectionsCount = connectionsResponse.data.paging?.total || 0;
            }
            catch (error) {
                this.logger.warn('Could not fetch connections count:', error.response?.data);
            }
            return {
                id: `linkedin-metrics-${Date.now()}`,
                platform: 'linkedin',
                followersCount: connectionsCount, // LinkedIn uses connections instead of followers
                followingCount: 0, // Not available in LinkedIn API
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
            this.handleLinkedInError(error);
            throw error;
        }
    }
    async deletePost(postId) {
        try {
            await axios.delete(`${this.baseURL}/ugcPosts/${encodeURIComponent(postId)}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            this.logger.info(`LinkedIn post ${postId} deleted successfully`);
            return true;
        }
        catch (error) {
            this.handleLinkedInError(error);
            throw error;
        }
    }
    async schedulePost(content) {
        // LinkedIn API doesn't support native scheduling
        throw new Error('LinkedIn API does not support native post scheduling');
    }
    validateContent(content) {
        if (content.content.length > 3000) {
            throw new SocialMediaError('LinkedIn post exceeds 3000 character limit', 'linkedin', 'CONTENT_TOO_LONG');
        }
    }
    async uploadMedia(mediaUrls) {
        const mediaAssets = [];
        for (const url of mediaUrls) {
            try {
                // Register upload
                const registerResponse = await axios.post(`${this.baseURL}/assets?action=registerUpload`, {
                    registerUploadRequest: {
                        owner: `urn:li:person:${this.personId}`,
                        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                        serviceRelationships: [{
                                relationshipType: 'OWNER',
                                identifier: 'urn:li:userGeneratedContent'
                            }]
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                });
                const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
                const asset = registerResponse.data.value.asset;
                // Upload the actual media
                const mediaResponse = await fetch(url);
                const mediaBuffer = await mediaResponse.arrayBuffer();
                await axios.post(uploadUrl, Buffer.from(mediaBuffer), {
                    headers: {
                        'Content-Type': mediaResponse.headers.get('content-type') || 'image/jpeg'
                    }
                });
                mediaAssets.push({
                    status: 'READY',
                    description: {
                        text: 'Image uploaded via automation'
                    },
                    media: asset,
                    title: {
                        text: 'Automated Post Image'
                    }
                });
            }
            catch (error) {
                this.logger.error(`Failed to upload media ${url}:`, error);
            }
        }
        return mediaAssets;
    }
    extractPostId(linkedinId) {
        // Extract the actual post ID from LinkedIn's response
        return linkedinId.split(':').pop() || linkedinId;
    }
    async getPostsCount() {
        try {
            const response = await axios.get(`${this.baseURL}/ugcPosts?q=authors&authors=urn:li:person:${this.personId}&count=0`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            return response.data.paging?.total || 0;
        }
        catch (error) {
            return 0;
        }
    }
    async calculateEngagementRate() {
        // This requires Social Actions API which has limited access
        // Return 0 for now, implement when API access is available
        return 0;
    }
    async calculateAverageLikes() {
        // Requires Social Actions API
        return 0;
    }
    async calculateAverageComments() {
        // Requires Social Actions API
        return 0;
    }
    async calculateAverageShares() {
        // Requires Social Actions API
        return 0;
    }
    async getTopPerformingPosts() {
        // Requires Social Actions API for engagement metrics
        return [];
    }
    handleLinkedInError(error) {
        if (error.response?.status === 429) {
            const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            throw new RateLimitError('linkedin', resetTime);
        }
        if (error.response?.status === 401) {
            throw new AuthenticationError('linkedin', 'Invalid access token');
        }
        throw new SocialMediaError(error.response?.data?.message || error.message || 'Unknown LinkedIn API error', 'linkedin', error.response?.status?.toString());
    }
}
//# sourceMappingURL=LinkedInService.js.map