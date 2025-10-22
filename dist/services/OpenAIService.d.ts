import { AIService, SocialPlatform, Trend } from '@/types';
export declare class OpenAIService implements AIService {
    private readonly client;
    private readonly logger;
    constructor();
    generateContent(prompt: string, _context?: unknown): Promise<string>;
    enhanceContent(content: string, platform: SocialPlatform): Promise<string>;
    analyzeTrends(trends: string[]): Promise<Trend[]>;
    optimizeForPlatform(content: string, platform: SocialPlatform): Promise<string>;
    private getPlatformSpecifications;
}
//# sourceMappingURL=OpenAIService.d.ts.map