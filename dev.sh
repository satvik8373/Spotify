#!/bin/bash

# Set environment variables
export FRONTEND_URL=http://localhost:3000
export NODE_ENV=development

# Start the backend and frontend concurrently
echo "Starting development environment..."
echo "Backend will run on http://localhost:5000"
echo "Frontend will run on http://localhost:3000"
echo "CORS is configured for localhost only"

# Check if we're on Windows or Unix
if [ -x "$(command -v powershell)" ]; then
  # Windows - use PowerShell to start both services
  powershell -Command "Start-Process powershell -ArgumentList 'cd backend && npm run dev'" 
  powershell -Command "Start-Process powershell -ArgumentList 'cd frontend && npm run dev'"
else
  # Unix-like systems
  (cd backend && npm run dev) & 
  (cd frontend && npm run dev)
fi

echo "Development servers started. Press Ctrl+C to stop." 