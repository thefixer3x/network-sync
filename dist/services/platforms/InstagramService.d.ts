import { SocialMediaService, Content, AccountMetrics } from '../../types/typescript-types';
export declare class InstagramService implements SocialMediaService {
    platform: "instagram";
    private baseURL;
    private accessToken;
    private instagramAccountId;
    private logger;
    constructor(accessToken: string, instagramAccountId?: string);
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
    getMetrics(): Promise<AccountMetrics>;
    deletePost(postId: string): Promise<boolean>;
    schedulePost(content: Content): Promise<string>;
    private validateContent;
    private calculateEngagementRate;
    private calculateAverageLikes;
    private calculateAverageComments;
    private getTopPerformingPosts;
    private handleInstagramError;
}
//# sourceMappingURL=InstagramService.d.ts.map