# Unified Memory Service

The Unified Memory Service provides semantic search and document storage with **dual-backend support** for maximum resilience and flexibility.

## Architecture

```
┌─────────────────────────────────────────┐
│      Unified Memory Service API         │
│  (Consistent interface, caching layer)  │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌──────────────────┐
│   PRIMARY     │   │    FALLBACK      │
│   Lanonasis   │   │   VectorStore    │
│ Memory Service│   │   (pgvector)     │
│  (prod-ready, │   │  (self-hosted)   │
│ Redis-backed) │   │                  │
└───────────────┘   └──────────────────┘
```

## Backends

### Primary: Lanonasis Memory Service
- **Production-ready** semantic search service
- **Redis-backed** for high performance
- **MCP server** support
- Hosted on your infrastructure (docs.lanonasis.com)

### Fallback: VectorStore (pgvector)
- **Self-hosted** on Supabase
- Uses **pgvector** extension
- Optimized with caching and batching
- Full control over data

## Configuration

### Environment Variables

```bash
# Lanonasis Memory Service (Optional - enables primary backend)
LANONASIS_MEMORY_URL="https://your-memory-service.com/api"
LANONASIS_API_KEY="your-api-key"

# These are already configured if using Supabase
SUPABASE_URL="your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
OPENAI_API_KEY="your-openai-key"  # For embeddings
```

### Behavior Modes

**Mode 1: Dual Backend (Recommended)**
- Primary: Lanonasis Memory Service
- Fallback: VectorStore
- Automatic failover on errors

**Mode 2: Lanonasis Only**
- Disable fallback if you want strict dependency
- Fails if Lanonasis is unavailable

**Mode 3: VectorStore Only**
- Don't configure Lanonasis credentials
- Uses local VectorStore exclusively

## Usage

### Basic Operations

```typescript
import { getMemoryService } from '@/services/memory-service';

const memory = getMemoryService();

// Store a document
const id = await memory.store({
  content: 'Important information about social media strategy',
  metadata: {
    platform: 'twitter',
    category: 'strategy',
    timestamp: new Date().toISOString(),
  },
});

// Search for similar content
const results = await memory.search({
  query: 'What is our social media strategy?',
  limit: 5,
  filters: {
    platform: 'twitter',
  },
});

console.log('Found results:', results);
// [
//   {
//     id: '...',
//     content: '...',
//     similarity: 0.89,
//     metadata: { ... }
//   }
// ]
```

### Batch Operations

```typescript
// Store multiple documents at once
const documents = [
  {
    content: 'Tweet about product launch',
    metadata: { type: 'post', platform: 'twitter' },
  },
  {
    content: 'LinkedIn article about AI trends',
    metadata: { type: 'article', platform: 'linkedin' },
  },
];

const ids = await memory.storeBatch(documents);
console.log('Stored documents:', ids);
```

### With Pre-computed Embeddings

```typescript
// If you already have embeddings from another source
await memory.store({
  content: 'Document text',
  embedding: [0.1, 0.2, ...], // 1536-dim vector
  metadata: { source: 'external' },
});
```

### Health Monitoring

```typescript
const health = await memory.healthCheck();

console.log(health);
// {
//   healthy: true,
//   primary: {
//     available: true,
//     backend: 'Lanonasis Memory Service'
//   },
//   fallback: {
//     available: true,
//     backend: 'VectorStore (pgvector)'
//   }
// }
```

### Metrics

```typescript
const metrics = memory.getMetrics();

console.log(metrics);
// {
//   primary: {
//     enabled: true,
//     backend: 'Lanonasis Memory Service'
//   },
//   fallback: {
//     enabled: true,
//     backend: 'VectorStore',
//     metrics: {
//       totalQueries: 150,
//       cacheHits: 45,
//       avgQueryTime: 120,
//       slowQueries: 2,
//       cacheHitRate: 0.3
//     }
//   },
//   cache: {
//     enabled: true,
//     stats: { hits: 100, misses: 50, ... }
//   }
// }
```

## Advanced Configuration

### Custom Initialization

```typescript
import { initializeMemoryService } from '@/services/memory-service';

// Initialize with custom config
const memory = initializeMemoryService({
  memoryServiceUrl: 'https://custom-memory-service.com',
  memoryServiceApiKey: 'custom-key',
  usePrimary: true,           // Use Lanonasis as primary
  fallbackEnabled: true,       // Enable VectorStore fallback
  cacheEnabled: true,          // Enable Redis caching
});
```

### Disable Fallback (Strict Mode)

```typescript
const memory = initializeMemoryService({
  usePrimary: true,
  fallbackEnabled: false,  // Fail if primary is down
  cacheEnabled: true,
});
```

### VectorStore Only Mode

```typescript
// Don't set LANONASIS_MEMORY_URL or LANONASIS_API_KEY
// Service will automatically use VectorStore only

const memory = getMemoryService();
// Uses VectorStore exclusively
```

## Integration Examples

### In Content Generation

