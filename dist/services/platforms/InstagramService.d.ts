import { SocialMediaService, Content, AccountMetrics } from '../../types/typescript-types';
type InstagramCredentials = Partial<{
    accessToken: string;
    instagramAccountId: string;
}>;
export declare class InstagramService implements SocialMediaService {
    platform: "instagram";
    private accessToken;
    private businessAccountId;
    private logger;
    private baseURL;
    constructor(credentials?: InstagramCredentials);
    authenticate(): Promise<boolean>;
    post(content: Content): Promise<string>;
    private createMediaContainers;
    getMetrics(): Promise<AccountMetrics>;
    deletePost(postId: string): Promise<boolean>;
    schedulePost(content: Content): Promise<string>;
    private validateContent;
    private getTopPerformingPosts;
    private handleInstagramError;
}
export {};
//# sourceMappingURL=InstagramService.d.ts.map