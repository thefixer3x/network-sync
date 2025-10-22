import { randomUUID } from 'node:crypto';
import { Logger } from '@/utils/Logger';
import { OpenAIService } from './OpenAIService';
function parseJson(input) {
    try {
        return JSON.parse(input);
    }
    catch {
        return null;
    }
}
export class TrendAnalyzer {
    constructor() {
        this.logger = new Logger('TrendAnalyzer');
        this.aiService = new OpenAIService();
    }
    async getTrendingTopics(keywords, industries = []) {
        try {
            const trends = [];
            trends.push(...(await this.getGoogleTrends(keywords)));
            if (process.env['TWITTER_API_KEY']) {
                trends.push(...(await this.getTwitterTrends()));
            }
            for (const industry of industries) {
                trends.push(...(await this.getIndustryTrends(industry)));
            }
            const analyzedTrends = await this.analyzeTrendRelevance(trends, keywords.join(' '));
            return analyzedTrends.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 20);
        }
        catch (error) {
            this.logger.error('Failed to gather trending topics:', error);
            return [];
        }
    }
    async analyzeTrendRelevance(trends, context) {
        try {
            const batchSize = 10;
            const analyzedTrends = [];
            for (let index = 0; index < trends.length; index += batchSize) {
                const batch = trends.slice(index, index + batchSize);
                const prompt = `Analyze these trending topics for relevance to business development and professional content creation:

Context: ${context}
Trends: ${batch.map((trend) => trend.topic).join(', ')}

For each trend, assess:
1. Relevance for business professionals (0-1 score)
2. Content creation potential (0-1 score)
3. Audience engagement potential (0-1 score)

Return JSON array with relevance scores:
[
  {
    "topic": "trend name",
    "relevanceScore": 0.8,
    "contentPotential": 0.9,
    "engagementPotential": 0.7,
    "reasoning": "brief explanation"
  }
]`;
                const analysisJson = await this.aiService.generateContent(prompt);
                const analysis = parseJson(analysisJson) ?? [];
                batch.forEach((trend) => {
                    const scores = analysis.find((item) => item.topic.toLowerCase() === trend.topic.toLowerCase());
                    if (scores && typeof scores.relevanceScore === 'number') {
                        trend.relevanceScore = scores.relevanceScore;
                        const trendMetadata = trend;
                        trendMetadata['contentPotential'] = scores.contentPotential ?? null;
                        trendMetadata['engagementPotential'] = scores.engagementPotential ?? null;
                        trendMetadata['reasoning'] = scores.reasoning ?? null;
                    }
                    analyzedTrends.push(trend);
                });
            }
            this.logger.info(`Analyzed ${analyzedTrends.length} trends for relevance.`);
            return analyzedTrends;
        }
        catch (error) {
            this.logger.error('Trend relevance analysis failed:', error);
            return trends;
        }
    }
    async getRelatedKeywords(topic) {
        try {
            const prompt = `Generate 8-10 related keywords and phrases for the topic: "${topic}"

Focus on:
- Business and professional terminology
- Industry-specific terms
- Hashtag-friendly keywords
- Synonyms and variations

Return as a simple list, one per line.`;
            const result = await this.aiService.generateContent(prompt);
            return result
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0 && !line.startsWith('-'))
                .slice(0, 10);
        }
        catch (error) {
            this.logger.error('Related keywords generation failed:', error);
            return [topic];
        }
    }
    async getGoogleTrends(keywords) {
        try {
            const trends = keywords.map((keyword) => ({
                id: randomUUID(),
                topic: keyword,
                platform: 'twitter',
                volume: Math.floor(Math.random() * 10000) + 1000,
                sentimentScore: (Math.random() - 0.5) * 2,
                relevanceScore: Math.random(),
                keywords: [keyword],
                discoveredAt: new Date(),
                sourceUrls: [`https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}`]
            }));
            this.logger.info(`Generated ${trends.length} simulated Google trends.`);
            return trends;
        }
        catch (error) {
            this.logger.error('Google Trends fetch failed:', error);
            return [];
        }
    }
    async getTwitterTrends() {
        try {
            this.logger.info('Twitter trends not implemented yet.');
            return [];
        }
        catch (error) {
            this.logger.error('Twitter Trends fetch failed:', error);
            return [];
        }
    }
    async getIndustryTrends(industry) {
        try {
            const prompt = `Generate 5 current trending topics in the ${industry} industry that would be relevant for business professionals and social media content.

For each topic, provide:
- The trend name/topic
- Key related keywords (2-3)
- Estimated discussion volume (low/medium/high)

Return as JSON array:
[
  {
    "topic": "trend name",
    "keywords": ["keyword1", "keyword2"],
    "volume": "medium"
  }
]`;
            const rawResult = await this.aiService.generateContent(prompt);
            const industryData = parseJson(rawResult);
            if (!industryData) {
                throw new Error('Unable to parse industry trend data.');
            }
            return industryData.map((item) => ({
                id: randomUUID(),
                topic: item.topic,
                platform: 'twitter',
                volume: this.volumeToNumber(item.volume),
                sentimentScore: 0.1,
                relevanceScore: 0.8,
                keywords: item.keywords,
                discoveredAt: new Date(),
                sourceUrls: []
            }));
        }
        catch (error) {
            this.logger.error(`Failed to get ${industry} trends:`, error);
            return [];
        }
    }
    volumeToNumber(volume) {
        switch (volume.toLowerCase()) {
            case 'high':
                return Math.floor(Math.random() * 5000) + 5000;
            case 'medium':
                return Math.floor(Math.random() * 3000) + 1000;
            case 'low':
                return Math.floor(Math.random() * 1000) + 100;
            default:
                return Math.floor(Math.random() * 1000) + 500;
        }
    }
}
//# sourceMappingURL=TrendAnalyzer.js.map