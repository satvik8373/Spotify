@echo off
echo Starting development environment...
echo Backend will run on http://localhost:5000
echo Frontend will run on http://localhost:3000
echo CORS is configured for localhost only

:: Set environment variables
set FRONTEND_URL=http://localhost:3000
set NODE_ENV=development

:: Start the backend and frontend in separate windows
start cmd /k "cd backend && npm run dev"
start cmd /k "cd frontend && npm run dev"

echo Development servers started. Both windows must be closed manually when finished. 