# Network Sync — Phased Implementation Guide

**Audience:** Execution leads and delegated swarms
**Source of truth:** `CODEBASE_AUDIT.md` (audit findings) + this guide (how to remediate)
**Cadence:** Each phase ships behind a PR labelled `phase/<n>/<workstream>` with the acceptance checklist filled in.

---

## 0. How to use this guide

1. **Phases are gates, not buckets.** A phase ends only when every "Definition of Done" item is checked. Do not start the next phase's mandatory work before the previous phase's gate closes.
2. **Workstreams inside a phase run in parallel.** Each workstream is sized for one engineer or one small swarm. Workstream IDs (e.g., `P1.W2`) appear on PR titles so reviewers can map work back to this guide.
3. **Patterns are non-negotiable.** Section 10 contains the canonical templates (query-param helper, repository pattern, auth middleware, jest harness, etc.). PRs that re-invent these patterns will be rejected. Update the pattern in section 10 if a better one is found, then refactor existing usages in a follow-up PR.
4. **Every PR ships with three things:** (a) the change, (b) a test that fails without the change, (c) the acceptance line from this guide that it closes.
5. **The audit is the floor, not the ceiling.** If a workstream uncovers a new defect inside its blast radius, fix it and note it in the PR description. If it's outside, file an issue tagged `audit-followup` — do not expand scope.

### Status legend used in tables

- `[ ]` not started
- `[~]` in progress (PR open)
- `[x]` merged & verified by phase gate

---

## 1. Workstream topology

```
Phase 0 ─┬─► Phase 1 ──┬─► Phase 2 (frontend)         ─┐
         │             ├─► Phase 3 (persistence)       ├─► Phase 6 ──► Phase 7
         │             ├─► Phase 4 (auth/security)     │
         │             └─► Phase 5 (workflow runtime)  ─┘
         │
         └─► (Phase 0 hotfix branch can ship to main immediately)
```

- **Phase 0** is a single short sprint (1–2 days) on a hotfix branch. Everything else waits.
- **Phase 1** lays the shared substrate. Until it merges, Phases 2–5 cannot start because they all depend on the patterns it introduces.
- **Phases 2, 3, 4, 5 run concurrently** with separate owners. They share Phase 1 contracts and meet at the Phase 6 integration gate.
- **Phase 6** integrates, smoke-tests end-to-end, and adds observability.
- **Phase 7** updates documentation to match reality.

### Team sizing recommendation

| Phase | Min team | Ideal team | Duration |
|------|----------|-----------|----------|
| 0    | 1 senior eng | 2 (paired) | 1–2 days |
| 1    | 2 eng | 3 (1 BE, 1 FE, 1 platform) | 3 days |
| 2    | 1 FE eng | 2 (FE + designer) | 4 days |
| 3    | 1 BE eng/service × 5 services | 3 BE engs rotating | 5–7 days |
| 4    | 1 security eng | 2 (security + BE) | 4 days |
| 5    | 1 BE eng | 2 (BE + workflow domain) | 5 days |
| 6    | 1 SRE | 2 (SRE + QA) | 3 days |
| 7    | 1 tech writer | 1 + reviewers | 2 days |

Total wall-clock with the recommended parallelism: **~3 weeks**.
Sequential lower bound: ~6 weeks.

---

## 2. Phase 0 — Stop the bleed

**Goal:** Make `npm run build` and `npm test` resolve. Close the remote code execution path. Nothing else.

**Branch:** `hotfix/phase-0-unblock` → main (fast-track review).

### Workstreams

| ID | Title | Owner | Files (primary) |
|----|-------|-------|----------------|
| P0.W1 | Disable RCE path in backup restore | Security | `src/routes/backup.routes.ts:312`, `src/services/backup.ts:298-491` |
| P0.W2 | Quiet 69 TS2345 query-param errors with surgical narrowing | BE | All `src/routes/*.routes.ts` reading `req.query.*` |
| P0.W3 | Fix frontend build (`motion` unused) | FE | `web-interface/src/components/auth/LoginForm.tsx:4` |
| P0.W4 | Add `.dockerignore` and drop `bun.lockb` reference | Platform | `Dockerfile:9,34` |

> Note: P0.W2 is a *bandage*, not the real fix. Phase 1 introduces the shared helper; here we only need code to compile. Use `String(req.query.x ?? '')` or `req.query.x as string` inline, and tag each line with `// TODO(P1.W1): use getQuery()`.

