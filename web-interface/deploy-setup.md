# Deployment Setup Guide

## 🚀 Quick Deployment Options

### Option 1: Deploy to Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**
   ```bash
   cd web-interface
   vercel
   ```

4. **Set Environment Variables in Vercel Dashboard**
   - Go to your project dashboard
   - Click "Settings" → "Environment Variables"
   - Add all variables from `.env.example`

5. **Redeploy with Environment Variables**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy to Netlify

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Deploy from your project directory**
   ```bash
   cd web-interface
   netlify deploy --build
   ```

4. **Set Environment Variables**
   ```bash
   # Set each variable
   netlify env:set SUPABASE_URL "your-supabase-url"
   netlify env:set SUPABASE_ANON_KEY "your-supabase-key"
   # ... add all other variables
   ```

5. **Deploy to Production**
   ```bash
   netlify deploy --prod --build
   ```

## 📋 Pre-Deployment Checklist

### 1. Database Setup (Supabase)

Create these tables in your Supabase database:

```sql
-- Social Accounts Table
CREATE TABLE social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_image TEXT,
  status TEXT DEFAULT 'connected',
  followers INTEGER DEFAULT 0,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  credentials JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflows Table
CREATE TABLE workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Content Queue Table
CREATE TABLE content_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Table
CREATE TABLE analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES social_accounts(id),
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. API Keys Required

Make sure you have all these API keys:

- **Supabase**: URL + Anon Key + Service Role Key
- **OpenAI**: API Key for content generation
- **Claude**: API Key (optional) for premium content
- **Perplexity**: API Key for research
- **Twitter**: API Key, Secret, Access Token, Access Secret
- **LinkedIn**: Client ID, Client Secret
- **Facebook**: App ID, App Secret
- **Instagram**: Client ID, Client Secret

### 3. OAuth Callback URLs

Set these callback URLs in your social media app settings:

- **Twitter**: `https://your-domain.com/api/auth/twitter/callback`
- **LinkedIn**: `https://your-domain.com/api/auth/linkedin/callback`
- **Facebook**: `https://your-domain.com/api/auth/facebook/callback`
- **Instagram**: `https://your-domain.com/api/auth/instagram/callback`

## 🔧 Environment Variables Reference

```bash
# Core Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-32-char-secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
OPENAI_API_KEY=sk-your-openai-key
CLAUDE_API_KEY=your-claude-key
PERPLEXITY_API_KEY=your-perplexity-key

# Twitter/X
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret

# LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Instagram
INSTAGRAM_CLIENT_ID=your-instagram-client-id
INSTAGRAM_CLIENT_SECRET=your-instagram-client-secret
```

## 📱 Post-Deployment Setup

### 1. Test the Application

1. Visit your deployed URL
2. Create an account
3. Connect a social media account
4. Create a simple workflow
5. Verify everything works

### 2. Set up Monitoring

Add these optional monitoring services:

- **Sentry** for error tracking
- **LogRocket** for user session replay
- **Uptime Robot** for uptime monitoring

### 3. Configure Webhooks (Optional)

If you want real-time updates, set up webhooks:

```bash
# Add webhook endpoints in your platform settings
POST /api/webhooks/twitter
POST /api/webhooks/linkedin
POST /api/webhooks/facebook
POST /api/webhooks/instagram
```

## 🔒 Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Configure CORS properly for your domain
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Validation**: Validate all user inputs
6. **Database Security**: Use RLS (Row Level Security) in Supabase

## 📊 Performance Optimization

1. **Caching**: Implement Redis caching for frequently accessed data
2. **CDN**: Use Vercel's or Netlify's CDN for static assets
3. **Database Indexes**: Add indexes for frequently queried fields
4. **API Optimization**: Implement pagination and data limiting

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails**: Check Node.js version (use 18+)
2. **Database Connection**: Verify Supabase credentials
3. **API Errors**: Check environment variables are set
4. **OAuth Issues**: Verify callback URLs in platform settings
5. **CORS Errors**: Check API route configurations

### Debug Commands:

```bash
# Check build locally
npm run build

# Verify environment variables
vercel env ls  # or netlify env:list

# Check logs
vercel logs   # or netlify dev --live
```

## 📞 Support

If you encounter issues:

1. Check the deployment logs
2. Verify all environment variables are set
3. Test API endpoints individually
4. Check social media platform API documentation
5. Review Supabase database logs

Your social media automation platform should now be live and ready to use! 🎉