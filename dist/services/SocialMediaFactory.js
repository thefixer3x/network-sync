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
//# sourceMappingURL=SocialMediaFactory.js.map