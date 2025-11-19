/**
 * Compliance Service
 *
 * Provides comprehensive compliance features including:
 * - GDPR compliance (data access, deletion, portability)
 * - Audit logging and trails
 * - Data retention policies
 * - Consent management
 * - Privacy policy tracking
 * - Compliance reporting
 * - Data classification
 */

import crypto from 'crypto';
import { Logger } from '@/utils/Logger';
import { metricsService } from './metrics';

const logger = new Logger('ComplianceService');

/**
 * Data classification levels
 */
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
}

/**
 * Audit action type
 */
export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  SHARE = 'share',
  DOWNLOAD = 'download',
  PRINT = 'print',
}

/**
 * Consent type
 */
export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  PERSONALIZATION = 'personalization',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  COOKIES = 'cookies',
}

/**
 * GDPR request type
 */
export enum GDPRRequestType {
  ACCESS = 'access', // Right to access
  RECTIFICATION = 'rectification', // Right to rectification
  ERASURE = 'erasure', // Right to erasure (right to be forgotten)
  PORTABILITY = 'portability', // Right to data portability
  RESTRICTION = 'restriction', // Right to restriction of processing
  OBJECTION = 'objection', // Right to object
}

/**
 * Compliance status
 */
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PENDING_REVIEW = 'pending_review',
  REMEDIATION_REQUIRED = 'remediation_required',
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * User consent record
 */
export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: number;
  revokedAt?: number;
  version: string; // Privacy policy version
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * GDPR request
 */
export interface GDPRRequest {
  id: string;
  userId: string;
  requestType: GDPRRequestType;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: number;
  completedAt?: number;
  data?: any;
  notes?: string;
  processedBy?: string;
}

/**
 * Data retention policy
 */
export interface RetentionPolicy {
  id: string;
  name: string;
  dataType: string;
  retentionPeriodDays: number;
  classification: DataClassification;
  autoDelete: boolean;
  legalBasis?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Privacy policy version
 */
export interface PrivacyPolicy {
  id: string;
  version: string;
  content: string;
  effectiveDate: number;
  publishedAt: number;
  isActive: boolean;
  changes?: string;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  id: string;
  reportType: string;
  generatedAt: number;
  period: {
    startDate: number;
    endDate: number;
  };
  metrics: {
    totalUsers: number;
    activeConsents: number;
    gdprRequests: number;
    dataBreaches: number;
    auditLogs: number;
    retentionPolicies: number;
  };
  status: ComplianceStatus;
  findings?: string[];
  recommendations?: string[];
}

/**
 * Data subject information
 */
export interface DataSubject {
  userId: string;
  personalData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
  };
  consents: ConsentRecord[];
  auditTrail: AuditLog[];
  retentionPolicies: string[];
  lastAccessedAt?: number;
}

/**
 * Compliance Service
 */
export class ComplianceService {
  private auditLogs: AuditLog[] = [];
  private consents: Map<string, ConsentRecord> = new Map();
  private gdprRequests: Map<string, GDPRRequest> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private privacyPolicies: Map<string, PrivacyPolicy> = new Map();
  private dataSubjects: Map<string, DataSubject> = new Map();

  private readonly MAX_AUDIT_LOGS = 100000;
  private readonly DEFAULT_RETENTION_DAYS = 90;

  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize default retention policies
    this.initializeDefaultPolicies();

    // Start cleanup interval (daily)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000);

    logger.info('Compliance service initialized');
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    const now = Date.now();

    // User data retention
    const userDataPolicy: RetentionPolicy = {
      id: this.generateId(),
      name: 'User Account Data',
      dataType: 'user_account',
      retentionPeriodDays: 365 * 7, // 7 years
      classification: DataClassification.CONFIDENTIAL,
      autoDelete: false,
      legalBasis: 'Contractual obligation',
      createdAt: now,
      updatedAt: now,
    };
    this.retentionPolicies.set(userDataPolicy.id, userDataPolicy);

