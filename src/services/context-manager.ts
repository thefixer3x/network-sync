/**
 * Context Manager
 *
 * Comprehensive context management system providing:
 * - Shared context between agents
 * - Context persistence and versioning
 * - Automatic context pruning based on token limits
 * - Context snapshots and rollback
 * - Thread-safe context updates
 */

import { Logger } from '../utils/Logger.js';
import { metricsService } from './metrics.js';
import { getCache } from '../cache/redis-cache.js';
import crypto from 'crypto';

const logger = new Logger('ContextManager');

/**
 * Context scope types
 */
export enum ContextScope {
  GLOBAL = 'global', // Shared across all agents
  WORKFLOW = 'workflow', // Scoped to a workflow execution
  AGENT = 'agent', // Scoped to a specific agent
  SESSION = 'session', // Scoped to a user session
}

/**
 * Context entry
 */
export interface ContextEntry {
  key: string;
  value: any;
  timestamp: number;
  scope: ContextScope;
  scopeId: string; // e.g., workflowId, agentName, sessionId
  metadata?: {
    source?: string;
    priority?: number;
    expiresAt?: number;
    tokenCount?: number;
  };
}

/**
 * Context snapshot
 */
export interface ContextSnapshot {
  id: string;
  contextId: string;
  version: number;
  entries: ContextEntry[];
  timestamp: number;
  reason?: string;
  createdBy?: string;
  metadata?: Record<string, any>;
}

/**
 * Context pruning strategy
 */
export enum PruningStrategy {
  LRU = 'lru', // Least Recently Used
  FIFO = 'fifo', // First In First Out
  PRIORITY = 'priority', // Based on priority metadata
  TOKEN_LIMIT = 'token_limit', // Based on token count
}

/**
 * Context configuration
 */
export interface ContextConfig {
  maxTokens?: number; // Max tokens for context
  maxEntries?: number; // Max number of entries
  pruningStrategy?: PruningStrategy;
  enableVersioning?: boolean;
  enablePersistence?: boolean;
  persistenceInterval?: number; // ms
}

/**
 * Context statistics
 */
export interface ContextStats {
  totalContexts: number;
  totalEntries: number;
  totalTokens: number;
  snapshotCount: number;
  pruningEvents: number;
  averageEntries: number;
  byScope: Record<ContextScope, number>;
}

/**
 * Managed context
 */
class ManagedContext {
  private entries = new Map<string, ContextEntry>();
  private versions: ContextSnapshot[] = [];
  private currentVersion = 0;
  private lastPruningTime = 0;

  constructor(
    public readonly id: string,
    public readonly config: Required<ContextConfig>
  ) {
    logger.debug(`Created managed context: ${id}`, config);
  }

  /**
   * Set context value
   */
  public set(
    key: string,
    value: any,
    scope: ContextScope,
    scopeId: string,
    metadata?: ContextEntry['metadata']
  ): void {
    const entry: ContextEntry = {
      key,
      value,
      timestamp: Date.now(),
      scope,
      scopeId,
    };

    if (metadata) {
      entry.metadata = metadata;
    }

    this.entries.set(key, entry);

    // Check if pruning is needed
    this.checkAndPrune();

    metricsService.incrementCounter('context_entries_set', {
      context: this.id,
      scope,
    });
  }

  /**
   * Get context value
   */
  public get(key: string): ContextEntry | null {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.metadata?.expiresAt && entry.metadata.expiresAt < Date.now()) {
      this.entries.delete(key);
      return null;
    }

    // Update timestamp for LRU
    entry.timestamp = Date.now();

