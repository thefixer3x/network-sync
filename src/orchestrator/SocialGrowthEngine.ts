import cron from 'node-cron';
import { Logger } from '@/utils/Logger';
import { AutomationEngine } from '../engine/automation-engine';
import type { EngagementRule } from '../services/EngagementAutomator';
import { EngagementAutomator } from '../services/EngagementAutomator';
import { HashtagResearcher } from '../services/HashtagResearcher';
import { CompetitorMonitor } from '../services/CompetitorMonitor';
import { AnalyticsDashboard } from '../services/AnalyticsDashboard';
import type { WorkflowRequest } from './workflow-engine';
import { WorkflowEngine } from './workflow-engine';
import type { SocialPlatform } from '../types/typescript-types';

export interface SocialGrowthConfig {
  platforms: SocialPlatform[];
  goals: {
    follower_growth_rate: number; // monthly percentage
    engagement_rate_target: number;
    content_frequency: number; // posts per week
    automation_level: 'conservative' | 'moderate' | 'aggressive';
  };
  automation: {
    auto_engagement: boolean;
    auto_posting: boolean;
    competitor_monitoring: boolean;
    hashtag_optimization: boolean;
    analytics_reporting: boolean;
  };
  engagement_rules: Partial<EngagementRule>[];
  competitors: {
    name: string;
    handles: Record<SocialPlatform, string>;
    industry: string;
  }[];
  content_strategy: {
    topics: string[];
    brand_voice: string;
    target_audience: string;
    content_pillars: string[];
  };
}

export class SocialGrowthEngine {
  private logger = new Logger('SocialGrowthEngine');
  private automationEngine: AutomationEngine;
  private engagementAutomator: EngagementAutomator;
  private hashtagResearcher: HashtagResearcher;
  private competitorMonitor: CompetitorMonitor;
  private analyticsDashboard: AnalyticsDashboard;
  private workflowEngine: WorkflowEngine;

  private isRunning = false;
  private config: SocialGrowthConfig | null = null;
  private scheduledTasks = new Map<string, cron.ScheduledTask>();

  constructor() {
    this.automationEngine = new AutomationEngine();
    this.engagementAutomator = new EngagementAutomator();
    this.hashtagResearcher = new HashtagResearcher();
    this.competitorMonitor = new CompetitorMonitor();
    this.analyticsDashboard = new AnalyticsDashboard();
    this.workflowEngine = new WorkflowEngine();
  }

  /**
   * Initialize and start the complete social growth automation system
   */
  async initialize(config: SocialGrowthConfig): Promise<void> {
    try {
      this.logger.info('🚀 Initializing Social Media Growth Engine');
      this.config = config;

      // 1. Set up automation engine
      if (config.automation.auto_posting) {
        this.logger.info('📅 Starting content automation...');
        await this.automationEngine.start();
      }

      // 2. Set up engagement automation
      if (config.automation.auto_engagement) {
        this.logger.info('🤝 Configuring engagement automation...');
        await this.setupEngagementAutomation();
      }

      // 3. Set up competitor monitoring
      if (config.automation.competitor_monitoring) {
        this.logger.info('🕵️  Setting up competitor monitoring...');
        await this.setupCompetitorMonitoring();
      }

      // 4. Schedule analytics and optimization tasks
      if (config.automation.analytics_reporting) {
        this.logger.info('📊 Setting up analytics and reporting...');
        await this.setupAnalyticsReporting();
      }

      // 5. Schedule hashtag optimization
      if (config.automation.hashtag_optimization) {
        this.logger.info('🏷️  Setting up hashtag optimization...');
        await this.setupHashtagOptimization();
      }

      this.isRunning = true;
      this.logger.success('✅ Social Media Growth Engine initialized successfully');

      // Generate initial strategy report
      await this.generateGrowthStrategy();
    } catch (error) {
      this.logger.error('Failed to initialize Social Growth Engine:', error);
      throw error;
    }
  }

