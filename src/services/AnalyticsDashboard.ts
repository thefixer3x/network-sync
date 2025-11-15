import { createClient } from '@supabase/supabase-js';
import type { SocialPlatform } from '@/types';
import { AccountMetrics, CompetitorAnalysis, Content } from '@/types';
import { Logger } from '@/utils/Logger';
import { SocialMediaFactory } from './SocialMediaFactory';
import { OpenAIService } from './OpenAIService';
import {
  addDays,
  subDays,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'list' | 'gauge';
  data: any;
  config: {
    size: 'small' | 'medium' | 'large';
    refreshInterval?: number; // minutes
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'donut';
    color?: string;
    target?: number;
  };
  lastUpdated: Date;
}

export interface DashboardReport {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  dateRange: {
    start: Date;
    end: Date;
  };
  platforms: SocialPlatform[];
  sections: {
    executive_summary: string;
    performance_metrics: any;
    content_analysis: any;
    competitor_insights: any;
    recommendations: string[];
    growth_opportunities: string[];
  };
  generatedAt: Date;
  charts: {
    engagement_trends: any[];
    follower_growth: any[];
    content_performance: any[];
    platform_comparison: any[];
  };
}

export interface AnalyticsFilter {
  platforms?: SocialPlatform[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  contentTypes?: string[];
  metrics?: string[];
}

export class AnalyticsDashboard {
  private logger = new Logger('AnalyticsDashboard');
  private supabase = createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!
  );
  private aiService = new OpenAIService();
  private widgets: Map<string, DashboardWidget> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultWidgets();
  }

  private initializeDefaultWidgets(): void {
    const defaultWidgets: Omit<DashboardWidget, 'id' | 'lastUpdated'>[] = [
      {
        title: 'Total Followers',
        type: 'metric',
        data: { value: 0, change: 0, trend: 'stable' },
        config: { size: 'small', color: '#4F46E5' },
      },
      {
        title: 'Engagement Rate',
        type: 'gauge',
        data: { value: 0, target: 5, max: 10 },
        config: { size: 'medium', color: '#10B981', target: 5 },
      },
      {
        title: 'Weekly Growth',
        type: 'chart',
        data: [],
        config: { size: 'large', chartType: 'line', refreshInterval: 60 },
      },
      {
        title: 'Top Performing Posts',
        type: 'table',
        data: [],
        config: { size: 'large' },
      },
      {
        title: 'Platform Performance',
        type: 'chart',
        data: [],
        config: { size: 'medium', chartType: 'bar' },
      },
    ];

    defaultWidgets.forEach((widget) => {
      this.addWidget(widget);
    });
  }

  addWidget(widget: Omit<DashboardWidget, 'id' | 'lastUpdated'>): string {
    const widgetId = crypto.randomUUID();
    const fullWidget: DashboardWidget = {
      ...widget,
      id: widgetId,
      lastUpdated: new Date(),
    };

    this.widgets.set(widgetId, fullWidget);

    // Set up auto-refresh if configured
    if (widget.config.refreshInterval) {
      const interval = setInterval(
        () => {
          this.refreshWidget(widgetId);
        },
        widget.config.refreshInterval * 60 * 1000
      );

      this.refreshIntervals.set(widgetId, interval);
    }

    this.logger.info(`Added dashboard widget: ${widget.title}`);
    return widgetId;
  }

  async refreshWidget(widgetId: string): Promise<void> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      return;
    }

    try {
      let newData: any;

      switch (widget.title) {
        case 'Total Followers':
          newData = await this.getTotalFollowersData();
          break;
        case 'Engagement Rate':
          newData = await this.getEngagementRateData();
          break;
        case 'Weekly Growth':
          newData = await this.getWeeklyGrowthData();
          break;
        case 'Top Performing Posts':
          newData = await this.getTopPerformingPostsData();
          break;
        case 'Platform Performance':
          newData = await this.getPlatformPerformanceData();
          break;
        default:
          return;
      }

      widget.data = newData;
      widget.lastUpdated = new Date();
      this.widgets.set(widgetId, widget);

      this.logger.debug(`Refreshed widget: ${widget.title}`);
    } catch (error) {
      this.logger.error(`Failed to refresh widget ${widget.title}:`, error);
    }
  }

  private async getTotalFollowersData(): Promise<any> {
    try {
      const { data: currentMetrics } = await this.supabase
        .from('account_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(10);

      const { data: previousMetrics } = await this.supabase
        .from('account_metrics')
        .select('*')
        .lt('recorded_at', subDays(new Date(), 7).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(10);

      const currentTotal =
        currentMetrics?.reduce((sum, metric) => sum + metric.followers_count, 0) || 0;
      const previousTotal =
        previousMetrics?.reduce((sum, metric) => sum + metric.followers_count, 0) || 0;
      const change = currentTotal - previousTotal;
      const percentChange = previousTotal > 0 ? (change / previousTotal) * 100 : 0;

      return {
        value: currentTotal,
        change: percentChange,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        absoluteChange: change,
      };
    } catch (error) {
      this.logger.error('Failed to get followers data:', error);
      return { value: 0, change: 0, trend: 'stable' };
    }
  }

  private async getEngagementRateData(): Promise<any> {
    try {
      const { data: recentMetrics } = await this.supabase
        .from('account_metrics')
        .select('engagement_rate')
        .order('recorded_at', { ascending: false })
        .limit(10);

      const avgEngagement =
        recentMetrics && recentMetrics.length > 0
          ? recentMetrics.reduce((sum, metric) => sum + metric.engagement_rate, 0) /
            recentMetrics.length
          : 0;

      return {
        value: Number(avgEngagement.toFixed(2)),
        target: 5, // 5% target engagement rate
        max: 10,
        status: avgEngagement >= 5 ? 'good' : avgEngagement >= 2 ? 'average' : 'poor',
      };
    } catch (error) {
      this.logger.error('Failed to get engagement rate data:', error);
      return { value: 0, target: 5, max: 10, status: 'poor' };
    }
  }

  private async getWeeklyGrowthData(): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 30); // Last 30 days

      const { data: metrics } = await this.supabase
        .from('account_metrics')
        .select('*')
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (!metrics || metrics.length === 0) {
        return [];
      }

      // Group by week and calculate growth
      const weeklyData = [];
      let currentWeek = startOfWeek(startDate);

      while (currentWeek <= endDate) {
        const weekEnd = endOfWeek(currentWeek);
        const weekMetrics = metrics.filter((m) => {
          const metricDate = new Date(m.recorded_at);
          return metricDate >= currentWeek && metricDate <= weekEnd;
        });

        if (weekMetrics.length > 0) {
          const totalFollowers = weekMetrics.reduce((sum, m) => sum + m.followers_count, 0);
          const avgEngagement =
            weekMetrics.reduce((sum, m) => sum + m.engagement_rate, 0) / weekMetrics.length;

          weeklyData.push({
            date: format(currentWeek, 'MMM dd'),
            followers: totalFollowers,
            engagement: Number(avgEngagement.toFixed(2)),
            posts: weekMetrics.reduce((sum, m) => sum + m.posts_count, 0),
          });
        }

        currentWeek = addDays(currentWeek, 7);
      }

      return weeklyData;
    } catch (error) {
      this.logger.error('Failed to get weekly growth data:', error);
      return [];
    }
  }

  private async getTopPerformingPostsData(): Promise<any> {
    try {
      const { data: content } = await this.supabase
        .from('content')
        .select('*')
        .eq('status', 'published')
        .not('metrics', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!content || content.length === 0) {
        return [];
      }

      // Calculate engagement scores and sort
      const postsWithScores = content
        .map((post) => {
          const metrics = post.metrics || {};
          const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
          const engagementRate = metrics.views ? (engagement / metrics.views) * 100 : 0;

          return {
            id: post.id,
            content:
              post.content.length > 100 ? `${post.content.substring(0, 97)}...` : post.content,
            platform: post.platform,
            engagement,
            engagementRate: Number(engagementRate.toFixed(2)),
            publishedAt: post.published_time || post.created_at,
            metrics: {
              likes: metrics.likes || 0,
              comments: metrics.comments || 0,
              shares: metrics.shares || 0,
              views: metrics.views || 0,
            },
          };
        })
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 10);

      return postsWithScores;
    } catch (error) {
      this.logger.error('Failed to get top performing posts:', error);
      return [];
    }
  }

  private async getPlatformPerformanceData(): Promise<any> {
    try {
      const { data: metrics } = await this.supabase
        .from('account_metrics')
        .select('*')
        .gte('recorded_at', subDays(new Date(), 7).toISOString())
        .order('recorded_at', { ascending: false });

      if (!metrics || metrics.length === 0) {
        return [];
      }

      // Group by platform and calculate averages
      const platformData: Record<string, any> = {};

      metrics.forEach((metric) => {
        if (!platformData[metric.platform]) {
          platformData[metric.platform] = {
            followers: [],
            engagement: [],
            posts: [],
          };
        }

        platformData[metric.platform].followers.push(metric.followers_count);
        platformData[metric.platform].engagement.push(metric.engagement_rate);
        platformData[metric.platform].posts.push(metric.posts_count);
      });

      const result = Object.entries(platformData).map(([platform, data]: [string, any]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        followers: Math.round(
          data.followers.reduce((a: number, b: number) => a + b, 0) / data.followers.length
        ),
        engagement: Number(
          (
            data.engagement.reduce((a: number, b: number) => a + b, 0) / data.engagement.length
          ).toFixed(2)
        ),
        posts: Math.round(
          data.posts.reduce((a: number, b: number) => a + b, 0) / data.posts.length
        ),
      }));

      return result;
    } catch (error) {
      this.logger.error('Failed to get platform performance data:', error);
      return [];
    }
  }

  async generateReport(
    type: 'daily' | 'weekly' | 'monthly',
    platforms?: SocialPlatform[]
  ): Promise<DashboardReport> {
    try {
      this.logger.info(`Generating ${type} analytics report`);

      // Determine date range
      const endDate = new Date();
      let startDate: Date;

      switch (type) {
        case 'daily':
          startDate = subDays(endDate, 1);
          break;
        case 'weekly':
          startDate = subDays(endDate, 7);
          break;
        case 'monthly':
          startDate = subDays(endDate, 30);
          break;
      }

      const filter: AnalyticsFilter = {
        platforms: platforms || ['twitter', 'linkedin', 'facebook', 'instagram'],
        dateRange: { start: startDate, end: endDate },
      };

      // Gather analytics data
      const performanceMetrics = await this.getPerformanceMetrics(filter);
      const contentAnalysis = await this.getContentAnalysis(filter);
      const competitorInsights = await this.getCompetitorInsights(filter);
      const charts = await this.generateCharts(filter);

      // Generate AI insights and recommendations
      const executiveSummary = await this.generateExecutiveSummary(performanceMetrics, type);
      const recommendations = await this.generateRecommendations(
        performanceMetrics,
        contentAnalysis
      );
      const growthOpportunities = await this.identifyGrowthOpportunities(
        performanceMetrics,
        competitorInsights
      );

      const report: DashboardReport = {
        id: crypto.randomUUID(),
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Analytics Report`,
        type,
        dateRange: { start: startDate, end: endDate },
        platforms: platforms || ['twitter', 'linkedin', 'facebook', 'instagram'],
        sections: {
          executive_summary: executiveSummary,
          performance_metrics: performanceMetrics,
          content_analysis: contentAnalysis,
          competitor_insights: competitorInsights,
          recommendations,
          growth_opportunities: growthOpportunities,
        },
        generatedAt: new Date(),
        charts,
      };

      // Store report in database
      await this.supabase.from('analytics_reports').insert([
        {
          id: report.id,
          title: report.title,
          type: report.type,
          date_range_start: startDate.toISOString(),
          date_range_end: endDate.toISOString(),
          platforms: platforms,
          data: report,
          generated_at: new Date().toISOString(),
        },
      ]);

      this.logger.success(`Generated ${type} report: ${report.id}`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to generate ${type} report:`, error);
      throw error;
    }
  }

  private async getPerformanceMetrics(filter: AnalyticsFilter): Promise<any> {
    const { data: metrics } = await this.supabase
      .from('account_metrics')
      .select('*')
      .gte('recorded_at', filter.dateRange?.start.toISOString())
      .lte('recorded_at', filter.dateRange?.end.toISOString())
      .in('platform', filter.platforms || ['twitter', 'linkedin', 'facebook', 'instagram']);

    if (!metrics || metrics.length === 0) {
      return {};
    }

    const totalFollowers = metrics.reduce((sum, m) => sum + m.followers_count, 0);
    const avgEngagement = metrics.reduce((sum, m) => sum + m.engagement_rate, 0) / metrics.length;
    const totalPosts = metrics.reduce((sum, m) => sum + m.posts_count, 0);

    return {
      total_followers: totalFollowers,
      average_engagement_rate: Number(avgEngagement.toFixed(2)),
      total_posts: totalPosts,
      platforms_count: new Set(metrics.map((m) => m.platform)).size,
      growth_rate: this.calculateGrowthRate(metrics),
    };
  }

  private calculateGrowthRate(metrics: any[]): number {
    if (metrics.length < 2) {
      return 0;
    }

    const sorted = metrics.sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (first.followers_count === 0) {
      return 0;
    }

    return Number(
      (((last.followers_count - first.followers_count) / first.followers_count) * 100).toFixed(2)
    );
  }

  private async getContentAnalysis(filter: AnalyticsFilter): Promise<any> {
    const { data: content } = await this.supabase
      .from('content')
      .select('*')
      .gte('created_at', filter.dateRange?.start.toISOString())
      .lte('created_at', filter.dateRange?.end.toISOString())
      .in('platform', filter.platforms || ['twitter', 'linkedin', 'facebook', 'instagram']);

    if (!content || content.length === 0) {
      return {};
    }

    const published = content.filter((c) => c.status === 'published');
    const byPlatform = published.reduce(
      (acc, c) => {
        acc[c.platform] = (acc[c.platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total_content: content.length,
      published_content: published.length,
      content_by_platform: byPlatform,
      ai_generated_percentage: Math.round(
        (content.filter((c) => c.ai_generated).length / content.length) * 100
      ),
      avg_posting_frequency: published.length / 7, // posts per week
    };
  }

  private async getCompetitorInsights(filter: AnalyticsFilter): Promise<any> {
    const { data: analyses } = await this.supabase
      .from('competitor_analyses')
      .select('*')
      .gte('analyzed_at', filter.dateRange?.start.toISOString())
      .lte('analyzed_at', filter.dateRange?.end.toISOString());

    if (!analyses || analyses.length === 0) {
      return {};
    }

    const avgEngagement = analyses.reduce((sum, a) => sum + a.engagement_rate, 0) / analyses.length;
    const topCompetitor = analyses.reduce((top, current) =>
      current.engagement_rate > top.engagement_rate ? current : top
    );

    return {
      competitors_analyzed: analyses.length,
      average_competitor_engagement: Number(avgEngagement.toFixed(2)),
      top_performing_competitor: topCompetitor.competitor_name,
      benchmarking_insights: analyses.map((a) => a.insights).slice(0, 5),
    };
  }

  private async generateCharts(filter: AnalyticsFilter): Promise<any> {
    const engagementTrends = await this.getEngagementTrendsChart(filter);
    const followerGrowth = await this.getFollowerGrowthChart(filter);
    const contentPerformance = await this.getContentPerformanceChart(filter);
    const platformComparison = await this.getPlatformComparisonChart(filter);

    return {
      engagement_trends: engagementTrends,
      follower_growth: followerGrowth,
      content_performance: contentPerformance,
      platform_comparison: platformComparison,
    };
  }

  private async getEngagementTrendsChart(filter: AnalyticsFilter): Promise<any[]> {
    const { data: metrics } = await this.supabase
      .from('account_metrics')
      .select('recorded_at, engagement_rate, platform')
      .gte('recorded_at', filter.dateRange?.start.toISOString())
      .lte('recorded_at', filter.dateRange?.end.toISOString())
      .order('recorded_at', { ascending: true });

    return (
      metrics?.map((m) => ({
        date: format(new Date(m.recorded_at), 'MMM dd'),
        engagement: m.engagement_rate,
        platform: m.platform,
      })) || []
    );
  }

  private async getFollowerGrowthChart(filter: AnalyticsFilter): Promise<any[]> {
    const { data: metrics } = await this.supabase
      .from('account_metrics')
      .select('recorded_at, followers_count, platform')
      .gte('recorded_at', filter.dateRange?.start.toISOString())
      .lte('recorded_at', filter.dateRange?.end.toISOString())
      .order('recorded_at', { ascending: true });

    return (
      metrics?.map((m) => ({
        date: format(new Date(m.recorded_at), 'MMM dd'),
        followers: m.followers_count,
        platform: m.platform,
      })) || []
    );
  }

  private async getContentPerformanceChart(filter: AnalyticsFilter): Promise<any[]> {
    const { data: content } = await this.supabase
      .from('content')
      .select('*')
      .eq('status', 'published')
      .gte('created_at', filter.dateRange?.start.toISOString())
      .lte('created_at', filter.dateRange?.end.toISOString());

    return (
      content
        ?.map((c) => {
          const metrics = c.metrics || {};
          const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);

          return {
            id: c.id,
            platform: c.platform,
            engagement,
            reach: metrics.views || 0,
            date: format(new Date(c.created_at), 'MMM dd'),
          };
        })
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 20) || []
    );
  }

  private async getPlatformComparisonChart(filter: AnalyticsFilter): Promise<any[]> {
    const performanceData = await this.getPlatformPerformanceData();
    return performanceData;
  }

  private async generateExecutiveSummary(metrics: any, reportType: string): Promise<string> {
    const prompt = `Generate an executive summary for a ${reportType} social media analytics report based on these metrics:

${JSON.stringify(metrics, null, 2)}

The summary should:
1. Highlight key performance indicators
2. Identify significant trends or changes
3. Provide context for the metrics
4. Be concise and business-focused
5. Include actionable insights

Write in a professional tone suitable for executives and stakeholders.`;

    try {
      return await this.aiService.generateContent(prompt);
    } catch (error) {
      this.logger.error('Failed to generate executive summary:', error);
      return `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} performance summary: ${metrics.total_followers || 0} total followers across platforms with ${metrics.average_engagement_rate || 0}% average engagement rate.`;
    }
  }

  private async generateRecommendations(
    performanceMetrics: any,
    contentAnalysis: any
  ): Promise<string[]> {
    const prompt = `Based on these social media performance metrics and content analysis, provide 5 specific, actionable recommendations for improvement:

Performance Metrics:
${JSON.stringify(performanceMetrics, null, 2)}

Content Analysis:
${JSON.stringify(contentAnalysis, null, 2)}

Focus on:
- Improving engagement rates
- Optimizing content strategy
- Platform-specific recommendations
- Growth opportunities
- Content optimization

Return as a JSON array of recommendation strings:`;

    try {
      const result = await this.aiService.generateContent(prompt);
      return JSON.parse(result);
    } catch (error) {
      this.logger.error('Failed to generate recommendations:', error);
      return [
        'Increase posting frequency during peak engagement hours',
        'Focus on platforms with highest engagement rates',
        'Experiment with different content formats',
        'Engage more actively with audience comments',
        'Analyze and replicate top-performing content patterns',
      ];
    }
  }

  private async identifyGrowthOpportunities(
    performanceMetrics: any,
    competitorInsights: any
  ): Promise<string[]> {
    const prompt = `Identify 3-5 specific growth opportunities based on performance data and competitor analysis:

Performance Metrics:
${JSON.stringify(performanceMetrics, null, 2)}

Competitor Insights:
${JSON.stringify(competitorInsights, null, 2)}

Focus on:
- Underutilized platforms or strategies
- Gaps compared to competitors
- Emerging trends to capitalize on
- Content opportunities
- Audience development strategies

Return as a JSON array of opportunity strings:`;

    try {
      const result = await this.aiService.generateContent(prompt);
      return JSON.parse(result);
    } catch (error) {
      this.logger.error('Failed to identify growth opportunities:', error);
      return [
        'Expand presence on underperforming platforms',
        'Develop content series around trending topics',
        'Implement competitor successful strategies',
        'Focus on audience segments with highest engagement',
        'Optimize posting times based on analytics data',
      ];
    }
  }

  async getWidgets(): Promise<DashboardWidget[]> {
    return Array.from(this.widgets.values());
  }

  async refreshAllWidgets(): Promise<void> {
    const promises = Array.from(this.widgets.keys()).map((widgetId) =>
      this.refreshWidget(widgetId)
    );

    await Promise.allSettled(promises);
    this.logger.info('Refreshed all dashboard widgets');
  }

  removeWidget(widgetId: string): boolean {
    const removed = this.widgets.delete(widgetId);

    // Clear refresh interval if exists
    const interval = this.refreshIntervals.get(widgetId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(widgetId);
    }

    if (removed) {
      this.logger.info(`Removed widget: ${widgetId}`);
    }

    return removed;
  }

  destroy(): void {
    // Clear all refresh intervals
    for (const interval of this.refreshIntervals.values()) {
      clearInterval(interval);
    }

    this.refreshIntervals.clear();
    this.widgets.clear();

    this.logger.info('Analytics dashboard destroyed');
  }
}
