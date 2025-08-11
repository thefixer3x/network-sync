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
import { SocialMediaError, AuthenticationError } from '@/types';
import { Logger } from '@/utils/Logger';
export class TwitterService {
    constructor() {
        this.platform = 'twitter';
        this.logger = new Logger('TwitterService');
        this.client = new TwitterApi({
            appKey: process.env["TWITTER_API_KEY"],
            appSecret: process.env["TWITTER_API_SECRET"],
            accessToken: process.env["TWITTER_ACCESS_TOKEN"],
            accessSecret: process.env["TWITTER_ACCESS_TOKEN_SECRET"],
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
}
//# sourceMappingURL=TwitterService.js.map