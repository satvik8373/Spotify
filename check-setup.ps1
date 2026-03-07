# AI Mood Playlist Setup Checker
# Run this script to verify your development environment

Write-Host "🔍 Checking AI Mood Playlist Setup..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "❌ Error: Run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project structure found" -ForegroundColor Green

# Check backend files
Write-Host "`n📦 Checking Backend..." -ForegroundColor Yellow

if (Test-Path "backend/.env") {
    Write-Host "  ✅ backend/.env exists" -ForegroundColor Green
    
    # Check for required env vars
    $backendEnv = Get-Content "backend/.env" -Raw
    
    if ($backendEnv -match "HUGGINGFACE_API_KEY") {
        Write-Host "  ✅ HUGGINGFACE_API_KEY configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  HUGGINGFACE_API_KEY not found" -ForegroundColor Yellow
    }
    
    if ($backendEnv -match "MOOD_PLAYLIST_ENABLED=true") {
        Write-Host "  ✅ MOOD_PLAYLIST_ENABLED=true" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  MOOD_PLAYLIST_ENABLED not set to true" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ backend/.env not found" -ForegroundColor Red
}

if (Test-Path "backend/src/routes/moodPlaylist.route.js") {
    Write-Host "  ✅ Mood playlist routes exist" -ForegroundColor Green
} else {
    Write-Host "  ❌ Mood playlist routes missing" -ForegroundColor Red
}

if (Test-Path "backend/src/services/moodPlaylist") {
    Write-Host "  ✅ Mood playlist services exist" -ForegroundColor Green
} else {
    Write-Host "  ❌ Mood playlist services missing" -ForegroundColor Red
}

# Check frontend files
Write-Host "`n🎨 Checking Frontend..." -ForegroundColor Yellow

if (Test-Path "frontend/.env.local") {
    Write-Host "  ✅ frontend/.env.local exists" -ForegroundColor Green
    
    $frontendEnv = Get-Content "frontend/.env.local" -Raw
    
    if ($frontendEnv -match "VITE_API_URL=http://localhost:5000") {
        Write-Host "  ✅ VITE_API_URL points to localhost" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  VITE_API_URL not configured for localhost" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  frontend/.env.local not found (will use .env)" -ForegroundColor Yellow
}

if (Test-Path "frontend/src/pages/MoodPlaylistPage.tsx") {
    Write-Host "  ✅ MoodPlaylistPage component exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ MoodPlaylistPage component missing" -ForegroundColor Red
}

if (Test-Path "frontend/src/components/MoodPlaylistGenerator.tsx") {
    Write-Host "  ✅ MoodPlaylistGenerator component exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ MoodPlaylistGenerator component missing" -ForegroundColor Red
}

if (Test-Path "frontend/src/services/moodPlaylistService.ts") {
    Write-Host "  ✅ Mood playlist service exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ Mood playlist service missing" -ForegroundColor Red
}

# Check if servers are running
Write-Host "`n🚀 Checking Running Servers..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  ✅ Node processes running: $($nodeProcesses.Count)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No Node processes found - servers not started" -ForegroundColor Yellow
}

# Try to check backend
Write-Host "`n🔌 Testing Backend Connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Backend responding on port 5000" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backend not responding on port 5000" -ForegroundColor Red
    Write-Host "     Run: cd backend && npm start" -ForegroundColor Gray
}

# Try to check frontend
Write-Host "`n🌐 Testing Frontend Connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Frontend responding on port 3000" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Frontend not responding on port 3000" -ForegroundColor Red
    Write-Host "     Run: cd frontend && npm run dev" -ForegroundColor Gray
}

# Summary
Write-Host "`n📋 Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Start backend:  cd backend && npm start" -ForegroundColor White
Write-Host "  2. Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "  3. Open browser:   http://localhost:3000/mood-playlist" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Yellow
Write-Host "  • START-DEVELOPMENT.md - Startup guide" -ForegroundColor White
Write-Host "  • test-mood-playlist.md - Testing guide" -ForegroundColor White
Write-Host "  • .kiro/specs/ai-mood-playlist-generator/USER-GUIDE.md - User guide" -ForegroundColor White

Write-Host "`n✨ Feature ready to use!" -ForegroundColor Green
Write-Host ""
