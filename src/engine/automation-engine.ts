// src/engine/automation-engine.ts
import { randomUUID } from 'node:crypto';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Content,
  AutomationConfig,
  SocialPlatform,
  Trend,
  AccountMetrics,
  CompetitorAnalysis,
  APIResponse,
  SocialMediaService,
} from '@/types';
import { RateLimitError, schemas } from '@/types';
import { Logger } from '@/utils/Logger';
import { SocialMediaFactory } from '@/services/SocialMediaFactory';
import { OpenAIService } from '@/services/OpenAIService';
import { TrendAnalyzer } from '@/services/TrendAnalyzer';
import { ContentOptimizer } from '@/services/ContentOptimizer';
import { AnalyticsCollector } from '@/services/AnalyticsCollector';
import { addMinutes, addHours } from 'date-fns';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : JSON.stringify(error);

export class AutomationEngine {
  private readonly logger = new Logger('AutomationEngine');
  private readonly supabase: SupabaseClient;

  private readonly socialServices = new Map<SocialPlatform, SocialMediaService>();
  private readonly aiService = new OpenAIService();
  private readonly trendAnalyzer = new TrendAnalyzer();
  private readonly contentOptimizer = new ContentOptimizer();
  private readonly analyticsCollector = new AnalyticsCollector();

  private readonly scheduledJobs = new Map<string, cron.ScheduledTask>();
  private isRunning = false;
  private config: AutomationConfig | null = null;

  constructor() {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey);

    void this.initializeServices();
    this.setupErrorHandling();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize social media services
      const platforms: SocialPlatform[] = ['twitter', 'linkedin', 'facebook', 'instagram'];

