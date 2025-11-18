# Database Connection Pool

This document describes how to use the centralized database connection pool in the network-sync application.

## Overview

The connection pool manager provides efficient, reusable database connections across the application. It implements the singleton pattern to ensure a single pool is shared by all services.

## Features

- **Connection Pooling**: Efficient reuse of database connections
- **Admin and Public Clients**: Support for both service-level and public access
- **Health Monitoring**: Built-in health checks and connection metrics
- **Graceful Shutdown**: Proper cleanup of connections on server shutdown
- **Configuration**: Customizable pool size, timeouts, and other parameters

## Configuration

### Environment Variables

```env
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key

# Optional (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Pool Configuration (optional)
DB_POOL_MIN=2              # Minimum connections (default: 2)
DB_POOL_MAX=10             # Maximum connections (default: 10)
DB_CONNECTION_TIMEOUT=30000 # Connection timeout in ms (default: 30000)
DB_IDLE_TIMEOUT=60000      # Idle timeout in ms (default: 60000)
DB_ACQUIRE_TIMEOUT=10000   # Acquire timeout in ms (default: 10000)
SUPABASE_SCHEMA=public     # Database schema (default: public)
```

## Usage

### Initialization

Initialize the connection pool during server startup:

```typescript
import { initializeConnectionPool } from '@/database/connection-pool';

// Initialize from environment variables
await initializeConnectionPool();

// Or with custom configuration
import { getConnectionPool } from '@/database/connection-pool';

const pool = getConnectionPool();
await pool.initialize({
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key',
  serviceRoleKey: 'your-service-role-key',
  schema: 'public',
  pool: {
    minConnections: 5,
    maxConnections: 20,
    connectionTimeout: 30000,
    idleTimeout: 60000,
    acquireTimeout: 10000,
  },
});
```

### Getting Connections

#### Public/Anon Client

For general application queries (uses anon key):

```typescript
import { getSupabaseClient, releaseConnection } from '@/database/connection-pool';

// Get a client from the pool
const supabase = getSupabaseClient();

// Use the client
const { data, error } = await supabase
  .from('table_name')
  .select('*');

// Release when done (optional, for tracking)
releaseConnection();
```

#### Admin Client

For admin operations (uses service role key):

```typescript
import { getSupabaseAdminClient, releaseConnection } from '@/database/connection-pool';

// Get admin client from the pool
const supabase = getSupabaseAdminClient();

// Perform admin operations
const { data, error } = await supabase
  .auth
  .admin
  .listUsers();

// Release when done (optional, for tracking)
releaseConnection();
```

### In Service Classes

Update your services to use the connection pool:

```typescript
// Before
import { createClient } from '@supabase/supabase-js';

export class MyService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }
}

// After
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/database/connection-pool';

export class MyService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }
}
```

### Health Checks

Monitor connection pool health:

```typescript
import { getConnectionPool } from '@/database/connection-pool';

const pool = getConnectionPool();

// Check health status
const isHealthy = await pool.healthCheck();

// Get health status ('healthy' | 'warning' | 'critical')
const status = pool.getHealthStatus();

// Get detailed statistics
const stats = pool.getStats();
console.log({
  active: stats.active,
  maxConnections: stats.config.maxConnections,
  health: stats.health,
  metrics: stats.metrics,
});
```

### Server Initialization

Use the server init module for proper startup and shutdown:

```typescript
import {
  initializeServer,
  shutdownServer,
  setupGracefulShutdown,
  healthCheck,
} from '@/server/init';

// Initialize all infrastructure
await initializeServer();

// Setup graceful shutdown handlers
setupGracefulShutdown();

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await healthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// On shutdown
process.on('SIGTERM', async () => {
  await shutdownServer();
  process.exit(0);
});
```

## Monitoring

### Pool Statistics

```typescript
import { getPoolStats } from '@/database/connection-pool';

const stats = getPoolStats();
console.log({
  activeConnections: stats.active,
  totalAcquired: stats.metrics.totalAcquired,
  totalReleased: stats.metrics.totalReleased,
  errors: stats.metrics.errors,
  health: stats.health,
});
```

### Health Status Levels

- **healthy**: < 70% utilization
- **warning**: 70-89% utilization
- **critical**: ≥ 90% utilization

## Best Practices

1. **Always use the pool**: Don't create new Supabase clients directly
2. **Choose the right client**:
   - Use `getSupabaseClient()` for regular operations
   - Use `getSupabaseAdminClient()` only when you need admin privileges
3. **Release connections**: Call `releaseConnection()` when done (for tracking)
4. **Monitor health**: Check pool health regularly in production
5. **Graceful shutdown**: Always call `shutdownServer()` on application exit

## Migration Guide

### Step 1: Update Imports

```typescript
// Remove
import { createClient } from '@supabase/supabase-js';

// Add
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseAdminClient } from '@/database/connection-pool';
```

### Step 2: Update Client Initialization

```typescript
// Before
private supabase = createClient(url, key);

// After (public client)
private supabase: SupabaseClient;
constructor() {
  this.supabase = getSupabaseClient();
}

// After (admin client)
private supabase: SupabaseClient;
constructor() {
  this.supabase = getSupabaseAdminClient();
}
```

### Step 3: Initialize on Startup

```typescript
// In your main server file
import { initializeServer, setupGracefulShutdown } from '@/server/init';

async function main() {
  await initializeServer();
  setupGracefulShutdown();

  // Start your server
  app.listen(port);
}

main();
```

## Troubleshooting

### Connection Pool Not Initialized

**Error**: `Connection pool not initialized. Call initialize() first.`

**Solution**: Call `initializeConnectionPool()` during server startup before using any services.

### Admin Client Not Available

**Error**: `Admin client not initialized. Provide serviceRoleKey in config.`

**Solution**: Set `SUPABASE_SERVICE_ROLE_KEY` environment variable or provide it in the initialization config.

### High Connection Utilization

**Warning**: Pool health status is 'critical'

**Solution**:
- Increase `DB_POOL_MAX` environment variable
- Review application code for connection leaks
- Ensure connections are being released properly

## Testing

See `src/database/__tests__/connection-pool.test.ts` for comprehensive test examples.

```typescript
import { getSupabaseClient, initializeConnectionPool } from '@/database/connection-pool';

beforeAll(async () => {
  await initializeConnectionPool();
});

test('should query database', async () => {
  const client = getSupabaseClient();
  const { data, error } = await client.from('test').select('*');
  expect(error).toBeNull();
});
```

## Related Documentation

- [Supabase Client Documentation](https://supabase.com/docs/reference/javascript/supabase-client)
- [Server Initialization](./SERVER_INITIALIZATION.md)
- [Health Checks](./HEALTH_CHECKS.md)