    return entry;
  }

  /**
   * Get all entries for a scope
   */
  public getByScope(scope: ContextScope, scopeId?: string): ContextEntry[] {
    const entries = Array.from(this.entries.values()).filter((entry) => {
      if (entry.scope !== scope) return false;
      if (scopeId && entry.scopeId !== scopeId) return false;

      // Check expiration
      if (entry.metadata?.expiresAt && entry.metadata.expiresAt < Date.now()) {
        this.entries.delete(entry.key);
        return false;
      }

      return true;
    });

    return entries;
  }

  /**
   * Delete context entry
   */
  public delete(key: string): boolean {
    const deleted = this.entries.delete(key);
    if (deleted) {
      metricsService.incrementCounter('context_entries_deleted', {
        context: this.id,
      });
    }
    return deleted;
  }

  /**
   * Clear all entries
   */
  public clear(scope?: ContextScope, scopeId?: string): void {
    if (!scope) {
      this.entries.clear();
      logger.info(`Cleared all entries for context: ${this.id}`);
      return;
    }

    const toDelete: string[] = [];
    for (const [key, entry] of this.entries.entries()) {
      if (entry.scope === scope && (!scopeId || entry.scopeId === scopeId)) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => this.entries.delete(key));
    logger.info(`Cleared ${toDelete.length} entries for context: ${this.id}`, {
      scope,
      scopeId,
    });
  }

  /**
   * Check if pruning is needed and execute
   */
  private checkAndPrune(): void {
    const stats = this.getStats();

    // Check entry limit
    if (this.entries.size > this.config.maxEntries) {
      this.prune();
      return;
    }

    // Check token limit
    if (stats.totalTokens > this.config.maxTokens) {
      this.prune();
      return;
    }
  }

  /**
   * Prune context based on strategy
   */
  public prune(): void {
    const beforeSize = this.entries.size;
    const targetSize = Math.floor(this.config.maxEntries * 0.75); // Prune to 75%

    logger.info(`Pruning context ${this.id}`, {
      beforeSize,
      targetSize,
      strategy: this.config.pruningStrategy,
    });

    const entries = Array.from(this.entries.entries());

    // Sort based on strategy
    switch (this.config.pruningStrategy) {
      case PruningStrategy.LRU:
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
      case PruningStrategy.FIFO:
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
      case PruningStrategy.PRIORITY:
        entries.sort(
          ([, a], [, b]) => (a.metadata?.priority || 0) - (b.metadata?.priority || 0)
        );
        break;
      case PruningStrategy.TOKEN_LIMIT:
        entries.sort(
          ([, a], [, b]) => (b.metadata?.tokenCount || 0) - (a.metadata?.tokenCount || 0)
        );
        break;
    }

    // Remove oldest/lowest priority entries
    const toRemove = entries.slice(0, beforeSize - targetSize);
    toRemove.forEach(([key]) => this.entries.delete(key));

    this.lastPruningTime = Date.now();

    metricsService.incrementCounter('context_pruning_events', {
      context: this.id,
      strategy: this.config.pruningStrategy,
    });

    metricsService.recordHistogram('context_entries_pruned', toRemove.length, {
      context: this.id,
    });

    logger.info(`Pruned ${toRemove.length} entries from context ${this.id}`, {
      afterSize: this.entries.size,
    });
  }

  /**
   * Create snapshot
   */
  public createSnapshot(reason?: string, createdBy?: string): ContextSnapshot {
    if (!this.config.enableVersioning) {
      throw new Error('Versioning is not enabled for this context');
    }

    this.currentVersion++;

    const snapshot: ContextSnapshot = {
      id: `${this.id}-v${this.currentVersion}`,
      contextId: this.id,
      version: this.currentVersion,
      entries: Array.from(this.entries.values()).map((e) => ({ ...e })),
      timestamp: Date.now(),
    };

    if (reason) {
      snapshot.reason = reason;
    }
    if (createdBy) {
      snapshot.createdBy = createdBy;
    }

    this.versions.push(snapshot);

    // Limit snapshot history
    if (this.versions.length > 50) {
      this.versions.shift();
    }

    metricsService.incrementCounter('context_snapshots_created', {
      context: this.id,
    });

    logger.info(`Created snapshot for context ${this.id}`, {
      version: this.currentVersion,
      entryCount: snapshot.entries.length,
      reason,
    });

    return snapshot;
  }

  /**
   * Get snapshot
   */
  public getSnapshot(version: number): ContextSnapshot | null {
    return this.versions.find((s) => s.version === version) || null;
  }

  /**
   * List snapshots
   */
  public listSnapshots(): ContextSnapshot[] {
    return this.versions.map((s) => ({
      ...s,
      entries: [], // Don't include entries in list
    }));
  }

  /**
   * Rollback to snapshot
   */
  public rollback(version: number, reason?: string): void {
    if (!this.config.enableVersioning) {
      throw new Error('Versioning is not enabled for this context');
    }

    const snapshot = this.versions.find((s) => s.version === version);
    if (!snapshot) {
      throw new Error(`Snapshot version ${version} not found`);
    }

    // Clear current entries
    this.entries.clear();

    // Restore entries from snapshot
    snapshot.entries.forEach((entry) => {
      this.entries.set(entry.key, { ...entry });
    });

    logger.warn(`Rolled back context ${this.id} to version ${version}`, {
      reason,
      entryCount: snapshot.entries.length,
    });

    metricsService.incrementCounter('context_rollbacks', {
      context: this.id,
      version: String(version),
    });
  }

  /**
   * Get context statistics
   */
  public getStats() {
    const entries = Array.from(this.entries.values());
    const totalTokens = entries.reduce((sum, e) => sum + (e.metadata?.tokenCount || 0), 0);

    const byScope: Record<string, number> = {};
    for (const entry of entries) {
      byScope[entry.scope] = (byScope[entry.scope] || 0) + 1;
    }

    return {
      entryCount: entries.length,
      totalTokens,
      byScope,
      snapshotCount: this.versions.length,
      currentVersion: this.currentVersion,
      lastPruningTime: this.lastPruningTime,
    };
  }

  /**
   * Serialize context for persistence
   */
  public serialize(): string {
    const data = {
      id: this.id,
      config: this.config,
      entries: Array.from(this.entries.entries()),
      currentVersion: this.currentVersion,
      versions: this.versions,
    };

    return JSON.stringify(data);
  }

  /**
   * Deserialize context from persistence
   */
  public static deserialize(data: string): ManagedContext {
    const parsed = JSON.parse(data);
    const context = new ManagedContext(parsed.id, parsed.config);

    context.entries = new Map(parsed.entries);
    context.currentVersion = parsed.currentVersion;
    context.versions = parsed.versions;

    return context;
  }
}

