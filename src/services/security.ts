/**
 * Advanced Security Service
 *
 * Provides comprehensive security features including:
 * - Authentication & Authorization (JWT, API keys, RBAC)
 * - Rate limiting and throttling
 * - Security event logging and audit trails
 * - Threat detection and anomaly detection
 * - IP whitelisting/blacklisting
 * - Session management
 * - Security reporting
 */

import crypto from 'crypto';
import { Logger } from '@/utils/Logger';
import { metricsService } from './metrics';

const logger = new Logger('SecurityService');

/**
 * User role enum
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
  API_CLIENT = 'api_client',
}

/**
 * Permission enum
 */
export enum Permission {
  // Content permissions
  CONTENT_READ = 'content:read',
  CONTENT_WRITE = 'content:write',
  CONTENT_DELETE = 'content:delete',
  CONTENT_PUBLISH = 'content:publish',

  // Workflow permissions
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_WRITE = 'workflow:write',
  WORKFLOW_EXECUTE = 'workflow:execute',
  WORKFLOW_DELETE = 'workflow:delete',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_WRITE = 'analytics:write',

  // Admin permissions
  ADMIN_USERS = 'admin:users',
  ADMIN_ROLES = 'admin:roles',
  ADMIN_SECURITY = 'admin:security',
  ADMIN_SYSTEM = 'admin:system',
}

/**
 * Security event type
 */
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_EXPIRED = 'token_expired',

  // Authorization events
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  PERMISSION_DENIED = 'permission_denied',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  THROTTLE_TRIGGERED = 'throttle_triggered',

  // Threats
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  ANOMALY_DETECTED = 'anomaly_detected',
  IP_BLOCKED = 'ip_blocked',

  // API usage
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  API_KEY_EXPIRED = 'api_key_expired',
}

/**
 * Security event severity
 */
export enum SecuritySeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Security event
 */
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  outcome: 'success' | 'failure';
  message: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

/**
 * API key
 */
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  userId: string;
  permissions: Permission[];
  expiresAt?: number;
  lastUsedAt?: number;
  rateLimit: number; // requests per minute
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * User session
 */
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: number;
  lastActivityAt: number;
  createdAt: number;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked: boolean;
}

/**
 * IP reputation
 */
interface IpReputation {
  ipAddress: string;
  failedAttempts: number;
  successfulAttempts: number;
  lastFailureAt?: number;
  blockedUntil?: number;
  trustScore: number; // 0-100
}

/**
 * Security statistics
 */
export interface SecurityStatistics {
  events: {
    total: number;
    byType: Record<SecurityEventType, number>;
    bySeverity: Record<SecuritySeverity, number>;
  };
  authentication: {
    successfulLogins: number;
    failedLogins: number;
    activeUsers: number;
    activeSessions: number;
  };
  authorization: {
    accessGranted: number;
    accessDenied: number;
    permissionDenied: number;
  };
  rateLimit: {
    totalRequests: number;
    throttledRequests: number;
    blockedRequests: number;
  };
  threats: {
    suspiciousActivities: number;
    bruteForceAttempts: number;
    anomaliesDetected: number;
    blockedIps: number;
  };
  apiKeys: {
    total: number;
    active: number;
    expired: number;
    revoked: number;
  };
}

/**
 * Role permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.CONTENT_DELETE,
    Permission.CONTENT_PUBLISH,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_WRITE,
    Permission.WORKFLOW_EXECUTE,
    Permission.WORKFLOW_DELETE,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_WRITE,
    Permission.ADMIN_USERS,
    Permission.ADMIN_ROLES,
    Permission.ADMIN_SECURITY,
    Permission.ADMIN_SYSTEM,
  ],
  [UserRole.USER]: [
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_EXECUTE,
    Permission.ANALYTICS_READ,
  ],
  [UserRole.VIEWER]: [
    Permission.CONTENT_READ,
    Permission.WORKFLOW_READ,
    Permission.ANALYTICS_READ,
  ],
  [UserRole.API_CLIENT]: [
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.WORKFLOW_EXECUTE,
  ],
};

/**
 * Advanced Security Service
 */
export class SecurityService {
  private events: SecurityEvent[] = [];
  private apiKeys: Map<string, ApiKey> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private ipReputations: Map<string, IpReputation> = new Map();
  private ipWhitelist: Set<string> = new Set();
  private ipBlacklist: Set<string> = new Set();

