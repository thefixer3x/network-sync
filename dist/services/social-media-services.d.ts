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
    private calculateGrowthRate;
    private calculateAverageLikes;
    private calculateAverageReplies;
    private calculateAverageRetweets;
    private getTopPerformingTweets;
    private handleTwitterError;
}
export declare class LinkedInService implements SocialMediaService {
    platform: "linkedin";
    private accessToken;
    private personId;
    private logger;
    private baseURL;
    constructor();
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
export declare class InstagramService implements SocialMediaService {
    platform: "instagram";
    private accessToken;
    private businessAccountId;
    private logger;
    private baseURL;
    constructor();
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
    private createMediaContainer;
    getMetrics(): Promise<AccountMetrics>;
    deletePost(postId: string): Promise<boolean>;
    schedulePost(content: Content): Promise<string>;
    private validateContent;
    private isVideoUrl;
    private getTopPerformingPosts;
    private handleInstagramError;
}
//# sourceMappingURL=social-media-services.d.ts.map