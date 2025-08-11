# Social Media Automation Platform - Web Interface

A modern, responsive web interface for managing your AI-powered social media automation system.

## 🚀 Features

### ✅ Core Features
- **Dashboard Overview** - Real-time metrics and system status
- **Social Account Management** - Connect and manage multiple platforms
- **Workflow Manager** - Create and manage automation workflows
- **Analytics Dashboard** - Performance tracking and insights
- **Content Calendar** - Schedule and manage content
- **Real-time Monitoring** - Live system monitoring and logs

### 🔐 Authentication
- Secure login/signup with Supabase Auth
- Social login (Google, GitHub)
- Password reset functionality
- Protected routes and role-based access

### 🎨 Modern UI/UX
- Responsive design (mobile-first)
- Dark/light mode support
- Smooth animations with Framer Motion
- Beautiful charts and visualizations
- Intuitive drag-and-drop interfaces

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **State Management**: React Query + Context API
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **Notifications**: React Hot Toast

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd web-interface
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your environment variables (see Environment Variables section)

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Environment Variables

Create a `.env.local` file with these variables:

```bash
# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Services
OPENAI_API_KEY=your-openai-key
CLAUDE_API_KEY=your-claude-key
PERPLEXITY_API_KEY=your-perplexity-key

# Social Media APIs
TWITTER_API_KEY=your-twitter-key
TWITTER_API_SECRET=your-twitter-secret
LINKEDIN_CLIENT_ID=your-linkedin-id
LINKEDIN_CLIENT_SECRET=your-linkedin-secret
FACEBOOK_APP_ID=your-facebook-id
FACEBOOK_APP_SECRET=your-facebook-secret
INSTAGRAM_CLIENT_ID=your-instagram-id
INSTAGRAM_CLIENT_SECRET=your-instagram-secret
```

## 📊 Database Schema

The application requires these Supabase tables:

```sql
-- Users are managed by Supabase Auth automatically

-- Social Accounts
CREATE TABLE social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_image TEXT,
  status TEXT DEFAULT 'connected',
  followers INTEGER DEFAULT 0,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  credentials JSONB, -- Encrypted in production
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflows
CREATE TABLE workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'paused',
  type TEXT NOT NULL,
  schedule JSONB NOT NULL,
  platforms TEXT[] DEFAULT '{}',
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  total_runs INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Queue
CREATE TABLE content_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics
CREATE TABLE analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their own social accounts" ON social_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own workflows" ON workflows
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own content" ON content_queue
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own analytics" ON analytics
  FOR ALL USING (auth.uid() = user_id);
```

## 🚀 Deployment

### Option 1: Vercel (Recommended)

1. **Connect to Vercel**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

2. **Set Environment Variables**
   - Go to Vercel dashboard
   - Add all environment variables from `.env.example`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Netlify

1. **Connect to Netlify**
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify init
   ```

2. **Configure Environment**
   ```bash
   netlify env:set SUPABASE_URL "your-url"
   # Add all other environment variables
   ```

3. **Deploy**
   ```bash
   netlify deploy --build --prod
   ```

## 📱 Key Components

### Dashboard Structure
```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Main dashboard components
│   ├── ui/               # Reusable UI components
│   └── providers/        # Context providers
├── contexts/             # React contexts
├── hooks/                # Custom hooks
└── types/                # TypeScript types
```

### Main Features

1. **Social Account Linking**
   - OAuth integration for Twitter, LinkedIn, Facebook, Instagram
   - Account status monitoring
   - Credential management
   - Real-time sync status

2. **Workflow Management**
   - Visual workflow builder
   - Schedule configuration
   - Performance tracking
   - Real-time status updates

3. **Analytics Dashboard**
   - Performance metrics
   - Growth tracking
   - Engagement analytics
   - Custom date ranges

4. **Content Management**
   - Content calendar view
   - Scheduling interface
   - Preview and editing
   - Multi-platform optimization

## 🔍 API Endpoints

```typescript
// Social Accounts
GET    /api/social/accounts
POST   /api/social/connect
DELETE /api/social/accounts/[id]

// Workflows
GET    /api/workflows
POST   /api/workflows
PUT    /api/workflows/[id]
POST   /api/workflows/[id]/toggle
DELETE /api/workflows/[id]

// Analytics
GET    /api/analytics
GET    /api/analytics/[platform]

// Content
GET    /api/content
POST   /api/content
PUT    /api/content/[id]
DELETE /api/content/[id]
```

## 🔧 Customization

### Adding New Social Platforms

1. **Update types** in `src/types/index.ts`
2. **Add platform config** in `ConnectAccountModal.tsx`
3. **Create OAuth handler** in `src/app/api/auth/[platform]/`
4. **Update UI components** with platform-specific styling

### Custom Themes

Modify `tailwind.config.js` to add your brand colors:

```js
theme: {
  extend: {
    colors: {
      primary: {
        // Your brand colors
      }
    }
  }
}
```

## 📈 Performance Optimization

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic with Next.js
- **Caching**: React Query for API caching
- **Database**: Supabase with proper indexing
- **CDN**: Automatic with Vercel/Netlify

## 🔒 Security Features

- **Authentication**: Secure JWT tokens via Supabase
- **Authorization**: Row-level security (RLS)
- **API Protection**: Rate limiting and validation
- **Data Encryption**: Credentials encrypted at rest
- **HTTPS**: Enforced in production
- **CORS**: Proper CORS configuration

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   rm -rf .next node_modules
   npm install
   npm run build
   ```

2. **Environment Variables**
   ```bash
   # Check if variables are loaded
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
   ```

3. **Database Connection**
   ```bash
   # Test Supabase connection
   npm run db:test
   ```

4. **Authentication Issues**
   - Check Supabase URL and keys
   - Verify redirect URLs in Supabase dashboard
   - Ensure RLS policies are correct

## 📞 Support

For issues and questions:

1. Check the [deployment guide](./deploy-setup.md)
2. Review environment variables
3. Check browser console for errors
4. Verify database schema and RLS policies

## 📄 License

This project is licensed under the MIT License.

---

Ready to automate your social media presence? 🚀