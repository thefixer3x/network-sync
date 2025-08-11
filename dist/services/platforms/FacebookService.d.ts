import { SocialMediaService, Content, AccountMetrics } from '../../types/typescript-types';
export declare class FacebookService implements SocialMediaService {
    platform: "facebook";
    private baseURL;
    private accessToken;
    private pageId;
    private logger;
    constructor(accessToken: string, pageId?: string);
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
    getMetrics(): Promise<AccountMetrics>;
    deletePost(postId: string): Promise<boolean>;
    schedulePost(content: Content): Promise<string>;
    private validateContent;
    private uploadMedia;
    private extractPostId;
    private getPostsCount;
    private getTopPerformingPosts;
    private calculateEngagementRate;
    private calculateAverageLikes;
    private calculateAverageComments;
    private calculateAverageShares;
    private handleFacebookError;
}
//# sourceMappingURL=FacebookService.d.ts.map