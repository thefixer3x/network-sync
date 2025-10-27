# Memory SDK Publishing Guide

## ✅ Verification Checklist

Based on your successful `@lanonasis/memory-client` v1.0.0 publication, here's everything verified:

### Git Tags ✅
```bash
✓ Tag created: v1.0.0
✓ Tag pushed to remote: https://github.com/lanonasis/lanonasis-maas.git
✓ Commit: b40f2064ae3abe385759ea720a564d54d4c14120
```

### GitHub Release ✅
```bash
✓ Release created: "memory-client v1.0.0"
✓ Asset uploaded: lanonasis-memory-client-1.0.0.tgz (27.6 KB)
✓ URL: https://github.com/lanonasis/lanonasis-maas/releases/tag/v1.0.0
```

### npm Publication ✅
```bash
✓ Package: @lanonasis/memory-client@1.0.0
✓ Registry: https://registry.npmjs.org/
✓ Tarball: 154.2 KB
✓ Published: Successfully 20 hours ago
```

**YOUR PROCESS WAS CORRECT!** 🎉

---

## 📦 Publishing social-network-sync Memory SDK

The SDK in `lib/memory-sdk/` is ready to publish. Here's how to do it:

### Package Details

```json
{
  "name": "@lanonasis/memory-sdk-standalone",
  "version": "1.0.0",
  "description": "Standalone Memory SDK - drop into any project"
}
```

**Files to Publish:**
- ✅ `lanonasis-memory-sdk.cjs` (71 KB)
- ✅ `lanonasis-memory-sdk.js` (70 KB)
- ✅ `types.d.ts`
- ✅ `README.md`
- ✅ `example.js`
- ✅ Source maps

---

## 🚀 Step-by-Step Publishing Process

### 1. Pre-Publishing Verification

```bash
cd /Users/seyederick/DevOps/_project_folders/social-network-sync

# Check package.json
cat lib/memory-sdk/package.json

# Verify build files exist
ls -lh lib/memory-sdk/lanonasis-memory-sdk.*

# Test the SDK locally
cd lib/memory-sdk
bun example.js  # or node example.js
```

### 2. Create Git Tag for social-network-sync

```bash
cd /Users/seyederick/DevOps/_project_folders/social-network-sync

# Stage the updated package.json
git add lib/memory-sdk/package.json

# Commit
git commit -m "chore: prepare memory-sdk v1.0.0 for publication

- Update package.json with publishing config
- Add repository and homepage URLs
- Configure dual registry (npm + GitHub Packages)
- Specify explicit file list for publishing"

# Create annotated tag
git tag -a v1.0.0 -m "Release: @lanonasis/memory-sdk-standalone v1.0.0

Initial public release of standalone memory SDK.

Features:
- Multi-modal memory storage and retrieval
- Semantic search capabilities
- Drop-in integration for any project
- Full TypeScript support
- CJS and ESM builds

Package: @lanonasis/memory-sdk-standalone
Registry: npm + GitHub Packages"

# Push commit and tag
git push origin main
git push origin v1.0.0
```

### 3. Verify Tag Pushed Correctly

```bash
# Check local tags
git tag -l

# Check remote tags
git ls-remote --tags origin

# Verify tag details
git show v1.0.0
```

**Expected Output:**
```
tag v1.0.0
Tagger: Your Name <your.email@example.com>
Date:   <timestamp>

Release: @lanonasis/memory-sdk-standalone v1.0.0
...
```

### 4. Create GitHub Release

