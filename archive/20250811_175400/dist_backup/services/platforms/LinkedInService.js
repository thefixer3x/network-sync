async;
calculateGrowthRate();
Promise < number > {
    // This would require historical data storage
    // For now, return 0 and implement based on stored metrics
    return: 0
};
async;
calculateAverageLikes();
Promise < number > {
    try: {
        const: tweets = await this.client.v2.userTimeline((await this.client.currentUserV2()).data.id, {
            max_results: 10,
            'tweet.fields': ['public_metrics']
        }),
        if(, tweets) { }, : .data.length, return: 0,
        const: totalLikes = tweets.data.reduce((sum, tweet) => sum + tweet.public_metrics.like_count, 0),
        return: totalLikes / tweets.data.length
    }, catch(error) {
        return 0;
    }
};
async;
calculateAverageReplies();
Promise < number > {
    try: {
        const: tweets = await this.client.v2.userTimeline((await this.client.currentUserV2()).data.id, {
            max_results: 10,
            'tweet.fields': ['public_metrics']
        }),
        if(, tweets) { }, : .data.length, return: 0,
        const: totalReplies = tweets.data.reduce((sum, tweet) => sum + tweet.public_metrics.reply_count, 0),
        return: totalReplies / tweets.data.length
    }, catch(error) {
        return 0;
    }
};
async;
calculateAverageRetweets();
Promise < number > {
    try: {
        const: tweets = await this.client.v2.userTimeline((await this.client.currentUserV2()).data.id, {
            max_results: 10,
            'tweet.fields': ['public_metrics']
        }),
        if(, tweets) { }, : .data.length, return: 0,
        const: totalRetweets = tweets.data.reduce((sum, tweet) => sum + tweet.public_metrics.retweet_count, 0),
        return: totalRetweets / tweets.data.length
    }, catch(error) {
        return 0;
    }
};
async;
getTopPerformingTweets();
Promise < string[] > {
    try: {
        const: tweets = await this.client.v2.userTimeline((await this.client.currentUserV2()).data.id, {
            max_results: 20,
            'tweet.fields': ['public_metrics']
        }),
        if(, tweets) { }, : .data.length, return: [],
        // Sort by total engagement and return top 5
        const: sorted = tweets.data
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
            .map(tweet => tweet.id),
        return: sorted
    }, catch(error) {
        return [];
    }
};
handleTwitterError(error, any);
void {
    if(error) { }, : .code === 429 || error.status === 429
};
{
    const resetTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    throw new RateLimitError('twitter', resetTime);
}
if (error.code === 401 || error.status === 401) {
    throw new AuthenticationError('twitter', 'Invalid credentials');
}
throw new SocialMediaError(error.message || 'Unknown Twitter API error', 'twitter', error.code?.toString());
// services/platforms/LinkedInService.ts
import axios from 'axios';
import { SocialMediaError, RateLimitError } from '@/types';
import { Logger } from '@/utils/Logger';
export class LinkedInService {
    constructor() {
        this.platform = 'linkedin';
        this.personId = '';
        this.logger = new Logger('LinkedInService');
        this.baseURL = 'https://api.linkedin.com/v2';
        this.accessToken = process.env["LINKEDIN_ACCESS_TOKEN"];
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
        }
        finally {
        }
    }
}
//# sourceMappingURL=LinkedInService.js.map