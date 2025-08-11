import { Logger } from '../utils/Logger';
export class ContentOptimizer {
    constructor() {
        this.logger = new Logger('ContentOptimizer');
    }
    async optimizeForPlatform(content, platform) {
        try {
            this.logger.info(`Optimizing content for ${platform}`);
            const platformSpecs = this.getPlatformSpecs(platform);
            // Optimize content based on platform requirements
            const optimized = {
                ...content,
                text: this.truncateText(content.text, platformSpecs.maxLength),
                hashtags: this.optimizeHashtags(content.hashtags || [], platform),
                mentions: content.mentions || []
            };
            return optimized;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to optimize content for ${platform}: ${errorMessage}`);
            throw error;
        }
    }
    getPlatformSpecs(platform) {
        const specs = {
            twitter: { maxLength: 280, maxHashtags: 3 },
            linkedin: { maxLength: 3000, maxHashtags: 5 },
            facebook: { maxLength: 2000, maxHashtags: 3 },
            instagram: { maxLength: 2200, maxHashtags: 30 },
            tiktok: { maxLength: 4000, maxHashtags: 100 }
        };
        return specs[platform] || specs.twitter;
    }
    truncateText(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        // Try to truncate at word boundary
        const truncated = text.substring(0, maxLength - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...';
        }
        return truncated + '...';
    }
    optimizeHashtags(hashtags, platform) {
        const specs = this.getPlatformSpecs(platform);
        // Sort by relevance/popularity and limit
        return hashtags
            .slice(0, specs.maxHashtags)
            .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
    }
    async addCallToAction(content, platform) {
        const ctas = {
            twitter: ['What do you think?', 'Share your thoughts!', 'Retweet if you agree!'],
            linkedin: ['What\'s your experience?', 'Thoughts?', 'Would love to hear from you in the comments.'],
            facebook: ['Let us know in the comments!', 'What do you think?', 'Share your thoughts!'],
            instagram: ['Tag a friend who needs to see this!', 'Double tap if you agree!', 'What do you think?'],
            tiktok: ['Duet this!', 'What do you think?', 'Try this and let me know!']
        };
        const platformCtas = ctas[platform] || ctas.twitter;
        const randomCta = platformCtas[Math.floor(Math.random() * platformCtas.length)];
        return {
            ...content,
            text: `${content.text}\n\n${randomCta}`
        };
    }
}
//# sourceMappingURL=ContentOptimizer.js.map