```bash
# Using GitHub CLI
gh release create v1.0.0 \
  --title "@lanonasis/memory-sdk-standalone v1.0.0" \
  --notes "## 🎉 Initial Release

### Features
- ✅ Multi-modal memory storage and retrieval
- ✅ Semantic search with vector embeddings
- ✅ Drop-in integration for any Node.js/Bun project
- ✅ Full TypeScript support with type definitions
- ✅ Dual build: CommonJS and ESM
- ✅ Source maps included

### Installation

\`\`\`bash
# npm
npm install @lanonasis/memory-sdk-standalone

# bun
bun add @lanonasis/memory-sdk-standalone

# yarn
yarn add @lanonasis/memory-sdk-standalone
\`\`\`

### Quick Start

\`\`\`typescript
import { MemorySDK } from '@lanonasis/memory-sdk-standalone';

const sdk = new MemorySDK({
  apiKey: process.env.LANONASIS_API_KEY
});

// Store memory
await sdk.createMemory({
  title: 'Project Requirements',
  content: 'Build a social media dashboard...',
  type: 'project'
});

// Search memories
const results = await sdk.searchMemories({
  query: 'dashboard requirements',
  limit: 10
});
\`\`\`

### Package Details
- **Size**: ~70 KB (minified)
- **Dependencies**: Minimal
- **Node**: >=18.0.0
- **License**: MIT

### Links
- 📚 [Documentation](https://docs.lanonasis.com/sdk)
- 🐛 [Report Issues](https://github.com/thefixer3x/network-sync/issues)
- 💬 [Discussions](https://github.com/thefixer3x/network-sync/discussions)" \
  lib/memory-sdk/lanonasis-memory-sdk.cjs#lanonasis-memory-sdk.cjs \
  lib/memory-sdk/lanonasis-memory-sdk.js#lanonasis-memory-sdk.js \
  lib/memory-sdk/types.d.ts#types.d.ts \
  lib/memory-sdk/README.md#README.md

# Or create via web UI:
# https://github.com/thefixer3x/network-sync/releases/new
```

### 5. Publish to npm

```bash
cd /Users/seyederick/DevOps/_project_folders/social-network-sync/lib/memory-sdk

# Login to npm (if not already)
npm login

# Dry run first (verify what will be published)
npm publish --dry-run

# Review the output - it should show:
# - lanonasis-memory-sdk.cjs
# - lanonasis-memory-sdk.js
# - types.d.ts
# - README.md
# - example.js
# - *.map files

# Publish for real
npm publish --access public

# Verify publication
npm view @lanonasis/memory-sdk-standalone
```

### 6. Publish to GitHub Packages (Optional)

```bash
cd /Users/seyederick/DevOps/_project_folders/social-network-sync/lib/memory-sdk

# Create .npmrc for GitHub Packages
echo "@lanonasis:registry=https://npm.pkg.github.com" > .npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc

# Publish
npm publish --registry=https://npm.pkg.github.com

# Clean up
rm .npmrc
```

---

## 🔄 Using the Published Dual Registry Script

If you want to automate publishing to both registries (like your successful script):

```bash
# Create publish script
cat > lib/memory-sdk/scripts/publish.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PACKAGE_DIR"

# Verify environment
if [[ -z "${NPM_TOKEN:-}" ]]; then
  echo "❌ NPM_TOKEN required"
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "❌ GITHUB_TOKEN required"
  exit 1
fi

# Publish to npm
echo "📦 Publishing to npm..."
cat <<NPMRC > .npmrc.tmp
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
NPMRC
npm publish --userconfig .npmrc.tmp --access public
rm .npmrc.tmp

# Publish to GitHub Packages
echo "📦 Publishing to GitHub Packages..."
cat <<GHRC > .npmrc.tmp
@lanonasis:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
GHRC
npm publish --userconfig .npmrc.tmp --registry https://npm.pkg.github.com
rm .npmrc.tmp

echo "✅ Published to both registries!"
EOF

chmod +x lib/memory-sdk/scripts/publish.sh

# Run it
NPM_TOKEN=your_npm_token GITHUB_TOKEN=your_gh_token \
  lib/memory-sdk/scripts/publish.sh
```

---

## ✅ Verification After Publishing

### Check npm
```bash
npm view @lanonasis/memory-sdk-standalone

# Should show:
# @lanonasis/memory-sdk-standalone@1.0.0 | MIT | ...
```

