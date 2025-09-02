#!/bin/bash

# Deploy Script for CRM-C4 Application
# This script helps prepare and deploy the application

set -e

echo "🚀 Starting deployment preparation for CRM-C4..."

# Check if required files exist
echo "📋 Checking required files..."
required_files=("Dockerfile" ".dockerignore" "package.json" "next.config.ts")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file $file not found!"
        exit 1
    fi
done

echo "✅ All required files found"

# Check if .env.example exists and .env is configured
if [ ! -f ".env.example" ]; then
    echo "❌ .env.example not found!"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Please copy .env.example to .env and configure it."
    echo "   cp .env.example .env"
    echo "   # Then edit .env with your actual values"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run type check
echo "🔍 Running type check..."
npm run typecheck

# Run build to test
echo "🏗️  Testing build..."
npm run build

echo "✅ Build successful!"

# Test Docker build (optional)
read -p "🐳 Do you want to test Docker build? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🐳 Building Docker image..."
    docker build -t crm-c4:test .
    echo "✅ Docker build successful!"
fi

# Git operations
echo "📝 Preparing Git commit..."
git add .

if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
else
    read -p "💾 Commit message (default: 'Deploy configuration update'): " commit_msg
    commit_msg=${commit_msg:-"Deploy configuration update"}
    
    git commit -m "$commit_msg"
    echo "✅ Changes committed"
    
    read -p "🚀 Push to remote repository? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push
        echo "✅ Pushed to remote repository"
    fi
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. 🌐 Go to your EasyPanel dashboard"
echo "2. 📱 Create a new app or update existing one"
echo "3. 🔗 Connect your Git repository"
echo "4. ⚙️  Configure environment variables from .env.example"
echo "5. 🚀 Deploy!"
echo ""
echo "📖 For detailed instructions, see DEPLOY.md"
echo "🏥 Health check will be available at: /api/health"
echo "🔗 Webhook endpoint will be: /api/webhooks/evolution"