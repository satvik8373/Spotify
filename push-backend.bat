@echo off
REM Push Mavrixfy-web Backend to GitHub
REM Repository: https://github.com/satvik8373/Spotify.git

echo.
echo 🚀 Pushing Mavrixfy-web Backend Changes to GitHub...
echo.

REM Navigate to Mavrixfy-web directory
cd /d "%~dp0"

REM Check if we're in a git repository
if not exist ..\.git (
    echo ❌ Error: Not in a git repository
    echo Please run this from the Mavrixfy-web folder inside your git repo
    pause
    exit /b 1
)

REM Show what will be committed
echo 📊 Backend Changes:
echo.
git status --short backend/
echo.

REM Ask for confirmation
set /p confirm="Push these backend changes to GitHub? (y/n): "
if /i not "%confirm%"=="y" (
    echo ❌ Cancelled
    pause
    exit /b 0
)

REM Add backend changes
echo.
echo 📦 Adding backend changes...
git add backend/

REM Commit
echo 💾 Committing backend changes...
git commit -m "feat(backend): Add version API and fix JioSaavn playlists

Backend Changes:
- Add version API endpoints (/api/version/check, /api/version/compare)
- Add app-version.json configuration file
- Fix JioSaavn playlists to show all songs (pagination support)
- Add getCompletePlaylistDetails() function
- Update playlist routes to fetch all songs

Files Added:
- backend/app-version.json
- backend/src/routes/version.route.js

Files Modified:
- backend/src/index.js
- backend/src/services/jiosaavn.service.js
- backend/src/routes/jiosaavn.route.js"

REM Push to GitHub
echo 🚀 Pushing to GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ✅ Successfully pushed backend to GitHub!
    echo.
    echo 📋 Next Steps:
    echo 1. Wait for Vercel to deploy (1-2 minutes^)
    echo 2. Test API endpoints:
    echo    curl https://spotify-api-drab.vercel.app/api/version/check
    echo.
    echo 3. Test from mobile app:
    echo    cd ..\Mavrixfy_App
    echo    npm run test:api
    echo.
    echo 🔗 Repository: https://github.com/satvik8373/Spotify.git
    echo 🌐 Backend: https://spotify-api-drab.vercel.app
    echo.
) else (
    echo.
    echo ❌ Push failed!
    echo Check the error message above and try again.
    echo.
)

pause