### Check GitHub Packages
```bash
npm view @lanonasis/memory-sdk-standalone --registry=https://npm.pkg.github.com
```

### Test Installation
```bash
# Create test directory
mkdir /tmp/test-sdk && cd /tmp/test-sdk
npm init -y

# Install from npm
npm install @lanonasis/memory-sdk-standalone

# Verify
node -e "const sdk = require('@lanonasis/memory-sdk-standalone'); console.log('✅ SDK loaded')"
```

---

## 📊 Package Comparison

| Package | Registry | Version | Size | Status |
|---------|----------|---------|------|--------|
| `@lanonasis/memory-client` | npm + GitHub | 1.0.0 | 154 KB | ✅ Published |
| `@lanonasis/memory-sdk-standalone` | Pending | 1.0.0 | ~70 KB | Ready |

---

## 🐛 Common Issues & Solutions

### Issue: Tag already exists
```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0

# Recreate and push
git tag -a v1.0.0 -m "Your message"
git push origin v1.0.0
```

### Issue: npm publish fails with "You cannot publish over the previously published versions"
```bash
# Bump version
npm version patch  # 1.0.0 -> 1.0.1
# or
npm version minor  # 1.0.0 -> 1.1.0
# or manually edit package.json

# Retry publish
npm publish --access public
```

### Issue: GitHub Packages authentication fails
```bash
# Verify token has write:packages scope
gh auth status

# Re-authenticate
gh auth login --scopes write:packages
```

### Issue: Files missing from package
```bash
# Check what will be published
npm pack --dry-run

# Verify "files" array in package.json
# Make sure all required files are listed
```

---

## 📝 Post-Publication Tasks

### 1. Update Documentation
- ✅ Update README with installation instructions
- ✅ Add badge: `[![npm version](https://badge.fury.io/js/%40lanonasis%2Fmemory-sdk-standalone.svg)](https://www.npmjs.com/package/@lanonasis/memory-sdk-standalone)`
- ✅ Link to npm package page
- ✅ Add usage examples

### 2. Announce Release
- 📢 GitHub Discussions
- 📢 Twitter/X
- 📢 Dev.to article
- 📢 Reddit (r/javascript, r/node)

### 3. Monitor
- 📊 npm downloads: `npm view @lanonasis/memory-sdk-standalone`
- 🐛 GitHub issues
- ⭐ GitHub stars

---

## 🔄 Future Release Process

For subsequent releases (v1.1.0, v1.2.0, etc.):

```bash
# 1. Make changes
# 2. Update version
npm version minor  # or patch/major

# 3. Commit and tag
git add .
git commit -m "Release v1.1.0"
git tag -a v1.1.0 -m "Release notes..."

# 4. Push
git push origin main --tags

# 5. Create GitHub release
gh release create v1.1.0 ...

# 6. Publish
npm publish --access public
```

---

## 📚 Reference: Your Successful Process

What you did for `@lanonasis/memory-client` v1.0.0:

```bash
✅ Created tag: git tag v1.0.0
✅ Pushed tag: git push origin v1.0.0
✅ Created GitHub release with asset
✅ Published to npm: npm publish
✅ Published to GitHub Packages
```

**Result**: Package successfully available at:
- npm: https://www.npmjs.com/package/@lanonasis/memory-client
- GitHub: https://github.com/lanonasis/lanonasis-maas/releases/tag/v1.0.0

---

## 🎯 Ready to Publish?

Your memory SDK is production-ready. Follow the steps above to publish `@lanonasis/memory-sdk-standalone` v1.0.0!

**Summary Command:**
```bash
cd /Users/seyederick/DevOps/_project_folders/social-network-sync
git add lib/memory-sdk/package.json
git commit -m "chore: prepare memory-sdk v1.0.0 for publication"
git tag -a v1.0.0 -m "Release: @lanonasis/memory-sdk-standalone v1.0.0"
git push origin main --tags
gh release create v1.0.0 --generate-notes
cd lib/memory-sdk && npm publish --access public
```

Good luck! 🚀
