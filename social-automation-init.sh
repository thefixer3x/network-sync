#!/bin/bash

# Social Media Automation - Project Initialization
echo "🚀 Initializing Social Media Automation System..."

# Create project structure
mkdir -p social-media-automation/{src,cli,dashboard,types,utils,services,config}
cd social-media-automation

# Initialize package.json with modern dependencies
cat > package.json << 'EOF'
{
  "name": "social-media-automation",
  "version": "1.0.0",
  "description": "Advanced social media automation system",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/index.js",
    "cli": "tsx cli/index.ts",
    "dashboard": "vite dev",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "openai": "^4.24.1",
    "tweepy-js": "^1.0.0",
    "linkedin-api-js-client": "^1.0.0",
    "node-cron": "^3.0.3",
    "axios": "^1.6.2",
    "zod": "^3.22.4",
    "date-fns": "^3.0.6",
    "commander": "^11.1.0",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.12"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/node-cron": "^3.0.11",
    "typescript": "^5.3.3",
    "tsx": "^4.6.2",
    "tsc-alias": "^1.8.8",
    "vite": "^5.0.10",
    "vitest": "^1.1.0",
    "tailwindcss": "^3.4.0",
    "react": "^18.2.0",
    "@types/react": "^18.2.45"
  }
}
EOF

# Create TypeScript configuration
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/types/*": ["types/*"],
      "@/utils/*": ["utils/*"],
      "@/services/*": ["services/*"],
      "@/config/*": ["config/*"]
    },
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src", "cli", "types", "utils", "services", "config"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create environment template
cat > .env.example << 'EOF'
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Social Media APIs
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token

FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token

# AI Services
OPENAI_API_KEY=your_openai_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# Configuration
NODE_ENV=development
PORT=3000
AUTOMATION_ENABLED=true
DEFAULT_TIMEZONE=America/New_York
EOF

echo "✅ Project structure created"
echo "📦 Run 'npm install' to install dependencies"
echo "🔧 Copy .env.example to .env and configure your API keys"