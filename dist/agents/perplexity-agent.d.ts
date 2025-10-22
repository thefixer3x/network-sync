/**
 * Perplexity Agent - Specialized for Research & Real-time Data
 */
export declare class PerplexityAgent {
    private config;
    private apiEndpoint;
    constructor();
    /**
     * Perform research with web search capabilities
     */
    research(params: {
        query: string;
        sources?: string[];
        maxResults?: number;
        includeImages?: boolean;
    }): Promise<{
        summary: string;
        fullContent: any;
        citations: any;
        images: any;
        metadata: {
            model: any;
            timestamp: Date;
            tokenUsage: any;
        };
    }>;
    /**
     * Fact-check content against current web data
     */
    factCheck(content: string, claims: string[]): Promise<{
        claims: {
            claim: string;
            verification: {
                summary: string;
                fullContent: any;
                citations: any;
                images: any;
                metadata: {
                    model: any;
                    timestamp: Date;
                    tokenUsage: any;
                };
            } | undefined;
            confidence: number;
        }[];
        overallAccuracy: number;
    }>;
    /**
     * Monitor trending topics in real-time
     */
    getTrendingTopics(params: {
        category?: string;
        region?: string;
        timeframe?: string;
    }): Promise<{
        summary: string;
        fullContent: any;
        citations: any;
        images: any;
        metadata: {
            model: any;
            timestamp: Date;
            tokenUsage: any;
        };
    }>;
    /**
     * Competitive analysis through web research
     */
    analyzeCompetitor(params: {
        competitor: string;
        aspects: string[];
    }): Promise<{
        competitor: string;
        analysis: {
            aspect: string;
            findings: {
                summary: string;
                fullContent: any;
                citations: any;
                images: any;
                metadata: {
                    model: any;
                    timestamp: Date;
                    tokenUsage: any;
                };
            } | undefined;
        }[];
        timestamp: Date;
    }>;
    /**
     * Format research results with citations
     */
    private formatResearchResults;
    private extractSummary;
    private calculateConfidence;
    private calculateOverallAccuracy;
}
//# sourceMappingURL=perplexity-agent.d.ts.map