/**
 * Multi-Agent Orchestration System
 * Manages task delegation to specialized LLM agents
 */

import { PerplexityAgent } from '../agents/perplexity-agent';
import { ClaudeAgent } from '../agents/claude-agent';
import { EmbeddingAgent } from '../agents/embedding-agent';
import { GoogleDriveStorage } from '../storage/google-drive';
import { VectorStore } from '../storage/vector-store';

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

type AgentKey = 'perplexity' | 'claude' | 'embedding';
type AgentInstance = PerplexityAgent | ClaudeAgent | EmbeddingAgent;

type GeneratedReport = {
  content: string;
  metadata: {
    generatedAt: Date;
    taskId: string;
    type: string;
  };
  driveUrl?: string;
};

export class AgentOrchestrator {
  private agents: Map<AgentKey, AgentInstance> = new Map();
  private taskQueue: AgentTask[] = [];
  private capabilities: Map<AgentKey, AgentCapability> = new Map();
  private readonly driveStorage: GoogleDriveStorage;
  private readonly vectorStore: VectorStore;

  constructor() {
    this.initializeAgents();
    this.defineCapabilities();
    this.driveStorage = new GoogleDriveStorage();
    this.vectorStore = new VectorStore();
  }

  private initializeAgents() {
    this.agents.clear();
    this.agents.set('perplexity', new PerplexityAgent());
    this.agents.set('claude', new ClaudeAgent());
    this.agents.set('embedding', new EmbeddingAgent());
  }

  private defineCapabilities() {
    this.capabilities.clear();
    this.capabilities.set('perplexity', {
      agent: 'perplexity',
      strengths: ['real-time research', 'web search', 'fact checking', 'current events'],
      weaknesses: ['creative writing', 'code generation'],
      costPerToken: 0.0001,
      speedRating: 9,
    });
    this.capabilities.set('claude', {
      agent: 'claude-3.5-sonnet',
      strengths: ['creative writing', 'analysis', 'code generation', 'complex reasoning'],
      weaknesses: ['real-time data', 'web search'],
      costPerToken: 0.003,
      speedRating: 7,
    });
    this.capabilities.set('embedding', {
      agent: 'text-embedding-3',
      strengths: ['vector embeddings', 'semantic search', 'similarity analysis'],
      weaknesses: ['content generation', 'reasoning'],
      costPerToken: 0.00002,
      speedRating: 10,
    });
  }

  private getAgent<T extends AgentInstance>(key: AgentKey): T {
    const agent = this.agents.get(key);
    if (!agent) {
      throw new Error(`Agent "${key}" is not initialized`);
    }

    return agent as T;
  }

  /**
   * Route task to most appropriate agent based on task type and content
   */
  async delegateTask(task: AgentTask): Promise<unknown> {
    const bestAgent = this.selectBestAgent(task);

    console.log(`📋 Delegating ${task.type} task to ${bestAgent}`);

    switch (bestAgent) {
      case 'perplexity':
        return this.handleResearchTask(task);
      case 'claude':
        return this.handleWritingTask(task);
      case 'embedding':
        return this.handleEmbeddingTask(task);
      default:
        throw new Error(`No suitable agent for task type: ${task.type}`);
    }
  }

  /**
   * Smart agent selection based on task requirements
   */
  private selectBestAgent(task: AgentTask): AgentKey {
    const taskTypeMapping: Record<AgentTask['type'], AgentKey> = {
      research: 'perplexity',
      writing: 'claude',
      analysis: 'claude',
      embedding: 'embedding',
    };

    return taskTypeMapping[task.type] ?? 'claude';
  }

  /**
   * Research Task Handler - Perplexity
   */
  private async handleResearchTask(task: AgentTask) {
    const agent = this.getAgent<PerplexityAgent>('perplexity');

    // Perform research
    const researchResults = await agent.research({
      query: task.payload.query,
      sources: task.payload.sources || ['web', 'academic', 'news'],
      maxResults: task.payload.maxResults || 10,
    });

    // Store raw research in vector database
    const vectorId = await this.vectorStore.store({
      content: researchResults,
      metadata: {
        taskId: task.id,
        timestamp: new Date(),
        type: 'research',
      },
    });

    // Generate report and store in Google Drive
    const report = await this.generateReport(researchResults, task);
    await this.storeReport(report, task);

    return {
      summary: researchResults.summary,
      reportUrl: report.driveUrl,
      vectorId,
    };
  }

