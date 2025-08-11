import { TwitterService } from './platforms/TwitterService';
import { LinkedInService } from './platforms/LinkedInService';
import { FacebookService } from './platforms/FacebookService';
import { InstagramService } from './platforms/InstagramService';
export class SocialMediaFactory {
    static create(platform) {
        switch (platform) {
            case 'twitter':
                return new TwitterService();
            case 'linkedin':
                return new LinkedInService();
            case 'facebook':
                return new FacebookService();
            case 'instagram':
                return new InstagramService();
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
}
// services/platforms/TwitterService.ts
import { TwitterApi } from 'twitter-api-v2';
import { SocialMediaError, RateLimitError, AuthenticationError } from '@/types';
import { Logger } from '@/utils/Logger';
export class TwitterService {
    constructor() {
        this.platform = 'twitter';
        this.logger = new Logger('TwitterService');
        this.client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        });
    }
    async authenticate() {
        try {
            const user = await this.client.currentUserV2();
            this.logger.info(`Authenticated as @${user.data.username}`);
            return true;
        }
        catch (error) {
            this.logger.error('Twitter authentication failed:', error);
            throw new AuthenticationError('twitter', error.message);
        }
    }
    async post(content) {
        try {
            this.validateContent(content);
            const tweetOptions = {
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
        }
        catch (error) {
            this.handleTwitterError(error);
            throw error;
        }
    }
    async getMetrics() {
        try {
            const user = await this.client.currentUserV2({
                'user.fields': ['public_metrics', 'created_at']
            });
            const metrics = user.data.public_metrics;
            return {
                id: crypto.randomUUID(),
                platform: 'twitter',
                followersCount: metrics.followers_count,
                followingCount: metrics.following_count,
                postsCount: metrics.tweet_count,
                engagementRate: await this.calculateEngagementRate(),
                growthRate: await this.calculateGrowthRate(),
                averageLikes: await this.calculateAverageLikes(),
                averageComments: await this.calculateAverageReplies(),
                averageShares: await this.calculateAverageRetweets(),
                topPerformingContent: await this.getTopPerformingTweets(),
                recordedAt: new Date(),
            };
        }
        catch (error) {
            this.handleTwitterError(error);
            throw error;
        }
    }
    async deletePost(postId) {
        try {
            await this.client.v2.deleteTweet(postId);
            this.logger.info(`Tweet ${postId} deleted successfully`);
            return true;
        }
        catch (error) {
            this.handleTwitterError(error);
            throw error;
        }
    }
    async schedulePost(content) {
        // Twitter API doesn't support native scheduling
        // This would typically be handled by the automation engine
        throw new Error('Twitter API does not support native post scheduling');
    }
    validateContent(content) {
        if (content.content.length > 280) {
            throw new SocialMediaError('Tweet exceeds 280 character limit', 'twitter', 'CONTENT_TOO_LONG');
        }
        if (content.mediaUrls.length > 4) {
            throw new SocialMediaError('Twitter supports maximum 4 media attachments', 'twitter', 'TOO_MANY_MEDIA');
        }
    }
    async uploadMedia(mediaUrls) {
        const mediaIds = [];
        for (const url of mediaUrls) {
            try {
                // Download media and upload to Twitter
                const response = await fetch(url);
                const buffer = await response.arrayBuffer();
                const mediaId = await this.client.v1.uploadMedia(Buffer.from(buffer), { mimeType: response.headers.get('content-type') || 'image/jpeg' });
                mediaIds.push(mediaId);
            }
            catch (error) {
                this.logger.error(`Failed to upload media ${url}:`, error);
            }
        }
        return mediaIds;
    }
    async calculateEngagementRate() {
        try {
            // Get recent tweets and calculate engagement
            const tweets = await this.client.v2.userTimeline((await this.client.currentUserV2()).data.id, {
                max_results: 10,
                'tweet.fields': ['public_metrics']
            });
            if (!tweets.data.length)
                return 0;
            const totalEngagement = tweets.data.reduce((sum, tweet) => {
                const metrics = tweet.public_metrics;
                return sum + metrics.like_count + metrics.reply_count + metrics.retweet_count;
            }, 0);
            const totalImpressions = tweets.data.reduce((sum, tweet) => {
                return sum + (tweet.public_metrics?.impression_count || 0);
            }, 0);
            return totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
        }
        catch (error) {
            this.logger.error('Failed to calculate engagement rate:', error);
            return 0;
        }
    }
    async calculateGrowthRate() {
        // This would require historical data storage
        // For now, return 0 and implement based on stored metrics
        return 0;
    }
    async calculateAverageLikes() {
        try {
            const tweets = await this.client.v2.userTimeline((await this.client.currentUserV2()).data.id, {
                max_results: 10,
                'tweet.fields': ['public_metrics']
            });
            if (!tweets.data.length)
                return 0;
            const totalLikes = tweets.data.reduce((sum, tweet) => sum + tweet.public_metrics.like_count, 0);
            return totalLikes / tweets.data.length;
        }
        catch (error) {
            return 0;
        }
    }
    async calculateAverageReplies() {
        try {
            const tweets = await this.client.v2.userTimeline((await this.client.currentUserV2()).data.id, {
                max_results: 10,
                'tweet.fields': ['public_metrics']
            });
            if (!tweets.data.length)
                return 0;
            const totalReplies = tweets.data.reduce((sum, tweet) => sum + tweet.public_metrics.reply_count, 0);
            return totalReplies / tweets.data.length;
        }
        catch (error) {
            return 0;
        }
    }
    async calculateAverageRetweets() {
        try {
            const tweets = await this.client.v2.userTimeline((await this.client.currentUserV2()).data.id, {
                max_results: 10,
                'tweet.fields': ['public_metrics']
            });
            if (!tweets.data.length)
                return 0;
            const totalRetweets = tweets.data.reduce((sum, tweet) => sum + tweet.public_metrics.retweet_count, 0);
            return totalRetweets / tweets.data.length;
        }
        catch (error) {
            return 0;
        }
    }
    async getTopPerformingTweets() {
        try {
            const tweets = await this.client.v2.userTimeline((await this.client.currentUserV2()).data.id, {
                max_results: 20,
                'tweet.fields': ['public_metrics']
            });
            if (!tweets.data.length)
                return [];
            // Sort by total engagement and return top 5
            const sorted = tweets.data
                .sort((a, b) => {
                const aEngagement = a.public_metrics.like_count +
                    a.public_metrics.reply_count +
                    a.public_metrics.retweet_count;
                const bEngagement = b.public_metrics.like_count +
                    b.public_metrics.reply_count +
                    b.public_metrics.retweet_count;
                return bEngagement - aEngagement;
            })
                .slice(0, 5)
                .map(tweet => tweet.id);
            return sorted;
        }
        catch (error) {
            return [];
        }
    }
    handleTwitterError(error) {
        if (error.code === 429 || error.status === 429) {
            const resetTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            throw new RateLimitError('twitter', resetTime);
        }
        if (error.code === 401 || error.status === 401) {
            throw new AuthenticationError('twitter', 'Invalid credentials');
        }
        throw new SocialMediaError(error.message || 'Unknown Twitter API error', 'twitter', error.code?.toString());
    }
}
// services/platforms/LinkedInService.ts
import axios from 'axios';
export class LinkedInService {
    constructor() {
        this.platform = 'linkedin';
        this.personId = '';
        this.logger = new Logger('LinkedInService');
        this.baseURL = 'https://api.linkedin.com/v2';
        this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
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
            this.logger.error('LinkedIn authentication failed:', error);
            throw new AuthenticationError('linkedin', error.response?.data?.message || error.message);
        }
    }
    async post(content) {
        try {
            this.validateContent(content);
            const postData = {
                author: `urn:li:person:${this.personId}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: content.content
                        },
                        shareMediaCategory: content.mediaUrls.length > 0 ? 'IMAGE' : 'NONE'
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            };
            // Add media if present
            if (content.mediaUrls.length > 0) {
                const mediaAssets = await this.uploadMedia(content.mediaUrls);
                postData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets;
            }
            const response = await axios.post(`${this.baseURL}/ugcPosts`, postData, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            const postId = this.extractPostId(response.headers['x-linkedin-id']);
            this.logger.info(`LinkedIn post created successfully: ${postId}`);
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
                id: crypto.randomUUID(),
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
    validateContent(content) {
        if (content.content.length > 63206) {
            throw new SocialMediaError('Facebook post exceeds character limit', 'facebook', 'CONTENT_TOO_LONG');
        }
    }
    async getTopPerformingPosts() {
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
                .map(post => ({
                id: post.id,
                engagement: (post.likes?.summary?.total_count || 0) +
                    (post.comments?.summary?.total_count || 0) +
                    (post.shares?.count || 0)
            }))
                .sort((a, b) => b.engagement - a.engagement)
                .slice(0, 5)
                .map(post => post.id);
        }
        catch (error) {
            return [];
        }
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
        throw new SocialMediaError(errorData?.message || error.message || 'Unknown Facebook API error', 'facebook', errorData?.code?.toString());
    }
}
export class InstagramService {
    constructor() {
        this.platform = 'instagram';
        this.logger = new Logger('InstagramService');
        this.baseURL = 'https://graph.facebook.com/v18.0';
        this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        this.businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
    }
    async authenticate() {
        try {
            const response = await axios.get(`${this.baseURL}/${this.businessAccountId}`, {
                params: {
                    fields: 'name,username',
                    access_token: this.accessToken
                }
            });
            this.logger.info(`Authenticated as @${response.data.username}`);
            return true;
        }
        catch (error) {
            this.logger.error('Instagram authentication failed:', error);
            throw new AuthenticationError('instagram', error.response?.data?.error?.message || error.message);
        }
    }
    async post(content) {
        try {
            this.validateContent(content);
            if (content.mediaUrls.length === 0) {
                throw new SocialMediaError('Instagram posts require at least one image or video', 'instagram', 'NO_MEDIA');
            }
            // Create media container
            const containerResponse = await this.createMediaContainer(content);
            const containerId = containerResponse.data.id;
            // Publish the container
            const publishResponse = await axios.post(`${this.baseURL}/${this.businessAccountId}/media_publish`, {
                creation_id: containerId,
                access_token: this.accessToken
            });
            this.logger.info(`Instagram post published successfully: ${publishResponse.data.id}`);
            return publishResponse.data.id;
        }
        catch (error) {
            this.handleInstagramError(error);
            throw error;
        }
    }
    async createMediaContainer(content) {
        const mediaData = {
            access_token: this.accessToken
        };
        if (content.mediaUrls.length === 1) {
            // Single image/video post
            const mediaUrl = content.mediaUrls[0];
            const isVideo = this.isVideoUrl(mediaUrl);
            mediaData[isVideo ? 'video_url' : 'image_url'] = mediaUrl;
            mediaData.caption = content.content;
            return await axios.post(`${this.baseURL}/${this.businessAccountId}/media`, mediaData);
        }
        else {
            // Carousel post (multiple images)
            const children = [];
            for (const mediaUrl of content.mediaUrls) {
                const isVideo = this.isVideoUrl(mediaUrl);
                const childData = {
                    [isVideo ? 'video_url' : 'image_url']: mediaUrl,
                    access_token: this.accessToken
                };
                const childResponse = await axios.post(`${this.baseURL}/${this.businessAccountId}/media`, childData);
                children.push(childResponse.data.id);
            }
            // Create carousel container
            return await axios.post(`${this.baseURL}/${this.businessAccountId}/media`, {
                media_type: 'CAROUSEL',
                children: children.join(','),
                caption: content.content,
                access_token: this.accessToken
            });
        }
    }
    async getMetrics() {
        try {
            const response = await axios.get(`${this.baseURL}/${this.businessAccountId}`, {
                params: {
                    fields: 'followers_count,follows_count,media_count',
                    access_token: this.accessToken
                }
            });
            // Get recent media for engagement calculation
            const mediaResponse = await axios.get(`${this.baseURL}/${this.businessAccountId}/media`, {
                params: {
                    fields: 'id,likes_count,comments_count,timestamp',
                    limit: 10,
                    access_token: this.accessToken
                }
            });
            const media = mediaResponse.data.data || [];
            const totalLikes = media.reduce((sum, item) => sum + (item.likes_count || 0), 0);
            const totalComments = media.reduce((sum, item) => sum + (item.comments_count || 0), 0);
            return {
                id: crypto.randomUUID(),
                platform: 'instagram',
                followersCount: response.data.followers_count || 0,
                followingCount: response.data.follows_count || 0,
                postsCount: response.data.media_count || 0,
                engagementRate: media.length > 0 ?
                    ((totalLikes + totalComments) / (media.length * response.data.followers_count)) * 100 : 0,
                growthRate: 0, // Requires historical data
                averageLikes: media.length > 0 ? totalLikes / media.length : 0,
                averageComments: media.length > 0 ? totalComments / media.length : 0,
                averageShares: 0, // Instagram doesn't have shares
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
                params: { access_token: this.accessToken }
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
        // Instagram API doesn't support native scheduling for regular posts
        // Only available for Instagram Creator accounts with specific permissions
        throw new Error('Instagram API does not support native post scheduling for business accounts');
    }
    validateContent(content) {
        if (content.content.length > 2200) {
            throw new SocialMediaError('Instagram caption exceeds 2200 character limit', 'instagram', 'CONTENT_TOO_LONG');
        }
        if (content.mediaUrls.length > 10) {
            throw new SocialMediaError('Instagram carousel supports maximum 10 items', 'instagram', 'TOO_MANY_MEDIA');
        }
    }
    isVideoUrl(url) {
        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
        return videoExtensions.some(ext => url.toLowerCase().includes(ext));
    }
    async getTopPerformingPosts() {
        try {
            const response = await axios.get(`${this.baseURL}/${this.businessAccountId}/media`, {
                params: {
                    fields: 'id,likes_count,comments_count',
                    limit: 20,
                    access_token: this.accessToken
                }
            });
            const media = response.data.data || [];
            return media
                .map(item => ({
                id: item.id,
                engagement: (item.likes_count || 0) + (item.comments_count || 0)
            }))
                .sort((a, b) => b.engagement - a.engagement)
                .slice(0, 5)
                .map(item => item.id);
        }
        catch (error) {
            return [];
        }
    }
    handleInstagramError(error) {
        const errorData = error.response?.data?.error;
        if (error.response?.status === 429 || errorData?.code === 4) {
            const resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            throw new RateLimitError('instagram', resetTime);
        }
        if (error.response?.status === 401 || errorData?.code === 190) {
            throw new AuthenticationError('instagram', 'Invalid access token');
        }
        throw new SocialMediaError(errorData?.message || error.message || 'Unknown Instagram API error', 'instagram', errorData?.code?.toString());
    }
}
//# sourceMappingURL=social-media-services.js.map