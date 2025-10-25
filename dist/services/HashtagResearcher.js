import { Logger } from '@/utils/Logger';
import { OpenAIService } from './OpenAIService';
import { TwitterApi } from 'twitter-api-v2';
export class HashtagResearcher {
    constructor() {
        this.logger = new Logger('HashtagResearcher');
        this.aiService = new OpenAIService();
        this.cache = new Map();
        this.cacheExpiry = 6 * 60 * 60 * 1000; // 6 hours
    }
    async researchHashtags(request) {
        try {
            this.logger.info(`Researching hashtags for ${request.topic} on ${request.platform}`);
            // Get trending hashtags
            const trending = await this.getTrendingHashtags(request.platform, request.industry);
            // Generate AI-powered hashtag suggestions
            const aiSuggestions = await this.generateAIHashtags(request);
            // Analyze competitor hashtags if provided
            const competitorAnalysis = request.competitorHashtags
                ? await this.analyzeCompetitorHashtags(request.competitorHashtags, request.platform)
                : [];
            // Get related hashtags from various sources
            const relatedHashtags = await this.getRelatedHashtags(request.topic, request.platform);
            // Combine and analyze all hashtags
            const allHashtags = [
                ...trending,
                ...aiSuggestions,
                ...competitorAnalysis,
                ...relatedHashtags
            ];
            // Remove duplicates and analyze each hashtag
            const uniqueHashtags = [...new Set(allHashtags)];
            const analyzedHashtags = await Promise.all(uniqueHashtags.map(hashtag => this.analyzeHashtag(hashtag, request.platform)));
            // Categorize hashtags into strategy
            const strategy = this.categorizeHashtags(analyzedHashtags, request);
            this.logger.success(`Generated hashtag strategy with ${strategy.primary.length} primary hashtags`);
            return strategy;
        }
        catch (error) {
            this.logger.error('Failed to research hashtags:', error);
            throw error;
        }
    }
    async getTrendingHashtags(platform, industry) {
        try {
            switch (platform) {
                case 'twitter':
                    return await this.getTwitterTrendingHashtags();
                case 'instagram':
                    return await this.getInstagramTrendingHashtags();
                default:
                    return await this.getGenericTrendingHashtags(platform, industry);
            }
        }
        catch (error) {
            this.logger.error(`Failed to get trending hashtags for ${platform}:`, error);
            return [];
        }
    }
    async getTwitterTrendingHashtags() {
        try {
            const twitterClient = new TwitterApi({
                appKey: process.env['TWITTER_API_KEY'],
                appSecret: process.env['TWITTER_API_SECRET'],
                accessToken: process.env['TWITTER_ACCESS_TOKEN'],
                accessSecret: process.env['TWITTER_ACCESS_TOKEN_SECRET'],
            });
            // Get trending topics (this requires Twitter API v1.1)
            // Note: Twitter API v2 has limited trending support, returning fallback hashtags
            try {
                const trends = await twitterClient.v1.trendsAvailable();
                const globalTrends = trends.find((location) => location.woeid === 1); // Worldwide
                if (globalTrends) {
                    // For now, return common trending hashtags as Twitter API access is limited
                    return [
                        '#trending', '#news', '#technology', '#social', '#business',
                        '#entertainment', '#sports', '#health', '#education', '#travel'
                    ];
                }
            }
            catch (apiError) {
                this.logger.warn('Twitter trending API unavailable, using fallback hashtags');
            }
            return [];
        }
        catch (error) {
            this.logger.error('Failed to get Twitter trending hashtags:', error);
            return [];
        }
    }
    async getInstagramTrendingHashtags() {
        // Instagram doesn't provide a public trending hashtags API
        // This would typically require third-party services or web scraping
        // For now, return common Instagram hashtags
        return [
            '#instagood', '#photooftheday', '#beautiful', '#love', '#happy',
            '#follow', '#like4like', '#instadaily', '#picoftheday', '#followme'
        ];
    }
    async getGenericTrendingHashtags(platform, industry) {
        // Use AI to generate trending hashtags based on current events
        const prompt = `Generate 10 currently trending hashtags for ${platform} in ${industry || 'general'} industry.
    
    Focus on:
    - Current events and trends
    - Industry-specific topics
    - Popular culture references
    - Seasonal trends
    - Business and professional topics
    
    Return only hashtags with # symbol, one per line:`;
        try {
            const result = await this.aiService.generateContent(prompt);
            return result
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('#'))
                .slice(0, 10);
        }
        catch (error) {
            this.logger.error('Failed to generate AI trending hashtags:', error);
            return [];
        }
    }
    async generateAIHashtags(request) {
        const prompt = `Generate 20 relevant hashtags for the following content:

Topic: ${request.topic}
Platform: ${request.platform}
Industry: ${request.industry || 'General'}
Target Audience: ${request.targetAudience || 'General'}
Content Type: ${request.contentType || 'General'}
Difficulty Preference: ${request.desiredDifficulty || 'medium'}

Generate hashtags that are:
1. Highly relevant to the topic
2. Appropriate for the target audience
3. Optimized for ${request.platform}
4. Mix of popular and niche hashtags
5. Include industry-specific terms
6. Consider content type and context

${request.platform === 'twitter' ? 'Keep hashtags concise for Twitter' : ''}
${request.platform === 'instagram' ? 'Include a mix of broad and specific hashtags for Instagram' : ''}
${request.platform === 'linkedin' ? 'Focus on professional and industry hashtags for LinkedIn' : ''}

Return only hashtags with # symbol, one per line:`;
        try {
            const result = await this.aiService.generateContent(prompt);
            return result
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('#') && line.length > 1)
                .slice(0, 20);
        }
        catch (error) {
            this.logger.error('Failed to generate AI hashtags:', error);
            return [];
        }
    }
    async analyzeCompetitorHashtags(hashtags, platform) {
        // Analyze competitor hashtags and find related ones
        const relatedHashtags = [];
        for (const hashtag of hashtags.slice(0, 5)) { // Limit to avoid API limits
            try {
                const related = await this.getRelatedHashtags(hashtag.replace('#', ''), platform);
                relatedHashtags.push(...related);
            }
            catch (error) {
                this.logger.error(`Failed to analyze competitor hashtag ${hashtag}:`, error);
            }
        }
        return [...new Set([...hashtags, ...relatedHashtags])];
    }
    async getRelatedHashtags(topic, platform) {
        const prompt = `Generate 10 related hashtags for the topic "${topic}" on ${platform}.

Consider:
- Synonyms and variations
- Related concepts and themes
- Industry terminology
- Popular combinations
- Trending variations

Return only hashtags with # symbol, one per line:`;
        try {
            const result = await this.aiService.generateContent(prompt);
            return result
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('#'))
                .slice(0, 10);
        }
        catch (error) {
            this.logger.error('Failed to get related hashtags:', error);
            return [];
        }
    }
    async analyzeHashtag(hashtag, platform) {
        const cacheKey = `${hashtag}:${platform}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.analyzedAt.getTime() < this.cacheExpiry) {
            return cached;
        }
        try {
            this.logger.debug(`Analyzing hashtag ${hashtag} on ${platform}`);
            // Get basic metrics from platform API
            const metrics = await this.getHashtagMetrics(hashtag, platform);
            // Get top posts using this hashtag
            const topPosts = await this.getTopPostsForHashtag(hashtag, platform);
            // Calculate derived metrics
            const analysis = {
                hashtag,
                platform,
                volume: metrics.volume || 0,
                trendingScore: this.calculateTrendingScore(metrics),
                difficultyScore: this.calculateDifficultyScore(metrics),
                engagementRate: metrics.engagementRate || 0,
                relatedHashtags: await this.getRelatedHashtags(hashtag.replace('#', ''), platform),
                topPosts,
                demographics: metrics.demographics || {},
                bestPostingTimes: this.getBestPostingTimes(platform),
                sentiment: metrics.sentiment || 'neutral',
                seasonality: {
                    trend: this.determineTrend(metrics),
                    peakTimes: this.getPeakTimes(platform)
                },
                analyzedAt: new Date()
            };
            // Cache the analysis
            this.cache.set(cacheKey, analysis);
            return analysis;
        }
        catch (error) {
            this.logger.error(`Failed to analyze hashtag ${hashtag}:`, error);
            // Return basic analysis if detailed analysis fails
            return {
                hashtag,
                platform,
                volume: 0,
                trendingScore: 0.5,
                difficultyScore: 0.5,
                engagementRate: 0,
                relatedHashtags: [],
                topPosts: [],
                demographics: {},
                bestPostingTimes: this.getBestPostingTimes(platform),
                sentiment: 'neutral',
                analyzedAt: new Date()
            };
        }
    }
    async getHashtagMetrics(hashtag, platform) {
        switch (platform) {
            case 'twitter':
                return await this.getTwitterHashtagMetrics(hashtag);
            case 'instagram':
                return await this.getInstagramHashtagMetrics(hashtag);
            default:
                return this.getEstimatedMetrics(hashtag, platform);
        }
    }
    async getTwitterHashtagMetrics(hashtag) {
        try {
            const twitterClient = new TwitterApi({
                appKey: process.env['TWITTER_API_KEY'],
                appSecret: process.env['TWITTER_API_SECRET'],
                accessToken: process.env['TWITTER_ACCESS_TOKEN'],
                accessSecret: process.env['TWITTER_ACCESS_TOKEN_SECRET'],
            });
            // Search for recent tweets with this hashtag
            const searchResults = await twitterClient.v2.search(hashtag, {
                max_results: 100,
                'tweet.fields': ['public_metrics', 'created_at'],
                'user.fields': ['public_metrics']
            });
            if (!searchResults.data || !Array.isArray(searchResults.data)) {
                return { volume: 0, engagementRate: 0 };
            }
            // Calculate metrics from search results
            const tweets = searchResults.data;
            const totalEngagement = tweets.reduce((sum, tweet) => {
                if (tweet.public_metrics) {
                    return sum + tweet.public_metrics.like_count +
                        tweet.public_metrics.reply_count +
                        tweet.public_metrics.retweet_count;
                }
                return sum;
            }, 0);
            const totalImpressions = tweets.reduce((sum, tweet) => {
                return sum + (tweet.public_metrics?.impression_count || 0);
            }, 0);
            return {
                volume: tweets.length,
                engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
                sentiment: 'neutral' // Would need sentiment analysis
            };
        }
        catch (error) {
            this.logger.error(`Failed to get Twitter metrics for ${hashtag}:`, error);
            return { volume: 0, engagementRate: 0 };
        }
    }
    async getInstagramHashtagMetrics(hashtag) {
        // Instagram Basic Display API doesn't provide hashtag search
        // This would require Instagram Graph API with business account
        return this.getEstimatedMetrics(hashtag, 'instagram');
    }
    getEstimatedMetrics(hashtag, platform) {
        // Provide estimated metrics based on hashtag characteristics
        const hashtagLength = hashtag.length;
        const isPopular = hashtagLength < 15;
        return {
            volume: isPopular ? Math.random() * 10000 + 1000 : Math.random() * 1000 + 100,
            engagementRate: Math.random() * 5 + 1, // 1-6%
            sentiment: 'neutral'
        };
    }
    async getTopPostsForHashtag(hashtag, platform) {
        // This would typically fetch actual top posts from the platform
        // For now, return empty array as it requires specific API access
        return [];
    }
    calculateTrendingScore(metrics) {
        // Calculate trending score based on volume, recency, and engagement
        const volume = metrics.volume || 0;
        const engagementRate = metrics.engagementRate || 0;
        // Simple scoring algorithm
        const volumeScore = Math.min(volume / 1000, 1);
        const engagementScore = Math.min(engagementRate / 10, 1);
        return (volumeScore * 0.6 + engagementScore * 0.4);
    }
    calculateDifficultyScore(metrics) {
        // Higher volume = higher difficulty
        const volume = metrics.volume || 0;
        return Math.min(volume / 10000, 1);
    }
    getBestPostingTimes(platform) {
        const times = {
            twitter: ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'],
            instagram: ['11:00 AM', '2:00 PM', '5:00 PM', '7:00 PM'],
            linkedin: ['8:00 AM', '12:00 PM', '5:00 PM'],
            facebook: ['9:00 AM', '1:00 PM', '7:00 PM']
        };
        return times[platform] ?? times['twitter'] ?? [];
    }
    determineTrend(metrics) {
        // This would analyze historical data
        // For now, return random trend
        const trends = ['rising', 'falling', 'stable'];
        return trends[Math.floor(Math.random() * trends.length)];
    }
    getPeakTimes(platform) {
        return this.getBestPostingTimes(platform);
    }
    categorizeHashtags(analyses, request) {
        // Sort hashtags by different criteria
        const byTrending = [...analyses].sort((a, b) => b.trendingScore - a.trendingScore);
        const byVolume = [...analyses].sort((a, b) => b.volume - a.volume);
        const byEngagement = [...analyses].sort((a, b) => b.engagementRate - a.engagementRate);
        const byDifficulty = [...analyses].sort((a, b) => a.difficultyScore - b.difficultyScore);
        // Determine optimal count based on platform
        const optimalCounts = {
            twitter: 3,
            instagram: 10,
            linkedin: 5,
            facebook: 3,
            tiktok: 5
        };
        const strategy = {
            primary: byEngagement.slice(0, 3).map(a => a.hashtag),
            secondary: byVolume.slice(3, 8).map(a => a.hashtag),
            long_tail: byDifficulty.slice(0, 5).map(a => a.hashtag),
            branded: this.generateBrandedHashtags(request.topic),
            trending: byTrending.slice(0, 5).map(a => a.hashtag),
            community: this.getCommunityHashtags(request.platform, request.industry),
            optimal_count: optimalCounts[request.platform] || 5,
            platform_specific_tips: this.getPlatformTips(request.platform)
        };
        return strategy;
    }
    generateBrandedHashtags(topic) {
        const cleanTopic = topic.replace(/\s+/g, '').toLowerCase();
        return [
            `#${cleanTopic}`,
            `#${cleanTopic}tips`,
            `#${cleanTopic}strategy`,
            `#${cleanTopic}insights`
        ];
    }
    getCommunityHashtags(platform, industry) {
        const communityHashtags = {
            twitter: ['#TwitterChat', '#TweetUp', '#TwitterTips'],
            instagram: ['#InstaGood', '#Community', '#InstaDaily'],
            linkedin: ['#LinkedInTips', '#ProfessionalDevelopment', '#Networking'],
            facebook: ['#FacebookCommunity', '#SocialMedia', '#Community']
        };
        return communityHashtags[platform] || [];
    }
    getPlatformTips(platform) {
        const tips = {
            twitter: [
                'Use 1-3 hashtags maximum for Twitter',
                'Mix trending and niche hashtags',
                'Place hashtags at the end of tweets',
                'Use hashtags in Twitter chats'
            ],
            instagram: [
                'Use up to 30 hashtags on Instagram',
                'Mix popular and niche hashtags',
                'Put hashtags in comments to keep caption clean',
                'Create hashtag sets for different content types',
                'Use location-based hashtags'
            ],
            linkedin: [
                'Use 3-5 professional hashtags',
                'Focus on industry-specific hashtags',
                'Use hashtags that your network follows',
                'Include hashtags in LinkedIn articles'
            ],
            facebook: [
                'Use 1-2 hashtags on Facebook',
                'Focus on branded hashtags',
                'Use hashtags sparingly in Facebook posts',
                'Consider hashtags for Facebook groups'
            ]
        };
        return tips[platform] || [];
    }
    async getHashtagPerformanceReport(hashtags, platform) {
        const analyses = await Promise.all(hashtags.map(hashtag => this.analyzeHashtag(hashtag, platform)));
        const report = {
            summary: {
                total_hashtags: hashtags.length,
                avg_volume: analyses.reduce((sum, a) => sum + a.volume, 0) / analyses.length,
                avg_engagement: analyses.reduce((sum, a) => sum + a.engagementRate, 0) / analyses.length,
                avg_difficulty: analyses.reduce((sum, a) => sum + a.difficultyScore, 0) / analyses.length
            },
            top_performers: analyses
                .sort((a, b) => b.engagementRate - a.engagementRate)
                .slice(0, 5)
                .map(a => ({
                hashtag: a.hashtag,
                engagement_rate: a.engagementRate,
                volume: a.volume,
                difficulty: a.difficultyScore
            })),
            recommendations: this.generateHashtagRecommendations(analyses, platform)
        };
        return report;
    }
    generateHashtagRecommendations(analyses, platform) {
        const recommendations = [];
        // Check for low engagement hashtags
        const lowEngagement = analyses.filter(a => a.engagementRate < 1);
        if (lowEngagement.length > 0) {
            recommendations.push(`Consider replacing low-engagement hashtags: ${lowEngagement.map(a => a.hashtag).join(', ')}`);
        }
        // Check for high difficulty hashtags
        const highDifficulty = analyses.filter(a => a.difficultyScore > 0.8);
        if (highDifficulty.length > 0) {
            recommendations.push(`These hashtags are highly competitive: ${highDifficulty.map(a => a.hashtag).join(', ')}`);
        }
        // Platform-specific recommendations
        if (platform === 'instagram' && analyses.length < 15) {
            recommendations.push('Consider using more hashtags on Instagram (up to 30 are allowed)');
        }
        if (platform === 'twitter' && analyses.length > 3) {
            recommendations.push('Consider using fewer hashtags on Twitter (1-3 is optimal)');
        }
        return recommendations;
    }
    clearCache() {
        this.cache.clear();
        this.logger.info('Hashtag analysis cache cleared');
    }
}
//# sourceMappingURL=HashtagResearcher.js.map