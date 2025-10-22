import { TwitterService } from './platforms/TwitterService';
import { LinkedInService } from './platforms/LinkedInService';
import { FacebookService } from './platforms/FacebookService';
import { InstagramService } from './platforms/InstagramService';
export class SocialMediaFactory {
    static create(platform, credentials = {}) {
        switch (platform) {
            case 'twitter':
                return new TwitterService({
                    ...(credentials.apiKey ? { apiKey: credentials.apiKey } : {}),
                    ...(credentials.apiSecret ? { apiSecret: credentials.apiSecret } : {}),
                    ...(credentials.accessToken ? { accessToken: credentials.accessToken } : {}),
                    ...(credentials.accessSecret ? { accessSecret: credentials.accessSecret } : {})
                });
            case 'linkedin':
                return new LinkedInService({
                    ...(credentials.accessToken ? { accessToken: credentials.accessToken } : {}),
                    ...(credentials.personId ? { personId: credentials.personId } : {})
                });
            case 'facebook':
                return new FacebookService({
                    ...(credentials.accessToken ? { accessToken: credentials.accessToken } : {}),
                    ...(credentials.pageId ? { pageId: credentials.pageId } : {})
                });
            case 'instagram':
                return new InstagramService({
                    ...(credentials.accessToken ? { accessToken: credentials.accessToken } : {}),
                    ...(credentials.instagramAccountId ? { instagramAccountId: credentials.instagramAccountId } : {})
                });
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
    static validateCredentials(platform, credentials) {
        switch (platform) {
            case 'twitter':
                return Boolean((credentials.apiKey || process.env['TWITTER_API_KEY']) &&
                    (credentials.apiSecret || process.env['TWITTER_API_SECRET']) &&
                    (credentials.accessToken || process.env['TWITTER_ACCESS_TOKEN']) &&
                    (credentials.accessSecret || process.env['TWITTER_ACCESS_SECRET'] || process.env['TWITTER_ACCESS_TOKEN_SECRET']));
            case 'linkedin':
                return Boolean(credentials.accessToken || process.env['LINKEDIN_ACCESS_TOKEN']);
            case 'facebook':
                return Boolean(credentials.accessToken || process.env['FACEBOOK_ACCESS_TOKEN']);
            case 'instagram':
                return Boolean(credentials.accessToken || process.env['INSTAGRAM_ACCESS_TOKEN']);
            default:
                return false;
        }
    }
}
//# sourceMappingURL=SocialMediaFactory.js.map