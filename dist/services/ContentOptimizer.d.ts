import { SocialPlatform, Content } from '../types/typescript-types';
export declare class ContentOptimizer {
    private logger;
    optimizeForPlatform(content: Content, platform: SocialPlatform): Promise<Content>;
    private getPlatformSpecs;
    private truncateText;
    private optimizeHashtags;
    addCallToAction(content: Content, platform: SocialPlatform): Promise<Content>;
}
//# sourceMappingURL=ContentOptimizer.d.ts.map