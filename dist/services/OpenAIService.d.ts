export declare class OpenAIService {
    private client;
    private logger;
    constructor(apiKey?: string);
    generateContent(prompt: string, maxTokens?: number): Promise<string>;
    enhanceContent(content: string, platform: string): Promise<string>;
    analyzeSentiment(text: string): Promise<{
        score: number;
        sentiment: string;
    }>;
    generateHashtags(content: string, platform: string, count?: number): Promise<string[]>;
}
//# sourceMappingURL=OpenAIService.d.ts.map