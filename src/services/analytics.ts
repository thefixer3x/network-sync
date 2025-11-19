/**
 * Advanced Analytics Service
 *
 * Comprehensive analytics system providing:
 * - Event tracking and aggregation
 * - Custom metrics and dimensions
 * - Real-time analytics
 * - Trend analysis and forecasting
 * - Performance insights
 * - Usage analytics
 */

import { Logger } from '../utils/Logger.js';
import { metricsService } from './metrics.js';
import { getCache } from '../cache/redis-cache.js';
import crypto from 'crypto';

const logger = new Logger('Analytics');

/**
 * Event types
 */
export enum EventType {
  PAGE_VIEW = 'page_view',
  CONTENT_VIEW = 'content_view',
  CONTENT_CREATE = 'content_create',
  CONTENT_PUBLISH = 'content_publish',
  CONTENT_SHARE = 'content_share',
  WORKFLOW_START = 'workflow_start',
  WORKFLOW_COMPLETE = 'workflow_complete',
  API_CALL = 'api_call',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  ERROR = 'error',
  CUSTOM = 'custom',
}

/**
 * Metric type
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Time granularity
 */
export enum TimeGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  id: string;
  type: EventType;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  dimensions: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  dimensions: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Time series data
 */
export interface TimeSeriesData {
  metric: string;
  granularity: TimeGranularity;
  dataPoints: Array<{
    timestamp: number;
    value: number;
    count?: number;
  }>;
  startTime: number;
  endTime: number;
}

/**
 * Analytics aggregation
 */
export interface AnalyticsAggregation {
  metric: string;
  dimensions: Record<string, string>;
  aggregations: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  period: {
    start: number;
    end: number;
  };
}

/**
 * Analytics dashboard metrics
 */
export interface DashboardMetrics {
  overview: {
    totalEvents: number;
    totalUsers: number;
    activeSessions: number;
    avgSessionDuration: number;
  };
  topEvents: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  topPages: Array<{
    path: string;
    views: number;
    uniqueVisitors: number;
  }>;
  performance: {
    avgApiResponseTime: number;
    errorRate: number;
    successRate: number;
    p95ResponseTime: number;
  };
  trends: {
    eventsOverTime: TimeSeriesData;
    usersOverTime: TimeSeriesData;
  };
  timestamp: number;
}

/**
 * Analytics funnel
 */
export interface AnalyticsFunnel {
  name: string;
  steps: Array<{
    name: string;
    event: EventType;
    count: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  totalEntered: number;
  totalCompleted: number;
  overallConversionRate: number;
}

/**
 * User analytics
 */
export interface UserAnalytics {
  userId: string;
  totalEvents: number;
  totalSessions: number;
  avgSessionDuration: number;
  lastSeen: number;
  firstSeen: number;
  topEvents: Array<{
    type: string;
    count: number;
  }>;
  retention: {
    day1: boolean;
    day7: boolean;
    day30: boolean;
  };
}

/**
 * Analytics Service
 */
export class AnalyticsService {
  private static instance: AnalyticsService;

  private events: AnalyticsEvent[] = [];
  private metrics: MetricDataPoint[] = [];
  private sessions = new Map<string, { startTime: number; lastActivity: number; eventCount: number }>();

