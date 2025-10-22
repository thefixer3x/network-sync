import { SocialPlatform, SocialMediaService } from '@/types';
export type PlatformCredentials = {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    accessSecret?: string;
    personId?: string;
    pageId?: string;
    instagramAccountId?: string;
};
export declare class SocialMediaFactory {
    static create(platform: SocialPlatform, credentials?: PlatformCredentials): SocialMediaService;
    static validateCredentials(platform: SocialPlatform, credentials: PlatformCredentials): boolean;
}
//# sourceMappingURL=SocialMediaFactory.d.ts.map