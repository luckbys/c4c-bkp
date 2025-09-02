# Deploy Script for CRM-C4 Application (PowerShell)
Write-Host "🚀 Starting deployment preparation for CRM-C4..." -ForegroundColor Green

# Check required files
Write-Host "📋 Checking required files..." -ForegroundColor Yellow
$files = @("Dockerfile", ".dockerignore", "package.json", "next.config.ts")
foreach ($file in $files) {
    if (!(Test-Path $file)) {
        Write-Host "❌ Required file $file not found!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ All required files found" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Run type check
Write-Host "🔍 Running type check..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Type check failed" -ForegroundColor Red
    exit 1
}

# Run build
Write-Host "🏗️  Testing build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host "🎉 Deployment preparation complete!" -ForegroundColor Green
Write-Host "📖 See DEPLOY.md for EasyPanel deployment instructions" -ForegroundColor Yellow