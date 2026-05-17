# Social Media Orchestrator

## Overview
Multi-Agent AI Orchestration System for Social Media automation. This project consists of a Next.js web interface frontend and a Bun/TypeScript backend for AI-powered social media management.

## Project Architecture

### Directory Structure
- `web-interface/` - Next.js frontend application (port 5000)
- `src/` - Backend TypeScript source code
  - `agents/` - AI agents (Claude, Perplexity, Embedding)
  - `server/` - Express server (port 3001)
  - `services/` - Business logic services
  - `routes/` - API route handlers
  - `orchestrator/` - Agent orchestration logic
- `migrations/` - Database migration SQL files
- `scripts/` - Utility scripts
- `docs/` - Project documentation
- `e2e/` - End-to-end tests
- `lib/memory-sdk/` - Memory SDK library

### Technology Stack
- **Frontend**: Next.js 14, React 18, Tailwind CSS, ReactFlow
- **Backend**: Bun, Express, TypeScript
- **Database**: PostgreSQL (via Supabase)
- **AI Services**: Claude (Anthropic), OpenAI, Perplexity
- **Queue**: Bull (Redis-based)

## Running the Project

### Development
The project runs the Next.js web interface on port 5000:
```bash
cd web-interface && bun run dev --port 5000 --hostname 0.0.0.0
```

### Backend Server (Optional)
The backend Express API runs on port 3001:
```bash
bun run src/server/server.ts
```

## Environment Variables
The project uses Supabase for authentication and database. Configure:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Recent Changes
- 2026-01-03: Initial Replit setup
  - Fixed React version mismatch (aligned to React 18)
  - Added missing reactflow dependency
  - Configured Next.js for Replit proxy (allowedDevOrigins)
  - Set up workflow for port 5000

## User Preferences
(None recorded yet)
