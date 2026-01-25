/**
 * AI Content Services - Barrel Export
 *
 * This module re-exports all AI-powered content services for convenient imports.
 * Each service handles a specific aspect of content generation and optimization.
 */

// Content generation and platform optimization
export { OpenAIService } from './OpenAIService';

// Content optimization with readability and sentiment analysis
export { ContentOptimizer } from './ContentOptimizer';
export type { OptimizedContent } from './ContentOptimizer';

// Trend discovery and analysis
export { TrendAnalyzer } from './TrendAnalyzer';

// Analytics collection and competitor analysis
export { AnalyticsCollector } from './AnalyticsCollector';

// Engagement automation
export { EngagementAutomator } from './EngagementAutomator';

// Hashtag research
export { HashtagResearcher } from './HashtagResearcher';

// Competitor monitoring
export { CompetitorMonitor } from './CompetitorMonitor';
