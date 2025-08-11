// services/OpenAIService.ts
import OpenAI from 'openai';
import { Logger } from '../utils/Logger';

export class OpenAIService {
  private client: OpenAI;
  private logger: Logger;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env['OPENAI_API_KEY']!,
    });
    this.logger = new Logger('OpenAIService');
  }

  async generateContent(prompt: string, maxTokens: number = 1000): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      this.logger.info('Generated content successfully');
      return content;
    } catch (error: any) {
      this.logger.error('Failed to generate content:', error.message);
      throw new Error(`OpenAI content generation failed: ${error.message}`);
    }
  }

  async enhanceContent(content: string, platform: string): Promise<string> {
    const prompt = `Enhance this social media content for ${platform}:
    
"${content}"

Make it more engaging, add relevant hashtags, and optimize for ${platform} best practices. Keep it authentic and within platform limits.`;

    return this.generateContent(prompt);
  }

  async analyzeSentiment(text: string): Promise<{ score: number; sentiment: string }> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Analyze the sentiment of the given text and respond with only a JSON object containing "score" (number between -1 and 1) and "sentiment" (positive, negative, or neutral).'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 100,
        temperature: 0.1,
      });

      const result = response.choices[0]?.message?.content;
      if (result) {
        try {
          return JSON.parse(result);
        } catch {
          // Fallback if JSON parsing fails
          return { score: 0, sentiment: 'neutral' };
        }
      }
      
      return { score: 0, sentiment: 'neutral' };
    } catch (error: any) {
      this.logger.error('Failed to analyze sentiment:', error.message);
      return { score: 0, sentiment: 'neutral' };
    }
  }

  async generateHashtags(content: string, platform: string, count: number = 5): Promise<string[]> {
    const prompt = `Generate ${count} relevant hashtags for this ${platform} post:
    
"${content}"

Return only the hashtags, one per line, including the # symbol.`;

    try {
      const response = await this.generateContent(prompt, 200);
      return response
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('#'))
        .slice(0, count);
    } catch (error: any) {
      this.logger.error('Failed to generate hashtags:', error.message);
      return [];
    }
  }
}
