<<<<<<< HEAD
# Social Intelligence OS

> **Your brand. Your voice. Amplified.**

We built the system that top-tier talent managers don't want you to know about.

While everyone else is copy-pasting ChatGPT into their LinkedIn, your content is:

- **Researched** with real-time market intelligence
- **Crafted** to match your exact voice and positioning
- **Contextual** - knows what you said last month, last year
- **Consistent** - your brand never drifts, never contradicts
- **Human-approved** - AI drafts, you greenlight

Rising creators spend 10+ hours a week on content. Their managers spend more.

**We compressed that into a workflow.**

---

*"It's not AI content. It's YOUR content, accelerated."*

---

## How It Works

```
Research (Perplexity) → Draft (Claude) → Context Check (Vectors) → You Approve → Deliver
```

Every piece of content is:
1. Researched against real-time data and your niche
2. Written in YOUR voice, using YOUR brand context
3. Checked for consistency with everything you've said before
4. Sent to you for approval - nothing posts without your sign-off
5. Delivered ready-to-post across platforms

## The Stack

| Layer | Technology |
|-------|------------|
| Intelligence | Perplexity (research), Claude (writing), OpenAI (embeddings) |
| Memory | Vector storage for brand context and history |
| Queue | Redis + Bull for scheduled workflows |
| Auth | JWT with refresh tokens |
| Platforms | Twitter, LinkedIn, Instagram, Facebook |

## Quick Start

```bash
# Install
bun install

# Configure
cp .env.example .env
# Add your API keys

# Run
bun run dev
```

## Project Structure

```
src/
├── agents/           # Specialized AI agents
├── orchestrator/     # Task routing and coordination
├── services/         # Platform integrations
├── storage/          # Vector store for context
├── queue/            # Job scheduling (Bull + Redis)
├── auth/             # JWT authentication
└── cli/              # Command-line interface

web-interface/        # Next.js dashboard
├── components/       # UI components
├── hooks/            # React hooks
└── app/              # Pages and routes
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run test` | Run test suite |
| `bun run demo` | Run demo workflow |

## Architecture

The system uses specialized agents for different tasks:

- **Perplexity Agent** - Real-time research, trending topics, competitor analysis
- **Claude Agent** - Content creation, brand voice matching, engagement copy
- **Orchestrator** - Routes tasks to the right agent based on context
- **Vector Store** - Maintains brand memory for consistency

## Security

- AES-256 encryption for sensitive data
- Rate limiting across 6 tiers
- CORS allowlist
- Webhook signature verification
- Human-in-the-loop for all publishing

---

Built for creators who value their time and their brand.

## License

MIT
=======
# Network Sync

> **AI-Powered Social Media Automation Platform**

Network Sync is an enterprise-grade social media automation platform that combines multi-agent AI orchestration with visual workflow building, giving you the power to automate, analyze, and optimize your social media presence across all major platforms.

---

## What is Network Sync?

Network Sync is your intelligent social media command center. It brings together:

- **Multi-Agent AI System** - Claude, Perplexity, and OpenAI working together
- **Visual Workflow Builder** - Drag-and-drop automation like Zapier/n8n
- **Real-Time Analytics** - Track performance across all platforms
- **Smart Content Generation** - AI-powered content tailored to each platform
- **Competitor Intelligence** - Monitor and learn from your competition
- **Engagement Automation** - Rules-based automated interactions

Whether you're a solo creator, marketing team, or enterprise, Network Sync handles the complexity of multi-platform social media management so you can focus on what matters: your message.

---

## Key Features

### 🤖 Multi-Agent AI Orchestration

Network Sync doesn't rely on a single AI model. Instead, it intelligently routes tasks to specialized agents:

| Agent | Specialization | Use Case |
|-------|---------------|----------|
| **Claude Agent** | Creative writing, analysis, complex reasoning | Content creation, brand voice, strategy |
| **Perplexity Agent** | Real-time research, web search, fact-checking | Trend analysis, competitor research, current events |
| **OpenAI Agent** | Content enhancement, sentiment analysis | Optimization, entity extraction, summaries |
| **Embedding Agent** | Vector search, semantic matching | Knowledge retrieval, similar content discovery |

The **AI Request Optimizer** ensures cost efficiency through:
- Request deduplication (no duplicate API calls)
- Intelligent caching
- Request batching
- Token optimization
- Per-provider cost tracking

---

### 🎨 Visual Workflow Builder

Build powerful automations without writing code:

**Node Types Available:**
- **Triggers** - Schedule, webhook, event, manual start
- **Actions** - Post content, generate content, fetch metrics, send email, HTTP requests
- **Conditions** - AND/OR logic with true/false branching
- **Transforms** - Map, filter, reduce operations
- **Delays** - Wait for specific durations
- **API Calls** - Connect to any external service

**Workflow Features:**
- Real-time validation as you build
- Pre-built templates for common automations
- Execution monitoring with detailed logs
- Error handling with retry policies
- Test mode before going live

