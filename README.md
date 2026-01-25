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