### Definition of Done (Phase 0 gate)

- [ ] `npm run build` exits 0 in both `/` and `/web-interface`
- [ ] `tsc --noEmit` reports zero errors
- [ ] `POST /backup/restore` returns 401 for unauthenticated callers (integration test included)
- [ ] No `execAsync` with template-string interpolation remains in `backup.ts` (replaced with `execFile` + arg array, or disabled entirely with a `503 Not Implemented`)
- [ ] Hotfix merged to `main` and tagged `v0.x.0-unblock`

### Deliverable

A green CI run on `main`. Screenshot/log link in PR description.

---

## 3. Phase 1 — Foundations

**Goal:** Stand up the four substrates that every other phase consumes: query parsing, persistence repository pattern, auth middleware, test harness.

**Branch:** `phase-1/foundations` (single integration branch, sub-branches per workstream merge into it).

### Workstreams

| ID | Title | Owner | Deliverable |
|----|-------|-------|-------------|
| P1.W1 | `getQuery()` helper + refactor of all 15 route files | BE | `src/utils/http-query.ts` + replaced TODOs |
| P1.W2 | Base repository pattern + connection-pool fix | BE | `src/database/Repository.ts`, schema alignment commit |
| P1.W3 | `requireAuth()` middleware + role checks | Security | `src/middleware/auth.ts`, used by one demo route |
| P1.W4 | Jest harness with stubbed Redis/Supabase/SDKs | Platform | `jest.setup.ts`, `__mocks__/`, CI green |
| P1.W5 | Migration runner that runs all migrations and resolves duplicate numbering | BE | Renamed migration files, rewritten `scripts/run-migrations.js`, README update |

### Cross-workstream contracts

- **Query helper:** signature `getQuery(req: Request, name: string, opts?: { default?: string }): string | undefined`. See pattern §10.1.
- **Repository:** abstract class with `find`, `findOne`, `insert`, `update`, `delete`, `transaction`. Per-service subclasses live in `src/repositories/<domain>Repository.ts`. See §10.2.
- **Auth:** `requireAuth(roles?: Role[])` returns Express middleware. Reads JWT from `Authorization: Bearer`, validates against Supabase, attaches `req.user`. See §10.3.
- **Test setup:** Auto-mocks Redis, Supabase, OpenAI, social SDKs. Tests opt into real clients via `jest.unmock()`. See §10.4.

### Definition of Done

- [ ] Every route file uses `getQuery()` — `grep -r "req.query" src/routes/ | grep -v getQuery` returns empty
- [ ] `src/database/Repository.ts` exists with unit tests at >90% coverage
- [ ] At least one route (`/health/db`) uses `requireAuth()` end-to-end
- [ ] `npm test` runs 0 hangs, all suites load (pass-rate target deferred to Phase 6)
- [ ] `scripts/run-migrations.js` applies all migrations in order against a clean Postgres; verified by `make db-reset && make db-migrate` in CI
- [ ] Duplicate migration filenames eliminated (rename `002_performance_indexes.sql` → `009_performance_indexes.sql`, etc., document in `migrations/README.md`)
- [ ] Connection pool and migrations target the **same** schema (decision: use `network_sync`; migrations updated)

### Deliverable

A `phase-1/foundations` PR with five sub-commits, one per workstream, each with its own tests.

---

## 4. Phase 2 — Frontend reality

**Goal:** The visual workflow builder is reachable, the dashboard is wired to real APIs, auth context talks to the backend.

**Branch:** `phase-2/frontend-real` (depends on Phase 1 auth contract).

### Workstreams

| ID | Title | Owner | Files |
|----|-------|-------|-------|
| P2.W1 | Mount providers in `_app.tsx` (SWR, Auth, Toaster) | FE | `web-interface/src/pages/_app.tsx` |
| P2.W2 | Move workflow builder from App Router to Pages Router | FE | `web-interface/src/app/workflows/*` → `web-interface/src/pages/workflows/*` |
| P2.W3 | Real `AuthContext` (login/logout/token storage) backed by backend `/auth/*` | FE+Security | `web-interface/src/contexts/AuthContext.tsx`, new `src/routes/auth.routes.ts` |
| P2.W4 | Replace `react-query` imports with `@tanstack/react-query` | FE | `web-interface/src/hooks/use*.tsx` |
| P2.W5 | Wire workflow builder save/load/execute to `workflowApi` | FE | `web-interface/src/components/workflow-builder/*` |

