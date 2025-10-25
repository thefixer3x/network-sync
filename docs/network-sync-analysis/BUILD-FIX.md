# Network-Sync Build Fix Guide

## Quick Fix (Run This Now)

The build is failing because of missing type definitions. Here's the fix:

### Step 1: Install Bun (if not already installed)
```bash
curl -fsSL https://bun.sh/install | bash
```

### Step 2: Install Missing Dependencies
```bash
cd /tmp/network-sync
bun install
bun add -d @types/node
```

### Step 3: Fix TypeScript Config
The tsconfig.json needs a small update to include Node types:

```bash
# Update tsconfig.json to include node types
```

Add this to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["node"],
    // ... rest of config
  }
}
```

### Step 4: Build Again
```bash
bun run build
```

---

## Common Build Errors Fixed

### Error 1: "Cannot find name 'process'"
**Cause:** Missing @types/node
**Fix:** `bun add -d @types/node`

### Error 2: "Cannot find module 'openai'"
**Cause:** Dependencies not installed
**Fix:** `bun install`

### Error 3: "Parameter implicitly has an 'any' type"
**Cause:** TypeScript strict mode
**Fix:** These are in files like AnalyticsDashboard.ts - need to add explicit types

---

## Alternative: Temporarily Disable Strict Mode

If you need to demo ASAP and fix types later, temporarily relax TypeScript:

Edit `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": false,  // Change from true to false
    "noImplicitAny": false,  // Add this line
  }
}
```

**⚠️ WARNING:** This is for demo only! Re-enable strict mode before production.

---

## Full Fix for Type Errors

If you have time, here are the type fixes needed:

### Fix 1: src/services/AnalyticsDashboard.ts
Lines with implicit 'any' need explicit types:

```typescript
// Before:
.reduce((sum, metric) => sum + metric.likes, 0)

// After:
.reduce((sum: number, metric: any) => sum + metric.likes, 0)
```

### Fix 2: src/agents/embedding-agent.ts
```typescript
// Before:
embeddings.map((item, index) => ({

// After:
embeddings.map((item: any, index: number) => ({
```

---

## Post-Build Checklist

After build succeeds:

- [ ] `bun run build` completes with no errors
- [ ] `dist/` directory created with .js and .d.ts files
- [ ] Test one agent: `bun run src/agents/perplexity-agent.ts`
- [ ] Check environment variables are loaded

---

## FASTEST PATH TO WORKING DEMO (2 hours)

1. **Install dependencies** (5 min)
   ```bash
   bun install
   bun add -d @types/node
   ```

2. **Temporarily disable strict mode** (2 min)
   Edit tsconfig.json: `"strict": false`

3. **Build** (1 min)
   ```bash
   bun run build
   ```

4. **Set up .env** (10 min)
   ```bash
   cp .env.example .env
   # Fill in your API keys:
   # - PERPLEXITY_API_KEY
   # - CLAUDE_API_KEY
   # - OPENAI_API_KEY
   # - SUPABASE_URL
   # - SUPABASE_ANON_KEY
   # - TWITTER_* credentials
   ```

5. **Test core agents** (30 min)
   ```bash
   # Test Perplexity Agent
   bun run src/agents/perplexity-agent.ts

   # Test Claude Agent
   bun run src/agents/claude-agent.ts

   # Test Orchestrator
   bun run src/orchestrator/agent-orchestrator.ts
   ```

6. **Run web interface** (15 min)
   ```bash
   cd web-interface
   npm install
   npm run dev
   ```

7. **Prepare demo scenarios** (1 hour)
   - Follow `/tmp/network-sync/2-day-demo-plan.md`
   - Test Scenario 1: AI-Powered Content Creation
   - Record backup video

---

## If Build Still Fails

**Option 1: Skip TypeScript compilation for demo**
```bash
# Run directly with Bun (bypasses TypeScript)
bun run src/example-usage.ts
```

**Option 2: Build only what you need**
```bash
# Build specific files
bunx tsc src/agents/perplexity-agent.ts --outDir dist
bunx tsc src/agents/claude-agent.ts --outDir dist
bunx tsc src/orchestrator/agent-orchestrator.ts --outDir dist
```

**Option 3: Use tsx for demo**
```bash
npm install -g tsx
tsx src/example-usage.ts
```

---

## Debug: Check Your Setup

Run this diagnostic:

```bash
#!/bin/bash
echo "=== Bun Version ==="
bun --version

echo "=== Node Modules ==="
ls node_modules | wc -l

echo "=== Environment Variables ==="
grep -c "API_KEY" .env

echo "=== TypeScript Config ==="
cat tsconfig.json | grep strict

echo "=== Build Attempt ==="
bun run build 2>&1 | head -20
```

---

## Contact Support

If you're still stuck, share:
1. Output of `bun --version`
2. Output of `bun run build 2>&1 | head -50`
3. Your tsconfig.json
4. First 10 lines of your .env (with secrets redacted)

Good luck! 🚀