      for (const platform of platforms) {
        try {
          const service = SocialMediaFactory.create(platform);
          await service.authenticate();
          this.socialServices.set(platform, service);
          this.logger.info(`${platform} service initialized successfully`);
        } catch (error) {
          this.logger.error(`Failed to initialize ${platform} service:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize services:', error);
    }
  }

  private setupErrorHandling(): void {
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  async start(configId?: string): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Automation engine is already running');
      return;
    }

    try {
      // Load configuration
      this.config = await this.loadConfiguration(configId);

      if (!this.config.enabled) {
        this.logger.info('Automation is disabled in configuration');
        return;
      }

      this.isRunning = true;
      this.logger.info('Starting automation engine...');

      // Schedule core automation tasks
      await this.scheduleAutomationTasks();

      // Start trend monitoring
      if (this.config.trendMonitoring.enabled) {
        await this.startTrendMonitoring();
      }

      // Start competitor tracking
      if (this.config.competitorTracking.enabled) {
        await this.startCompetitorTracking();
      }

      // Schedule analytics collection
      await this.scheduleAnalyticsCollection();

      this.logger.info('Automation engine started successfully');
    } catch (error) {
      this.logger.error('Failed to start automation engine:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Automation engine is not running');
      return;
    }

    this.logger.info('Stopping automation engine...');

    // Stop all scheduled jobs
    for (const [name, job] of this.scheduledJobs.entries()) {
      job.stop();
      this.logger.info(`Stopped job: ${name}`);
    }

    this.scheduledJobs.clear();
    this.isRunning = false;

    this.logger.info('Automation engine stopped');
  }

  private async loadConfiguration(configId?: string): Promise<AutomationConfig> {
    try {
      let query = this.supabase.from('automation_configs').select('*');

      if (configId) {
        query = query.eq('id', configId);
      } else {
        query = query.eq('enabled', true).limit(1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to load configuration: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No automation configuration found');
      }

      const config = schemas.AutomationConfig.parse(data[0]);
      this.logger.info(`Loaded configuration: ${config.name}`);

      return config;
    } catch (error) {
      this.logger.error('Failed to load configuration:', error);
      throw error instanceof Error ? error : new Error(getErrorMessage(error));
    }
  }

  private async scheduleAutomationTasks(): Promise<void> {
    if (!this.config) {
      return;
    }

    const { postingSchedule } = this.config;

    // Schedule content generation (daily at 6 AM)
    const contentGenJob = cron.schedule(
      '0 6 * * *',
      async () => {
        await this.generateDailyContent();
      },
      {
        timezone: postingSchedule.timezone,
        scheduled: false,
      }
    );

    this.scheduledJobs.set('content-generation', contentGenJob);

    // Schedule posting based on configuration
    for (const timeSlot of postingSchedule.timesOfDay) {
      const [hour, minute] = timeSlot.split(':').map(Number);
      const cronExpression = `${minute} ${hour} * * ${postingSchedule.daysOfWeek.join(',')}`;

      const postingJob = cron.schedule(
        cronExpression,
        async () => {
          await this.executeScheduledPosting();
        },
        {
          timezone: postingSchedule.timezone,
          scheduled: false,
        }
      );

      this.scheduledJobs.set(`posting-${timeSlot}`, postingJob);
    }

    // Start all jobs
    for (const [name, job] of this.scheduledJobs.entries()) {
      job.start();
      this.logger.info(`Started scheduled job: ${name}`);
    }
  }

  private async generateDailyContent(): Promise<void> {
    try {
      this.logger.info('Starting daily content generation...');

      // Get trending topics
      const trends = await this.trendAnalyzer.getTrendingTopics(
        this.config!.trendMonitoring.keywords,
        this.config!.trendMonitoring.industries
      );

      // Generate content for each platform
      const generatedContent: Content[] = [];

      for (const platform of this.config!.platforms) {
        const contentIdeas = await this.generateContentForPlatform(platform, trends);
        generatedContent.push(...contentIdeas);
      }

      // Store generated content
      await this.storeGeneratedContent(generatedContent);

      this.logger.info(
        `Generated ${generatedContent.length} content pieces for ${this.config!.platforms.length} platforms`
      );
    } catch (error) {
      this.logger.error('Failed to generate daily content:', error);
    }
  }

  private async generateContentForPlatform(
    platform: SocialPlatform,
    trends: Trend[]
  ): Promise<Content[]> {
    const contentPieces: Content[] = [];
    const relevantTrends = trends.filter((t) => t.relevanceScore > 0.7).slice(0, 3);

    for (const trend of relevantTrends) {
      try {
        // Generate base content using AI
        const prompt = this.createContentPrompt(trend, platform);
        const generatedText = await this.aiService.generateContent(prompt);

        // Optimize for platform
        const optimizedContent = await this.contentOptimizer.optimizeForPlatform(
          generatedText,
          platform
        );

        // Create content object
        const content: Content = {
          id: randomUUID(),
          content: optimizedContent.text,
          platform,
          status: 'draft',
          hashtags: optimizedContent.hashtags,
          mentions: optimizedContent.mentions,
          mediaUrls: [],
          aiGenerated: true,
          originalTopic: trend.topic,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Validate content
        const validatedContent = schemas.Content.parse(content);
        contentPieces.push(validatedContent);
      } catch (error) {
        this.logger.error(
          `Failed to generate content for ${platform} and trend ${trend.topic}:`,
          error
        );
      }
    }

    return contentPieces;
  }

  private createContentPrompt(trend: Trend, platform: SocialPlatform): string {
    const platformContext: Record<SocialPlatform, string> = {
      twitter:
        'Create a concise, engaging tweet that drives discussion and includes relevant hashtags.',
      linkedin:
        'Write a professional LinkedIn post that provides business insights and encourages professional networking.',
      facebook:
        "Craft a Facebook post that's conversational, engaging, and suitable for community discussion.",
      instagram:
        "Create an Instagram caption that's visually appealing, uses relevant hashtags, and encourages engagement.",
      tiktok:
        'Outline a TikTok script that captures attention quickly, leverages current trends, and delivers clear value.',
    };

    return `
      As a business development specialist focused on changing the world one solution at a time, create engaging social media content about: ${trend.topic}

      Platform: ${platform}
      Context: ${platformContext[platform]}
      Keywords: ${trend.keywords.join(', ')}
      Tone: Professional but approachable, solution-focused, optimistic
      
      Requirements:
      - Include actionable insights
      - Stay within platform character limits
      - Include 2-3 relevant hashtags
      - Make it shareable and engaging
      - Focus on problem-solving and innovation
      
      Generate the content:
    `;
  }

  private async storeGeneratedContent(contentPieces: Content[]): Promise<void> {
    try {
      const { error } = await this.supabase.from('content').insert(contentPieces);

      if (error) {
        throw new Error(`Failed to store content: ${error.message}`);
      }

      this.logger.info(`Stored ${contentPieces.length} content pieces in database`);
    } catch (error) {
      this.logger.error('Failed to store generated content:', error);
      throw error instanceof Error ? error : new Error(getErrorMessage(error));
    }
  }

  private async executeScheduledPosting(): Promise<void> {
    try {
      this.logger.info('Executing scheduled posting...');

      // Get content scheduled for this time slot
      const currentTime = new Date();
      const scheduledContent = await this.getScheduledContent(currentTime);

      if (scheduledContent.length === 0) {
        this.logger.info('No content scheduled for this time slot');
        return;
      }

      // Process each content piece
      const results = await Promise.allSettled(
        scheduledContent.map((content) => this.publishContent(content))
      );

      // Log results
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      this.logger.info(`Publishing results: ${successful} successful, ${failed} failed`);

      // Handle failed posts
      if (failed > 0) {
        const failedResults = results
          .map((result, index) => ({ result, content: scheduledContent[index] }))
          .filter(
            (item): item is { result: PromiseRejectedResult; content: Content } =>
              item.result.status === 'rejected'
          )
          .map(({ result, content }) => ({
            content,
            error: result.reason,
          }));

        await this.handleFailedPosts(failedResults);
      }
    } catch (error) {
      this.logger.error('Failed to execute scheduled posting:', error);
    }
  }

  private async getScheduledContent(currentTime: Date): Promise<Content[]> {
    const timeWindow = addMinutes(currentTime, 30); // 30-minute window

    const { data, error } = await this.supabase
      .from('content')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_time', currentTime.toISOString())
      .lte('scheduled_time', timeWindow.toISOString())
      .in('platform', this.config!.platforms);

    if (error) {
      throw new Error(`Failed to fetch scheduled content: ${error.message}`);
    }

    return (data || []).map((item) => schemas.Content.parse(item));
  }

  private async publishContent(content: Content): Promise<void> {
    try {
      const service = this.socialServices.get(content.platform);

      if (!service) {
        throw new Error(`No service available for platform: ${content.platform}`);
      }

      this.logger.info(`Publishing content ${content.id} to ${content.platform}`);

      // Publish the content
      const postId = await service.post(content);

      // Update content status
      await this.updateContentStatus(content.id, 'published', {
        publishedTime: new Date(),
        externalId: postId,
      });

      this.logger.info(`Successfully published content ${content.id} as post ${postId}`);
    } catch (error) {
      this.logger.error(`Failed to publish content ${content.id}:`, error);

      if (error instanceof RateLimitError) {
        await this.handleRateLimit(content, error.resetTime);
      } else {
        await this.updateContentStatus(content.id, 'failed');
      }

      throw error instanceof Error ? error : new Error(getErrorMessage(error));
    }
  }

  private async updateContentStatus(
    contentId: string,
    status: Content['status'],
    updates: Partial<Content> = {}
  ): Promise<void> {
    const { error } = await this.supabase
      .from('content')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...updates,
      })
      .eq('id', contentId);

    if (error) {
      this.logger.error(`Failed to update content status: ${error.message}`);
    }
  }

  private async handleRateLimit(content: Content, resetTime: Date): Promise<void> {
    this.logger.warn(`Rate limit hit for ${content.platform}. Rescheduling for ${resetTime}`);

    // Reschedule content after rate limit resets
    await this.updateContentStatus(content.id, 'scheduled', {
      scheduledTime: addMinutes(resetTime, 5), // Add 5 minutes buffer
    });
  }

  private async handleFailedPosts(
    failedPosts: Array<{ content: Content; error: unknown }>
  ): Promise<void> {
    for (const { content, error } of failedPosts) {
      if (error instanceof RateLimitError) {
        continue;
      }

      const retryable =
        typeof error === 'object' && error !== null && 'retryable' in error
          ? Boolean((error as { retryable?: boolean }).retryable)
          : false;

      if (retryable) {
        const retryTime = addHours(new Date(), 1);
        await this.updateContentStatus(content.id, 'scheduled', {
          scheduledTime: retryTime,
        });
      } else {
        await this.updateContentStatus(content.id, 'failed');
      }

      this.logger.error(`Content ${content.id} failed to publish: ${getErrorMessage(error)}`);
    }
  }

  private async startTrendMonitoring(): Promise<void> {
    const trendJob = cron.schedule(
      '0 */6 * * *',
      async () => {
        await this.collectTrends();
      },
      { scheduled: false }
    );

    this.scheduledJobs.set('trend-monitoring', trendJob);
    trendJob.start();

    this.logger.info('Started trend monitoring (every 6 hours)');
  }

  private async startCompetitorTracking(): Promise<void> {
    const competitorJob = cron.schedule(
      '0 8,20 * * *',
      async () => {
        await this.analyzeCompetitors();
      },
      { scheduled: false }
    );

    this.scheduledJobs.set('competitor-tracking', competitorJob);
    competitorJob.start();

    this.logger.info('Started competitor tracking (8 AM and 8 PM daily)');
  }

  private async scheduleAnalyticsCollection(): Promise<void> {
    const analyticsJob = cron.schedule(
      '0 23 * * *',
      async () => {
        await this.collectAnalytics();
      },
      { scheduled: false }
    );

    this.scheduledJobs.set('analytics-collection', analyticsJob);
    analyticsJob.start();

    this.logger.info('Started analytics collection (11 PM daily)');
  }

  private async collectTrends(): Promise<void> {
    try {
      this.logger.info('Collecting trending topics...');

      const trends = await this.trendAnalyzer.getTrendingTopics(
        this.config!.trendMonitoring.keywords,
        this.config!.trendMonitoring.industries
      );

      // Store trends in database
      const { error } = await this.supabase.from('trends').insert(trends);

      if (error) {
        throw new Error(`Failed to store trends: ${error.message}`);
      }

      this.logger.info(`Collected and stored ${trends.length} trending topics`);
    } catch (error) {
      this.logger.error('Failed to collect trends:', error);
    }
  }

  private async analyzeCompetitors(): Promise<void> {
    try {
      this.logger.info('Analyzing competitor content...');

      const competitors = this.config!.competitorTracking.competitors;
      const analyses: CompetitorAnalysis[] = [];

      for (const competitor of competitors) {
        for (const [platform, handle] of Object.entries(competitor.handles)) {
          try {
            const service = this.socialServices.get(platform as SocialPlatform);
            if (!service) {
              continue;
            }

            // Get competitor's recent posts and analyze them
            const analysis = await this.analyticsCollector.analyzeCompetitor(
              competitor.name,
              platform as SocialPlatform,
              handle
            );

            analyses.push(analysis);
          } catch (error) {
            this.logger.error(
              `Failed to analyze competitor ${competitor.name} on ${platform}:`,
              error
            );
          }
        }
      }

      // Store competitor analyses
      if (analyses.length > 0) {
        const { error } = await this.supabase.from('competitor_analyses').insert(analyses);

        if (error) {
          throw new Error(`Failed to store competitor analyses: ${error.message}`);
        }
      }

      this.logger.info(`Analyzed ${analyses.length} competitor accounts`);
    } catch (error) {
      this.logger.error('Failed to analyze competitors:', error);
    }
  }

  private async collectAnalytics(): Promise<void> {
    try {
      this.logger.info('Collecting account analytics...');

      const metrics: AccountMetrics[] = [];

      for (const platform of this.config!.platforms) {
        try {
          const service = this.socialServices.get(platform);
          if (!service) {
            continue;
          }

          const platformMetrics = await service.getMetrics();
          metrics.push(platformMetrics);
        } catch (error) {
          this.logger.error(`Failed to collect metrics for ${platform}:`, error);
        }
      }

      // Store metrics
      if (metrics.length > 0) {
        const { error } = await this.supabase.from('account_metrics').insert(metrics);

        if (error) {
          throw new Error(`Failed to store metrics: ${error.message}`);
        }
      }

      this.logger.info(`Collected metrics for ${metrics.length} platforms`);
    } catch (error) {
      this.logger.error('Failed to collect analytics:', error);
    }
  }

  // Public API methods
  async getStatus(): Promise<APIResponse<any>> {
    return {
      success: true,
      data: {
        isRunning: this.isRunning,
        configId: this.config?.id,
        configName: this.config?.name,
        enabledPlatforms: this.config?.platforms || [],
        scheduledJobs: Array.from(this.scheduledJobs.keys()),
        servicesStatus: Object.fromEntries(
          Array.from(this.socialServices.entries()).map(([platform, service]) => [
            platform,
            service ? 'connected' : 'disconnected',
          ])
        ),
      },
      timestamp: new Date(),
    };
  }

  async pauseAutomation(): Promise<APIResponse<void>> {
    try {
      if (!this.config) {
        throw new Error('No configuration loaded');
      }

      // Update configuration to disabled
      await this.supabase
        .from('automation_configs')
        .update({ enabled: false })
        .eq('id', this.config.id);

      this.config.enabled = false;

      // Stop jobs but keep engine running
      for (const job of this.scheduledJobs.values()) {
        job.stop();
      }

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
        timestamp: new Date(),
      };
    }
  }

  async resumeAutomation(): Promise<APIResponse<void>> {
    try {
      if (!this.config) {
        throw new Error('No configuration loaded');
      }

      // Update configuration to enabled
      await this.supabase
        .from('automation_configs')
        .update({ enabled: true })
        .eq('id', this.config.id);

      this.config.enabled = true;

      // Restart jobs
      for (const job of this.scheduledJobs.values()) {
        job.start();
      }

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
        timestamp: new Date(),
      };
    }
  }
}
