# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun install` - Install dependencies
- `bun run build` - Compile TypeScript to JavaScript (outputs to `dist/`)
- `bun run dev` - Run development server (executes `src/example-usage.ts`)
- `bun run start` - Start production server (runs orchestrator)
- `bun run test` - Run test suite
- `bun run demo` - Run demonstration of multi-agent orchestration
- `bun run orchestrate` - Start the agent orchestrator directly
- `bun run cli` - Launch the CLI interface

## System Architecture

This is a **multi-agent AI orchestration system** for social media automation. The system uses specialized AI agents that are coordinated by a central orchestrator:

### Core Components

**Agent Orchestrator** (`src/orchestrator/agent-orchestrator.ts`)
- Central hub that routes tasks to appropriate agents
- Manages task queues and agent capabilities
- Main entry point: `src/orchestrator/agent-orchestrator.ts`

**Specialized Agents**
- **Perplexity Agent**: Research and real-time data gathering
- **Claude Agent**: Content creation and analysis  
- **Embedding Agent**: Vector embeddings and semantic search

**Storage Systems**
- **Vector Store**: Supabase-based semantic search (`src/storage/vector-store.ts`)
- **Memory SDK Integration**: Persistent cross-session memory in `lib/memory-sdk/`
- **Google Drive**: Document and report storage

**Social Media Services** (`src/services/`)
- Platform-specific implementations: Twitter, LinkedIn, Facebook, Instagram
- Social media factory pattern for platform abstraction
- Content optimization and analytics collection

### Key Entry Points

- Main orchestrator: `src/orchestrator/agent-orchestrator.ts`
- Demo/example: `src/example-usage.ts` 
- CLI interface: `src/cli/cli-interface.ts`
- Type definitions: `src/types/typescript-types.ts`

## Memory SDK Integration

The system includes the Lanonasis Memory SDK for persistent memory:

- **Location**: `lib/memory-sdk/`
- **Usage**: Import from `'./lib/memory-sdk/lanonasis-memory-sdk.js'`
- **Features**: Multi-modal content storage, semantic search, cross-session persistence
- **Configuration**: Requires `LANONASIS_API_URL` and `LANONASIS_API_KEY` environment variables
- **Integration Examples**: `src/examples/memory-integration.ts`

## Environment Setup

Required environment variables for full functionality:
- OpenAI API keys for content generation
- Anthropic Claude API keys for analysis tasks
- Perplexity API keys for research
- Supabase credentials for vector storage
- Social platform API credentials (Twitter, LinkedIn, etc.)
- Google Drive API credentials for document storage
- Lanonasis Memory SDK credentials for persistent memory

## Development Notes

- **Runtime**: Uses Bun as the JavaScript runtime
- **Module System**: ES modules (`"type": "module"` in package.json)
- **TypeScript**: Strict configuration with path mapping (`@/*` for `src/*`, `@memory-sdk/*` for `lib/memory-sdk/*`)
- **Validation**: Uses Zod schemas for runtime type validation
- **Task Management**: Agent orchestrator uses task queues with priority scheduling
- **Content Types**: Supports text, images, videos, carousels across multiple platforms

## Complete N8N Workflow Implementation

The system now includes ALL n8n workflow patterns without requiring n8n:

### **Social Growth Engine** (`src/orchestrator/SocialGrowthEngine.ts`)
Main orchestrator that combines all workflow components:
- **Content automation** - Daily content generation and scheduling
- **Engagement automation** - Auto-reply, like, retweet based on rules
- **Competitor monitoring** - Real-time competitor tracking and alerts
- **Analytics reporting** - Automated weekly/monthly reports
- **Hashtag optimization** - Weekly hashtag research and strategy

### **Core Workflow Components**

**Engagement Automator** (`src/services/EngagementAutomator.ts`)
- Auto-engagement rules with AI-generated replies
- Rate limiting and cooldown management
- Opportunity discovery and action execution
- Smart filtering based on audience criteria

**Hashtag Researcher** (`src/services/HashtagResearcher.ts`) 
- Real-time hashtag trend analysis
- Platform-specific hashtag strategies
- Competitor hashtag analysis
- Performance tracking and recommendations

**Competitor Monitor** (`src/services/CompetitorMonitor.ts`)
- Automated competitor content analysis
- Growth tracking and alert system
- Strategy insights and recommendations  
- Multi-platform monitoring

**Analytics Dashboard** (`src/services/AnalyticsDashboard.ts`)
- Real-time performance widgets
- Automated report generation
- Growth tracking and insights
- AI-powered recommendations

### **Workflow Patterns Implemented**

✅ **Step 1-2**: Social media authentication and connection  
✅ **Step 3-4**: Topic research and trend analysis  
✅ **Step 5-6**: Competitor analysis and monitoring  
✅ **Step 7-8**: AI content generation and optimization  
✅ **Step 9-10**: Content scheduling and publishing  
✅ **Step 11-12**: Engagement monitoring and automation  
✅ **Step 13-14**: Analytics collection and reporting  
✅ **Step 15**: Advanced features (hashtag research, audience analysis)

## Testing and Demo

- Run `bun run demo` to see original system demonstration
- Run `bun run src/examples/complete-workflow-demo.ts` for full workflow demo
- Run `node test-integration.js` to test Memory SDK integration
- Use `bun run cli` for interactive command-line interface

## Usage Examples

```typescript
import { SocialGrowthEngine } from './src/orchestrator/SocialGrowthEngine';

const engine = new SocialGrowthEngine();

// Initialize complete automation system
await engine.initialize({
  platforms: ['twitter', 'linkedin'],
  goals: { follower_growth_rate: 5, engagement_rate_target: 3.5 },
  automation: {
    auto_engagement: true,
    auto_posting: true,
    competitor_monitoring: true,
    hashtag_optimization: true,
    analytics_reporting: true
  }
  // ... additional config
});

// System runs autonomously with scheduled tasks:
// - Content generation (daily 6 AM)
// - Automated posting (9 AM, 1 PM, 5 PM) 
// - Engagement automation (every 30 min)
// - Competitor monitoring (every 2 hours)
// - Analytics refresh (daily 8 AM)
// - Weekly reports (Mondays 9 AM)
```