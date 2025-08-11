/**
 * Workflow Engine for Multi-Agent Pipeline Execution
 * Each agent handles a specific phase in the content creation workflow
 */
export interface WorkflowPhase {
    id: string;
    name: string;
    agent: string;
    description: string;
    inputs: string[];
    outputs: string[];
    dependencies?: string[];
    timeout?: number;
}
export interface WorkflowRequest {
    id: string;
    type: 'social_campaign' | 'content_creation' | 'research_analysis' | 'competitive_analysis';
    topic: string;
    platforms: ('twitter' | 'linkedin' | 'instagram' | 'facebook')[];
    parameters: Record<string, unknown>;
    brand_voice?: string;
    target_audience?: string;
    goals?: string[];
}
export interface WorkflowResult {
    success: boolean;
    workflow_id: string;
    completed_phases: string[];
    failed_phases: string[];
    results: Record<string, unknown>;
    execution_time: number;
    error?: string;
}
export declare class WorkflowEngine {
    private perplexityAgent;
    private claudeAgent;
    private vectorStore;
    private memoryStorage;
    private runningWorkflows;
    private readonly WORKFLOW_PHASES;
    constructor();
    /**
     * Execute a complete workflow pipeline
     */
    executeWorkflow(request: WorkflowRequest): Promise<WorkflowResult>;
    /**
     * Execute a single workflow phase
     */
    private executePhase;
    /**
     * Perplexity Agent Phase Execution
     */
    private executePerplexityPhase;
    /**
     * Claude Agent Phase Execution
     */
    private executeClaudePhase;
    /**
     * Platform Specialist Phase Execution
     */
    private executePlatformSpecialistPhase;
    /**
     * Analytics Specialist Phase Execution
     */
    private executeAnalyticsSpecialistPhase;
    /**
     * Data Processor Phase Execution
     */
    private executeDataProcessorPhase;
    /**
     * Optimization Specialist Phase Execution
     */
    private executeOptimizationSpecialistPhase;
    /**
     * Gather inputs for a phase from previous phases and request
     */
    private gatherPhaseInputs;
    /**
     * Store workflow results in persistent memory
     */
    private storeWorkflowResults;
    private optimizeForPlatforms;
    private generatePostingSchedule;
    private generateHashtagStrategy;
    private setupTracking;
    private defineKPIs;
    private createMonitoringDashboard;
    private processRawData;
    private generateDataQualityReport;
    private filterSources;
    private optimizeContent;
    private generateSEOMetadata;
    private createEngagementHooks;
    private getPlatformTone;
    private getPlatformFormat;
    private getPlatformOptimalLength;
    private getOptimalPostingTimes;
    private getHashtagsForPlatform;
    private getMetricsForGoal;
    private getPrimaryKPIForGoal;
    private getSecondaryKPIsForGoal;
    private getDashboardWidgets;
    private getCTAForPlatform;
    private generateWorkflowSummary;
    /**
     * Get workflow status
     */
    getWorkflowStatus(workflowId: string): WorkflowExecution | undefined;
    /**
     * Get all available workflow types
     */
    getAvailableWorkflows(): string[];
    /**
     * Get workflow phases for a specific type
     */
    getWorkflowPhases(workflowType: string): WorkflowPhase[];
}
interface WorkflowExecution {
    id: string;
    request: WorkflowRequest;
    phases: WorkflowPhase[];
    results: Map<string, unknown>;
    status: 'running' | 'completed' | 'failed';
    startTime: number;
}
export {};
//# sourceMappingURL=workflow-engine.d.ts.map