---

### 📊 Analytics Dashboard

Comprehensive analytics across all your social accounts:

**Metrics Tracked:**
- Engagement rates (likes, comments, shares, saves)
- Follower growth and trends
- Post performance and reach
- Click-through rates
- Audience demographics
- Best posting times
- Content type performance

**Analysis Tools:**
- Time series visualizations (hourly, daily, monthly)
- Funnel analysis for conversion tracking
- A/B testing with statistical analysis
- Custom dashboards
- Export capabilities

---

### 📱 Multi-Platform Support

Connect and manage all your social accounts:

| Platform | Features |
|----------|----------|
| **Twitter/X** | Posting, engagement, trend analysis, hashtag research |
| **LinkedIn** | Content publishing, B2B analytics, professional networking |
| **Facebook** | Page management, post scheduling, audience insights |
| **Instagram** | Visual content, stories, hashtag optimization, engagement |

Each platform integration includes:
- OAuth secure authentication
- Platform-specific content optimization
- Native API rate limit handling
- Automatic formatting adjustments

---

### 🔍 Trend Analyzer

Stay ahead of the conversation:

- **Real-time trend detection** from Google Trends, Twitter, and industry sources
- **Relevance scoring** - AI-powered assessment of trend fit for your brand
- **Content potential scoring** - How suitable is this trend for content creation?
- **Engagement prediction** - Expected audience response
- **Industry filtering** - Focus on trends in your niche
- **Batch analysis** - Analyze up to 20 trends simultaneously

---

### 👥 Competitor Monitor

Know what your competition is doing:

- **Multi-competitor tracking** - Monitor 5+ competitors simultaneously
- **Cross-platform monitoring** - Track across all social platforms
- **Smart alerts** for:
  - Follower spikes
  - Viral posts
  - Engagement surges
  - New campaigns
  - Trending hashtags
- **Deep insights:**
  - Posting frequency and optimal times
  - Content strategy analysis
  - Engagement patterns
  - Growth trends
  - Audience response patterns
- **Opportunity & threat analysis** - Actionable recommendations

---

### #️⃣ Hashtag Researcher

Maximize your reach with intelligent hashtag strategy:

- **Volume metrics** - How often is this hashtag used?
- **Trending scores** - Is it rising or falling?
- **Difficulty scoring** - How competitive is it?
- **Engagement rates** - What results can you expect?
- **Related hashtags** - Discover connected tags
- **Top posts analysis** - See what's working
- **Demographics** - Country, age group, interests
- **Best posting times** - When to use each hashtag
- **Sentiment analysis** - Positive, neutral, or negative context
- **AI-generated strategies** - Platform-specific recommendations

---

### ⚡ Engagement Automator

Grow your presence on autopilot:

**Automation Rules:**
- Auto-reply to comments
- Auto-like posts matching criteria
- Auto-retweet relevant content
- Auto-follow users in your niche
- Mention response automation

**Intelligent Conditions:**
- Keyword and hashtag matching
- Follower count requirements
- Engagement thresholds
- Time window restrictions
- Verified account filtering
- Sentiment filtering

**Safety Features:**
- Rate limiting to prevent platform violations
- Cooldown periods between actions
- Daily/hourly action limits
- Opportunity scoring for relevance

---

### ✍️ Content Optimizer

Perfect your content for each platform:

- **Character limit adherence** - Never exceed platform limits
- **Optimal formatting** - Platform-specific best practices
- **Hashtag recommendations** - AI-suggested hashtags
- **Emoji optimization** - Right amount for each platform
- **Call-to-action optimization** - Improve conversion
- **Timing suggestions** - Best time to post
- **A/B variation generation** - Test multiple versions

---

### 📅 Content Calendar

Plan and visualize your content strategy:

- **Calendar view** - See all scheduled posts at a glance
- **Drag-and-drop scheduling** - Easy rescheduling
- **Multi-platform view** - All accounts in one place
- **Content queue** - Automated posting from queue
- **Approval workflows** - Team collaboration
- **Content versioning** - Track all changes
- **Template library** - Reusable content templates

---

## Enterprise Features

### 🔐 Security & Authentication

- **JWT Authentication** - Secure access tokens with refresh mechanism
- **API Key Management** - Generate and manage API keys with granular permissions
- **Session Management** - Multi-session support with device tracking
- **IP Reputation System** - Automatic blocking of suspicious IPs
- **Role-Based Access Control (RBAC):**
  - 4 roles: Admin, User, Viewer, API Client
  - 41 granular permissions
  - Role hierarchy and inheritance

### 🛡️ Compliance & Governance

- **GDPR Support** - Data export and right to be forgotten
- **Consent Management** - Track user consent preferences
- **Audit Logging** - Complete trail of all actions
- **Data Retention Policies** - Configurable retention periods
- **Privacy Policy Management** - Versioned policy tracking
- **Breach Notification** - Automated incident workflows

### 💾 Backup & Disaster Recovery

