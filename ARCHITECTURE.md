# System Architecture

## Overview

```mermaid
graph TD
    A[CLI Interface] --> B[Automation Engine]
    B --> C[Agent Orchestator]
    C --> D[Perplexity Agent]
    C --> E[Claude Agent]
    C --> F[Embedding Agent]
    
    D --> G[Research Tasks]
    E --> H[Writing Tasks]
    F --> I[Embedding Tasks]
    
    C --> J[Vector Store]
    C --> K[Google Drive]
    
    B --> L[Social Media Services]
    L --> M[Twitter Service]
    L --> N[LinkedIn Service]
    L --> O[Facebook Service]
    L --> P[Instagram Service]
    
    B --> Q[AI Content Services]
    Q --> R[OpenAI Service]
    Q --> S[Content Optimizer]
    Q --> T[Trend Analyzer]
    Q --> U[Analytics Collector]
    
    V[Example Usage] --> B
    
    style D fill:#4285f4,stroke:#333
    style E fill:#fbbc04,stroke:#333
    style F fill:#ea4335,stroke:#333
    style R fill:#34a853,stroke:#333
```

## Component Descriptions

### Agents
- **Perplexity Agent**: Specialized for research and real-time data gathering
- **Claude Agent**: Specialized for content creation and analysis
- **Embedding Agent**: Specialized for vector embeddings and semantic search

### Core Services
- **Agent Orchestrator**: Routes tasks to the most appropriate agent based on capabilities
- **Automation Engine**: Manages scheduling and automated workflows
- **Vector Store**: Supabase-based storage for semantic search capabilities
- **Google Drive**: Storage for reports and documents

### Social Media Services
- **Twitter Service**: Integration with Twitter API
- **LinkedIn Service**: Integration with LinkedIn API
- **Facebook Service**: Integration with Facebook API
- **Instagram Service**: Integration with Instagram API

### AI Content Services
- **OpenAI Service**: Content generation using GPT models
- **Content Optimizer**: Platform-specific content optimization
- **Trend Analyzer**: Analysis of trending topics
- **Analytics Collector**: Collection and analysis of platform metrics

### Interfaces
- **CLI Interface**: Command-line tools for system management
- **Example Usage**: Demonstration of system capabilities
