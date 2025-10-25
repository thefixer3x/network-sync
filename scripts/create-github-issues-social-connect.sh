#!/bin/bash

# Script to create GitHub issues for social-connect production roadmap
# Based on the comprehensive audit and improvements

set -e

REPO="thefixer3x/social-connect"

echo "🚀 Creating GitHub issues for social-connect..."
echo "Repository: $REPO"
echo ""

# Create labels first
echo "📝 Creating labels..."

gh label create "phase-1" --color "0E8A16" --description "Phase 1: Foundation & Testing" --repo $REPO 2>/dev/null || echo "  ✓ Label 'phase-1' already exists"
gh label create "phase-2" --color "FFA500" --description "Phase 2: Security & Scalability" --repo $REPO 2>/dev/null || echo "  ✓ Label 'phase-2' already exists"
gh label create "phase-3" --color "1D76DB" --description "Phase 3: Deployment & Monitoring" --repo $REPO 2>/dev/null || echo "  ✓ Label 'phase-3' already exists"
gh label create "phase-4" --color "9C27B0" --description "Phase 4: Polish & Launch" --repo $REPO 2>/dev/null || echo "  ✓ Label 'phase-4' already exists"

gh label create "critical" --color "D93F0B" --description "Critical priority" --repo $REPO 2>/dev/null || echo "  ✓ Label 'critical' already exists"
gh label create "high" --color "FF6B6B" --description "High priority" --repo $REPO 2>/dev/null || echo "  ✓ Label 'high' already exists"
gh label create "medium" --color "FFC107" --description "Medium priority" --repo $REPO 2>/dev/null || echo "  ✓ Label 'medium' already exists"

gh label create "testing" --color "1D76DB" --description "Testing related" --repo $REPO 2>/dev/null || echo "  ✓ Label 'testing' already exists"
gh label create "security" --color "D93F0B" --description "Security related" --repo $REPO 2>/dev/null || echo "  ✓ Label 'security' already exists"
gh label create "deployment" --color "2ECC71" --description "Deployment related" --repo $REPO 2>/dev/null || echo "  ✓ Label 'deployment' already exists"
gh label create "performance" --color "3498DB" --description "Performance optimization" --repo $REPO 2>/dev/null || echo "  ✓ Label 'performance' already exists"
gh label create "documentation" --color "95A5A6" --description "Documentation" --repo $REPO 2>/dev/null || echo "  ✓ Label 'documentation' already exists"

echo "✅ Labels created"
echo ""

# Create milestones
echo "📅 Creating milestones..."

gh api repos/$REPO/milestones -f title="Phase 1: Foundation Complete" -f description="Testing infrastructure and code quality improvements" -f due_on="2025-11-13T00:00:00Z" 2>/dev/null || echo "  ✓ Milestone 'Phase 1' already exists"

gh api repos/$REPO/milestones -f title="Phase 2: Security Hardened" -f description="Security and scalability improvements" -f due_on="2025-12-04T00:00:00Z" 2>/dev/null || echo "  ✓ Milestone 'Phase 2' already exists"

gh api repos/$REPO/milestones -f title="Phase 3: Deployment Ready" -f description="Deployment and monitoring infrastructure" -f due_on="2025-12-25T00:00:00Z" 2>/dev/null || echo "  ✓ Milestone 'Phase 3' already exists"

gh api repos/$REPO/milestones -f title="Phase 4: Production Launch" -f description="Final polish and production launch" -f due_on="2026-01-15T00:00:00Z" 2>/dev/null || echo "  ✓ Milestone 'Phase 4' already exists"

echo "✅ Milestones created"
echo ""

# Get milestone numbers
MILESTONE_1=$(gh api repos/$REPO/milestones --jq '.[] | select(.title=="Phase 1: Foundation Complete") | .number')
MILESTONE_2=$(gh api repos/$REPO/milestones --jq '.[] | select(.title=="Phase 2: Security Hardened") | .number')
MILESTONE_3=$(gh api repos/$REPO/milestones --jq '.[] | select(.title=="Phase 3: Deployment Ready") | .number')
MILESTONE_4=$(gh api repos/$REPO/milestones --jq '.[] | select(.title=="Phase 4: Production Launch") | .number')

echo "Creating issues..."
echo ""

# PHASE 1 ISSUES (Recently completed, but creating for tracking)

echo "Phase 1: Testing & Code Quality..."