### Definition of Done

- [ ] Visiting `/workflows` in the dev server renders the builder canvas
- [ ] User can: log in, create a workflow, save it, reload page, see it persisted
- [ ] No `react-query` references remain (`grep -r "from 'react-query'" web-interface/src` returns empty)
- [ ] `AuthContext` no longer hard-codes `dev@example.com`
- [ ] Playwright smoke test covers: login → create workflow → save → log out → log in → workflow visible

### Deliverable

A demo recording (or live link) of the flow above. Attached to PR.

---

## 5. Phase 3 — Persistence migration

**Goal:** Replace `new Map()` with database-backed repositories across the 8 services flagged in the audit.

**Branch:** `phase-3/persistence-<service>` per service, merged independently into a `phase-3/integration` collector.

### Workstreams (one per service, parallelizable)

| ID | Service | Maps to replace | Migration to wire | Repository |
|----|---------|----------------|-------------------|------------|
| P3.W1 | `compliance.ts` | L203–207 (5 Maps) | `006_compliance.sql` | `ComplianceRepository` |
| P3.W2 | `backup.ts` | L87–91 (5 Maps) | `007_backup.sql` | `BackupRepository` |
| P3.W3 | `security.ts` | L253–256 (4 Maps) | `005_security.sql` | `SecurityRepository` |
| P3.W4 | `workflow-manager.ts` | L133–135 | `003_create_workflows.sql` | `WorkflowRepository` |
| P3.W5 | `visual-workflow-executor.ts` | L36–37 | extend `003_create_workflows.sql` | `WorkflowExecutionRepository` |
| P3.W6 | `analytics.ts` | L199–204, 433, 449, 580 | `004_analytics.sql` | `AnalyticsRepository` |
| P3.W7 | `content-management.ts` | L201–202 | `003_content_management.sql` | `ContentRepository` |
| P3.W8 | `ai-cost-tracker.ts` | L78 + stubbed `loadBudgets` | new migration `010_ai_costs.sql` | `AiCostRepository` |

### Per-workstream Definition of Done

For each service:

- [ ] All `Map` instances removed; type checker would catch regressions
- [ ] Corresponding migration wired into `scripts/run-migrations.js`
- [ ] Repository inherits from `Repository` base (§10.2) with no SQL string concatenation
- [ ] Service unit tests pass against an in-memory pg mock (see §10.4)
- [ ] Integration test against real Postgres in CI runs CRUD + one domain-specific scenario
- [ ] Service exposes `health()` returning `{db: 'ok' | 'degraded', latencyMs: number}`

### Phase 3 gate (all workstreams merged)

- [ ] Server starts with no in-memory storage for the listed services
- [ ] Restarting the server preserves all data created in the previous session (verified by automated test)
- [ ] `network_sync` schema row counts visible in admin dashboard

### Deliverable

8 PRs (one per service) + a final integration PR that flips a feature flag so the in-memory path is removed.

---

## 6. Phase 4 — Auth and security hardening

**Goal:** Every route is authenticated unless explicitly public. Critical vulnerabilities closed.

**Branch:** `phase-4/security` (depends on P1.W3).

### Workstreams

| ID | Title | Owner | Scope |
|----|-------|-------|-------|
| P4.W1 | Apply `requireAuth()` to 8 unprotected routers | Security | ai-cost, ai-optimization, agent-supervision, content-management, analytics, context, cache, workflow-management |
| P4.W2 | Replace 2 stub `authenticate` functions with real middleware | Security | `backup.routes.ts:13-17`, `visual-workflow.routes.ts:30-34` |
| P4.W3 | Resolve `npm audit` critical + high (12 issues) | Platform | Root + `web-interface` |
| P4.W4 | Replace MD5 cache key with SHA-256 | BE | `src/middleware/cache.ts:232` |
| P4.W5 | Replace `new Function()` transform evaluator with sandboxed VM (`vm2` or `isolated-vm`) | BE | `src/services/visual-workflow-executor.ts:342` |
| P4.W6 | Wire helmet + rate-limiter that are imported but unused | Platform | `src/server/app.ts` |
| P4.W7 | Default-deny CORS (config-driven origin allowlist) | Platform | `src/server/app.ts:39-42` |
| P4.W8 | Enforce RBAC across remaining routes (claimed 41 perms, only used in `compliance.routes.ts`) | Security | RBAC matrix doc + per-route decorators |