/**
 * Context Manager
 */
export class ContextManager {
  private static instance: ContextManager;
  private contexts = new Map<string, ManagedContext>();
  private persistenceTimer?: NodeJS.Timeout;

  // Default configuration
  private readonly defaultConfig: Required<ContextConfig> = {
    maxTokens: 100000, // ~100k tokens
    maxEntries: 1000,
    pruningStrategy: PruningStrategy.LRU,
    enableVersioning: true,
    enablePersistence: true,
    persistenceInterval: 60000, // 1 minute
  };

  private constructor() {
    logger.info('Context Manager initialized');
    this.startPersistence();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Create or get context
   */
  public getContext(id: string, config?: Partial<ContextConfig>): ManagedContext {
    let context = this.contexts.get(id);

    if (!context) {
      const fullConfig = { ...this.defaultConfig, ...config };
      context = new ManagedContext(id, fullConfig);
      this.contexts.set(id, context);

      metricsService.incrementCounter('contexts_created', { context: id });
      logger.info(`Created new context: ${id}`);
    }

    return context;
  }

  /**
   * Delete context
   */
  public deleteContext(id: string): boolean {
    const deleted = this.contexts.delete(id);
    if (deleted) {
      metricsService.incrementCounter('contexts_deleted', { context: id });
      logger.info(`Deleted context: ${id}`);
    }
    return deleted;
  }

  /**
   * List all contexts
   */
  public listContexts(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * Set context value (convenience method)
   */
  public set(
    contextId: string,
    key: string,
    value: any,
    scope: ContextScope = ContextScope.GLOBAL,
    scopeId: string = 'default',
    metadata?: ContextEntry['metadata']
  ): void {
    const context = this.getContext(contextId);
    context.set(key, value, scope, scopeId, metadata);
  }

  /**
   * Get context value (convenience method)
   */
  public get(contextId: string, key: string): ContextEntry | null {
    const context = this.contexts.get(contextId);
    if (!context) return null;
    return context.get(key);
  }

  /**
   * Get by scope (convenience method)
   */
  public getByScope(
    contextId: string,
    scope: ContextScope,
    scopeId?: string
  ): ContextEntry[] {
    const context = this.contexts.get(contextId);
    if (!context) return [];
    return context.getByScope(scope, scopeId);
  }

  /**
   * Create snapshot (convenience method)
   */
  public createSnapshot(
    contextId: string,
    reason?: string,
    createdBy?: string
  ): ContextSnapshot {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }
    return context.createSnapshot(reason, createdBy);
  }

  /**
   * Rollback context (convenience method)
   */
  public rollback(contextId: string, version: number, reason?: string): void {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }
    context.rollback(version, reason);
  }

