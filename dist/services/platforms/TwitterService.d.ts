import { SocialPlatform, SocialMediaService } from '@/types';
export declare class SocialMediaFactory {
    static create(platform: SocialPlatform): SocialMediaService;
}
import { Content, AccountMetrics } from '@/types';
export declare class TwitterService implements SocialMediaService {
    platform: "twitter";
    private client;
    private logger;
    constructor();
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
    getMetrics(): Promise<AccountMetrics>;
    deletePost(postId: string): Promise<boolean>;
    schedulePost(content: Content): Promise<string>;
    private validateContent;
    private uploadMedia;
    private calculateEngagementRate;
}
//# sourceMappingURL=TwitterService.d.ts.map