### Definition of Done

- [ ] `grep -r "req.user = {" src/routes/` returns empty (no stub auth)
- [ ] `npm audit --omit=dev` reports 0 critical, 0 high in both `/` and `/web-interface`
- [ ] OWASP ZAP baseline scan in CI reports 0 high-severity findings
- [ ] RBAC matrix documented in `SECURITY.md` and enforced by middleware on at least 90% of routes
- [ ] Transform node sandbox documented with explicit allowlist of globals

### Deliverable

`SECURITY.md` updated with current posture + a CI badge for ZAP baseline.

---

## 7. Phase 5 — Workflow runtime truth

**Goal:** Workflow execution stops returning mocks. Real action handlers execute and report results.

**Branch:** `phase-5/workflow-runtime` (depends on P3.W4, P3.W5).

### Workstreams

| ID | Title | Files |
|----|-------|-------|
| P5.W1 | Implement real action handlers for `post_content`, `analyze_sentiment`, `moderate_content`, `generate_content`, `fetch_metrics` | `src/services/workflow-manager.ts:510,519` |
| P5.W2 | Replace `condition evaluator always returns true` with real expression engine | `src/services/workflow-manager.ts:542` |
| P5.W3 | Wire visual-workflow-executor action nodes to the handlers from P5.W1 | `src/services/visual-workflow-executor.ts:231-252` |
| P5.W4 | Replace `Math.random()` data fabrication in `TrendAnalyzer.getGoogleTrends` and `AnalyticsCollector.analyzeCompetitor` with real adapters (or feature-flag off) | `src/services/TrendAnalyzer.ts:128-141`, `src/services/AnalyticsCollector.ts:37-46` |
| P5.W5 | Replace `setInterval`-based scheduler in `backup.ts` with cron (`node-cron`) backed by DB schedule rows | `src/services/backup.ts` |

### Definition of Done

- [ ] No `Math.random()` in `src/services/**` (use `grep -r "Math.random" src/services` to verify)
- [ ] Workflow execution log shows real handler names, real inputs, real outputs
- [ ] At least one end-to-end test posts content via the real Twitter/X sandbox API
- [ ] Backup schedules survive process restart
- [ ] Condition node correctly branches on `==`, `!=`, `>`, `<`, `contains`, `regex`

### Deliverable

A Loom or recorded test run showing a workflow execute end-to-end against staging, with screenshots of the persisted execution log.

---

## 8. Phase 6 — Observability, CI/CD, integration

**Goal:** All previous phases meet at a green CI with observability that proves production-readiness.

**Branch:** `phase-6/observability` (depends on Phases 2–5 merged).

### Workstreams

| ID | Title |
|----|-------|
| P6.W1 | Jest pass-rate target: 95% (current 37%) — fix or quarantine flaky tests |
| P6.W2 | Coverage threshold raised from 70% → 80% per `jest.config.js` |
| P6.W3 | OpenTelemetry instrumentation (traces from HTTP → service → DB) |
| P6.W4 | Structured logging via `pino` with request-id correlation |
| P6.W5 | `/metrics` Prometheus endpoint with per-route latency histogram |
| P6.W6 | Staging deploy pipeline (build → migrate → smoke test → promote) |
| P6.W7 | E2E suite (Playwright) covering: auth, workflow CRUD, execution, content post |

### Definition of Done

- [ ] CI badge green for: build, type-check, unit tests, integration tests, E2E, ZAP, audit
- [ ] Staging environment reachable via `https://staging.<domain>` with seeded data
- [ ] Grafana dashboard shows: request rate, error rate, P95 latency, workflow execution duration, DB pool saturation
- [ ] One full deploy from PR merge → staging green takes <10 minutes

### Deliverable

A staging URL + Grafana dashboard link in `DEPLOYMENT.md`.

---

## 9. Phase 7 — Documentation alignment

**Goal:** Every claim in repo docs is true. Old aspirational docs are either fulfilled or marked as roadmap.

**Branch:** `phase-7/docs-truth`.

### Workstreams

