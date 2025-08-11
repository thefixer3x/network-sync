/**
 * Multi-Agent Orchestration System
 * Manages task delegation to specialized LLM agents
 */

import { PerplexityAgent } from '../agents/perplexity-agent';
import { ClaudeAgent } from '../agents/claude-agent';
// import { EmbeddingAgent } from '../agents/embedding-agent'; // TODO: Create this file
// import { GoogleDriveStorage } from '../storage/google-drive'; // TODO: Create this file
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

export class AgentOrchestrator {
  private agents: Map<string, any> = new Map();
  private taskQueue: AgentTask[] = [];
  private capabilities: Map<string, AgentCapability> = new Map();
  // private driveStorage: GoogleDriveStorage; // TODO: Uncomment when GoogleDriveStorage is created
  private vectorStore: VectorStore;

  constructor() {
    this.initializeAgents();
    this.defineCapabilities();
    // this.driveStorage = new GoogleDriveStorage(); // TODO: Uncomment when GoogleDriveStorage is created
    this.vectorStore = new VectorStore();
  }

  private initializeAgents() {
    this.agents.set('perplexity', new PerplexityAgent());
    this.agents.set('claude', new ClaudeAgent());
    // this.agents.set('embedding', new EmbeddingAgent()); // TODO: Uncomment when EmbeddingAgent is created
  }

  private defineCapabilities() {
    this.capabilities = new Map([
      ['perplexity', {
        agent: 'perplexity',
        strengths: ['real-time research', 'web search', 'fact checking', 'current events'],
        weaknesses: ['creative writing', 'code generation'],
        costPerToken: 0.0001,
        speedRating: 9
      }],
      ['claude', {
        agent: 'claude-3.5-sonnet',
        strengths: ['creative writing', 'analysis', 'code generation', 'complex reasoning'],
        weaknesses: ['real-time data', 'web search'],
        costPerToken: 0.003,
        speedRating: 7
      }],
      ['embedding', {
        agent: 'text-embedding-3',
        strengths: ['vector embeddings', 'semantic search', 'similarity analysis'],
        weaknesses: ['content generation', 'reasoning'],
        costPerToken: 0.00002,
        speedRating: 10
      }]
    ]);
  }

  /**
   * Route task to most appropriate agent based on task type and content
   */
  async delegateTask(task: AgentTask): Promise<any> {
    const bestAgent = this.selectBestAgent(task);
    
    console.log(`📋 Delegating ${task.type} task to ${bestAgent}`);
    
    switch (bestAgent) {
      case 'perplexity':
        return await this.handleResearchTask(task);
      case 'claude':
        return await this.handleWritingTask(task);
      case 'embedding':
        return await this.handleEmbeddingTask(task);
      default:
        throw new Error(`No suitable agent for task type: ${task.type}`);
    }
  }

  /**
   * Smart agent selection based on task requirements
   */
  private selectBestAgent(task: AgentTask): string {
    const taskTypeMapping = {
      'research': 'perplexity',
      'writing': 'claude',
      'analysis': 'claude',
      'embedding': 'embedding'
    };

    return taskTypeMapping[task.type] || 'claude';
  }

  /**
   * Research Task Handler - Perplexity
   */
  private async handleResearchTask(task: AgentTask) {
    const agent = this.agents.get('perplexity');
    
    // Perform research
    const researchResults = await agent.research({
      query: task.payload.query,
      sources: task.payload.sources || ['web', 'academic', 'news'],
      maxResults: task.payload.maxResults || 10
    });

    // Store raw research in vector database
    await this.vectorStore.store({
      content: researchResults,
      metadata: {
        taskId: task.id,
        timestamp: new Date(),
        type: 'research'
      }
    });

    // Generate report and store in Google Drive
    const report = await this.generateReport(researchResults, task);
    await this.storeReport(report, task);

    return {
      summary: researchResults.summary,
      reportUrl: (report as any).driveUrl,
      vectorId: researchResults.vectorId
    };
  }

  /**
   * Writing Task Handler - Claude
   */
  private async handleWritingTask(task: AgentTask) {
    const agent = this.agents.get('claude');
    
    // Retrieve context from vector store if needed
    let context = '';
    if (task.payload.useContext) {
      context = await this.vectorStore.retrieveRelevant(
        task.payload.topic,
        task.payload.contextLimit || 5
      );
    }

    // Generate content with brand voice
    const content = await agent.generateContent({
      prompt: task.payload.prompt,
      context: context,
      brandVoice: task.payload.brandVoice || 'professional',
      format: task.payload.format || 'article',
      maxTokens: task.payload.maxTokens || 2000
    });

    // Store generated content
    await this.storeContent(content, task);

    return content;
  }

  /**
   * Embedding Task Handler
   */
  private async handleEmbeddingTask(task: AgentTask) {
    const agent = this.agents.get('embedding');
    
    const embeddings = await agent.createEmbeddings({
      texts: task.payload.texts,
      model: 'text-embedding-3-small'
    });

    await this.vectorStore.storeEmbeddings(embeddings);

    return {
      embeddingIds: embeddings.map((e: any) => e.id),
      dimensions: embeddings[0].dimensions
    };
  }

  /**
   * Generate structured report from research
   */
  private async generateReport(data: any, task: AgentTask) {
    const claudeAgent = this.agents.get('claude');
    
    const report = await claudeAgent.generateContent({
      prompt: `Create a comprehensive report from the following research data`,
      context: JSON.stringify(data),
      format: 'report',
      sections: ['Executive Summary', 'Key Findings', 'Analysis', 'Recommendations']
    });

    return {
      content: report,
      metadata: {
        generatedAt: new Date(),
        taskId: task.id,
        type: 'research_report'
      }
    };
  }

  /**
   * Store report in designated Google Drive folder
   */
  private async storeReport(report: any, task: AgentTask) {
    const folderPath = this.determineFolderPath(task);
    
    const driveResult = await (this as any).driveStorage.uploadReport({
      content: report.content,
      filename: `${task.type}_${task.id}_${Date.now()}.md`,
      folder: folderPath,
      metadata: report.metadata
    });

    report.driveUrl = driveResult.webViewLink;
    return driveResult;
  }

  /**
   * Store generated content
   */
  private async storeContent(content: any, task: AgentTask) {
    // Store in vector database for future reference
    await this.vectorStore.store({
      content: content,
      metadata: {
        taskId: task.id,
        type: 'generated_content',
        timestamp: new Date()
      }
    });

    // Also store in Drive if specified
    if (task.payload.storeInDrive) {
      await (this as any).driveStorage.uploadContent({
        content: content,
        folder: task.payload.driveFolder || 'generated_content'
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
      timestamp: new Date()
    };
    
    this.taskQueue.push(fullTask);
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    
    return fullTask.id;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const orchestrator = new AgentOrchestrator();