  private async setupEngagementAutomation(): Promise<void> {
    // Add engagement rules from config
    for (const ruleConfig of this.config!.engagement_rules) {
      for (const platform of this.config!.platforms) {
        await this.engagementAutomator.addEngagementRule({
          platform,
          type: 'auto_reply',
          enabled: true,
          conditions: {
            keywords: this.config!.content_strategy.topics,
            followerCountMin: 100,
            followerCountMax: 100000,
            excludeVerified: false,
            minEngagement: 5,
          },
          actions: {
            reply: true,
            like: true,
          },
          limits: {
            maxActionsPerHour: 10,
            maxActionsPerDay: 50,
            cooldownMinutes: 60,
          },
          ...ruleConfig,
        });
      }
    }

    // Schedule engagement monitoring (every 30 minutes)
    const engagementTask = cron.schedule(
      '*/30 * * * *',
      async () => {
        await this.executeEngagementCycle();
      },
      { scheduled: false }
    );

    this.scheduledTasks.set('engagement_automation', engagementTask);
    engagementTask.start();

    this.logger.success('Engagement automation configured');
  }

  private async setupCompetitorMonitoring(): Promise<void> {
    // Add competitors from config
    for (const competitor of this.config!.competitors) {
      await this.competitorMonitor.addCompetitor({
        name: competitor.name,
        handles: competitor.handles,
        industry: competitor.industry,
        size: 'medium', // Default size
        monitoringEnabled: true,
        trackingMetrics: ['followers', 'engagement', 'posting_frequency'],
        alertThresholds: {
          followerGrowth: 10, // Alert if >10% growth
          engagementIncrease: 5, // Alert if >5% engagement
          viralPostThreshold: 1000, // Alert if post gets >1000 engagement
        },
      });
    }

    // Start monitoring (every 2 hours)
    await this.competitorMonitor.startMonitoring(120);

    this.logger.success('Competitor monitoring configured');
  }

  private async setupAnalyticsReporting(): Promise<void> {
    // Schedule daily analytics refresh
    const dailyAnalytics = cron.schedule(
      '0 8 * * *',
      async () => {
        await this.analyticsDashboard.refreshAllWidgets();
      },
      { scheduled: false }
    );

    // Schedule weekly reports
    const weeklyReports = cron.schedule(
      '0 9 * * MON',
      async () => {
        await this.generateWeeklyReport();
      },
      { scheduled: false }
    );

    // Schedule monthly reports
    const monthlyReports = cron.schedule(
      '0 9 1 * *',
      async () => {
        await this.generateMonthlyReport();
      },
      { scheduled: false }
    );

    this.scheduledTasks.set('daily_analytics', dailyAnalytics);
    this.scheduledTasks.set('weekly_reports', weeklyReports);
    this.scheduledTasks.set('monthly_reports', monthlyReports);

    dailyAnalytics.start();
    weeklyReports.start();
    monthlyReports.start();

    this.logger.success('Analytics and reporting configured');
  }

  private async setupHashtagOptimization(): Promise<void> {
    // Schedule weekly hashtag research
    const hashtagOptimization = cron.schedule(
      '0 10 * * SUN',
      async () => {
        await this.optimizeHashtagStrategy();
      },
      { scheduled: false }
    );

    this.scheduledTasks.set('hashtag_optimization', hashtagOptimization);
    hashtagOptimization.start();

    this.logger.success('Hashtag optimization configured');
  }

