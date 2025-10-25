# Deployment Instructions

## Issue
The Vercel project is linked to the root directory, but the Next.js app is in `web-interface/`. 
This causes the build to fail with: "The file '/vercel/path0/.next/routes-manifest.json' couldn't be found"

## Solution

### Option 1: Deploy from web-interface directory (Easiest)

Always deploy from the web-interface directory:

```bash
cd web-interface
vercel --prod
```

The `web-interface/.vercel/` folder is already linked to the correct project.

### Option 2: Update Root Project Settings (via Dashboard)

If you want to deploy from the root directory:

1. Go to: https://vercel.com/onasis-team/network-sync/settings/general
2. Scroll to "Root Directory"
3. Set it to: `web-interface`
4. Click "Save"
5. Then you can deploy from root: `vercel --prod`

### Option 3: Update via CLI

Update the project settings programmatically:

```bash
# From root directory
vercel pull
# Edit .vercel/project.json manually to set rootDirectory: "web-interface"
# Then deploy
vercel --prod
```

## Current Working Configuration

**From web-interface directory:**
```bash
cd web-interface
vercel dev          # Local development
vercel              # Deploy to preview
vercel --prod       # Deploy to production
```

## Project Structure

```
social-network-sync/              ← Root (has backend code)
├── .vercel/                      ← Root-level link (causes issues)
├── vercel.json                   ← Minimal config
├── package.json                  ← Backend dependencies
│
└── web-interface/                ← Next.js app location
    ├── .vercel/                  ← Correct link (use this)
    ├── package.json              ← Frontend dependencies
    ├── next.config.js
    └── src/
```

## Why This Happens

Vercel linked to the root directory first, so it expects to find a Next.js app there. 
Since your Next.js app is in `web-interface/`, you must either:
- Always deploy from `web-interface/` directory
- Configure Vercel's root directory setting to `web-interface`

## Recommended Workflow

**Always work from web-interface:**
```bash
cd web-interface

# Development
bun install
bun run dev
# or
vercel dev

# Deployment
vercel --prod
```

This ensures Vercel builds from the correct location.
