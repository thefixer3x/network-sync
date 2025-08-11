import { TwitterService } from './platforms/TwitterService';
import { LinkedInService } from './platforms/LinkedInService';
import { FacebookService } from './platforms/FacebookService';
import { InstagramService } from './platforms/InstagramService';
export class SocialMediaFactory {
    static create(platform, credentials) {
        switch (platform) {
            case 'twitter':
                return new TwitterService(credentials.apiKey, credentials.apiSecret, credentials.accessToken, credentials.accessSecret);
            case 'linkedin':
                return new LinkedInService(credentials.accessToken, credentials.personId);
            case 'facebook':
                return new FacebookService(credentials.accessToken, credentials.pageId);
            case 'instagram':
                return new InstagramService(credentials.accessToken, credentials.instagramAccountId);
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
    static validateCredentials(platform, credentials) {
        switch (platform) {
            case 'twitter':
                return !!(credentials.apiKey &&
                    credentials.apiSecret &&
                    credentials.accessToken &&
                    credentials.accessSecret);
            case 'linkedin':
                return !!credentials.accessToken;
            case 'facebook':
                return !!credentials.accessToken;
            case 'instagram':
                return !!credentials.accessToken;
            default:
                return false;
        }
    }
}
//# sourceMappingURL=SocialMediaFactory.js.map