import type { SocialPlatform } from '@/types';
import { Logger } from '@/utils/Logger';
import { OpenAIService } from './OpenAIService';

export interface OptimizedContent {
  text: string;
  hashtags: string[];
  mentions: string[];
  characterCount: number;
  readabilityScore: number;
  sentimentScore: number;
}

type PlatformConstraint = {
  maxChars: number;
  maxHashtags: number;
};

const PLATFORM_CONSTRAINTS: Record<SocialPlatform, PlatformConstraint> = {
  twitter: { maxChars: 280, maxHashtags: 5 },
  linkedin: { maxChars: 3000, maxHashtags: 10 },
  facebook: { maxChars: 63206, maxHashtags: 15 },
  instagram: { maxChars: 2200, maxHashtags: 30 },
  tiktok: { maxChars: 2200, maxHashtags: 10 },
};

const OPTIMAL_POSTING_TIMES: Record<SocialPlatform, number[]> = {
  twitter: [9, 12, 15, 17],
  linkedin: [8, 10, 12, 14, 17],
  facebook: [9, 13, 15],
  instagram: [11, 13, 17, 19],
  tiktok: [15, 18, 21],
};

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

export class ContentOptimizer {
  private readonly logger = new Logger('ContentOptimizer');
  private readonly aiService = new OpenAIService();

  async optimizeForPlatform(content: string, platform: SocialPlatform): Promise<OptimizedContent> {
    try {
      const optimizedText = await this.aiService.optimizeForPlatform(content, platform);

      const hashtags = this.extractHashtags(optimizedText);
      const mentions = this.extractMentions(optimizedText);
      const characterCount = optimizedText.length;
      const readabilityScore = this.calculateReadabilityScore(optimizedText);
      const sentimentScore = await this.calculateSentimentScore(optimizedText);

      await this.validatePlatformConstraints(optimizedText, platform);

      const result: OptimizedContent = {
        text: optimizedText,
        hashtags,
        mentions,
        characterCount,
        readabilityScore,
        sentimentScore,
      };

      this.logger.info(
        `Content optimized for ${platform}: ${characterCount} characters, ${hashtags.length} hashtags.`
      );
      return result;
    } catch (error) {
      this.logger.error(`Content optimization failed for ${platform}:`, error);
      return {
        text: content,
        hashtags: this.extractHashtags(content),
        mentions: this.extractMentions(content),
        characterCount: content.length,
        readabilityScore: 0,
        sentimentScore: 0,
      };
    }
  }

  async generateHashtagSuggestions(
    content: string,
    platform: SocialPlatform,
    count = 5
  ): Promise<string[]> {
    try {
      const prompt = `Generate ${count} relevant hashtags for this ${platform} post:

Content: "${content}"

Requirements:
- Hashtags should be relevant to business development, innovation, and professional growth
- Provide a mix of popular and niche hashtags
- Ensure they are appropriate for the platform and content
- No spaces in hashtags

Return only the hashtags, one per line, including the # symbol.`;

      const result = await this.aiService.generateContent(prompt);
      return result
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('#'))
        .slice(0, count);
    } catch (error) {
      this.logger.error('Hashtag generation failed:', error);
      return [];
    }
  }

  async optimizePostingTime(
    _content: string,
    platform: SocialPlatform,
    timezone = 'America/New_York'
  ): Promise<Date[]> {
    const times = OPTIMAL_POSTING_TIMES[platform] ?? OPTIMAL_POSTING_TIMES.twitter;
    const now = new Date();
    const suggestions: Date[] = [];

    for (let day = 0; day < 7; day += 1) {
      for (const hour of times) {
        const postTime = new Date(now);
        postTime.setDate(now.getDate() + day);
        postTime.setHours(hour, 0, 0, 0);

        if (postTime > now) {
          suggestions.push(postTime);
        }
      }
    }

    this.logger.debug(
      `Generated posting suggestions for ${platform} in timezone ${timezone}: ${suggestions.length} slots.`
    );

    return suggestions.slice(0, 10);
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[\w]+/g);
    return matches ? matches.map((tag) => tag.toLowerCase()) : [];
  }

  private extractMentions(text: string): string[] {
    const matches = text.match(/@[\w]+/g);
    return matches ? matches.map((mention) => mention.toLowerCase()) : [];
  }

  private calculateReadabilityScore(text: string): number {
    const sentences = Math.max(1, text.split(/[.!?]+/).filter(Boolean).length);
    const words = Math.max(1, text.split(/\s+/).filter(Boolean).length);
    const syllables = this.countSyllables(text);

    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

    return Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  }

  private countSyllables(text: string): number {
    return text
      .toLowerCase()
      .split(/\s+/)
      .reduce((total, word) => {
        const cleanWord = word.replace(/[^a-z]/g, '');
        if (!cleanWord) {
          return total;
        }

        let syllables = cleanWord.match(/[aeiouy]+/g)?.length ?? 0;
        if (cleanWord.endsWith('e')) {
          syllables -= 1;
        }
        return total + Math.max(1, syllables);
      }, 0);
  }

  private async calculateSentimentScore(text: string): Promise<number> {
    try {
      const prompt = `Analyze the sentiment of this text and return a score from -1 (very negative) to 1 (very positive):

Text: "${text}"

Return only a number between -1 and 1 representing the sentiment score.`;

      const result = await this.aiService.generateContent(prompt);
      const score = Number.parseFloat(result.trim());
      return Number.isFinite(score) ? Math.max(-1, Math.min(1, score)) : 0;
    } catch (error) {
      this.logger.error('Sentiment analysis failed:', error);
      return 0;
    }
  }

  private async validatePlatformConstraints(text: string, platform: SocialPlatform): Promise<void> {
    const constraint = PLATFORM_CONSTRAINTS[platform];
    if (!constraint) {
      return;
    }

    if (text.length > constraint.maxChars) {
      throw new Error(
        `Content exceeds ${platform} character limit (${text.length}/${constraint.maxChars}).`
      );
    }

    const hashtagCount = this.extractHashtags(text).length;
    if (hashtagCount > constraint.maxHashtags) {
      throw new Error(
        `Too many hashtags for ${platform} (${hashtagCount}/${constraint.maxHashtags}).`
      );
    }
  }
}