  /**
   * Writing Task Handler - Claude
   */
  private async handleWritingTask(task: AgentTask) {
    const agent = this.getAgent<ClaudeAgent>('claude');

    // Retrieve context from vector store if needed
    let context = '';
    if (task.payload.useContext) {
      context = await this.vectorStore.retrieveRelevant(
        task.payload.topic,
        task.payload.contextLimit || 5
      );
    }

    // Generate content with brand voice
    const contentResult = await agent.generateContent({
      prompt: task.payload.prompt,
      context: context,
      brandVoice: task.payload.brandVoice || 'professional',
      format: task.payload.format || 'article',
      maxTokens: task.payload.maxTokens || 2000,
    });

    // Store generated content
    await this.storeContent(contentResult, task);

    return contentResult.content;
  }

  /**
   * Embedding Task Handler
   */
  private async handleEmbeddingTask(task: AgentTask) {
    const agent = this.getAgent<EmbeddingAgent>('embedding');

    const embeddings = await agent.createEmbeddings({
      texts: task.payload.texts,
      model: 'text-embedding-3-small',
    });

    await this.vectorStore.storeEmbeddings(
      embeddings.map(({ content, embedding, metadata }) => ({
        content,
        embedding,
        metadata,
      }))
    );

    return {
      embeddingIds: embeddings.map((embedding) => embedding.id),
      dimensions: embeddings[0]?.dimensions ?? 0,
    };
  }

  /**
   * Generate structured report from research
   */
  private async generateReport(data: unknown, task: AgentTask): Promise<GeneratedReport> {
    const claudeAgent = this.getAgent<ClaudeAgent>('claude');

    const reportContent = await claudeAgent.generateContent({
      prompt: `Create a comprehensive report from the following research data`,
      context: JSON.stringify(data),
      format: 'report',
      sections: ['Executive Summary', 'Key Findings', 'Analysis', 'Recommendations'],
    });

    return {
      content: reportContent.content,
      metadata: {
        generatedAt: new Date(),
        taskId: task.id,
        type: 'research_report',
      },
    };
  }

  /**
   * Store report in designated Google Drive folder
   */
  private async storeReport(report: GeneratedReport, task: AgentTask) {
    const folderPath = this.determineFolderPath(task);

    const driveResult = await this.driveStorage.uploadReport({
      content: report.content,
      filename: `${task.type}_${task.id}_${Date.now()}.md`,
      folder: folderPath,
      metadata: report.metadata,
    });

    report.driveUrl = driveResult.webViewLink;
    return driveResult;
  }

  /**
   * Store generated content
   */
  private async storeContent(content: unknown, task: AgentTask) {
    const textContent =
      typeof content === 'string' ? content : (content as { content?: string })?.content;

    if (!textContent) {
      return;
    }

    await this.vectorStore.store({
      content: textContent,
      metadata: {
        taskId: task.id,
        type: 'generated_content',
        timestamp: new Date(),
      },
    });

    // Also store in Drive if specified
    if (task.payload.storeInDrive) {
      await this.driveStorage.uploadContent({
        content: textContent,
        folder: task.payload.driveFolder || 'generated_content',
      });
    }
  }

  /**
   * Determine appropriate Drive folder based on task type and topic
   */
  private determineFolderPath(task: AgentTask): string {
    const basePath = 'AI_Reports';
    const topicFolder = task.payload.topic?.replace(/\s+/g, '_') || 'General';
    const typeFolder = task.type;

    return `${basePath}/${topicFolder}/${typeFolder}`;
  }

  /**
   * Process task queue
   */
  async processQueue() {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task) {
        try {
          await this.delegateTask(task);
        } catch (error) {
          console.error(`Error processing task ${task.id}:`, error);
        }
      }
    }
  }

  /**
   * Add task to queue
   */
  queueTask(task: Omit<AgentTask, 'id' | 'timestamp'>): string {
    const fullTask: AgentTask = {
      ...task,
      id: this.generateTaskId(),
      timestamp: new Date(),
    };

    this.taskQueue.push(fullTask);
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    return fullTask.id;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

let orchestratorInstance: AgentOrchestrator | null = null;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
  }
  return orchestratorInstance;
}

// Export singleton instance for app runtime (skipped in tests)
export const orchestrator =
  process.env['NODE_ENV'] === 'test' ? undefined : getAgentOrchestrator();
