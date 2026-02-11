@echo off
REM Deployment script for Mavrixfy Backend (Windows)
echo Starting deployment process...

REM Check if we're in the backend directory
if not exist "package.json" (
    echo Error: package.json not found. Make sure you're in the backend directory.
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
call npm install

REM Check if nodemailer is installed
npm list nodemailer >nul 2>&1
if errorlevel 1 (
    echo nodemailer not found, installing...
    call npm install nodemailer
)

echo Dependencies installed

REM Deploy to Vercel
echo Deploying to Vercel...
call vercel --prod

echo Deployment complete!
echo.
echo Next steps:
echo 1. Verify environment variables in Vercel dashboard
echo 2. Test the registration flow at https://www.mavrixfy.site/register
echo 3. Check email for OTP code

pause
