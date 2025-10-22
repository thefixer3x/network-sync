/**
 * Claude Agent - Specialized for High-Quality Writing & Analysis
 */
type ClaudePlatform = 'twitter' | 'linkedin' | 'instagram' | 'blog' | 'email';
type FormattedContent = {
    content: string;
    format?: string;
    metadata: {
        model: unknown;
        tokenUsage: unknown;
        generatedAt: Date;
    };
    sections?: Record<string, string>;
};
export declare class ClaudeAgent {
    private config;
    private apiEndpoint;
    private brandVoices;
    constructor();
    private initializeBrandVoices;
    /**
     * Generate high-quality content with brand voice
     */
    generateContent(params: {
        prompt: string;
        context?: string;
        brandVoice?: string;
        format?: string;
        maxTokens?: number;
        sections?: string[];
    }): Promise<FormattedContent>;
    /**
     * Analyze content for insights and improvements
     */
    analyzeContent(params: {
        content: string;
        analysisType: 'sentiment' | 'readability' | 'engagement' | 'seo';
        targetAudience?: string;
    }): Promise<any>;
    /**
     * Rewrite content for different platforms
     */
    adaptContent(params: {
        content: string;
        fromPlatform: ClaudePlatform;
        toPlatform: ClaudePlatform;
        maintainMessage: boolean;
    }): Promise<string>;
    /**
     * Generate content variations for A/B testing
     */
    generateVariations(params: {
        baseContent: string;
        numberOfVariations: number;
        variationType: 'headline' | 'cta' | 'full';
        testingGoal: string;
    }): Promise<{
        id: string;
        content: string;
        hypothesis: string;
    }[]>;
    /**
     * Build system prompt based on brand voice
     */
    private buildSystemPrompt;
    /**
     * Build user prompt with context
     */
    private buildUserPrompt;
    /**
     * Format content based on type
     */
    private formatContent;
    /**
     * Extract sections from formatted content
     */
    private extractSections;
    /**
     * Parse analysis results
     */
    private parseAnalysis;
    /**
     * Generate hypothesis for A/B testing
     */
    private generateHypothesis;
}
export {};
//# sourceMappingURL=claude-agent.d.ts.map