| ID | Doc | Action |
|----|-----|--------|
| P7.W1 | `README.md` | Rewrite "Features" section to match Phase 6 reality; add "Roadmap" for deferred items |
| P7.W2 | `CODEBASE_AUDIT.md` | Mark resolved items, archive into `docs/audits/2026-01.md`, add `2026-05.md` with current state |
| P7.W3 | `PHASE3_PLANNING.md` | Replace with link to this guide; archive |
| P7.W4 | `VISUAL_WORKFLOW_BUILDER.md` | Update to reflect Pages Router location and real action handlers |
| P7.W5 | `DEPLOYMENT.md` | Add the staging URL, migration steps, env var reference |
| P7.W6 | `SECURITY.md` | Document RBAC matrix, auth flow, CORS policy |
| P7.W7 | API reference (OpenAPI/Swagger) | Generated from route handlers, served at `/docs` |

### Definition of Done

- [ ] No doc references a feature that doesn't exist in the deployed build
- [ ] No doc claims "✅ Implemented" for code paths that throw `NotImplementedError`
- [ ] `/docs` serves an OpenAPI UI that matches actual route signatures
- [ ] CHANGELOG covers Phase 0 → Phase 6 in human-readable entries

---

## 10. Canonical patterns (the floor)

Every workstream consumes these. If you find a sharper version, edit this section in a dedicated PR, then refactor consumers.

### 10.1 Query parameter helper (`src/utils/http-query.ts`)

```ts
import type { Request } from 'express';

export function getQuery(
  req: Request,
  name: string,
  opts: { default?: string } = {},
): string | undefined {
  const v = req.query[name];
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : opts.default;
  if (typeof v === 'string') return v;
  return opts.default;
}

export function getQueryInt(req: Request, name: string, def?: number): number | undefined {
  const s = getQuery(req, name);
  if (s === undefined) return def;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : def;
}

export function getQueryBool(req: Request, name: string, def = false): boolean {
  const s = getQuery(req, name);
  if (s === undefined) return def;
  return s === '1' || s.toLowerCase() === 'true';
}
```

**Rule:** Never read `req.query.x` directly outside this file.

### 10.2 Repository base (`src/database/Repository.ts`)

```ts
import type { Pool, PoolClient } from 'pg';

export abstract class Repository<TRow, TKey = string> {
  constructor(protected readonly pool: Pool, protected readonly table: string) {}

  protected abstract rowToEntity(row: TRow): unknown;

  async findById(id: TKey, client?: PoolClient): Promise<TRow | null> {
    const c = client ?? this.pool;
    const r = await c.query<TRow>(
      `SELECT * FROM ${this.qualifiedTable()} WHERE id = $1`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  private qualifiedTable(): string {
    return `network_sync.${this.table}`;
  }
}
```

**Rules:**
- Subclasses **must** parameterize all queries; no string interpolation of user input.
- All multi-statement work goes through `transaction()`.
- No `SELECT *` in subclass code — list columns explicitly so schema drift surfaces in tests.

### 10.3 Auth middleware (`src/middleware/auth.ts`)

```ts
import type { Request, Response, NextFunction } from 'express';
import { verifySupabaseJwt } from '@/services/auth';

export type Role = 'admin' | 'editor' | 'analyst' | 'viewer';

export interface AuthedRequest extends Request {
  user: { id: string; email: string; roles: Role[] };
}

export function requireAuth(roles?: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'missing_token' });
    }
    try {
      const user = await verifySupabaseJwt(header.slice(7));
      if (roles && !roles.some(r => user.roles.includes(r))) {
        return res.status(403).json({ error: 'forbidden' });
      }
      (req as AuthedRequest).user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}
```

**Rule:** No router may define its own `authenticate` function. Use this one.

### 10.4 Test harness (`jest.setup.ts`)

```ts
jest.mock('ioredis', () => require('ioredis-mock'));

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test' } }, error: null }),
    },
    from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }),
  }),
}));

jest.mock('openai', () => ({
  default: class { chat = { completions: { create: jest.fn() } }; },
}));

// Provide an in-memory pg pool for repository tests
import { newDb } from 'pg-mem';
(global as any).__memDb = newDb();
```

In `jest.config.js`:

```js
module.exports = {
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  // ...
};
```

**Rule:** Tests that need real network must `jest.unmock(...)` and live in a `*.integration.test.ts` file that CI runs in a separate job.

### 10.5 Migration naming

```
NNN_<domain>_<verb>.sql
```

