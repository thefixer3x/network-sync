import { SocialMediaService, Content, AccountMetrics } from '../../types/typescript-types';
export declare class TwitterService implements SocialMediaService {
    platform: "twitter";
    private client;
    private logger;
    constructor(apiKey: string, apiSecret: string, accessToken: string, accessSecret: string);
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
    getMetrics(): Promise<AccountMetrics>;
    deletePost(postId: string): Promise<boolean>;
    schedulePost(content: Content): Promise<string>;
    private validateContent;
    private uploadMedia;
    private calculateEngagementRate;
    private calculateAverageLikes;
    private calculateAverageComments;
    private calculateAverageShares;
    private getTopPerformingPosts;
    private handleTwitterError;
}
//# sourceMappingURL=TwitterService.d.ts.map