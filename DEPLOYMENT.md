# Production Deployment Guide

## Overview

This guide covers deploying the Social Media Orchestrator API to production environments.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for development)
- PostgreSQL 14+ (or use Docker)
- Redis 6+ (or use Docker)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd network-sync

# 2. Create environment file
cp .env.example .env
# Edit .env with your production values

# 3. Start all services
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f api
```

### Manual Deployment

```bash
# 1. Install dependencies
bun install

# 2. Build TypeScript
bun run build

# 3. Run database migrations
bun run migrate

# 4. Start the server
NODE_ENV=production bun run start
```

## Environment Variables

### Required

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Security
JWT_SECRET=your-jwt-secret-key
API_KEY_SECRET=your-api-key-secret
SESSION_SECRET=your-session-secret

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Optional

```bash
# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Cache
CACHE_TTL_SECONDS=3600
CACHE_MAX_SIZE_MB=512

# Compliance
DATA_RETENTION_DAYS=90
AUDIT_LOG_RETENTION_DAYS=730
GDPR_REQUEST_SLA_DAYS=30
```

## Docker Deployment

### Building the Image

```bash
# Build production image
docker build -t social-media-api:latest .

# Build with specific tag
docker build -t social-media-api:v1.0.0 .

# Build for multi-platform
docker buildx build --platform linux/amd64,linux/arm64 -t social-media-api:latest .
```

### Running the Container

```bash
# Run with environment file
docker run -d \
  --name social-media-api \
  --env-file .env.production \
  -p 3000:3000 \
  social-media-api:latest

# Run with individual environment variables
docker run -d \
  --name social-media-api \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATABASE_URL=postgresql://... \
  -p 3000:3000 \
  social-media-api:latest
```

### Docker Compose

```bash
# Start all services in detached mode
docker-compose up -d

# Start specific service
docker-compose up -d api

# Scale the API
docker-compose up -d --scale api=3

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f api

# Execute command in container
docker-compose exec api bun run migrate

# Restart service
docker-compose restart api
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured
- Helm 3+ (optional)

### Deploy with kubectl

```bash
# Create namespace
kubectl create namespace social-media-api

# Create secrets
kubectl create secret generic api-secrets \
  --from-env-file=.env.production \
  -n social-media-api

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment
kubectl get pods -n social-media-api
kubectl get services -n social-media-api

# View logs
kubectl logs -f deployment/social-media-api -n social-media-api

# Scale deployment
kubectl scale deployment social-media-api --replicas=3 -n social-media-api
```

### Deploy with Helm

```bash
# Install chart
helm install social-media-api ./helm/social-media-api \
  --namespace social-media-api \
  --create-namespace \
  --values values.production.yaml

# Upgrade
helm upgrade social-media-api ./helm/social-media-api \
  --namespace social-media-api \
  --values values.production.yaml

# Rollback
helm rollback social-media-api 1 -n social-media-api

# Uninstall
helm uninstall social-media-api -n social-media-api
```

## Health Checks

### Liveness Probe

```bash
curl http://localhost:3000/health/live
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-19T12:00:00.000Z"
}
```

### Readiness Probe

```bash
curl http://localhost:3000/health/ready
```

Response:
```json
{
  "status": "ready",
  "checks": {
    "database": true,
    "redis": true
  },
  "timestamp": "2025-01-19T12:00:00.000Z"
}
```

### Dependencies Check

```bash
curl http://localhost:3000/health/dependencies
```

## Monitoring

### Prometheus Metrics

Metrics are exposed at `/metrics` in Prometheus format:

```bash
curl http://localhost:3000/metrics
```

Key metrics:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `database_connections_active` - Active database connections
- `redis_operations_total` - Redis operations
- `cache_hits_total` - Cache hits
- `cache_misses_total` - Cache misses

### Logging

Logs are output in JSON format for production:

```json
{
  "level": "info",
  "timestamp": "2025-01-19T12:00:00.000Z",
  "message": "HTTP Request",
  "method": "GET",
  "path": "/health",
  "status": 200,
  "duration": "5ms",
  "requestId": "abc123"
}
```

## Database Migrations

### Running Migrations