  private async executeEngagementCycle(): Promise<void> {
    try {
      this.logger.task('Engagement', 'Starting engagement automation cycle');

      for (const platform of this.config!.platforms) {
        // Find engagement opportunities
        const opportunities = await this.engagementAutomator.findEngagementOpportunities(platform);

        if (opportunities.length === 0) {
          continue;
        }

        this.logger.info(`Found ${opportunities.length} opportunities on ${platform}`);

        // Execute top opportunities based on automation level
        const maxActions = this.getMaxActionsForLevel(this.config!.goals.automation_level);
        const topOpportunities = opportunities
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, maxActions);

        for (const opportunity of topOpportunities) {
          for (const action of opportunity.recommendedActions) {
            const success = await this.engagementAutomator.executeEngagementAction(
              opportunity,
              action
            );
            if (success) {
              this.logger.info(`✅ Executed ${action} on ${platform} post ${opportunity.postId}`);
            }
          }
        }
      }

      this.logger.success('Engagement cycle completed');
    } catch (error) {
      this.logger.error('Engagement cycle failed:', error);
    }
  }

  private getMaxActionsForLevel(level: 'conservative' | 'moderate' | 'aggressive'): number {
    switch (level) {
      case 'conservative':
        return 2;
      case 'moderate':
        return 5;
      case 'aggressive':
        return 10;
    }
  }

  private async optimizeHashtagStrategy(): Promise<void> {
    try {
      this.logger.task('Hashtags', 'Optimizing hashtag strategy');

      for (const platform of this.config!.platforms) {
        for (const topic of this.config!.content_strategy.topics) {
          const strategy = await this.hashtagResearcher.researchHashtags({
            topic,
            platform,
            industry: this.config!.competitors[0]?.industry || 'general',
            targetAudience: this.config!.content_strategy.target_audience,
            contentType: 'educational',
          });

          this.logger.info(`Generated hashtag strategy for ${topic} on ${platform}:`);
          this.logger.info(`Primary: ${strategy.primary.join(', ')}`);
          this.logger.info(`Trending: ${strategy.trending.join(', ')}`);
        }
      }

      this.logger.success('Hashtag optimization completed');
    } catch (error) {
      this.logger.error('Hashtag optimization failed:', error);
    }
  }

  private async generateWeeklyReport(): Promise<void> {
    try {
      this.logger.task('Reporting', 'Generating weekly analytics report');

      const report = await this.analyticsDashboard.generateReport('weekly', this.config!.platforms);

      this.logger.info('📊 Weekly Report Generated:');
      this.logger.info(`📈 Followers: ${report.sections.performance_metrics.total_followers}`);
      this.logger.info(
        `💬 Engagement: ${report.sections.performance_metrics.average_engagement_rate}%`
      );
      this.logger.info(`📝 Posts: ${report.sections.content_analysis.published_content}`);

      // Log top recommendations
      if (report.sections.recommendations.length > 0) {
        this.logger.info('🎯 Top Recommendations:');
        report.sections.recommendations.slice(0, 3).forEach((rec, i) => {
          this.logger.info(`${i + 1}. ${rec}`);
        });
      }

      this.logger.success('Weekly report generated');
    } catch (error) {
      this.logger.error('Weekly report generation failed:', error);
    }
  }

  private async generateMonthlyReport(): Promise<void> {
    try {
      this.logger.task('Reporting', 'Generating monthly analytics report');

      const report = await this.analyticsDashboard.generateReport(
        'monthly',
        this.config!.platforms
      );

      this.logger.info('📊 Monthly Report Generated');
      this.logger.info(`Growth Rate: ${report.sections.performance_metrics.growth_rate}%`);

      this.logger.success('Monthly report generated');
    } catch (error) {
      this.logger.error('Monthly report generation failed:', error);
    }
  }

  /**
   * Generate comprehensive growth strategy using workflow engine
   */
  async generateGrowthStrategy(): Promise<void> {
    try {
      this.logger.task('Strategy', 'Generating comprehensive growth strategy');

      const workflowRequest: WorkflowRequest = {
        id: crypto.randomUUID(),
        type: 'social_campaign',
        topic: this.config!.content_strategy.content_pillars.join(' and '),
        platforms: this.config!.platforms.filter((p) => p !== 'tiktok'),
        parameters: {
          post_count: this.config!.goals.content_frequency * 4, // Monthly posts
          automation_level: this.config!.goals.automation_level,
        },
        brand_voice: this.config!.content_strategy.brand_voice,
        target_audience: this.config!.content_strategy.target_audience,
        goals: [
          `Achieve ${this.config!.goals.follower_growth_rate}% monthly growth`,
          `Maintain ${this.config!.goals.engagement_rate_target}% engagement rate`,
          `Post ${this.config!.goals.content_frequency} times per week`,
        ],
      };

      const result = await this.workflowEngine.executeWorkflow(workflowRequest);

      if (result.success) {
        this.logger.success(`✅ Growth strategy generated in ${result.execution_time}ms`);
        this.logger.info(`Completed phases: ${result.completed_phases.join(', ')}`);
      } else {
        this.logger.error(`❌ Strategy generation failed: ${result.error}`);
      }
    } catch (error) {
      this.logger.error('Growth strategy generation failed:', error);
    }
  }

  /**
   * Execute a custom workflow (research, content creation, etc.)
   */
  async executeWorkflow(request: WorkflowRequest): Promise<any> {
    return this.workflowEngine.executeWorkflow(request);
  }

  /**
   * Get current system status
   */
  async getStatus(): Promise<any> {
    const [automationStatus, engagementStats, competitorCount, dashboardWidgets] =
      await Promise.all([
        this.automationEngine.getStatus(),
        this.engagementAutomator.getEngagementStats(),
        this.competitorMonitor.getCompetitors(),
        this.analyticsDashboard.getWidgets(),
      ]);

    return {
      isRunning: this.isRunning,
      config: {
        platforms: this.config?.platforms || [],
        automation_level: this.config?.goals.automation_level || 'moderate',
        active_features: Object.entries(this.config?.automation || {})
          .filter(([key, enabled]) => enabled)
          .map(([key]) => key),
      },
      automation: automationStatus.data,
      engagement: {
        rules_count: engagementStats['totalRules'],
        daily_actions: engagementStats['dailyActions'],
      },
      competitors: {
        monitored_count: competitorCount.length,
        active_count: competitorCount.filter((c) => c.monitoringEnabled).length,
      },
      analytics: {
        widgets_count: dashboardWidgets.length,
        last_updated: dashboardWidgets[0]?.lastUpdated || null,
      },
      scheduled_tasks: Array.from(this.scheduledTasks.keys()),
    };
  }

  /**
   * Pause all automation
   */
  async pause(): Promise<void> {
    this.logger.info('⏸️  Pausing Social Growth Engine...');

    // Pause automation engine
    await this.automationEngine.pauseAutomation();

    // Stop scheduled tasks
    for (const [name, task] of this.scheduledTasks) {
      task.stop();
      this.logger.info(`Paused task: ${name}`);
    }

    // Stop competitor monitoring
    await this.competitorMonitor.stopMonitoring();

    this.isRunning = false;
    this.logger.success('✅ Social Growth Engine paused');
  }

  /**
   * Resume all automation
   */
  async resume(): Promise<void> {
    this.logger.info('▶️  Resuming Social Growth Engine...');

    // Resume automation engine
    await this.automationEngine.resumeAutomation();

    // Start scheduled tasks
    for (const [name, task] of this.scheduledTasks) {
      task.start();
      this.logger.info(`Resumed task: ${name}`);
    }

    // Start competitor monitoring
    await this.competitorMonitor.startMonitoring(120);

    this.isRunning = true;
    this.logger.success('✅ Social Growth Engine resumed');
  }

  /**
   * Stop and cleanup all resources
   */
  async stop(): Promise<void> {
    this.logger.info('🛑 Stopping Social Growth Engine...');

    // Stop automation engine
    await this.automationEngine.stop();

    // Stop all scheduled tasks
    for (const [name, task] of this.scheduledTasks) {
      task.stop();
    }
    this.scheduledTasks.clear();

    // Stop monitoring
    await this.competitorMonitor.stopMonitoring();

    // Cleanup
    this.analyticsDashboard.destroy();
    await this.engagementAutomator.cleanupOldData();

    this.isRunning = false;
    this.logger.success('✅ Social Growth Engine stopped');
  }

  /**
   * Generate a one-time content campaign
   */
  async createContentCampaign(
    topic: string,
    platforms: SocialPlatform[],
    postCount = 10
  ): Promise<any> {
    const workflowRequest: WorkflowRequest = {
      id: crypto.randomUUID(),
      type: 'content_creation',
      topic,
      platforms: platforms.filter((p) => p !== 'tiktok'),
      parameters: {
        post_count: postCount,
        content_type: 'educational',
      },
      brand_voice: this.config?.content_strategy.brand_voice || 'professional',
      target_audience: this.config?.content_strategy.target_audience || 'business professionals',
    };

    return this.workflowEngine.executeWorkflow(workflowRequest);
  }

  /**
   * Analyze competitors manually
   */
  async analyzeCompetitors(): Promise<any> {
    const competitors = await this.competitorMonitor.getCompetitors();
    const reports = [];

    for (const competitor of competitors.slice(0, 3)) {
      // Analyze top 3
      const report = await this.competitorMonitor.getCompetitorReport(competitor.id);
      reports.push(report);
    }

    return {
      competitors_analyzed: reports.length,
      reports,
    };
  }

  /**
   * Get alerts and recommendations
   */
  async getAlertsAndRecommendations(): Promise<any> {
    const [competitorAlerts, engagementStats] = await Promise.all([
      this.competitorMonitor.getAlerts(),
      this.engagementAutomator.getEngagementStats(),
    ]);

    return {
      competitor_alerts: competitorAlerts,
      engagement_stats: engagementStats,
      recommendations: [
        'Review competitor alerts for growth opportunities',
        'Check engagement automation performance',
        'Update hashtag strategy based on trends',
        'Analyze top-performing content for patterns',
      ],
    };
  }
}