gh issue create --repo $REPO \
  --title "✅ Set up Jest Testing Framework" \
  --milestone "$MILESTONE_1" \
  --label "testing,phase-1,critical" \
  --body "## Status: COMPLETED ✅

**Implemented in:** PR #XX (7d9ddbf)

### What Was Done
- Installed Jest with TypeScript support (ts-jest)
- Created jest.config.js with 70% coverage threshold
- Added test scripts to package.json
- Configured for CI/CD integration

### Files Created
- jest.config.js
- api-server/src/middleware/__tests__/auth.test.ts
- src/services/__tests__/TwitterService.test.ts

### Test Scripts
\`\`\`bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage
npm run test:ci           # CI mode
\`\`\`

### Next Steps
- [ ] Add more test coverage (currently ~20%, target 70%)
- [ ] Add tests for remaining services
- [ ] Add integration tests for API endpoints

**Reference:** docs/IMPROVEMENTS_SUMMARY.md" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Increase Test Coverage to 70%+" \
  --milestone "$MILESTONE_1" \
  --label "testing,phase-1,high" \
  --body "## Goal
Increase test coverage from current ~20% to 70%+ across the codebase.

## Tasks
- [ ] Add unit tests for all platform services
  - [ ] TwitterService (expand current tests)
  - [ ] LinkedInService
  - [ ] FacebookService
  - [ ] InstagramService
- [ ] Add unit tests for OpenAI service
- [ ] Add unit tests for TrendAnalyzer
- [ ] Add unit tests for AnalyticsCollector
- [ ] Add unit tests for AutomationEngine
- [ ] Add integration tests for API endpoints (using supertest)
  - [ ] /api/auth/* routes
  - [ ] /api/content/* routes
  - [ ] /api/analytics/* routes
  - [ ] /api/automation/* routes

## Acceptance Criteria
- [ ] Coverage report shows 70%+ for lines, branches, functions, statements
- [ ] All tests pass in CI/CD pipeline
- [ ] Test execution time < 30 seconds

## Time Estimate
24 hours

## Reference
- docs/IMPROVEMENTS_SUMMARY.md
- jest.config.js (coverage configuration)" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Add ESLint Configuration and Fix Linting Issues" \
  --milestone "$MILESTONE_1" \
  --label "phase-1,high" \
  --body "## Goal
Set up ESLint with TypeScript support and enforce coding standards.

## Tasks
- [ ] Install ESLint and TypeScript plugin
\`\`\`bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
\`\`\`
- [ ] Create .eslintrc.js configuration
- [ ] Configure rules (Airbnb or Standard base)
- [ ] Add pre-commit hook (husky + lint-staged)
- [ ] Fix all critical linting errors
- [ ] Add lint script to package.json
- [ ] Update CI/CD to run linter

## Recommended Rules
- TypeScript-specific rules
- Import order enforcement
- No unused variables
- Consistent naming conventions
- Max line length: 120

## Acceptance Criteria
- [ ] ESLint runs without critical errors
- [ ] Pre-commit hook prevents commits with lint errors
- [ ] CI/CD fails if linting fails
- [ ] Documentation of coding standards

## Time Estimate
4 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Add Prettier Code Formatter" \
  --milestone "$MILESTONE_1" \
  --label "phase-1,medium" \
  --body "## Goal
Configure Prettier for consistent code formatting across the project.

## Tasks
- [ ] Install Prettier
\`\`\`bash
npm install --save-dev prettier
\`\`\`
- [ ] Create .prettierrc configuration
- [ ] Integrate with ESLint (no conflicts)
- [ ] Add pre-commit formatting hook
- [ ] Format entire codebase
- [ ] Add format script to package.json

## Configuration
\`\`\`json
{
  \"semi\": true,
  \"singleQuote\": true,
  \"tabWidth\": 2,
  \"trailingComma\": \"es5\",
  \"printWidth\": 80
}
\`\`\`

## Time Estimate
2 hours" || echo "  ⚠️ Issue may already exist"

echo "✅ Phase 1 issues created"
echo ""

# PHASE 2 ISSUES (Security & Scalability)

echo "Phase 2: Security & Scalability..."

gh issue create --repo $REPO \
  --title "✅ Implement JWT Authentication System" \
  --milestone "$MILESTONE_2" \
  --label "security,phase-2,critical" \
  --body "## Status: COMPLETED ✅

**Implemented in:** PR #XX (7d9ddbf)

### What Was Done
- Created JWT authentication middleware
- Implemented signup/login/verify endpoints
- Added bcrypt password hashing
- Created users table migration
- Added role-based authorization support

### Files Created
- api-server/src/middleware/auth.ts
- api-server/src/routes/auth.ts
- api-server/migrations/001_create_users_table.sql

### To Enable
Uncomment line 76 in api-server/src/server.ts:
\`\`\`typescript
app.use('/api/', authenticate);
\`\`\`

### Features
- JWT token generation and validation
- Bcrypt password hashing (10 rounds)
- Role-based access control
- Optional authentication middleware

**Reference:** docs/IMPROVEMENTS_SUMMARY.md" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Add Input Validation with Zod for All API Endpoints" \
  --milestone "$MILESTONE_2" \
  --label "security,phase-2,high" \
  --body "## Goal
Implement comprehensive input validation using Zod for all API endpoints.

## Tasks
- [ ] Create Zod schemas for all request bodies
  - [ ] Content creation/update requests
  - [ ] Automation configuration requests
  - [ ] User profile updates
- [ ] Create validation middleware
- [ ] Apply validation to all POST/PUT endpoints
- [ ] Add validation error responses (400 Bad Request)
- [ ] Update API documentation with validation rules

## Example Implementation
\`\`\`typescript
import { z } from 'zod';

const createContentSchema = z.object({
  content: z.string().min(1).max(4000),
  platform: z.enum(['twitter', 'linkedin', 'facebook', 'instagram']),
  scheduledTime: z.string().datetime().optional(),
  hashtags: z.array(z.string()).max(30),
  mentions: z.array(z.string()),
  mediaUrls: z.array(z.string().url()).max(4)
});
\`\`\`

## Time Estimate
16 hours

## Reference
- api-server/src/config/env.ts (Zod example)" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Encrypt Sensitive Credentials in Database" \
  --milestone "$MILESTONE_2" \
  --label "security,phase-2,critical" \
  --body "## Goal
Implement encryption for sensitive credentials stored in the database.

## Tasks
- [ ] Choose encryption library (crypto-js or @aws-crypto/client-node)
- [ ] Create encryption/decryption utility functions
- [ ] Encrypt social media platform credentials before storage
- [ ] Encrypt API keys before storage
- [ ] Update database schema to store encrypted data
- [ ] Create migration for existing data
- [ ] Document key management process
- [ ] Implement key rotation capability

## Security Requirements
- Use AES-256 encryption
- Store encryption keys separately from application secrets
- Use environment variable for master key
- Document key rotation process

## Time Estimate
12 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Add CORS and CSRF Protection" \
  --milestone "$MILESTONE_2" \
  --label "security,phase-2,high" \
  --body "## Goal
Enhance security with proper CORS and CSRF protection.

## Tasks
- [ ] Review and tighten CORS configuration
- [ ] Implement CSRF token generation
- [ ] Add CSRF validation middleware
- [ ] Configure allowed origins from environment
- [ ] Add CSRF tokens to forms
- [ ] Update frontend to include CSRF tokens
- [ ] Add security headers via Helmet
- [ ] Test CORS with different origins

## Implementation
\`\`\`typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Generate token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
\`\`\`

## Time Estimate
6 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Implement Redis-Backed Distributed Task Queue" \
  --milestone "$MILESTONE_2" \
  --label "phase-2,critical" \
  --body "## Goal
Replace in-memory automation scheduling with Redis-backed Bull queue for horizontal scalability.

## Tasks
- [ ] Install Redis and Bull
\`\`\`bash
npm install redis bull
npm install --save-dev @types/bull
\`\`\`
- [ ] Set up Redis connection
- [ ] Create queue management service
- [ ] Migrate AutomationEngine to use Bull queues
- [ ] Implement job processors
- [ ] Add job retry logic
- [ ] Add job failure handling
- [ ] Set up Bull Board for monitoring
- [ ] Update Docker Compose to include Redis

## Benefits
- Persist tasks across server restarts
- Horizontal scalability (multiple workers)
- Better job monitoring
- Scheduled job support

## Time Estimate
20 hours

## Reference
- Docker Compose already includes Redis service" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Add Database Connection Pooling and Health Checks" \
  --milestone "$MILESTONE_2" \
  --label "phase-2,high" \
  --body "## Goal
Configure PostgreSQL connection pooling for better performance and reliability.

## Tasks
- [ ] Configure postgres connection pool settings
\`\`\`typescript
const pool = postgres(DATABASE_URL, {
  max: 10,
  min: 2,
  idle_timeout: 30,
  connect_timeout: 2
});
\`\`\`
- [ ] Add connection health checks
- [ ] Implement retry logic for transient failures
- [ ] Monitor pool usage metrics
- [ ] Add connection recovery
- [ ] Update health endpoint to check DB connectivity

## Time Estimate
6 hours" || echo "  ⚠️ Issue may already exist"

echo "✅ Phase 2 issues created"
echo ""

# PHASE 3 ISSUES (Deployment & Monitoring)

echo "Phase 3: Deployment & Monitoring..."

gh issue create --repo $REPO \
  --title "✅ Docker Configuration Completed" \
  --milestone "$MILESTONE_3" \
  --label "deployment,phase-3,critical" \
  --body "## Status: COMPLETED ✅

**Implemented in:** PR #XX (7d9ddbf)

### What Was Done
- Created multi-stage Dockerfile for production
- Created Docker Compose for local development
- Added .dockerignore for optimization
- Added nginx.conf for frontend hosting
- Configured health checks for all services
- Set up PostgreSQL and Redis services

### Files Created
- Dockerfile
- docker-compose.yml
- .dockerignore
- nginx.conf

### Usage
\`\`\`bash
docker-compose up -d          # Start all services
docker-compose logs -f api    # View logs
docker-compose down           # Stop services
\`\`\`

**Reference:** docs/IMPROVEMENTS_SUMMARY.md" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "✅ GitHub Actions CI/CD Pipeline Completed" \
  --milestone "$MILESTONE_3" \
  --label "deployment,phase-3,critical" \
  --body "## Status: COMPLETED ✅

**Implemented in:** PR #XX (7d9ddbf)

### What Was Done
- Created comprehensive CI/CD pipeline
- Jobs: lint, test, build, docker, security, deploy
- Automated security scanning (npm audit, Snyk)
- Docker image building and pushing
- Coverage reporting to Codecov
- Branch-based deployment strategy

### File Created
- .github/workflows/ci.yml

### Next Steps
- [ ] Configure Docker Hub credentials (DOCKER_USERNAME, DOCKER_PASSWORD)
- [ ] Configure Snyk token (SNYK_TOKEN) for security scanning
- [ ] Set up deployment targets (staging, production)

**Reference:** docs/IMPROVEMENTS_SUMMARY.md" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Implement Structured Logging with Winston or Pino" \
  --milestone "$MILESTONE_3" \
  --label "phase-3,high" \
  --body "## Goal
Replace basic console.log with structured logging for better observability.

## Tasks
- [ ] Choose logging library (Winston or Pino)
- [ ] Install and configure logger
- [ ] Create logging utility with multiple transports
- [ ] Define log levels (debug, info, warn, error)
- [ ] Add structured logging throughout codebase
- [ ] Configure log rotation (daily, size-based)
- [ ] Add request ID to all logs
- [ ] Configure external log aggregation (CloudWatch, DataDog, or Logtail)

## Configuration Example
\`\`\`typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
\`\`\`

## Time Estimate
12 hours

## Reference
- src/utils/Logger.ts (current basic logger)" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Integrate Sentry for Error Tracking" \
  --milestone "$MILESTONE_3" \
  --label "phase-3,critical" \
  --body "## Goal
Set up Sentry for comprehensive error tracking and monitoring.

## Tasks
- [ ] Create Sentry account and project
- [ ] Install Sentry SDK
\`\`\`bash
npm install @sentry/node @sentry/tracing
\`\`\`
- [ ] Configure Sentry in backend
- [ ] Configure Sentry in frontend
- [ ] Add error boundaries in React components
- [ ] Upload source maps for stack traces
- [ ] Configure custom error tagging
- [ ] Set up alert rules
- [ ] Enable performance monitoring

## Configuration
\`\`\`typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});
\`\`\`

## Time Estimate
8 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Set up Application Performance Monitoring (APM)" \
  --milestone "$MILESTONE_3" \
  --label "phase-3,high" \
  --body "## Goal
Implement APM for performance monitoring and profiling.

## Tasks
- [ ] Choose APM tool (New Relic, DataDog, or Prometheus)
- [ ] Install APM agent
- [ ] Configure backend instrumentation
- [ ] Track database query performance
- [ ] Monitor external API calls
- [ ] Add custom metrics (queue length, agent tasks)
- [ ] Set up performance dashboards
- [ ] Configure alerting on degradation

## Key Metrics
- Response times (p50, p95, p99)
- Error rates
- Queue depth
- Database query performance
- External API latency
- Memory usage
- CPU usage

## Time Estimate
8 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Create Comprehensive Health Check Endpoints" \
  --milestone "$MILESTONE_3" \
  --label "phase-3,high" \
  --body "## Goal
Implement detailed health check endpoints for service monitoring.

## Tasks
- [ ] Expand basic /health endpoint
- [ ] Create /health/detailed with dependency checks
- [ ] Add readiness probe endpoint (/ready)
- [ ] Add liveness probe endpoint (/alive)
- [ ] Check database connectivity
- [ ] Check Redis connectivity
- [ ] Check external API accessibility
- [ ] Return appropriate status codes

## Endpoints
\`\`\`
GET /health          → 200 OK (basic)
GET /health/detailed → JSON with all service status
GET /ready           → Kubernetes readiness probe
GET /alive           → Kubernetes liveness probe
\`\`\`

## Time Estimate
6 hours" || echo "  ⚠️ Issue may already exist"

echo "✅ Phase 3 issues created"
echo ""

# PHASE 4 ISSUES (Polish & Launch)

echo "Phase 4: Polish & Launch..."

gh issue create --repo $REPO \
  --title "Create OpenAPI/Swagger API Documentation" \
  --milestone "$MILESTONE_4" \
  --label "documentation,phase-4,high" \
  --body "## Goal
Generate comprehensive API documentation using OpenAPI/Swagger.

## Tasks
- [ ] Install swagger dependencies
- [ ] Create OpenAPI 3.0 spec file
- [ ] Document all API endpoints
- [ ] Define request/response schemas
- [ ] Add authentication documentation
- [ ] Add code examples for common use cases
- [ ] Host interactive Swagger UI
- [ ] Generate API client libraries (optional)

## Tools
- Swagger UI or Redoc
- swagger-jsdoc (generate from code comments)

## Time Estimate
16 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Frontend Performance Optimization" \
  --milestone "$MILESTONE_4" \
  --label "performance,phase-4,medium" \
  --body "## Goal
Optimize Next.js frontend for better performance and user experience.

## Tasks
- [ ] Implement code splitting
- [ ] Add lazy loading for heavy components
- [ ] Optimize images (Next.js Image component)
- [ ] Analyze and reduce bundle size
- [ ] Achieve Lighthouse score >90
- [ ] Add service worker for offline support (optional)
- [ ] Optimize recharts bundle size
- [ ] Remove unused dependencies

## Optimizations
- Dynamic imports for modals
- Route-based code splitting
- Image lazy loading
- Tree shaking

## Time Estimate
12 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Database Query Optimization and Indexing" \
  --milestone "$MILESTONE_4" \
  --label "performance,phase-4,medium" \
  --body "## Goal
Analyze and optimize database queries for better performance.

## Tasks
- [ ] Enable slow query logging
- [ ] Analyze slow queries
- [ ] Identify missing indexes
- [ ] Add indexes for frequently queried columns
- [ ] Resolve N+1 query problems
- [ ] Implement query result caching
- [ ] Add pagination for large datasets
- [ ] Optimize joins and subqueries

## Time Estimate
8 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Conduct Security Audit and Penetration Testing" \
  --milestone "$MILESTONE_4" \
  --label "security,phase-4,high" \
  --body "## Goal
Conduct comprehensive security audit and address vulnerabilities.

## Tasks
- [ ] Complete OWASP Top 10 checklist
- [ ] Run dependency vulnerability scan (npm audit)
- [ ] Scan for leaked secrets (git-secrets, trufflehog)
- [ ] Test for SQL injection vulnerabilities
- [ ] Test for XSS vulnerabilities
- [ ] Verify CSRF protection
- [ ] Test authentication bypass attempts
- [ ] Review and harden CORS configuration
- [ ] Verify rate limiting effectiveness
- [ ] Test API endpoint authorization

## Tools
- npm audit / bun audit
- OWASP ZAP
- Snyk
- git-secrets

## Target
- A+ rating on securityheaders.com
- Zero high/critical vulnerabilities

## Time Estimate
16 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Load Testing and Performance Benchmarking" \
  --milestone "$MILESTONE_4" \
  --label "performance,phase-4,high" \
  --body "## Goal
Perform load testing to ensure system can handle expected traffic.

## Tasks
- [ ] Install load testing tool (k6, Artillery, or Apache JMeter)
- [ ] Define test scenarios
  - Content creation workflow
  - Analytics dashboard queries
  - Concurrent workflow execution
  - API endpoint stress test
- [ ] Test with 100 concurrent users
- [ ] Test with 500 concurrent users
- [ ] Test with 1000 concurrent users
- [ ] Document response times under load
- [ ] Identify breaking point
- [ ] Create optimization recommendations

## Acceptance Criteria
- [ ] Handle 1000 concurrent users
- [ ] Response time p95 < 500ms under normal load
- [ ] No memory leaks during sustained load
- [ ] Graceful degradation under extreme load

## Time Estimate
12 hours" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Beta Launch with Select Users" \
  --milestone "$MILESTONE_4" \
  --label "phase-4,high" \
  --body "## Goal
Launch beta version to 10-20 users for real-world feedback.

## Tasks
- [ ] Recruit 10-20 beta users
- [ ] Create beta user onboarding documentation
- [ ] Set up feedback collection process
- [ ] Enable user analytics tracking
- [ ] Establish support channel (Discord, Slack, or email)
- [ ] Schedule weekly feedback review meetings
- [ ] Create bug reporting template
- [ ] Monitor system performance during beta
- [ ] Collect feature requests
- [ ] Prioritize fixes based on feedback

## Success Metrics
- [ ] 80%+ user satisfaction
- [ ] <5% critical bug rate
- [ ] Average response time <500ms
- [ ] >70% feature adoption

## Time Estimate
40 hours (1 week)" || echo "  ⚠️ Issue may already exist"

gh issue create --repo $REPO \
  --title "Production Launch Checklist" \
  --milestone "$MILESTONE_4" \
  --label "phase-4,critical" \
  --body "## Production Readiness Checklist

### Code Quality
- [ ] All tests passing (70%+ coverage)
- [ ] No critical linting errors
- [ ] No TypeScript errors
- [ ] Code reviewed and approved

### Security
- [ ] Security audit completed and passed
- [ ] All credentials encrypted in database
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Security headers configured
- [ ] Authentication enabled on all protected routes

### Performance
- [ ] Load testing completed (1000 concurrent users)
- [ ] Database queries optimized
- [ ] Frontend bundle optimized
- [ ] Lighthouse score >90

### Monitoring
- [ ] Sentry error tracking active
- [ ] APM configured and tested
- [ ] Logging configured with aggregation
- [ ] Health check endpoints working
- [ ] Uptime monitoring configured
- [ ] Alert rules configured

### Deployment
- [ ] Docker images built and pushed
- [ ] CI/CD pipeline passing
- [ ] Staging environment validated
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested

### Documentation
- [ ] API documentation complete (Swagger)
- [ ] User documentation published
- [ ] Developer onboarding guide complete
- [ ] Support process defined
- [ ] Terms of service published
- [ ] Privacy policy published

### Business
- [ ] Pricing and billing active
- [ ] Support team trained
- [ ] Marketing materials ready
- [ ] Launch announcement prepared
- [ ] Social media accounts set up

## Launch Day Tasks
- [ ] Deploy to production
- [ ] Verify all services healthy
- [ ] Test critical user flows
- [ ] Send launch announcement
- [ ] Monitor for issues
- [ ] Onboard first 100 users

## Post-Launch
- [ ] Monitor error rates (target: <1%)
- [ ] Monitor response times (target: p95 <500ms)
- [ ] Collect user feedback
- [ ] Address critical issues within 24 hours

## Time Estimate
80 hours (2 weeks)" || echo "  ⚠️ Issue may already exist"

echo "✅ Phase 4 issues created"
echo ""

echo "🎉 All issues created successfully!"
echo ""
echo "View your issues at: https://github.com/$REPO/issues"
echo "View your milestones at: https://github.com/$REPO/milestones"
echo ""
echo "To create a project board:"
echo "1. Go to: https://github.com/$REPO/projects/new"
echo "2. Choose 'Board' template"
echo "3. Add columns: Backlog, To Do, In Progress, In Review, Done"
echo "4. Add issues to the board"
