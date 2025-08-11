import { SocialMediaService } from '@/types';
export declare class InstagramService implements SocialMediaService {
    platform: "instagram";
    private accessToken;
    private businessAccountId;
    private logger;
    private baseURL;
    constructor();
    authenticate(): Promise<boolean>;
}
//# sourceMappingURL=SocialMediaFactory.d.ts.map