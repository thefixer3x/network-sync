import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { AIService, SocialPlatform, Trend } from '@/types';
import { Logger } from '@/utils/Logger';

type PlatformSpec = {
  charLimit: number;
  tone: string;
  bestPractices: string[];
};

const PLATFORM_SPECS: Record<SocialPlatform, PlatformSpec> = {
  twitter: {
    charLimit: 280,
    tone: 'Concise and engaging',
    bestPractices: [
      'Use relevant hashtags (1-3)',
      'Include a clear call-to-action',
      'Keep it conversational',
      'Thread longer ideas'
    ]
  },
  linkedin: {
    charLimit: 3000,
    tone: 'Professional and insightful',
    bestPractices: [
      'Start with a compelling hook',
      'Provide actionable insights',
      'Use industry terminology',
      'End with an engagement question'
    ]
  },
  facebook: {
    charLimit: 63206,
    tone: 'Conversational and community-focused',
    bestPractices: [
      'Tell relatable stories',
      'Encourage discussion',
      'Use approachable language',
      'Include a call-to-action'
    ]
  },
  instagram: {
    charLimit: 2200,
    tone: 'Visual-first and inspiring',
    bestPractices: [
      'Complement visuals with narrative',
      'Use relevant hashtags (5-10)',
      'Add emojis intentionally',
      'Create shareable moments'
    ]
  },
  tiktok: {
    charLimit: 2200,
    tone: 'Trendy and engaging',
    bestPractices: [
      'Hook the viewer immediately',
      'Reference trending sounds/hashtags',
      'Keep language energetic',
      'Highlight clear value quickly'
    ]
  }
};

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

export class OpenAIService implements AIService {
  private readonly client: OpenAI;
  private readonly logger = new Logger('OpenAIService');

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY must be set to use OpenAIService.');
    }

    this.client = new OpenAI({ apiKey });
  }

  async generateContent(prompt: string, _context?: unknown): Promise<string> {
    try {
      const systemPrompt = `You are a professional business development specialist and content creator who helps organizations "change the world one solution at a time." Your writing style is:

- Professional yet approachable
- Solution-focused and optimistic
- Action-oriented with concrete insights
- Engaging and conversational
- Focused on problem-solving and innovation

Always provide actionable insights and maintain a tone that resonates with business leaders and entrepreneurs.`;

      const completion = await this.client.chat.completions.create({
        model: process.env['OPENAI_MODEL'] || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: Number.parseInt(process.env['OPENAI_MAX_TOKENS'] ?? '500', 10),
        temperature: Number.parseFloat(process.env['OPENAI_TEMPERATURE'] ?? '0.7')
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned by OpenAI.');
      }

      this.logger.info('Content generated successfully.');
      return content.trim();
    } catch (error) {
      this.logger.error('OpenAI content generation failed:', error);
      throw new Error(`Content generation failed: ${formatError(error)}`);
    }
  }

  async enhanceContent(content: string, platform: SocialPlatform): Promise<string> {
    const platformSpecs = this.getPlatformSpecifications(platform);

    const prompt = `Enhance this social media content for ${platform}:

Original content: "${content}"

Platform requirements:
- Character limit: ${platformSpecs.charLimit}
- Tone: ${platformSpecs.tone}
- Best practices: ${platformSpecs.bestPractices.join(', ')}

Please:
1. Optimize the content for ${platform} while preserving the core message
2. Ensure it is within the character limit
3. Make it more engaging and platform-appropriate
4. Add relevant hashtags if appropriate
5. Maintain a professional but approachable tone

Return only the enhanced content without additional commentary.`;

    return this.generateContent(prompt);
  }

  async analyzeTrends(trends: string[]): Promise<Trend[]> {
    const prompt = `Analyze these trending topics for business development and social media potential:

Trends: ${trends.join(', ')}

For each trend, provide:
1. Relevance score (0-1) for business professionals
2. Content opportunity assessment
3. Suggested content angles
4. Potential hashtags
5. Target audience fit

Focus on trends that deliver value to entrepreneurs, business leaders, and innovation-focused professionals.

Return as JSON array with this structure:
[
  {
    "topic": "trend name",
    "relevanceScore": 0.8,
    "contentOpportunity": "description",
    "suggestedAngles": ["angle1", "angle2"],
    "hashtags": ["#tag1", "#tag2"],
    "audienceFit": "description"
  }
]`;

    try {
      const analysis = await this.generateContent(prompt);
      const parsed = JSON.parse(analysis) as Array<{
        topic?: string;
        relevanceScore?: number;
        contentOpportunity?: string;
        suggestedAngles?: string[];
        hashtags?: string[];
        audienceFit?: string;
      }>;

      return parsed.map((item) => ({
        id: randomUUID(),
        topic: item.topic ?? 'Unknown trend',
        platform: 'twitter',
        volume: Math.floor(Math.random() * 10_000) + 1_000,
        sentimentScore: 0,
        relevanceScore: typeof item.relevanceScore === 'number' ? item.relevanceScore : 0.5,
        keywords: Array.isArray(item.hashtags)
          ? item.hashtags.map((tag) => tag.replace('#', '')).filter(Boolean)
          : [],
        discoveredAt: new Date(),
        sourceUrls: []
      }));
    } catch (error) {
      this.logger.error('Trend analysis failed, returning fallback results.', error);
      return trends.map((trend) => ({
        id: randomUUID(),
        topic: trend,
        platform: 'twitter',
        volume: Math.floor(Math.random() * 5_000) + 500,
        sentimentScore: 0,
        relevanceScore: 0.5,
        keywords: [trend.replace(/\s+/g, '')],
        discoveredAt: new Date(),
        sourceUrls: []
      }));
    }
  }

  async optimizeForPlatform(content: string, platform: SocialPlatform): Promise<string> {
    return this.enhanceContent(content, platform);
  }

  private getPlatformSpecifications(platform: SocialPlatform): PlatformSpec {
    return PLATFORM_SPECS[platform];
  }
}
