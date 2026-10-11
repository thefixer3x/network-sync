#!/bin/bash
# Fixes the web-interface ESLint/TypeScript toolchain.
# Package manager: bun (see web-interface/package.json "packageManager").

set -e

echo "🔧 Fixing web-interface ESLint configuration..."

cd web-interface

if ! command -v bun &> /dev/null; then
    echo "❌ bun is required but was not found on PATH."
    echo "   Install it with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "📦 Installing dependencies..."
bun install

echo "✅ Dependencies installed!"

echo "🧹 Running lint check..."
bun run lint

echo "🔨 Running type check..."
bun run type-check

echo "🏗️  Running build..."
bun run build

echo "✅ Web interface configuration fixed!"
