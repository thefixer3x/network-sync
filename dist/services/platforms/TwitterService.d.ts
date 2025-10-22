import { SocialMediaService, Content, AccountMetrics } from '../../types/typescript-types';
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
    private calculateGrowthRate;
    private calculateAverageLikes;
    private calculateAverageReplies;
    private calculateAverageRetweets;
    private getTopPerformingTweets;
    private handleTwitterError;
}
//# sourceMappingURL=TwitterService.d.ts.map