- **Automated Backups** - Full, incremental, and differential
- **Multi-destination Support** - S3, Google Cloud Storage, Azure
- **Point-in-Time Recovery (PITR)** - Restore to any moment
- **Backup Verification** - Integrity checking
- **Failover Automation** - Minimal downtime recovery
- **RTO/RPO Monitoring** - Meet your SLAs

### 📈 Monitoring & Performance

- **Prometheus Metrics** - Full observability stack
- **Health Checks** - Kubernetes liveness/readiness probes
- **Request Tracing** - Unique IDs for debugging
- **Performance Percentiles** - P50, P95, P99 tracking
- **AI Cost Analytics** - Per-user and per-workflow cost tracking

---

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **React Flow** - Visual workflow builder
- **Framer Motion** - Animations
- **Lucide React** - Icon library

### Backend
- **Express.js** - API framework
- **TypeScript** - Type safety
- **Bun/Node.js** - Runtime

### Databases
- **PostgreSQL 14** - Primary database
- **Redis 7** - Caching, rate limiting, job queues
- **Supabase** - Auth and vector storage
- **pgvector** - Vector embeddings

### AI/ML Services
- **Anthropic Claude** - Claude 3.5 Sonnet
- **Perplexity API** - Real-time research
- **OpenAI** - GPT-4 and embeddings

### Infrastructure
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Kubernetes-ready** - Health probes, scaling

---

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL 14+
- Redis 7+
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/thefixer3x/network-sync.git
   cd network-sync
   ```

2. **Install dependencies**
   ```bash
   # Backend
   npm install

   # Frontend
   cd web-interface
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Backend (.env)
   cp .env.example .env

   # Frontend (web-interface/.env.local)
   cp web-interface/.env.example web-interface/.env.local
   ```

4. **Set up the database**
   ```bash
   # Run migrations in Supabase SQL Editor
   # See migrations/ folder for SQL files
   ```

5. **Start the development servers**
   ```bash
   # Frontend (port 3000)
   cd web-interface
   npm run dev

   # Backend services (optional, for orchestration)
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

### Environment Variables

#### Backend (.env)
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# AI Services
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
PERPLEXITY_API_KEY=your_perplexity_key

# Redis
REDIS_URL=redis://localhost:6379

# Social Media APIs
TWITTER_API_KEY=your_twitter_key
TWITTER_API_SECRET=your_twitter_secret
LINKEDIN_CLIENT_ID=your_linkedin_id
LINKEDIN_CLIENT_SECRET=your_linkedin_secret
```

#### Frontend (web-interface/.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_SCHEMA=network_sync

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Project Structure

```
network-sync/
├── src/                          # Backend source code
│   ├── agents/                   # AI agents (Claude, Perplexity)
│   ├── orchestrator/             # Agent orchestration
│   ├── services/                 # Business logic services
│   ├── engine/                   # Automation engine
│   ├── storage/                  # Vector storage
│   ├── api/                      # REST API endpoints
│   ├── cli/                      # Command-line interface
│   └── types/                    # TypeScript types
│
├── web-interface/                # Frontend source code
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   ├── components/           # React components
│   │   │   ├── dashboard/        # Dashboard views
│   │   │   ├── workflow/         # Workflow builder
│   │   │   ├── auth/             # Authentication
│   │   │   └── ui/               # Reusable UI components
│   │   ├── contexts/             # React contexts
│   │   ├── hooks/                # Custom hooks
│   │   └── lib/                  # Utilities
│   └── public/                   # Static assets
│
├── migrations/                   # Database migrations
├── tests/                        # Test files
└── docker/                       # Docker configuration
```

---

## Available Scripts

### Backend
```bash
npm run dev          # Run development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run orchestrate  # Run AI orchestrator
npm run cli          # Interactive CLI
```

### Frontend
```bash
npm run dev          # Development server (port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

---

## API Overview

Network Sync provides 90+ REST API endpoints organized into modules:

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Workflows** | 12 | Workflow CRUD, versioning, execution |
| **Visual Workflows** | 10 | Visual builder API |
| **Content Management** | 17 | Content, templates, A/B testing |
| **Analytics** | 9 | Events, metrics, dashboards |
| **Security** | 15 | Auth, API keys, sessions, RBAC |
| **Compliance** | 11 | GDPR, audit, consent |
| **Backup** | 16 | Backup, restore, DR |
| **Context** | 14 | State management |
| **Cache** | 9 | Cache operations |
| **AI Cost** | 6 | Cost tracking |
| **Health** | 6 | Health checks, metrics |

Full API documentation available at `/api/docs` when running the server.

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [docs.networksync.io](https://docs.networksync.io)
- **Issues**: [GitHub Issues](https://github.com/thefixer3x/network-sync/issues)
- **Email**: support@networksync.io

---

<p align="center">
  <strong>Network Sync</strong> - Automate Your Social Media. Amplify Your Voice.
</p>
>>>>>>> 7140a1eb3553f076071ab3e8cd7141dc1bf5b1ad