  private readonly MAX_EVENTS = 10000;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly DEFAULT_RATE_LIMIT = 100; // requests per minute

  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    logger.info('Security service initialized');
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate API key
   */
  private generateApiKey(): string {
    const prefix = 'sk_live_';
    const key = crypto.randomBytes(32).toString('base64url');
    return `${prefix}${key}`;
  }

  /**
   * Hash API key for storage
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Log security event
   */
  public logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
    const loggedEvent: SecurityEvent = {
      ...event,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.events.push(loggedEvent);

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Log to application logger
    const logLevel = event.severity === SecuritySeverity.CRITICAL || event.severity === SecuritySeverity.ERROR
      ? 'error'
      : event.severity === SecuritySeverity.WARNING
      ? 'warn'
      : 'info';

    logger[logLevel](`Security Event: ${event.type}`, {
      severity: event.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
      message: event.message,
    });

    // Record metrics
    metricsService.incrementCounter('security_events', {
      type: event.type,
      severity: event.severity,
      outcome: event.outcome,
    });

    return loggedEvent;
  }

  /**
   * Create user session
   */
  public createSession(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): { session: UserSession; token: string; refreshToken: string } {
    const token = this.generateToken();
    const refreshToken = this.generateToken();
    const now = Date.now();

    const session: UserSession = {
      id: this.generateId(),
      userId,
      token: this.hashApiKey(token),
      refreshToken: this.hashApiKey(refreshToken),
      ipAddress,
      userAgent,
      expiresAt: now + this.TOKEN_EXPIRY,
      lastActivityAt: now,
      createdAt: now,
    };

    this.sessions.set(session.id, session);

    this.logEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      severity: SecuritySeverity.INFO,
      userId,
      ipAddress,
      userAgent,
      outcome: 'success',
      message: `User ${userId} logged in successfully`,
    });

    return { session, token, refreshToken };
  }

  /**
   * Validate session token
   */
  public validateSession(token: string): UserSession | null {
    const hashedToken = this.hashApiKey(token);
    const now = Date.now();

    for (const session of this.sessions.values()) {
      if (session.token === hashedToken) {
        // Check if expired
        if (session.expiresAt < now) {
          this.logEvent({
            type: SecurityEventType.TOKEN_EXPIRED,
            severity: SecuritySeverity.WARNING,
            userId: session.userId,
            outcome: 'failure',
            message: 'Session token expired',
          });
          return null;
        }

        // Update last activity
        session.lastActivityAt = now;
        return session;
      }
    }

    return null;
  }

  /**
   * Refresh session token
   */
  public refreshSession(refreshToken: string): { token: string; refreshToken: string } | null {
    const hashedRefreshToken = this.hashApiKey(refreshToken);
    const now = Date.now();

    for (const session of this.sessions.values()) {
      if (session.refreshToken === hashedRefreshToken) {
        // Check if refresh token expired
        if (session.expiresAt + this.REFRESH_TOKEN_EXPIRY < now) {
          this.logEvent({
            type: SecurityEventType.TOKEN_EXPIRED,
            severity: SecuritySeverity.WARNING,
            userId: session.userId,
            outcome: 'failure',
            message: 'Refresh token expired',
          });
          return null;
        }

        // Generate new tokens
        const newToken = this.generateToken();
        const newRefreshToken = this.generateToken();

        session.token = this.hashApiKey(newToken);
        session.refreshToken = this.hashApiKey(newRefreshToken);
        session.expiresAt = now + this.TOKEN_EXPIRY;
        session.lastActivityAt = now;

        this.logEvent({
          type: SecurityEventType.TOKEN_REFRESH,
          severity: SecuritySeverity.INFO,
          userId: session.userId,
          outcome: 'success',
          message: 'Session token refreshed',
        });

        return { token: newToken, refreshToken: newRefreshToken };
      }
    }

    return null;
  }

  /**
   * Destroy session
   */
  public destroySession(token: string): boolean {
    const hashedToken = this.hashApiKey(token);

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.token === hashedToken) {
        this.sessions.delete(sessionId);

        this.logEvent({
          type: SecurityEventType.LOGOUT,
          severity: SecuritySeverity.INFO,
          userId: session.userId,
          outcome: 'success',
          message: 'User logged out',
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Create API key
   */
  public createApiKey(data: {
    name: string;
    userId: string;
    permissions?: Permission[];
    expiresAt?: number;
    rateLimit?: number;
  }): { apiKey: ApiKey; key: string } {
    const key = this.generateApiKey();
    const now = Date.now();

    const apiKey: ApiKey = {
      id: this.generateId(),
      key: this.hashApiKey(key),
      name: data.name,
      userId: data.userId,
      permissions: data.permissions || [],
      rateLimit: data.rateLimit || this.DEFAULT_RATE_LIMIT,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    if (data.expiresAt) {
      apiKey.expiresAt = data.expiresAt;
    }

    this.apiKeys.set(apiKey.id, apiKey);

    this.logEvent({
      type: SecurityEventType.API_KEY_CREATED,
      severity: SecuritySeverity.INFO,
      userId: data.userId,
      outcome: 'success',
      message: `API key "${data.name}" created`,
      metadata: { apiKeyId: apiKey.id },
    });

    return { apiKey, key };
  }

  /**
   * Validate API key
   */
  public validateApiKey(key: string): ApiKey | null {
    const hashedKey = this.hashApiKey(key);
    const now = Date.now();

    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.key === hashedKey && apiKey.isActive) {
        // Check if expired
        if (apiKey.expiresAt && apiKey.expiresAt < now) {
          this.logEvent({
            type: SecurityEventType.API_KEY_EXPIRED,
            severity: SecuritySeverity.WARNING,
            userId: apiKey.userId,
            outcome: 'failure',
            message: `API key "${apiKey.name}" expired`,
            metadata: { apiKeyId: apiKey.id },
          });
          return null;
        }

        // Update last used
        apiKey.lastUsedAt = now;
        return apiKey;
      }
    }

    return null;
  }

  /**
   * Revoke API key
   */
  public revokeApiKey(apiKeyId: string): boolean {
    const apiKey = this.apiKeys.get(apiKeyId);
    if (!apiKey) {
      return false;
    }

    apiKey.isActive = false;
    apiKey.updatedAt = Date.now();

    this.logEvent({
      type: SecurityEventType.API_KEY_REVOKED,
      severity: SecuritySeverity.INFO,
      userId: apiKey.userId,
      outcome: 'success',
      message: `API key "${apiKey.name}" revoked`,
      metadata: { apiKeyId: apiKey.id },
    });

    return true;
  }

  /**
   * Check if user has permission
   */
  public hasPermission(role: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role];
    return rolePermissions.includes(permission);
  }

  /**
   * Check if user has any of the permissions
   */
  public hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some((permission) => this.hasPermission(role, permission));
  }

  /**
   * Check if user has all permissions
   */
  public hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every((permission) => this.hasPermission(role, permission));
  }

  /**
   * Check rate limit
   */
  public checkRateLimit(identifier: string, limit: number = this.DEFAULT_RATE_LIMIT): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    let entry = this.rateLimits.get(identifier);

    if (!entry || entry.resetAt < now) {
      // Create new entry
      entry = {
        count: 0,
        resetAt: now + windowMs,
        blocked: false,
      };
      this.rateLimits.set(identifier, entry);
    }

    // Check if blocked
    if (entry.blocked) {
      this.logEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity: SecuritySeverity.WARNING,
        outcome: 'failure',
        message: `Rate limit exceeded for ${identifier}`,
        metadata: { identifier, limit },
      });
      return false;
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > limit) {
      entry.blocked = true;

      this.logEvent({
        type: SecurityEventType.THROTTLE_TRIGGERED,
        severity: SecuritySeverity.WARNING,
        outcome: 'failure',
        message: `Throttle triggered for ${identifier}`,
        metadata: { identifier, limit, count: entry.count },
      });

      metricsService.incrementCounter('rate_limit_exceeded', { identifier });
      return false;
    }

    return true;
  }

  /**
   * Update IP reputation
   */
  public updateIpReputation(ipAddress: string, success: boolean): void {
    let reputation = this.ipReputations.get(ipAddress);

    if (!reputation) {
      reputation = {
        ipAddress,
        failedAttempts: 0,
        successfulAttempts: 0,
        trustScore: 50, // Start with neutral score
      };
      this.ipReputations.set(ipAddress, reputation);
    }

    const now = Date.now();

    if (success) {
      reputation.successfulAttempts++;
      reputation.trustScore = Math.min(100, reputation.trustScore + 5);
    } else {
      reputation.failedAttempts++;
      reputation.lastFailureAt = now;
      reputation.trustScore = Math.max(0, reputation.trustScore - 10);

      // Check for brute force
      if (reputation.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        reputation.blockedUntil = now + this.BLOCK_DURATION;

        this.logEvent({
          type: SecurityEventType.BRUTE_FORCE_DETECTED,
          severity: SecuritySeverity.CRITICAL,
          ipAddress,
          outcome: 'failure',
          message: `Brute force detected from IP ${ipAddress}`,
          metadata: { failedAttempts: reputation.failedAttempts },
        });

        this.blockIp(ipAddress);
      }
    }
  }

  /**
   * Check if IP is blocked
   */
  public isIpBlocked(ipAddress: string): boolean {
    // Check blacklist
    if (this.ipBlacklist.has(ipAddress)) {
      return true;
    }

    // Check reputation
    const reputation = this.ipReputations.get(ipAddress);
    if (reputation?.blockedUntil && reputation.blockedUntil > Date.now()) {
      return true;
    }

    return false;
  }

  /**
   * Check if IP is whitelisted
   */
  public isIpWhitelisted(ipAddress: string): boolean {
    return this.ipWhitelist.has(ipAddress);
  }

  /**
   * Block IP address
   */
  public blockIp(ipAddress: string): void {
    this.ipBlacklist.add(ipAddress);

    this.logEvent({
      type: SecurityEventType.IP_BLOCKED,
      severity: SecuritySeverity.CRITICAL,
      ipAddress,
      outcome: 'success',
      message: `IP address ${ipAddress} blocked`,
    });
  }

  /**
   * Unblock IP address
   */
  public unblockIp(ipAddress: string): void {
    this.ipBlacklist.delete(ipAddress);

    const reputation = this.ipReputations.get(ipAddress);
    if (reputation) {
      delete reputation.blockedUntil;
      reputation.failedAttempts = 0;
    }
  }

  /**
   * Whitelist IP address
   */
  public whitelistIp(ipAddress: string): void {
    this.ipWhitelist.add(ipAddress);
  }

  /**
   * Remove IP from whitelist
   */
  public removeFromWhitelist(ipAddress: string): void {
    this.ipWhitelist.delete(ipAddress);
  }

  /**
   * Detect anomalies
   */
  public detectAnomalies(userId: string): boolean {
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes

    // Get recent events for user
    const recentEvents = this.events.filter(
      (e) => e.userId === userId && e.timestamp >= now - timeWindow
    );

    // Anomaly 1: Too many failed login attempts
    const failedLogins = recentEvents.filter(
      (e) => e.type === SecurityEventType.LOGIN_FAILURE
    ).length;
    if (failedLogins >= 3) {
      this.logEvent({
        type: SecurityEventType.ANOMALY_DETECTED,
        severity: SecuritySeverity.WARNING,
        userId,
        outcome: 'failure',
        message: `Anomaly detected: ${failedLogins} failed login attempts in ${timeWindow / 60000} minutes`,
      });
      return true;
    }

    // Anomaly 2: Multiple permission denials
    const permissionDenials = recentEvents.filter(
      (e) => e.type === SecurityEventType.PERMISSION_DENIED
    ).length;
    if (permissionDenials >= 5) {
      this.logEvent({
        type: SecurityEventType.ANOMALY_DETECTED,
        severity: SecuritySeverity.WARNING,
        userId,
        outcome: 'failure',
        message: `Anomaly detected: ${permissionDenials} permission denials in ${timeWindow / 60000} minutes`,
      });
      return true;
    }

    // Anomaly 3: Suspicious activity pattern
    const suspiciousTypes = [
      SecurityEventType.ACCESS_DENIED,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
    ];
    const suspiciousEvents = recentEvents.filter((e) => suspiciousTypes.includes(e.type)).length;
    if (suspiciousEvents >= 10) {
      this.logEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.ERROR,
        userId,
        outcome: 'failure',
        message: `Suspicious activity detected: ${suspiciousEvents} suspicious events in ${timeWindow / 60000} minutes`,
      });
      return true;
    }

    return false;
  }

  /**
   * Get security events
   */
  public getEvents(filters?: {
    type?: SecurityEventType;
    severity?: SecuritySeverity;
    userId?: string;
    ipAddress?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): SecurityEvent[] {
    let events = [...this.events];

    if (filters) {
      if (filters.type) {
        events = events.filter((e) => e.type === filters.type);
      }
      if (filters.severity) {
        events = events.filter((e) => e.severity === filters.severity);
      }
      if (filters.userId) {
        events = events.filter((e) => e.userId === filters.userId);
      }
      if (filters.ipAddress) {
        events = events.filter((e) => e.ipAddress === filters.ipAddress);
      }
      if (filters.startTime) {
        events = events.filter((e) => e.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        events = events.filter((e) => e.timestamp <= filters.endTime!);
      }
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filters?.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  /**
   * Get API keys for user
   */
  public getApiKeys(userId: string): ApiKey[] {
    return Array.from(this.apiKeys.values())
      .filter((key) => key.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get active sessions for user
   */
  public getUserSessions(userId: string): UserSession[] {
    return Array.from(this.sessions.values())
      .filter((session) => session.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get security statistics
   */
  public getStatistics(): SecurityStatistics {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;

    const recentEvents = this.events.filter((e) => e.timestamp >= last24h);

    // Count by type
    const byType: Record<string, number> = {};
    for (const type of Object.values(SecurityEventType)) {
      byType[type] = recentEvents.filter((e) => e.type === type).length;
    }

    // Count by severity
    const bySeverity: Record<string, number> = {};
    for (const severity of Object.values(SecuritySeverity)) {
      bySeverity[severity] = recentEvents.filter((e) => e.severity === severity).length;
    }

    // Authentication stats
    const successfulLogins = byType[SecurityEventType.LOGIN_SUCCESS] || 0;
    const failedLogins = byType[SecurityEventType.LOGIN_FAILURE] || 0;
    const activeUsers = new Set(
      Array.from(this.sessions.values()).map((s) => s.userId)
    ).size;
    const activeSessions = this.sessions.size;

    // Authorization stats
    const accessGranted = byType[SecurityEventType.ACCESS_GRANTED] || 0;
    const accessDenied = byType[SecurityEventType.ACCESS_DENIED] || 0;
    const permissionDenied = byType[SecurityEventType.PERMISSION_DENIED] || 0;

    // Rate limit stats
    const totalRequests = Array.from(this.rateLimits.values()).reduce(
      (sum, entry) => sum + entry.count,
      0
    );
    const throttledRequests = byType[SecurityEventType.THROTTLE_TRIGGERED] || 0;
    const blockedRequests = byType[SecurityEventType.RATE_LIMIT_EXCEEDED] || 0;

    // Threat stats
    const suspiciousActivities = byType[SecurityEventType.SUSPICIOUS_ACTIVITY] || 0;
    const bruteForceAttempts = byType[SecurityEventType.BRUTE_FORCE_DETECTED] || 0;
    const anomaliesDetected = byType[SecurityEventType.ANOMALY_DETECTED] || 0;
    const blockedIps = this.ipBlacklist.size;

    // API key stats
    const totalKeys = this.apiKeys.size;
    const activeKeys = Array.from(this.apiKeys.values()).filter((k) => k.isActive).length;
    const expiredKeys = Array.from(this.apiKeys.values()).filter(
      (k) => k.expiresAt && k.expiresAt < now
    ).length;
    const revokedKeys = Array.from(this.apiKeys.values()).filter((k) => !k.isActive).length;

    return {
      events: {
        total: recentEvents.length,
        byType: byType as Record<SecurityEventType, number>,
        bySeverity: bySeverity as Record<SecuritySeverity, number>,
      },
      authentication: {
        successfulLogins,
        failedLogins,
        activeUsers,
        activeSessions,
      },
      authorization: {
        accessGranted,
        accessDenied,
        permissionDenied,
      },
      rateLimit: {
        totalRequests,
        throttledRequests,
        blockedRequests,
      },
      threats: {
        suspiciousActivities,
        bruteForceAttempts,
        anomaliesDetected,
        blockedIps,
      },
      apiKeys: {
        total: totalKeys,
        active: activeKeys,
        expired: expiredKeys,
        revoked: revokedKeys,
      },
    };
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean up old events (keep 24 hours)
    const eventRetention = 24 * 60 * 60 * 1000;
    this.events = this.events.filter((e) => e.timestamp >= now - eventRetention);

    // Clean up expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now || session.lastActivityAt < now - this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }

    // Clean up old rate limits
    for (const [identifier, entry] of this.rateLimits.entries()) {
      if (entry.resetAt < now) {
        this.rateLimits.delete(identifier);
      }
    }

    // Clean up IP reputations (unblock after block duration)
    for (const [ipAddress, reputation] of this.ipReputations.entries()) {
      if (reputation.blockedUntil && reputation.blockedUntil < now) {
        delete reputation.blockedUntil;
        reputation.failedAttempts = 0;
      }
    }

    logger.debug('Security cleanup completed', {
      events: this.events.length,
      sessions: this.sessions.size,
      rateLimits: this.rateLimits.size,
      ipReputations: this.ipReputations.size,
    });
  }

  /**
   * Shutdown service
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    logger.info('Security service shut down');
  }
}

// Singleton instance
export const securityService = new SecurityService();
