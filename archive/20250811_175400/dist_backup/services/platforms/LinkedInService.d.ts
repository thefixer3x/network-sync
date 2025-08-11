import { SocialMediaService, Content } from '@/types';
export declare class LinkedInService implements SocialMediaService {
    platform: "linkedin";
    private accessToken;
    private personId;
    private logger;
    private baseURL;
    constructor();
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
}
//# sourceMappingURL=LinkedInService.d.ts.map