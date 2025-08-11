/**
 * Claude Agent - Specialized for High-Quality Writing & Analysis
 */
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
    }): Promise<any>;
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
        fromPlatform: string;
        toPlatform: string;
        maintainMessage: boolean;
    }): Promise<any>;
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
        content: any;
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
//# sourceMappingURL=claude-agent.d.ts.map