```bash
# In Docker
docker-compose exec api bun run migrate

# In Kubernetes
kubectl exec -it deployment/social-media-api -n social-media-api -- bun run migrate

# Manually
bun run migrate
```

### Migration Files

Migrations are located in `migrations/` directory and run in order:
- `001_initial.sql`
- `002_workflows.sql`
- `003_content_management.sql`
- `004_analytics.sql`
- `005_security.sql`
- `006_compliance.sql`

## Performance Tuning

### Database Connection Pool

```bash
# Recommended settings for production
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_POOL_IDLE_TIMEOUT_MS=30000
DATABASE_POOL_CONNECTION_TIMEOUT_MS=5000
```

### Redis Configuration

```bash
# Recommended settings
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY_MS=1000
REDIS_ENABLE_OFFLINE_QUEUE=true
```

### Node.js Memory

```bash
# Set Node.js memory limit (2GB)
NODE_OPTIONS="--max-old-space-size=2048"
```

## Security Best Practices

### 1. Use Environment Variables

Never commit secrets to version control. Use environment variables or secret management systems.

### 2. Enable HTTPS

Use a reverse proxy (nginx, Traefik) or load balancer with SSL/TLS termination.

### 3. Set Secure Headers

The API includes security headers via middleware. Ensure your reverse proxy adds:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`

### 4. Rate Limiting

Configure appropriate rate limits based on your traffic:

```bash
RATE_LIMIT_WINDOW_MS=60000    # 1 minute
RATE_LIMIT_MAX_REQUESTS=100   # 100 requests per minute
```

### 5. IP Whitelisting

For admin endpoints, use IP whitelisting via the security service.

## Backup and Disaster Recovery

### Database Backups

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U user dbname > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T postgres psql -U user dbname < backup_20250119.sql
```

### Redis Backups

```bash
# Save Redis snapshot
docker-compose exec redis redis-cli BGSAVE

# Copy snapshot
docker cp redis:/data/dump.rdb ./backups/redis_$(date +%Y%m%d).rdb
```

### Application State

Export compliance and audit data:

```bash
# Export via API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/compliance/export/$USER_ID > user_data.json
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs api

# Check configuration
docker-compose config

# Validate environment
docker-compose exec api env | grep DATABASE
```

### Database Connection Issues

```bash
# Test database connection
docker-compose exec api bun run db:test

# Check database logs
docker-compose logs postgres

# Verify credentials
echo $DATABASE_URL
```

### High Memory Usage

```bash
# Check container stats
docker stats social-media-api

# Inspect memory usage
docker-compose exec api node -e "console.log(process.memoryUsage())"

# Adjust Node.js memory
NODE_OPTIONS="--max-old-space-size=4096"
```

### Slow Response Times

```bash
# Check metrics
curl http://localhost:3000/metrics/json

# Check database pool
curl http://localhost:3000/health/dependencies

# Enable query logging
LOG_LEVEL=debug
```

## Maintenance

### Zero-Downtime Deployment

1. Deploy new version with different tag
2. Start new containers alongside old ones
3. Run health checks on new containers
4. Switch traffic to new containers
5. Stop old containers

```bash
# Blue-green deployment example
docker-compose -f docker-compose.blue.yaml up -d
# Wait for health checks
docker-compose -f docker-compose.green.yaml down
```

### Rolling Updates (Kubernetes)

```bash
# Update deployment image
kubectl set image deployment/social-media-api \
  api=social-media-api:v1.1.0 \
  -n social-media-api

# Check rollout status
kubectl rollout status deployment/social-media-api -n social-media-api

# Pause rollout
kubectl rollout pause deployment/social-media-api -n social-media-api

# Resume rollout
kubectl rollout resume deployment/social-media-api -n social-media-api
```

### Database Maintenance

```bash
# Vacuum PostgreSQL
docker-compose exec postgres psql -U user -d dbname -c "VACUUM ANALYZE;"

# Check database size
docker-compose exec postgres psql -U user -d dbname -c "SELECT pg_size_pretty(pg_database_size('dbname'));"

# Clean old audit logs
curl -X POST http://localhost:3000/compliance/cleanup \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: <docs-url>
- Email: support@yourdomain.com

## License

See LICENSE file for details.
