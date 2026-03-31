# Vercel Environment Variables Setup Script (PowerShell)
# This script helps you quickly add all required environment variables to Vercel
# 
# Prerequisites:
# 1. Install Vercel CLI: npm i -g vercel
# 2. Login: vercel login
# 3. Link project: vercel link
#
# Usage: .\setup-vercel-env.ps1

Write-Host "🚀 Setting up Vercel Environment Variables" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
$vercelExists = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelExists) {
    Write-Host "❌ Vercel CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm i -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Vercel CLI found" -ForegroundColor Green
Write-Host ""

# Resolve env file path
$envFile = if ($args.Count -gt 0 -and $args[0]) { $args[0] } else { ".env" }
if (-not (Test-Path $envFile)) {
    if (Test-Path "vercel-env-detailed.example") {
        $envFile = "vercel-env-detailed.example"
        Write-Host "ℹ️  .env not found, using $envFile" -ForegroundColor Cyan
    } else {
        Write-Host "❌ .env file not found in current directory" -ForegroundColor Red
        Write-Host "   Please run this script from the backend directory" -ForegroundColor Yellow
        Write-Host "   Or pass a file path: .\setup-vercel-env.ps1 your-file.env" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "📝 Reading $envFile..." -ForegroundColor Cyan
Write-Host ""

# Read .env file
$envContent = Get-Content $envFile

# Variables to skip
$skipVars = @("GOOGLE_APPLICATION_CREDENTIALS")

foreach ($line in $envContent) {
    # Skip comments and empty lines
    if ($line -match "^\s*#" -or $line -match "^\s*$") {
        continue
    }
    
    # Parse key=value
    if ($line -match "^([^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Remove quotes
        $value = $value -replace '^"', '' -replace '"$', '' -replace "^'", "" -replace "'$", ""
        
        # Skip certain variables
        if ($skipVars -contains $key) {
            Write-Host "⏭️  Skipping $key (not needed in Vercel)" -ForegroundColor Gray
            continue
        }
        
        # Skip empty values
        if ([string]::IsNullOrWhiteSpace($value)) {
            Write-Host "⏭️  Skipping $key (empty value)" -ForegroundColor Gray
            continue
        }
        
        Write-Host "➕ Adding $key..." -ForegroundColor Yellow
        
        # Add to Vercel (using echo to pipe value)
        $value | vercel env add $key production --force 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Added successfully" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Failed to add" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Environment variables setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify variables in Vercel dashboard" -ForegroundColor White
Write-Host "2. Deploy: vercel --prod" -ForegroundColor White
Write-Host "3. Test endpoints with: node test-vercel-deployment.js" -ForegroundColor White
Write-Host ""
