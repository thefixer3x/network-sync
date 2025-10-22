import { SocialMediaService, Content, AccountMetrics } from '../../types/typescript-types';
export declare class FacebookService implements SocialMediaService {
    platform: "facebook";
    private accessToken;
    private pageId;
    private logger;
    private baseURL;
    constructor();
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
    private postMultipleImages;
    getMetrics(): Promise<AccountMetrics>;
    deletePost(postId: string): Promise<boolean>;
    schedulePost(content: Content): Promise<string>;
    private validateContent;
    private getTopPerformingPosts;
    private handleFacebookError;
}
//# sourceMappingURL=FacebookService.d.ts.map