```typescript
import { getMemoryService } from '@/services/memory-service';

async function generateContextualContent(topic: string) {
  const memory = getMemoryService();

  // Find relevant past content
  const relevantContent = await memory.search({
    query: topic,
    limit: 3,
    filters: { type: 'successful_post' },
  });

  // Use as context for AI generation
  const context = relevantContent
    .map((r) => r.content)
    .join('\n\n');

  return await aiService.generate({
    prompt: `Based on this context:\n${context}\n\nCreate new content about: ${topic}`,
  });
}
```

### In Analytics

```typescript
async function findSimilarSuccessfulPosts(postId: string) {
  const memory = getMemoryService();

  // Get the original post
  const post = await getPost(postId);

  // Find similar posts
  const similar = await memory.search({
    query: post.content,
    limit: 10,
    filters: { engagement: 'high' },
    minSimilarity: 0.7,
  });

  return similar;
}
```

### In Trend Analysis

```typescript
async function analyzeTrendingTopics() {
  const memory = getMemoryService();

  // Store trending content
  await memory.storeBatch(
    trendingPosts.map((post) => ({
      content: post.text,
      metadata: {
        type: 'trending',
        platform: post.platform,
        engagement: post.likes + post.shares,
        timestamp: post.createdAt,
      },
    }))
  );

  // Find patterns
  const patterns = await memory.search({
    query: 'trending topics in social media',
    limit: 20,
    filters: { type: 'trending' },
  });

  return analyzePatterns(patterns);
}
```

## Failover Behavior

### Automatic Failover

```typescript
// Request goes to Lanonasis Memory Service first
const results = await memory.search({ query: 'test' });

// If Lanonasis fails:
// 1. Error is logged
// 2. Request automatically retries with VectorStore
// 3. Results returned from fallback
// 4. User doesn't experience failure
```

### Monitoring Failovers

Check logs for failover events:

```
[WARN] Lanonasis Memory Service search failed, trying fallback
[DEBUG] Memory search completed via VectorStore fallback (3 results, 145ms)
```

## Performance Optimization

### Caching Strategy

The service uses **three-tier caching**:

1. **Redis Cache**: Fast in-memory cache for search results (1 hour TTL)
2. **Lanonasis Memory Service**: Redis-backed semantic search (primary)
3. **VectorStore**: Supabase pgvector with query caching

```typescript
// First call: Cache miss, hits Lanonasis/VectorStore
await memory.search({ query: 'AI trends' }); // ~120ms

// Second call: Cache hit, immediate return
await memory.search({ query: 'AI trends' }); // ~2ms
```

### Batch Processing

Use `storeBatch()` for multiple documents:

```typescript
// Inefficient: Multiple round trips
for (const doc of documents) {
  await memory.store(doc); // Don't do this!
}

// Efficient: Single batch operation
await memory.storeBatch(documents); // Do this!
```

## Troubleshooting

### Lanonasis Connection Issues

```bash
# Check if service is reachable
curl https://your-memory-service.com/health

# Check environment variables
echo $LANONASIS_MEMORY_URL
echo $LANONASIS_API_KEY

# Check logs
grep "Lanonasis" logs/app.log
```

### VectorStore Issues

```bash
# Run migration if table doesn't exist
psql $DATABASE_URL -f migrations/001_create_vector_store.sql

# Check pgvector extension
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### No Results Returned

```typescript
// Check health of both backends
const health = await memory.healthCheck();
console.log('Service health:', health);

// Check metrics
const metrics = memory.getMetrics();
console.log('Query metrics:', metrics.fallback.metrics);

// Try with lower similarity threshold
const results = await memory.search({
  query: 'test',
  minSimilarity: 0.3, // Lower threshold
});
```

## Migration Guide

### From VectorStore to Unified Service

```typescript
// Before
import { VectorStore } from '@/storage/vector-store';
const store = new VectorStore();
await store.searchSimilar({ text: 'query' });

// After
import { getMemoryService } from '@/services/memory-service';
const memory = getMemoryService();
await memory.search({ query: 'query' });
```

### Exporting Data Between Backends

```typescript
// Export from VectorStore
const vectorStore = new VectorStore();
const allDocs = await vectorStore.batchGetByIds(allIds);

// Import to Lanonasis
const memory = getMemoryService();
await memory.storeBatch(allDocs.map(doc => ({
  content: doc.content,
  metadata: doc.metadata,
})));
```

## Best Practices

1. ✅ **Always use the unified service** - Don't instantiate VectorStore directly
2. ✅ **Configure both backends** for maximum resilience
3. ✅ **Monitor health checks** in production
4. ✅ **Use batch operations** for multiple documents
5. ✅ **Add meaningful metadata** for better filtering
6. ✅ **Set appropriate similarity thresholds** (0.7+ for high precision, 0.3+ for recall)
7. ✅ **Limit result sets** to avoid performance issues

## Related Documentation

- [Lanonasis Memory SDK](https://www.npmjs.com/package/@lanonasis/memory-sdk-standalone)
- [Lanonasis Memory Client](https://www.npmjs.com/package/@lanonasis/memory-client)
- [VectorStore Documentation](./VECTOR_STORE.md)
- [Environment Variables](./ENVIRONMENT.md)
