import { SocialMediaService, Content, AccountMetrics } from '../../types/typescript-types';
export declare class LinkedInService implements SocialMediaService {
    platform: "linkedin";
    private baseURL;
    private accessToken;
    private personId;
    private logger;
    constructor(accessToken: string, personId?: string);
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
    getMetrics(): Promise<AccountMetrics>;
    deletePost(postId: string): Promise<boolean>;
    schedulePost(content: Content): Promise<string>;
    private validateContent;
    private uploadMedia;
    private extractPostId;
    private getPostsCount;
    private calculateEngagementRate;
    private calculateAverageLikes;
    private calculateAverageComments;
    private calculateAverageShares;
    private getTopPerformingPosts;
    private handleLinkedInError;
}
//# sourceMappingURL=LinkedInService.d.ts.map