    // Audit logs retention
    const auditLogPolicy: RetentionPolicy = {
      id: this.generateId(),
      name: 'Audit Logs',
      dataType: 'audit_log',
      retentionPeriodDays: 365 * 2, // 2 years
      classification: DataClassification.INTERNAL,
      autoDelete: true,
      legalBasis: 'Legal compliance',
      createdAt: now,
      updatedAt: now,
    };
    this.retentionPolicies.set(auditLogPolicy.id, auditLogPolicy);

    // Session data retention
    const sessionPolicy: RetentionPolicy = {
      id: this.generateId(),
      name: 'Session Data',
      dataType: 'session',
      retentionPeriodDays: 30,
      classification: DataClassification.INTERNAL,
      autoDelete: true,
      legalBasis: 'Legitimate interest',
      createdAt: now,
      updatedAt: now,
    };
    this.retentionPolicies.set(sessionPolicy.id, sessionPolicy);

    // Analytics data retention
    const analyticsPolicy: RetentionPolicy = {
      id: this.generateId(),
      name: 'Analytics Data',
      dataType: 'analytics',
      retentionPeriodDays: 90,
      classification: DataClassification.INTERNAL,
      autoDelete: true,
      legalBasis: 'Consent',
      createdAt: now,
      updatedAt: now,
    };
    this.retentionPolicies.set(analyticsPolicy.id, analyticsPolicy);
  }

  /**
   * Log audit entry
   */
  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const auditLog: AuditLog = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.auditLogs.push(auditLog);

    // Keep only recent logs
    if (this.auditLogs.length > this.MAX_AUDIT_LOGS) {
      this.auditLogs.shift();
    }

    // Update data subject audit trail
    const subject = this.dataSubjects.get(entry.userId);
    if (subject) {
      subject.auditTrail.push(auditLog);
      subject.lastAccessedAt = auditLog.timestamp;
    }

    // Record metrics
    metricsService.incrementCounter('compliance_audit_logs', {
      action: entry.action,
      resourceType: entry.resourceType,
    });

    logger.debug('Audit log created', {
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
    });

    return auditLog;
  }

  /**
   * Record user consent
   */
  public recordConsent(data: {
    userId: string;
    consentType: ConsentType;
    granted: boolean;
    version: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): ConsentRecord {
    const now = Date.now();

    const consent: ConsentRecord = {
      id: this.generateId(),
      userId: data.userId,
      consentType: data.consentType,
      granted: data.granted,
      version: data.version,
      createdAt: now,
      updatedAt: now,
    };

    // Conditionally add optional properties
    if (data.ipAddress) consent.ipAddress = data.ipAddress;
    if (data.metadata) consent.metadata = data.metadata;

    if (data.granted) {
      consent.grantedAt = now;
    } else {
      consent.revokedAt = now;
    }

    this.consents.set(consent.id, consent);

    // Update data subject consents
    let subject = this.dataSubjects.get(data.userId);
    if (!subject) {
      subject = {
        userId: data.userId,
        personalData: {},
        consents: [],
        auditTrail: [],
        retentionPolicies: [],
      };
      this.dataSubjects.set(data.userId, subject);
    }
    subject.consents.push(consent);

    // Log audit
    this.logAudit({
      userId: data.userId,
      action: AuditAction.UPDATE,
      resourceType: 'consent',
      resourceId: consent.id,
      metadata: {
        consentType: data.consentType,
        granted: data.granted,
      },
    });

    logger.info('Consent recorded', {
      userId: data.userId,
      consentType: data.consentType,
      granted: data.granted,
    });

    return consent;
  }

  /**
   * Get user consents
   */
  public getUserConsents(userId: string): ConsentRecord[] {
    return Array.from(this.consents.values())
      .filter((consent) => consent.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Check if user has granted consent
   */
  public hasConsent(userId: string, consentType: ConsentType): boolean {
    const userConsents = this.getUserConsents(userId);
    const latestConsent = userConsents.find((c) => c.consentType === consentType);
    return latestConsent?.granted || false;
  }

  /**
   * Create GDPR request
   */
  public createGDPRRequest(data: {
    userId: string;
    requestType: GDPRRequestType;
    notes?: string;
  }): GDPRRequest {
    const now = Date.now();

    const request: GDPRRequest = {
      id: this.generateId(),
      userId: data.userId,
      requestType: data.requestType,
      status: 'pending',
      requestedAt: now,
    };

    // Conditionally add optional properties
    if (data.notes) request.notes = data.notes;

    this.gdprRequests.set(request.id, request);

    // Log audit
    this.logAudit({
      userId: data.userId,
      action: AuditAction.CREATE,
      resourceType: 'gdpr_request',
      resourceId: request.id,
      metadata: {
        requestType: data.requestType,
      },
    });

    logger.info('GDPR request created', {
      userId: data.userId,
      requestType: data.requestType,
    });

    return request;
  }

  /**
   * Process GDPR request
   */
  public processGDPRRequest(
    requestId: string,
    processedBy: string,
    action: 'approve' | 'reject',
    data?: any
  ): GDPRRequest | null {
    const request = this.gdprRequests.get(requestId);
    if (!request) {
      return null;
    }

    const now = Date.now();

    if (action === 'approve') {
      request.status = 'completed';
      request.completedAt = now;
      request.processedBy = processedBy;
      request.data = data;

      // Execute the request
      this.executeGDPRRequest(request);
    } else {
      request.status = 'rejected';
      request.completedAt = now;
      request.processedBy = processedBy;
    }

    // Log audit
    this.logAudit({
      userId: request.userId,
      action: AuditAction.UPDATE,
      resourceType: 'gdpr_request',
      resourceId: requestId,
      metadata: {
        action,
        processedBy,
      },
    });

    logger.info('GDPR request processed', {
      requestId,
      requestType: request.requestType,
      action,
    });

    return request;
  }

  /**
   * Execute GDPR request
   */
  private executeGDPRRequest(request: GDPRRequest): void {
    switch (request.requestType) {
      case GDPRRequestType.ACCESS:
        // Return all user data
        request.data = this.getUserData(request.userId);
        break;

      case GDPRRequestType.PORTABILITY:
        // Export user data in machine-readable format
        request.data = this.exportUserData(request.userId);
        break;

      case GDPRRequestType.ERASURE:
        // Delete user data (right to be forgotten)
        this.deleteUserData(request.userId);
        break;

      case GDPRRequestType.RESTRICTION:
        // Restrict processing of user data
        this.restrictUserData(request.userId);
        break;

      default:
        logger.warn('Unknown GDPR request type', { requestType: request.requestType });
    }
  }

  /**
   * Get all user data
   */
  public getUserData(userId: string): DataSubject | null {
    return this.dataSubjects.get(userId) || null;
  }

  /**
   * Export user data
   */
  public exportUserData(userId: string): any {
    const subject = this.dataSubjects.get(userId);
    if (!subject) {
      return null;
    }

    return {
      userId: subject.userId,
      personalData: subject.personalData,
      consents: subject.consents.map((c) => ({
        type: c.consentType,
        granted: c.granted,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
        version: c.version,
      })),
      auditTrail: subject.auditTrail.map((log) => ({
        timestamp: log.timestamp,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
      })),
      exportedAt: Date.now(),
    };
  }

  /**
   * Delete user data (right to be forgotten)
   */
  public deleteUserData(userId: string): boolean {
    const subject = this.dataSubjects.get(userId);
    if (!subject) {
      return false;
    }

    // Delete consents
    for (const consent of this.consents.values()) {
      if (consent.userId === userId) {
        this.consents.delete(consent.id);
      }
    }

    // Anonymize audit logs (keep for compliance but remove PII)
    for (const log of this.auditLogs) {
      if (log.userId === userId) {
        log.userId = `anonymized_${crypto.randomBytes(8).toString('hex')}`;
        if (log.metadata) {
          delete log.metadata['email'];
          delete log.metadata['name'];
          delete log.metadata['phone'];
        }
      }
    }

    // Remove data subject
    this.dataSubjects.delete(userId);

    // Log audit (with anonymized ID)
    this.logAudit({
      userId: `anonymized_${userId}`,
      action: AuditAction.DELETE,
      resourceType: 'user_data',
      resourceId: userId,
      metadata: {
        reason: 'GDPR erasure request',
      },
    });

    logger.info('User data deleted', { userId });

    return true;
  }

  /**
   * Restrict user data processing
   */
  private restrictUserData(userId: string): void {
    const subject = this.dataSubjects.get(userId);
    if (subject) {
      // Mark data as restricted using metadata
      const metadata = (subject.personalData as any)._metadata || {};
      (subject.personalData as any)._metadata = {
        ...metadata,
        restricted: true,
        restrictedAt: Date.now(),
      };
    }
  }

  /**
   * Get audit logs
   */
  public getAuditLogs(filters?: {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): AuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.userId) {
        logs = logs.filter((log) => log.userId === filters.userId);
      }
      if (filters.action) {
        logs = logs.filter((log) => log.action === filters.action);
      }
      if (filters.resourceType) {
        logs = logs.filter((log) => log.resourceType === filters.resourceType);
      }
      if (filters.startDate) {
        logs = logs.filter((log) => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter((log) => log.timestamp <= filters.endDate!);
      }
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Get GDPR requests
   */
  public getGDPRRequests(filters?: {
    userId?: string;
    requestType?: GDPRRequestType;
    status?: string;
  }): GDPRRequest[] {
    let requests = Array.from(this.gdprRequests.values());

    if (filters) {
      if (filters.userId) {
        requests = requests.filter((r) => r.userId === filters.userId);
      }
      if (filters.requestType) {
        requests = requests.filter((r) => r.requestType === filters.requestType);
      }
      if (filters.status) {
        requests = requests.filter((r) => r.status === filters.status);
      }
    }

    return requests.sort((a, b) => b.requestedAt - a.requestedAt);
  }

  /**
   * Create retention policy
   */
  public createRetentionPolicy(data: {
    name: string;
    dataType: string;
    retentionPeriodDays: number;
    classification: DataClassification;
    autoDelete: boolean;
    legalBasis?: string;
  }): RetentionPolicy {
    const now = Date.now();

    const policy: RetentionPolicy = {
      id: this.generateId(),
      name: data.name,
      dataType: data.dataType,
      retentionPeriodDays: data.retentionPeriodDays,
      classification: data.classification,
      autoDelete: data.autoDelete,
      createdAt: now,
      updatedAt: now,
    };

    // Conditionally add optional properties
    if (data.legalBasis) policy.legalBasis = data.legalBasis;

    this.retentionPolicies.set(policy.id, policy);

    logger.info('Retention policy created', {
      name: data.name,
      dataType: data.dataType,
    });

    return policy;
  }

  /**
   * Get retention policies
   */
  public getRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.retentionPolicies.values());
  }

  /**
   * Create privacy policy version
   */
  public createPrivacyPolicy(data: {
    version: string;
    content: string;
    effectiveDate: number;
    changes?: string;
  }): PrivacyPolicy {
    const now = Date.now();

    // Deactivate all previous versions
    for (const policy of this.privacyPolicies.values()) {
      policy.isActive = false;
    }

    const policy: PrivacyPolicy = {
      id: this.generateId(),
      version: data.version,
      content: data.content,
      effectiveDate: data.effectiveDate,
      publishedAt: now,
      isActive: true,
    };

    // Conditionally add optional properties
    if (data.changes) policy.changes = data.changes;

    this.privacyPolicies.set(policy.id, policy);

    logger.info('Privacy policy created', { version: data.version });

    return policy;
  }

  /**
   * Get active privacy policy
   */
  public getActivePrivacyPolicy(): PrivacyPolicy | null {
    for (const policy of this.privacyPolicies.values()) {
      if (policy.isActive) {
        return policy;
      }
    }
    return null;
  }

  /**
   * Generate compliance report
   */
  public generateComplianceReport(period: { startDate: number; endDate: number }): ComplianceReport {
    const now = Date.now();

    // Filter data by period
    const periodLogs = this.auditLogs.filter(
      (log) => log.timestamp >= period.startDate && log.timestamp <= period.endDate
    );

    const periodRequests = Array.from(this.gdprRequests.values()).filter(
      (req) => req.requestedAt >= period.startDate && req.requestedAt <= period.endDate
    );

    const activeConsents = Array.from(this.consents.values()).filter(
      (c) => c.granted && (!c.revokedAt || c.revokedAt >= period.startDate)
    );

    // Analyze compliance status
    const findings: string[] = [];
    const recommendations: string[] = [];
    let status: ComplianceStatus = ComplianceStatus.COMPLIANT;

    // Check for pending GDPR requests
    const pendingRequests = periodRequests.filter((r) => r.status === 'pending');
    if (pendingRequests.length > 0) {
      findings.push(`${pendingRequests.length} pending GDPR requests require attention`);
      status = ComplianceStatus.PENDING_REVIEW;
    }

    // Check consent expiration
    const oldConsents = activeConsents.filter(
      (c) => c.grantedAt && now - c.grantedAt > 365 * 24 * 60 * 60 * 1000 // 1 year
    );
    if (oldConsents.length > 0) {
      findings.push(`${oldConsents.length} consents are over 1 year old and should be re-confirmed`);
      recommendations.push('Implement annual consent re-confirmation process');
    }

    // Check audit log retention
    const oldLogs = this.auditLogs.filter(
      (log) => now - log.timestamp > 365 * 2 * 24 * 60 * 60 * 1000 // 2 years
    );
    if (oldLogs.length > 1000) {
      findings.push(`${oldLogs.length} audit logs exceed retention period`);
      recommendations.push('Archive or delete old audit logs according to retention policy');
    }

    const report: ComplianceReport = {
      id: this.generateId(),
      reportType: 'compliance_review',
      generatedAt: now,
      period,
      metrics: {
        totalUsers: this.dataSubjects.size,
        activeConsents: activeConsents.length,
        gdprRequests: periodRequests.length,
        dataBreaches: 0, // TODO: Implement breach tracking
        auditLogs: periodLogs.length,
        retentionPolicies: this.retentionPolicies.size,
      },
      status,
      findings,
      recommendations,
    };

    logger.info('Compliance report generated', {
      period,
      status,
      findings: findings.length,
    });

    return report;
  }

  /**
   * Cleanup old data according to retention policies
   */
  private cleanup(): void {
    const now = Date.now();

    // Cleanup audit logs
    const auditLogPolicy = Array.from(this.retentionPolicies.values()).find(
      (p) => p.dataType === 'audit_log' && p.autoDelete
    );

    if (auditLogPolicy) {
      const cutoffDate = now - auditLogPolicy.retentionPeriodDays * 24 * 60 * 60 * 1000;
      const beforeCount = this.auditLogs.length;
      this.auditLogs = this.auditLogs.filter((log) => log.timestamp >= cutoffDate);
      const deletedCount = beforeCount - this.auditLogs.length;

      if (deletedCount > 0) {
        logger.info('Cleaned up audit logs', { deletedCount });
      }
    }

    // Cleanup completed GDPR requests (after 90 days)
    const requestCutoff = now - 90 * 24 * 60 * 60 * 1000;
    for (const [id, request] of this.gdprRequests.entries()) {
      if (request.completedAt && request.completedAt < requestCutoff) {
        this.gdprRequests.delete(id);
      }
    }

    logger.debug('Compliance cleanup completed');
  }

  /**
   * Shutdown service
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    logger.info('Compliance service shut down');
  }
}

// Singleton instance
export const complianceService = new ComplianceService();