  private readonly MAX_EVENTS = 10000;
  private readonly MAX_METRICS = 10000;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    logger.info('Analytics Service initialized');
    this.startCleanupInterval();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Track event
   */
  public trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): AnalyticsEvent {
    const trackedEvent: AnalyticsEvent = {
      ...event,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.events.push(trackedEvent);

    // Maintain size limit
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Update session
    if (trackedEvent.sessionId) {
      this.updateSession(trackedEvent.sessionId);
    }

    // Record to Prometheus
    metricsService.incrementCounter('analytics_events', {
      type: event.type,
      ...Object.entries(event.dimensions).reduce((acc, [k, v]) => ({...acc, [k]: v}), {}),
    });

    logger.debug(`Tracked event: ${event.type}`, { eventId: trackedEvent.id });

    return trackedEvent;
  }

  /**
   * Record metric
   */
  public recordMetric(metric: Omit<MetricDataPoint, 'timestamp'>): MetricDataPoint {
    const dataPoint: MetricDataPoint = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(dataPoint);

    // Maintain size limit
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Record to Prometheus
    switch (metric.type) {
      case MetricType.COUNTER:
        metricsService.incrementCounter(`analytics_${metric.name}`, metric.dimensions);
        break;
      case MetricType.GAUGE:
        metricsService.setGauge(`analytics_${metric.name}`, metric.value, metric.dimensions);
        break;
      case MetricType.HISTOGRAM:
        metricsService.recordHistogram(`analytics_${metric.name}`, metric.value, metric.dimensions);
        break;
    }

    return dataPoint;
  }

  /**
   * Get time series data
   */
  public getTimeSeries(
    metricName: string,
    granularity: TimeGranularity,
    startTime: number,
    endTime: number,
    dimensions?: Record<string, string>
  ): TimeSeriesData {
    // Filter metrics
    let filteredMetrics = this.metrics.filter((m) => {
      if (m.name !== metricName) return false;
      if (m.timestamp < startTime || m.timestamp > endTime) return false;

      if (dimensions) {
        for (const [key, value] of Object.entries(dimensions)) {
          if (m.dimensions[key] !== value) return false;
        }
      }

      return true;
    });

    // Determine bucket size
    const bucketSize = this.getBucketSize(granularity);

    // Group by time buckets
    const buckets = new Map<number, { sum: number; count: number }>();

    for (const metric of filteredMetrics) {
      const bucketTime = Math.floor(metric.timestamp / bucketSize) * bucketSize;
      const bucket = buckets.get(bucketTime) || { sum: 0, count: 0 };
      bucket.sum += metric.value;
      bucket.count++;
      buckets.set(bucketTime, bucket);
    }

    // Convert to data points
    const dataPoints = Array.from(buckets.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        value: data.sum / data.count, // Average
        count: data.count,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      metric: metricName,
      granularity,
      dataPoints,
      startTime,
      endTime,
    };
  }

  /**
   * Get aggregation
   */
  public getAggregation(
    metricName: string,
    startTime: number,
    endTime: number,
    dimensions?: Record<string, string>
  ): AnalyticsAggregation {
    const filteredMetrics = this.metrics.filter((m) => {
      if (m.name !== metricName) return false;
      if (m.timestamp < startTime || m.timestamp > endTime) return false;

      if (dimensions) {
        for (const [key, value] of Object.entries(dimensions)) {
          if (m.dimensions[key] !== value) return false;
        }
      }

      return true;
    });

    if (filteredMetrics.length === 0) {
      return {
        metric: metricName,
        dimensions: dimensions || {},
        aggregations: {
          count: 0,
          sum: 0,
          avg: 0,
          min: 0,
          max: 0,
          p50: 0,
          p95: 0,
          p99: 0,
        },
        period: { start: startTime, end: endTime },
      };
    }

    const values = filteredMetrics.map((m) => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, v) => acc + v, 0);

    return {
      metric: metricName,
      dimensions: dimensions || {},
      aggregations: {
        count: values.length,
        sum,
        avg: sum / values.length,
        min: values[0] || 0,
        max: values[values.length - 1] || 0,
        p50: this.percentile(values, 50),
        p95: this.percentile(values, 95),
        p99: this.percentile(values, 99),
      },
      period: { start: startTime, end: endTime },
    };
  }

