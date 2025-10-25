import { SocialMediaService, Content, AccountMetrics } from '../../types/typescript-types';
type LinkedInCredentials = Partial<{
    accessToken: string;
    personId: string;
}>;
export declare class LinkedInService implements SocialMediaService {
    platform: "linkedin";
    private accessToken;
    private personId;
    private logger;
    private baseURL;
    constructor(credentials?: LinkedInCredentials);
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
export {};
//# sourceMappingURL=LinkedInService.d.ts.map