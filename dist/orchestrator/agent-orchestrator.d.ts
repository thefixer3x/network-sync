/**
 * Multi-Agent Orchestration System
 * Manages task delegation to specialized LLM agents
 */
export interface AgentTask {
    id: string;
    type: 'research' | 'writing' | 'analysis' | 'embedding';
    payload: any;
    priority: number;
    timestamp: Date;
}
export interface AgentCapability {
    agent: string;
    strengths: string[];
    weaknesses: string[];
    costPerToken: number;
    speedRating: number;
}
export declare class AgentOrchestrator {
    private agents;
    private taskQueue;
    private capabilities;
    private driveStorage;
    private vectorStore;
    constructor();
    private initializeAgents;
    private defineCapabilities;
    /**
     * Route task to most appropriate agent based on task type and content
     */
    delegateTask(task: AgentTask): Promise<any>;
    /**
     * Smart agent selection based on task requirements
     */
    private selectBestAgent;
    /**
     * Research Task Handler - Perplexity
     */
    private handleResearchTask;
    /**
     * Writing Task Handler - Claude
     */
    private handleWritingTask;
    /**
     * Embedding Task Handler
     */
    private handleEmbeddingTask;
    /**
     * Generate structured report from research
     */
    private generateReport;
    /**
     * Store report in designated Google Drive folder
     */
    private storeReport;
    /**
     * Store generated content
     */
    private storeContent;
    /**
     * Determine appropriate Drive folder based on task type and topic
     */
    private determineFolderPath;
    /**
     * Process task queue
     */
    processQueue(): Promise<void>;
    /**
     * Add task to queue
     */
    queueTask(task: Omit<AgentTask, 'id' | 'timestamp'>): string;
    private generateTaskId;
}
export declare const orchestrator: AgentOrchestrator;
//# sourceMappingURL=agent-orchestrator.d.ts.map