  /**
   * Get dashboard metrics
   */
  public getDashboardMetrics(): DashboardMetrics {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;

    // Recent events
    const recentEvents = this.events.filter((e) => e.timestamp >= last24h);

    // Unique users
    const uniqueUsers = new Set(
      recentEvents.filter((e) => e.userId).map((e) => e.userId!)
    ).size;

    // Active sessions
    const activeSessions = Array.from(this.sessions.values()).filter(
      (s) => now - s.lastActivity < this.SESSION_TIMEOUT
    ).length;

    // Session durations
    const sessionDurations = Array.from(this.sessions.values())
      .filter((s) => s.lastActivity - s.startTime > 0)
      .map((s) => s.lastActivity - s.startTime);
    const avgSessionDuration =
      sessionDurations.length > 0
        ? sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length
        : 0;

    // Top events
    const eventCounts = new Map<string, number>();
    for (const event of recentEvents) {
      eventCounts.set(event.type, (eventCounts.get(event.type) || 0) + 1);
    }

    const topEvents = Array.from(eventCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / recentEvents.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top pages
    const pageViews = recentEvents.filter((e) => e.type === EventType.PAGE_VIEW);
    const pageCounts = new Map<string, { views: number; users: Set<string> }>();

    for (const event of pageViews) {
      const path = event.properties['path'] || 'unknown';
      const entry = pageCounts.get(path) || { views: 0, users: new Set() };
      entry.views++;
      if (event.userId) entry.users.add(event.userId);
      pageCounts.set(path, entry);
    }

    const topPages = Array.from(pageCounts.entries())
      .map(([path, data]) => ({
        path,
        views: data.views,
        uniqueVisitors: data.users.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Performance metrics
    const apiMetrics = this.metrics.filter(
      (m) => m.name === 'api_response_time' && m.timestamp >= last24h
    );
    const apiValues = apiMetrics.map((m) => m.value);
    const avgApiResponseTime =
      apiValues.length > 0 ? apiValues.reduce((sum, v) => sum + v, 0) / apiValues.length : 0;
    const p95ResponseTime = this.percentile(apiValues.sort((a, b) => a - b), 95);

    const errorEvents = recentEvents.filter((e) => e.type === EventType.ERROR);
    const errorRate = recentEvents.length > 0 ? (errorEvents.length / recentEvents.length) * 100 : 0;
    const successRate = 100 - errorRate;

    // Trends
    const eventsOverTime = this.getTimeSeries(
      'events',
      TimeGranularity.HOUR,
      last24h,
      now
    );

    const usersOverTime = this.getTimeSeries(
      'users',
      TimeGranularity.HOUR,
      last24h,
      now
    );

    return {
      overview: {
        totalEvents: recentEvents.length,
        totalUsers: uniqueUsers,
        activeSessions,
        avgSessionDuration,
      },
      topEvents,
      topPages,
      performance: {
        avgApiResponseTime,
        errorRate,
        successRate,
        p95ResponseTime,
      },
      trends: {
        eventsOverTime,
        usersOverTime,
      },
      timestamp: now,
    };
  }

  /**
   * Get funnel analysis
   */
  public getFunnel(
    name: string,
    steps: Array<{ name: string; event: EventType }>,
    startTime: number,
    endTime: number
  ): AnalyticsFunnel {
    const filteredEvents = this.events.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );

    const stepCounts = steps.map((step) => ({
      ...step,
      count: filteredEvents.filter((e) => e.type === step.event).length,
      conversionRate: 0,
      dropoffRate: 0,
    }));

    const totalEntered = stepCounts[0]?.count || 0;

    // Calculate conversion and dropoff rates
    for (let i = 0; i < stepCounts.length; i++) {
      const currentStep = stepCounts[i];
      const previousStep = stepCounts[i - 1];

      if (currentStep && totalEntered > 0) {
        currentStep.conversionRate = (currentStep.count / totalEntered) * 100;
      }

      if (i > 0 && currentStep && previousStep && previousStep.count > 0) {
        currentStep.dropoffRate =
          ((previousStep.count - currentStep.count) / previousStep.count) * 100;
      }
    }

    const totalCompleted = stepCounts[stepCounts.length - 1]?.count || 0;
    const overallConversionRate =
      totalEntered > 0 ? (totalCompleted / totalEntered) * 100 : 0;

    return {
      name,
      steps: stepCounts,
      totalEntered,
      totalCompleted,
      overallConversionRate,
    };
  }

  /**
   * Get user analytics
   */
  public getUserAnalytics(userId: string): UserAnalytics | null {
    const userEvents = this.events.filter((e) => e.userId === userId);

    if (userEvents.length === 0) {
      return null;
    }

    const sessions = new Set(userEvents.map((e) => e.sessionId).filter(Boolean));
    const eventCounts = new Map<string, number>();

    for (const event of userEvents) {
      eventCounts.set(event.type, (eventCounts.get(event.type) || 0) + 1);
    }

    const topEvents = Array.from(eventCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const timestamps = userEvents.map((e) => e.timestamp).sort((a, b) => a - b);
    const firstSeen = timestamps[0] || 0;
    const lastSeen = timestamps[timestamps.length - 1] || 0;
    const now = Date.now();

    const retention = {
      day1: userEvents.some((e) => e.timestamp > firstSeen + 24 * 60 * 60 * 1000),
      day7: userEvents.some((e) => e.timestamp > firstSeen + 7 * 24 * 60 * 60 * 1000),
      day30: userEvents.some((e) => e.timestamp > firstSeen + 30 * 24 * 60 * 60 * 1000),
    };

    return {
      userId,
      totalEvents: userEvents.length,
      totalSessions: sessions.size,
      avgSessionDuration: 0, // Would need session tracking
      lastSeen,
      firstSeen,
      topEvents,
      retention,
    };
  }

  /**
   * Clear old data
   */
  public clearOldData(olderThan: number): void {
    const cutoff = Date.now() - olderThan;

    this.events = this.events.filter((e) => e.timestamp >= cutoff);
    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoff);

    // Clean up old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoff) {
        this.sessions.delete(sessionId);
      }
    }

    logger.info('Cleared old analytics data', {
      cutoff: new Date(cutoff).toISOString(),
    });
  }

  /**
   * Get statistics
   */
  public getStatistics() {
    return {
      totalEvents: this.events.length,
      totalMetrics: this.metrics.length,
      activeSessions: this.sessions.size,
      oldestEvent: this.events[0]?.timestamp || null,
      newestEvent: this.events[this.events.length - 1]?.timestamp || null,
    };
  }

  /**
   * Update session
   */
  private updateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    const now = Date.now();

    if (session) {
      session.lastActivity = now;
      session.eventCount++;
    } else {
      this.sessions.set(sessionId, {
        startTime: now,
        lastActivity: now,
        eventCount: 1,
      });
    }
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)] || 0;
  }

  /**
   * Get bucket size for granularity
   */
  private getBucketSize(granularity: TimeGranularity): number {
    switch (granularity) {
      case TimeGranularity.MINUTE:
        return 60 * 1000;
      case TimeGranularity.HOUR:
        return 60 * 60 * 1000;
      case TimeGranularity.DAY:
        return 24 * 60 * 60 * 1000;
      case TimeGranularity.WEEK:
        return 7 * 24 * 60 * 60 * 1000;
      case TimeGranularity.MONTH:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      // Clear data older than 7 days
      this.clearOldData(7 * 24 * 60 * 60 * 1000);
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Shutdown service
   */
  public shutdown(): void {
    logger.info('Shutting down Analytics Service');
    this.events = [];
    this.metrics = [];
    this.sessions.clear();
    logger.info('Analytics Service shut down successfully');
  }
}

/**
 * Get analytics service instance
 */
export function getAnalyticsService(): AnalyticsService {
  return AnalyticsService.getInstance();
}

/**
 * Export singleton instance
 */
export const analyticsService = AnalyticsService.getInstance();