- `NNN` is a zero-padded, monotonically increasing integer. No duplicates ever.
- `<domain>` matches the service that owns the tables (`compliance`, `backup`, `analytics`, …).
- `<verb>` is `create`, `alter`, `seed`, `drop`.
- All tables go into `network_sync` schema. Migration must `CREATE SCHEMA IF NOT EXISTS network_sync;` as its first statement (idempotent).

### 10.6 PR template (`.github/pull_request_template.md`)

```markdown
## Workstream
Phase: <0–7>
Workstream ID: <e.g. P3.W4>

## Acceptance criteria closed
- [ ] (paste from IMPLEMENTATION_GUIDE.md)

## Pattern compliance
- [ ] Uses canonical pattern from §10
- [ ] No new in-memory storage introduced
- [ ] No new direct `req.query.x` reads
- [ ] No new ad-hoc auth function

## Test evidence
<paste log of new test passing, screenshot, or recording>

## Out-of-scope findings filed
- (link to follow-up issues tagged `audit-followup`)
```

---

## 11. Review and judging rubric

Each PR is reviewed against four axes. Use this to triage and to give consistent feedback to swarms.

| Axis | What "passing" looks like | Common failure |
|------|--------------------------|----------------|
| **Correctness** | Acceptance line ticked; reproducer test included | Test exists but doesn't fail without the fix |
| **Pattern fidelity** | Uses §10 helpers verbatim | Re-implements query parsing or auth locally |
| **Persistence honesty** | Survives a process restart; verified by test | Hidden `Map` cache that masks DB outage |
| **Scope discipline** | Diff stays inside workstream; follow-ups filed | Drive-by refactors of unrelated services |

### Weekly status format (one row per workstream)

```
| Phase | Workstream | Owner | Status | Blockers | ETA |
|-------|-----------|-------|--------|----------|-----|
| 3     | P3.W4     | @ann  | [~]    | needs P1.W2 merged | Fri |
```

Status meeting: 30 minutes weekly, just walk the table.

---

## 12. Risk register and decision log

These are the decisions the execution lead must own before Phase 1 starts. Record decisions in `docs/decisions/<n>-<slug>.md` (ADR format).

| # | Decision | Recommendation | Why it matters |
|---|----------|----------------|----------------|
| D1 | Schema name (`public` vs `network_sync`) | `network_sync` | Aligns connection pool and migrations; everything else cascades |
| D2 | Auth source of truth | Supabase JWT | Already wired; avoids a second user store |
| D3 | Workflow expression sandbox | `isolated-vm` | `vm2` is unmaintained; `Function()` is unsafe |
| D4 | Frontend router | Pages Router | Less work than migrating App Router fragments; aligns with existing `_app.tsx` |
| D5 | Background scheduler | `node-cron` + DB rows | `setInterval` loses state on restart |
| D6 | Telemetry stack | OpenTelemetry + Grafana Cloud (or self-hosted) | Vendor-neutral; matches Phase 6 deliverable |
| D7 | Trend / competitor data source | Decide per-platform (X API, Reddit JSON, etc.) or feature-flag off until decided | Avoids `Math.random()` fabrication leaking to prod |

---

## 13. Scope cuts (use if timeline slips)

Order of things to *defer* before things to *skip*:

1. **Defer** P5.W4 (real trend/competitor adapters) — feature-flag off, ship UI with "Coming soon" badge.
2. **Defer** P6.W3 (OpenTelemetry) — keep structured logs only; add traces post-launch.
3. **Defer** P3.W8 (AI cost tracker DB) — keep in-memory but add a startup warning log; budgets are advisory, not safety-critical.
4. **Skip** P2.W5's workflow-builder save/load UI in favor of JSON import/export until Phase 8.
5. **Skip** P4.W3's frontend audit fixes if they require major dep bumps; pin and document in `SECURITY.md`.

**Do not skip:** P0 entirely, P1.W3 (auth), P4.W5 (sandbox), P3 for any service that writes user data.

---

## 14. Glossary

- **Drift** — A doc claim that no longer matches the code.
- **Swarm** — A small team (1–3 engineers) executing one workstream end-to-end.
- **Gate** — A definition-of-done checklist that must be fully checked before downstream phases start.
- **Workstream** — A unit of work scoped to a single PR (or a small chain of PRs) with a single owner.
- **Pattern** — A canonical implementation in §10 that all consumers must use verbatim.

---

*Owner of this guide: Platform tech lead. Propose changes via PR labelled `meta/implementation-guide`.*
