/**
 * Workflow Engine for Multi-Agent Pipeline Execution
 * Each agent handles a specific phase in the content creation workflow
 */
import { PerplexityAgent } from '../agents/perplexity-agent.js';
import { ClaudeAgent } from '../agents/claude-agent.js';
import { VectorStore } from '../storage/vector-store.js';
import { EnhancedContentStorage } from '../examples/memory-integration.js';
export class WorkflowEngine {
    constructor() {
        this.runningWorkflows = new Map();
        // Workflow phase definitions
        this.WORKFLOW_PHASES = {
            social_campaign: [
                {
                    id: 'research',
                    name: 'Research & Discovery',
                    agent: 'perplexity',
                    description: 'Research topic, trends, and competition from internet sources',
                    inputs: ['topic', 'target_audience', 'platforms'],
                    outputs: ['research_data', 'trends', 'competitor_analysis'],
                    timeout: 30000
                },
                {
                    id: 'content_alignment',
                    name: 'Content Alignment & Strategy',
                    agent: 'claude',
                    description: 'Align research with brand voice and create content strategy',
                    inputs: ['research_data', 'brand_voice', 'goals'],
                    outputs: ['content_strategy', 'messaging_framework', 'content_pillars'],
                    dependencies: ['research'],
                    timeout: 25000
                },
                {
                    id: 'platform_optimization',
                    name: 'Platform-Specific Optimization',
                    agent: 'platform_specialist',
                    description: 'Optimize content for each social media platform',
                    inputs: ['content_strategy', 'platforms'],
                    outputs: ['platform_content', 'posting_schedule', 'hashtag_strategy'],
                    dependencies: ['content_alignment'],
                    timeout: 20000
                },
                {
                    id: 'content_generation',
                    name: 'Content Generation',
                    agent: 'claude',
                    description: 'Generate actual social media posts and content',
                    inputs: ['platform_content', 'messaging_framework'],
                    outputs: ['social_posts', 'captions', 'content_calendar'],
                    dependencies: ['platform_optimization'],
                    timeout: 30000
                },
                {
                    id: 'analytics_setup',
                    name: 'Analytics & Monitoring Setup',
                    agent: 'analytics_specialist',
                    description: 'Set up tracking and define success metrics',
                    inputs: ['goals', 'platforms', 'content_calendar'],
                    outputs: ['tracking_setup', 'kpi_definitions', 'monitoring_dashboard'],
                    dependencies: ['content_generation'],
                    timeout: 15000
                }
            ],
            content_creation: [
                {
                    id: 'research',
                    name: 'Topic Research',
                    agent: 'perplexity',
                    description: 'Deep research on the topic from multiple sources',
                    inputs: ['topic', 'content_type'],
                    outputs: ['research_data', 'key_insights', 'source_references'],
                    timeout: 25000
                },
                {
                    id: 'content_structuring',
                    name: 'Content Structure & Outline',
                    agent: 'claude',
                    description: 'Create structured outline and content framework',
                    inputs: ['research_data', 'content_type', 'target_audience'],
                    outputs: ['content_outline', 'key_points', 'narrative_flow'],
                    dependencies: ['research'],
                    timeout: 20000
                },
                {
                    id: 'content_writing',
                    name: 'Content Creation',
                    agent: 'claude',
                    description: 'Write the actual content based on structure',
                    inputs: ['content_outline', 'brand_voice', 'key_points'],
                    outputs: ['final_content', 'meta_descriptions', 'call_to_actions'],
                    dependencies: ['content_structuring'],
                    timeout: 35000
                },
                {
                    id: 'optimization',
                    name: 'SEO & Platform Optimization',
                    agent: 'optimization_specialist',
                    description: 'Optimize content for search and platform algorithms',
                    inputs: ['final_content', 'platforms', 'target_keywords'],
                    outputs: ['optimized_content', 'seo_metadata', 'engagement_hooks'],
                    dependencies: ['content_writing'],
                    timeout: 15000
                }
            ],
            research_analysis: [
                {
                    id: 'data_collection',
                    name: 'Comprehensive Data Collection',
                    agent: 'perplexity',
                    description: 'Collect data from web, academic, and news sources',
                    inputs: ['research_topic', 'data_sources', 'time_range'],
                    outputs: ['raw_data', 'source_credibility', 'data_timestamps'],
                    timeout: 40000
                },
                {
                    id: 'data_processing',
                    name: 'Data Processing & Filtering',
                    agent: 'data_processor',
                    description: 'Clean, filter, and structure collected data',
                    inputs: ['raw_data', 'relevance_criteria'],
                    outputs: ['processed_data', 'data_quality_report', 'filtered_sources'],
                    dependencies: ['data_collection'],
                    timeout: 20000
                },
                {
                    id: 'analysis',
                    name: 'Deep Analysis & Insights',
                    agent: 'claude',
                    description: 'Analyze processed data and extract insights',
                    inputs: ['processed_data', 'analysis_framework'],
                    outputs: ['insights', 'patterns', 'correlations', 'predictions'],
                    dependencies: ['data_processing'],
                    timeout: 30000
                },
                {
                    id: 'report_generation',
                    name: 'Report Generation',
                    agent: 'claude',
                    description: 'Create comprehensive analysis report',
                    inputs: ['insights', 'patterns', 'report_template'],
                    outputs: ['final_report', 'executive_summary', 'visualizations'],
                    dependencies: ['analysis'],
                    timeout: 25000
                }
            ]
        };
        this.perplexityAgent = new PerplexityAgent();
        this.claudeAgent = new ClaudeAgent();
        this.vectorStore = new VectorStore();
        this.memoryStorage = new EnhancedContentStorage();
    }
    /**
     * Execute a complete workflow pipeline
     */
    async executeWorkflow(request) {
        const startTime = Date.now();
        const execution = {
            id: request.id,
            request,
            phases: this.WORKFLOW_PHASES[request.type] || [],
            results: new Map(),
            status: 'running',
            startTime
        };
        this.runningWorkflows.set(request.id, execution);
        try {
            console.log(`🚀 Starting ${request.type} workflow: ${request.topic}`);
            for (const phase of execution.phases) {
                console.log(`📋 Executing phase: ${phase.name}`);
                // Check dependencies
                if (phase.dependencies) {
                    const missingDeps = phase.dependencies.filter(dep => !execution.results.has(dep));
                    if (missingDeps.length > 0) {
                        throw new Error(`Missing dependencies for ${phase.id}: ${missingDeps.join(', ')}`);
                    }
                }
                // Execute phase
                const phaseResult = await this.executePhase(phase, execution);
                execution.results.set(phase.id, phaseResult);
                console.log(`✅ Completed phase: ${phase.name}`);
            }
            // Store workflow results in memory
            await this.storeWorkflowResults(execution);
            execution.status = 'completed';
            const executionTime = Date.now() - startTime;
            return {
                success: true,
                workflow_id: request.id,
                completed_phases: execution.phases.map(p => p.id),
                failed_phases: [],
                results: Object.fromEntries(execution.results),
                execution_time: executionTime
            };
        }
        catch (error) {
            execution.status = 'failed';
            const executionTime = Date.now() - startTime;
            return {
                success: false,
                workflow_id: request.id,
                completed_phases: Array.from(execution.results.keys()),
                failed_phases: [execution.phases.find(p => !execution.results.has(p.id))?.id].filter(Boolean),
                results: Object.fromEntries(execution.results),
                execution_time: executionTime,
                error: error instanceof Error ? error.message : String(error)
            };
        }
        finally {
            this.runningWorkflows.delete(request.id);
        }
    }
    /**
     * Execute a single workflow phase
     */
    async executePhase(phase, execution) {
        const { request } = execution;
        // Gather inputs from previous phases and request
        const inputs = this.gatherPhaseInputs(phase, execution);
        // Execute based on agent type
        switch (phase.agent) {
            case 'perplexity':
                return await this.executePerplexityPhase(phase, inputs, request);
            case 'claude':
                return await this.executeClaudePhase(phase, inputs, request);
            case 'platform_specialist':
                return await this.executePlatformSpecialistPhase(phase, inputs, request);
            case 'analytics_specialist':
                return await this.executeAnalyticsSpecialistPhase(phase, inputs, request);
            case 'data_processor':
                return await this.executeDataProcessorPhase(phase, inputs, request);
            case 'optimization_specialist':
                return await this.executeOptimizationSpecialistPhase(phase, inputs, request);
            default:
                throw new Error(`Unknown agent type: ${phase.agent}`);
        }
    }
    /**
     * Perplexity Agent Phase Execution
     */
    async executePerplexityPhase(phase, inputs, request) {
        switch (phase.id) {
            case 'research':
                return await this.perplexityAgent.research({
                    query: `${request.topic} ${request.target_audience} trends analysis`,
                    sources: ['web', 'news', 'academic'],
                    maxResults: 15,
                    includeCompetitors: true,
                    platforms: request.platforms
                });
            case 'data_collection':
                return await this.perplexityAgent.comprehensiveResearch({
                    topic: inputs.research_topic,
                    sources: inputs.data_sources || ['web', 'news', 'academic'],
                    timeRange: inputs.time_range || '30d',
                    depth: 'comprehensive'
                });
            default:
                throw new Error(`Unknown Perplexity phase: ${phase.id}`);
        }
    }
    /**
     * Claude Agent Phase Execution
     */
    async executeClaudePhase(phase, inputs, request) {
        switch (phase.id) {
            case 'content_alignment':
                return await this.claudeAgent.createContentStrategy({
                    researchData: inputs.research_data,
                    brandVoice: request.brand_voice || 'professional',
                    goals: request.goals || [],
                    targetAudience: request.target_audience,
                    platforms: request.platforms
                });
            case 'content_generation':
                return await this.claudeAgent.generateSocialContent({
                    strategy: inputs.content_strategy,
                    messagingFramework: inputs.messaging_framework,
                    platforms: request.platforms,
                    quantity: request.parameters.post_count || 10
                });
            case 'content_structuring':
                return await this.claudeAgent.createContentStructure({
                    researchData: inputs.research_data,
                    contentType: inputs.content_type,
                    targetAudience: request.target_audience,
                    brandVoice: request.brand_voice
                });
            case 'content_writing':
                return await this.claudeAgent.writeContent({
                    outline: inputs.content_outline,
                    brandVoice: request.brand_voice || 'professional',
                    keyPoints: inputs.key_points,
                    contentType: request.parameters.content_type
                });
            case 'analysis':
                return await this.claudeAgent.analyzeData({
                    data: inputs.processed_data,
                    framework: inputs.analysis_framework || 'comprehensive',
                    focusAreas: request.parameters.focus_areas || []
                });
            case 'report_generation':
                return await this.claudeAgent.generateReport({
                    insights: inputs.insights,
                    patterns: inputs.patterns,
                    template: inputs.report_template || 'executive',
                    audience: request.target_audience
                });
            default:
                throw new Error(`Unknown Claude phase: ${phase.id}`);
        }
    }
    /**
     * Platform Specialist Phase Execution
     */
    async executePlatformSpecialistPhase(phase, inputs, request) {
        // This would be implemented with platform-specific optimization logic
        return {
            platform_content: this.optimizeForPlatforms(inputs.content_strategy, request.platforms),
            posting_schedule: this.generatePostingSchedule(request.platforms),
            hashtag_strategy: this.generateHashtagStrategy(request.topic, request.platforms)
        };
    }
    /**
     * Analytics Specialist Phase Execution
     */
    async executeAnalyticsSpecialistPhase(phase, inputs, request) {
        return {
            tracking_setup: this.setupTracking(request.platforms, request.goals),
            kpi_definitions: this.defineKPIs(request.goals, request.parameters),
            monitoring_dashboard: this.createMonitoringDashboard(request.platforms)
        };
    }
    /**
     * Data Processor Phase Execution
     */
    async executeDataProcessorPhase(phase, inputs, request) {
        return {
            processed_data: this.processRawData(inputs.raw_data),
            data_quality_report: this.generateDataQualityReport(inputs.raw_data),
            filtered_sources: this.filterSources(inputs.source_credibility)
        };
    }
    /**
     * Optimization Specialist Phase Execution
     */
    async executeOptimizationSpecialistPhase(phase, inputs, request) {
        return {
            optimized_content: this.optimizeContent(inputs.final_content, request.platforms),
            seo_metadata: this.generateSEOMetadata(inputs.final_content),
            engagement_hooks: this.createEngagementHooks(inputs.final_content, request.platforms)
        };
    }
    /**
     * Gather inputs for a phase from previous phases and request
     */
    gatherPhaseInputs(phase, execution) {
        const inputs = {};
        // Add data from request
        inputs.topic = execution.request.topic;
        inputs.platforms = execution.request.platforms;
        inputs.brand_voice = execution.request.brand_voice;
        inputs.target_audience = execution.request.target_audience;
        inputs.goals = execution.request.goals;
        // Add parameters
        Object.assign(inputs, execution.request.parameters);
        // Add outputs from previous phases
        for (const [phaseId, result] of execution.results) {
            if (typeof result === 'object' && result !== null) {
                Object.assign(inputs, result);
            }
        }
        return inputs;
    }
    /**
     * Store workflow results in persistent memory
     */
    async storeWorkflowResults(execution) {
        const summary = this.generateWorkflowSummary(execution);
        await this.memoryStorage.storeContent({
            content: summary,
            platform: 'workflow_engine',
            contentType: 'workflow_result',
            metadata: {
                workflow_id: execution.id,
                workflow_type: execution.request.type,
                topic: execution.request.topic,
                completed_phases: Array.from(execution.results.keys()),
                execution_time: Date.now() - execution.startTime
            }
        });
    }
    // Helper methods for platform optimization
    optimizeForPlatforms(strategy, platforms) {
        // Platform-specific optimization logic
        return platforms.reduce((acc, platform) => {
            acc[platform] = {
                tone: this.getPlatformTone(platform),
                format: this.getPlatformFormat(platform),
                optimal_length: this.getPlatformOptimalLength(platform)
            };
            return acc;
        }, {});
    }
    generatePostingSchedule(platforms) {
        // Generate optimal posting times for each platform
        return platforms.reduce((acc, platform) => {
            acc[platform] = this.getOptimalPostingTimes(platform);
            return acc;
        }, {});
    }
    generateHashtagStrategy(topic, platforms) {
        // Generate hashtag strategies per platform
        return platforms.reduce((acc, platform) => {
            acc[platform] = this.getHashtagsForPlatform(topic, platform);
            return acc;
        }, {});
    }
    setupTracking(platforms, goals) {
        return {
            platforms: platforms.map(p => ({ platform: p, tracking_enabled: true })),
            goals: goals?.map(g => ({ goal: g, metrics: this.getMetricsForGoal(g) }))
        };
    }
    defineKPIs(goals, parameters) {
        return goals?.map(goal => ({
            goal,
            primary_kpi: this.getPrimaryKPIForGoal(goal),
            secondary_kpis: this.getSecondaryKPIsForGoal(goal),
            target_values: parameters?.[`${goal}_targets`]
        })) || [];
    }
    createMonitoringDashboard(platforms) {
        return {
            dashboard_url: `https://analytics.yourcompany.com/dashboard`,
            widgets: platforms.map(p => ({ platform: p, widgets: this.getDashboardWidgets(p) }))
        };
    }
    // Data processing helpers
    processRawData(rawData) {
        // Data cleaning and processing logic
        return rawData; // Placeholder
    }
    generateDataQualityReport(rawData) {
        return {
            total_sources: 0,
            credible_sources: 0,
            quality_score: 0.85,
            completeness: 0.92
        };
    }
    filterSources(sourceCredibility) {
        return []; // Placeholder
    }
    // Content optimization helpers
    optimizeContent(content, platforms) {
        return platforms.reduce((acc, platform) => {
            acc[platform] = {
                optimized_content: content,
                seo_score: 0.85,
                readability: 'high'
            };
            return acc;
        }, {});
    }
    generateSEOMetadata(content) {
        return {
            meta_title: 'Generated Meta Title',
            meta_description: 'Generated Meta Description',
            keywords: ['keyword1', 'keyword2'],
            schema_markup: {}
        };
    }
    createEngagementHooks(content, platforms) {
        return platforms.reduce((acc, platform) => {
            acc[platform] = {
                hooks: ['Question hook', 'Statistic hook', 'Story hook'],
                cta: this.getCTAForPlatform(platform)
            };
            return acc;
        }, {});
    }
    // Platform-specific helper methods
    getPlatformTone(platform) {
        const tones = {
            twitter: 'casual',
            linkedin: 'professional',
            instagram: 'visual',
            facebook: 'friendly'
        };
        return tones[platform] || 'neutral';
    }
    getPlatformFormat(platform) {
        const formats = {
            twitter: 'short-form',
            linkedin: 'article',
            instagram: 'visual-story',
            facebook: 'mixed-media'
        };
        return formats[platform] || 'text';
    }
    getPlatformOptimalLength(platform) {
        const lengths = {
            twitter: 280,
            linkedin: 1300,
            instagram: 125,
            facebook: 250
        };
        return lengths[platform] || 500;
    }
    getOptimalPostingTimes(platform) {
        const times = {
            twitter: ['9:00 AM', '12:00 PM', '3:00 PM'],
            linkedin: ['8:00 AM', '12:00 PM', '5:00 PM'],
            instagram: ['11:00 AM', '2:00 PM', '5:00 PM'],
            facebook: ['9:00 AM', '1:00 PM', '7:00 PM']
        };
        return times[platform] || ['12:00 PM'];
    }
    getHashtagsForPlatform(topic, platform) {
        // This would use AI to generate relevant hashtags
        return [`#${topic}`, '#marketing', '#content'];
    }
    getMetricsForGoal(goal) {
        const metrics = {
            engagement: ['likes', 'comments', 'shares'],
            awareness: ['reach', 'impressions', 'mentions'],
            traffic: ['clicks', 'website_visits', 'conversions']
        };
        return metrics[goal] || ['engagement'];
    }
    getPrimaryKPIForGoal(goal) {
        const kpis = {
            engagement: 'engagement_rate',
            awareness: 'reach',
            traffic: 'click_through_rate'
        };
        return kpis[goal] || 'engagement_rate';
    }
    getSecondaryKPIsForGoal(goal) {
        const secondaryKPIs = {
            engagement: ['likes_per_post', 'comment_rate', 'share_rate'],
            awareness: ['impressions', 'brand_mentions', 'follower_growth'],
            traffic: ['website_sessions', 'bounce_rate', 'conversion_rate']
        };
        return secondaryKPIs[goal] || [];
    }
    getDashboardWidgets(platform) {
        return ['performance_chart', 'engagement_metrics', 'audience_demographics'];
    }
    getCTAForPlatform(platform) {
        const ctas = {
            twitter: 'Join the conversation!',
            linkedin: 'Connect with us',
            instagram: 'Follow for more',
            facebook: 'Like and share'
        };
        return ctas[platform] || 'Learn more';
    }
    generateWorkflowSummary(execution) {
        return `Workflow Summary: ${execution.request.type} for "${execution.request.topic}"
    
Completed Phases: ${Array.from(execution.results.keys()).join(', ')}
Execution Time: ${Date.now() - execution.startTime}ms
Platforms: ${execution.request.platforms.join(', ')}
Target Audience: ${execution.request.target_audience || 'General'}
Brand Voice: ${execution.request.brand_voice || 'Professional'}

Results: ${JSON.stringify(Object.fromEntries(execution.results), null, 2)}`;
    }
    /**
     * Get workflow status
     */
    getWorkflowStatus(workflowId) {
        return this.runningWorkflows.get(workflowId);
    }
    /**
     * Get all available workflow types
     */
    getAvailableWorkflows() {
        return Object.keys(this.WORKFLOW_PHASES);
    }
    /**
     * Get workflow phases for a specific type
     */
    getWorkflowPhases(workflowType) {
        return this.WORKFLOW_PHASES[workflowType] || [];
    }
}
//# sourceMappingURL=workflow-engine.js.map