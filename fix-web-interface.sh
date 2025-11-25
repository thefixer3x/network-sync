#!/bin/bash

echo "🔧 Fixing web-interface ESLint configuration..."

cd web-interface

echo "📦 Installing TypeScript ESLint dependencies..."
# Try different package managers
if command -v bun &> /dev/null; then
    bun install
elif command -v npm &> /dev/null; then
    npm install
elif command -v yarn &> /dev/null; then
    yarn install
else
    echo "❌ No package manager found. Please install dependencies manually:"
    echo "   cd web-interface"
    echo "   bun install  # or npm install"
    exit 1
fi

echo "✅ Dependencies installed!"

echo "🧹 Running lint check..."
if command -v bun &> /dev/null; then
    bun run lint
elif command -v npm &> /dev/null; then
    npm run lint
elif command -v yarn &> /dev/null; then
    yarn lint
fi

echo "🔨 Running type check..."
if command -v bun &> /dev/null; then
    bun run type-check
elif command -v npm &> /dev/null; then
    npm run type-check
elif command -v yarn &> /dev/null; then
    yarn type-check
fi

echo "🏗️  Running build..."
if command -v bun &> /dev/null; then
    bun run build
elif command -v npm &> /dev/null; then
    npm run build
elif command -v yarn &> /dev/null; then
    yarn build
fi

echo "✅ Web interface configuration fixed!"
