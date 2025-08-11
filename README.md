# Social Media Automation System

An advanced multi-agent orchestration system for social media automation, leveraging specialized AI agents for research, content creation, and platform management.

## 🏗️ Project Structure

```
src/
├── agents/                 # Specialized AI agents
│   ├── perplexity-agent.ts # Research and real-time data agent
│   └── claude-agent.ts     # Writing and analysis agent
├── orchestrator/           # Agent orchestration system
│   └── agent-orchestrator.ts
├── services/               # Platform and AI services
│   ├── social-media-services.ts
│   └── ai-content-services.ts
├── engine/                 # Automation engine
│   └── automation-engine.ts
├── storage/                # Data storage solutions
│   └── vector-store.ts
├── cli/                    # Command-line interface
│   └── cli-interface.ts
├── types/                  # TypeScript types and schemas
│   └── typescript-types.ts
├── utils/                  # Utility functions
├── example-usage.ts        # Usage examples
```

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. Run the demo:
   ```bash
   bun run demo
   ```

## 📦 Dependencies

- **AI Services**: OpenAI, Perplexity, Anthropic (Claude)
- **Database**: Supabase (Vector storage)
- **Social Platforms**: Twitter, LinkedIn, Facebook, Instagram
- **Utilities**: Zod (validation), Node-cron (scheduling)

## 🧠 System Architecture

The system uses a multi-agent approach where different AI models are specialized for specific tasks:

- **Perplexity Agent**: Research and real-time data gathering
- **Claude Agent**: Content creation and analysis
- **Orchestrator**: Routes tasks to the most appropriate agent
- **Automation Engine**: Schedules and manages automated workflows

## 🛠️ Available Scripts

- `bun run dev` - Run development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run test` - Run tests
- `bun run demo` - Run demonstration
- `bun run orchestrate` - Run orchestrator

## 📊 Features

- Multi-platform social media management
- AI-powered content generation
- Automated scheduling
- Trend analysis
- Competitor monitoring
- Analytics collection
- Vector storage for semantic search

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the MIT License.
