import { randomUUID } from 'node:crypto';
import { AccountMetrics, CompetitorAnalysis, SocialPlatform } from '@/types';
import { Logger } from '@/utils/Logger';
import { SocialMediaFactory } from './SocialMediaFactory';
import { OpenAIService } from './OpenAIService';

export class AnalyticsCollector {
  private readonly logger = new Logger('AnalyticsCollector');
  private readonly aiService = new OpenAIService();

  async collectPlatformMetrics(platform: SocialPlatform): Promise<AccountMetrics | null> {
    try {
      const service = SocialMediaFactory.create(platform);
      await service.authenticate();

      const metrics = await service.getMetrics();
      this.logger.info(`Collected metrics for ${platform}.`);
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to collect metrics for ${platform}:`, error);
      return null;
    }
  }

  async analyzeCompetitor(
    competitorName: string,
    platform: SocialPlatform,
    handle: string
  ): Promise<CompetitorAnalysis> {
    try {
      const analysis: CompetitorAnalysis = {
        id: randomUUID(),
        competitorName,
        platform,
        handle,
        content: `Recent ${platform} content analysis`,
        engagementRate: Math.random() * 10,
        postTime: new Date(),
        hashtags: ['#business', '#innovation', '#growth'],
        contentType: 'text',
        metrics: {
          likes: Math.floor(Math.random() * 1_000),
          comments: Math.floor(Math.random() * 100),
          shares: Math.floor(Math.random() * 50),
          views: Math.floor(Math.random() * 5_000)
        },
        insights: await this.generateCompetitorInsights(competitorName, platform),
        analyzedAt: new Date()
      };

      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze competitor ${competitorName} on ${platform}:`, error);
      throw error;
    }
  }

  async calculateGrowthRate(currentMetrics: AccountMetrics, previousMetrics: AccountMetrics): Promise<number> {
    if (previousMetrics.followersCount === 0) {
      return 0;
    }

    const growthRate =
      ((currentMetrics.followersCount - previousMetrics.followersCount) / previousMetrics.followersCount) * 100;

    return Math.round(growthRate * 100) / 100;
  }

  async generateAnalyticsReport(metrics: AccountMetrics[]): Promise<string> {
    try {
      const reportData = metrics.map((metric) => ({
        platform: metric.platform,
        followers: metric.followersCount,
        engagement: metric.engagementRate,
        growth: metric.growthRate
      }));

      const prompt = `Generate a comprehensive social media analytics report based on this data:

${JSON.stringify(reportData, null, 2)}

The report should include:
1. Executive summary of performance
2. Platform-by-platform analysis
3. Key insights and trends
4. Actionable recommendations
5. Areas for improvement

Write in a professional tone suitable for business stakeholders.`;

      return this.aiService.generateContent(prompt);
    } catch (error) {
      this.logger.error('Failed to generate analytics report:', error);
      return 'Analytics report generation failed';
    }
  }

  private async generateCompetitorInsights(competitorName: string, platform: SocialPlatform): Promise<string> {
    try {
      const prompt = `Generate competitive intelligence insights for ${competitorName} on ${platform}.

Provide actionable insights about:
1. Content strategy patterns
2. Engagement tactics
3. Posting frequency and timing
4. Audience interaction approach
5. Opportunities for differentiation

Keep insights professional and strategic, focusing on learnings that can improve our own social media approach.

Insights:`;

      return this.aiService.generateContent(prompt);
    } catch (error) {
      this.logger.error('Failed to generate competitor insights:', error);
      return 'Competitive analysis insights unavailable';
    }
  }
}
