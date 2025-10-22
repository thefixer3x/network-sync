/**
 * Perplexity Agent - Specialized for Research & Real-time Data
 */
const formatError = (error) => error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
export class PerplexityAgent {
    constructor() {
        this.apiEndpoint = 'https://api.perplexity.ai/chat/completions';
        this.config = {
            apiKey: process.env['PERPLEXITY_API_KEY'] || '',
            model: 'llama-3.1-sonar-large-128k-online',
            temperature: 0.2 // Lower for factual accuracy
        };
    }
    /**
     * Perform research with web search capabilities
     */
    async research(params) {
        const messages = [
            {
                role: 'system',
                content: `You are a research assistant. Provide comprehensive, factual information with sources.
                  Focus on: accuracy, recency, relevance, and credibility of sources.`
            },
            {
                role: 'user',
                content: params.query
            }
        ];
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages,
                    temperature: this.config.temperature,
                    max_tokens: 4000,
                    return_citations: true,
                    return_images: params.includeImages || false,
                    search_domain_filter: params.sources || [],
                    search_recency_filter: 'week' // Focus on recent data
                })
            });
            const data = await response.json();
            return this.formatResearchResults(data);
        }
        catch (error) {
            console.error('Perplexity research error:', error);
            throw new Error(`Research failed: ${formatError(error)}`);
        }
    }
    /**
     * Fact-check content against current web data
     */
    async factCheck(content, claims) {
        const checkPromises = claims.map(claim => this.research({
            query: `Fact check: ${claim}. Provide evidence for or against this claim.`,
            maxResults: 5
        }));
        const results = await Promise.all(checkPromises);
        return {
            claims: claims.map((claim, i) => ({
                claim,
                verification: results[i],
                confidence: this.calculateConfidence(results[i])
            })),
            overallAccuracy: this.calculateOverallAccuracy(results)
        };
    }
    /**
     * Monitor trending topics in real-time
     */
    async getTrendingTopics(params) {
        const query = `What are the current trending topics ${params.category ? `in ${params.category}` : ''} ${params.region ? `for ${params.region}` : ''} ${params.timeframe ? `over the past ${params.timeframe}` : 'today'}? Include engagement metrics and key discussions.`;
        return await this.research({
            query,
            sources: ['twitter', 'reddit', 'news'],
            maxResults: 20
        });
    }
    /**
     * Competitive analysis through web research
     */
    async analyzeCompetitor(params) {
        const analysisPromises = params.aspects.map(aspect => this.research({
            query: `Analyze ${params.competitor}'s ${aspect}: current strategy, recent changes, performance metrics`,
            maxResults: 10
        }));
        const results = await Promise.all(analysisPromises);
        return {
            competitor: params.competitor,
            analysis: params.aspects.map((aspect, i) => ({
                aspect,
                findings: results[i]
            })),
            timestamp: new Date()
        };
    }
    /**
     * Format research results with citations
     */
    formatResearchResults(data) {
        const citations = data.citations || [];
        const content = data.choices?.[0]?.message?.content || '';
        return {
            summary: this.extractSummary(content),
            fullContent: content,
            citations: citations.map((c) => ({
                title: c.title,
                url: c.url,
                snippet: c.snippet,
                relevanceScore: c.score || 0
            })),
            images: data.images || [],
            metadata: {
                model: data.model,
                timestamp: new Date(),
                tokenUsage: data.usage
            }
        };
    }
    extractSummary(content) {
        // Extract first paragraph or up to 280 characters
        const firstParagraph = content.split('\n\n')[0] ?? '';
        const trimmed = firstParagraph.trim();
        return trimmed.length > 280 ? `${trimmed.substring(0, 277)}...` : trimmed;
    }
    calculateConfidence(result) {
        // Calculate confidence based on citation quality and quantity
        const citations = result.citations || [];
        if (citations.length === 0)
            return 0.2;
        const avgRelevance = citations.reduce((acc, c) => acc + (c.relevanceScore || 0), 0) / citations.length;
        return Math.min(avgRelevance * (citations.length / 10), 1);
    }
    calculateOverallAccuracy(results) {
        const confidences = results.map(r => this.calculateConfidence(r));
        return confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }
}
//# sourceMappingURL=perplexity-agent.js.map