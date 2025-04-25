@echo off
echo Starting Spotify Clone Development Environment...
echo.
echo Backend will run on http://localhost:5000
echo Frontend will run on http://localhost:3000
echo.
echo CORS is configured for localhost with credentials support
echo.

:: Set environment variables
set FRONTEND_URL=http://localhost:3000
set NODE_ENV=development

:: Create a .env.local if it doesn't exist (for frontend)
if not exist "frontend\.env.local" (
  echo Creating frontend/.env.local file...
  echo VITE_API_URL=http://localhost:5000/api> frontend\.env.local
  echo VITE_CLERK_PUBLISHABLE_KEY=pk_test_c2V0LXRvdWNhbi0xMS5jbGVyay5hY2NvdW50cy5kZXYk>> frontend\.env.local
  echo.
)

:: Start the backend and frontend in separate windows
echo Starting backend server...
start cmd /k "cd backend && npm run dev"

:: Wait a moment for backend to start
timeout /t 2 > nul

echo Starting frontend development server...
start cmd /k "cd frontend && npm run dev"

echo.
echo Development servers started! Both windows must be closed manually when finished.
echo.
echo If you encounter any CORS issues:
echo 1. Check that both servers are running
echo 2. Verify that the backend CORS configuration accepts requests from http://localhost:3000
echo 3. Ensure the frontend is using the correct API URL (http://localhost:5000/api)
echo. 