  /**
   * Persist all contexts to cache
   */
  private async persistContexts(): Promise<void> {
    if (this.contexts.size === 0) return;

    try {
      const cache = getCache();
      if (!cache.connected) return;

      const promises: Promise<void>[] = [];

      for (const [id, context] of this.contexts.entries()) {
        const config = (context as any).config;
        if (!config.enablePersistence) continue;

        const serialized = context.serialize();
        const cacheKey = `context:${id}`;

        promises.push(
          cache.set(cacheKey, serialized, 3600000).then(() => {}) // 1 hour TTL
        );
      }

      await Promise.all(promises);

      metricsService.incrementCounter('context_persistence_success', {
        count: String(promises.length),
      });
    } catch (error) {
      logger.error('Failed to persist contexts', { error });
      metricsService.incrementCounter('context_persistence_errors');
    }
  }

  /**
   * Restore context from cache
   */
  public async restoreContext(id: string): Promise<boolean> {
    try {
      const cache = getCache();
      if (!cache.connected) return false;

      const cacheKey = `context:${id}`;
      const serialized = await cache.get<string>(cacheKey);

      if (!serialized) {
        logger.debug(`No persisted context found: ${id}`);
        return false;
      }

      const context = ManagedContext.deserialize(serialized);
      this.contexts.set(id, context);

      logger.info(`Restored context from cache: ${id}`);
      metricsService.incrementCounter('context_restorations', { context: id });

      return true;
    } catch (error) {
      logger.error(`Failed to restore context ${id}`, { error });
      return false;
    }
  }

  /**
   * Start automatic persistence
   */
  private startPersistence(): void {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }

    this.persistenceTimer = setInterval(
      () => this.persistContexts(),
      this.defaultConfig.persistenceInterval
    );

    logger.info('Context persistence started', {
      interval: this.defaultConfig.persistenceInterval,
    });
  }

  /**
   * Get overall statistics
   */
  public getStatistics(): ContextStats {
    const stats: ContextStats = {
      totalContexts: this.contexts.size,
      totalEntries: 0,
      totalTokens: 0,
      snapshotCount: 0,
      pruningEvents: 0,
      averageEntries: 0,
      byScope: {
        [ContextScope.GLOBAL]: 0,
        [ContextScope.WORKFLOW]: 0,
        [ContextScope.AGENT]: 0,
        [ContextScope.SESSION]: 0,
      },
    };

    for (const context of this.contexts.values()) {
      const contextStats = context.getStats();
      stats.totalEntries += contextStats.entryCount;
      stats.totalTokens += contextStats.totalTokens;
      stats.snapshotCount += contextStats.snapshotCount;

      for (const [scope, count] of Object.entries(contextStats.byScope)) {
        stats.byScope[scope as ContextScope] += count;
      }
    }

    stats.averageEntries =
      stats.totalContexts > 0 ? stats.totalEntries / stats.totalContexts : 0;

    return stats;
  }

  /**
   * Shutdown context manager
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down Context Manager');

    // Stop persistence timer
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }

    // Persist all contexts one final time
    await this.persistContexts();

    // Clear all contexts
    this.contexts.clear();

    logger.info('Context Manager shut down successfully');
  }
}

/**
 * Get context manager instance
 */
export function getContextManager(): ContextManager {
  return ContextManager.getInstance();
}

/**
 * Export singleton instance
 */
export const contextManager = ContextManager.getInstance();
