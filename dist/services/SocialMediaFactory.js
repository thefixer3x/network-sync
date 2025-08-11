validateContent(content, Content);
void {
    if(content) { }, : .content.length > 63206
};
{
    throw new SocialMediaError('Facebook post exceeds character limit', 'facebook', 'CONTENT_TOO_LONG');
}
async;
getTopPerformingPosts();
Promise < string[] > {
    try: {
        const: endpoint = this.pageId
            ? `${this.baseURL}/${this.pageId}/posts`
            : `${this.baseURL}/me/posts`,
        const: response = await axios.get(endpoint, {
            params: {
                fields: 'id,likes.summary(true),comments.summary(true),shares',
                limit: 20,
                access_token: this.accessToken
            }
        }),
        const: posts = response.data.data || [],
        return: posts
            .map(post => ({
            id: post.id,
            engagement: (post.likes?.summary?.total_count || 0) +
                (post.comments?.summary?.total_count || 0) +
                (post.shares?.count || 0)
        }))
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, 5)
            .map(post => post.id)
    }, catch(error) {
        return [];
    }
};
handleFacebookError(error, any);
void {
    const: errorData = error.response?.data?.error,
    if(error) { }, : .response?.status === 429 || errorData?.code === 4
};
{
    const resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    throw new RateLimitError('facebook', resetTime);
}
if (error.response?.status === 401 || errorData?.code === 190) {
    throw new AuthenticationError('facebook', 'Invalid access token');
}
throw new SocialMediaError(errorData?.message || error.message || 'Unknown Facebook API error', 'facebook', errorData?.code?.toString());
// services/platforms/InstagramService.ts
import axios from 'axios';
import { Content, SocialMediaError } from '@/types';
import { Logger } from '@/utils/Logger';
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
}
//# sourceMappingURL=SocialMediaFactory.js.map