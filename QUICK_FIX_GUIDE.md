# Quick Fix Guide - CORS Error Resolution

## Current Issue
The backend is still returning the old CORS header because **the changes haven't been deployed yet**.

## What Was Fixed (Locally)
✅ Removed hardcoded CORS headers from `vercel.json`  
✅ Express CORS middleware now handles both domains correctly  
✅ Added `nodemailer` to `package.json`  
✅ Email service configured with Gmail credentials  

## Deploy Now (Choose One Method)

### Method 1: Automated Script (Easiest)
```bash
cd backend
deploy.bat
```
This will install dependencies and deploy automatically.

### Method 2: Manual Commands
```bash
cd backend
npm install
vercel --prod
```

### Method 3: Git Push (If Auto-Deploy Enabled)
```bash
git add .
git commit -m "Fix CORS and add email OTP verification"
git push
```

## After Deployment

### 1. Verify Environment Variables in Vercel
Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Required variables:
```
EMAIL_SERVICE=gmail
EMAIL_USER=mavrixesports22@gmail.com
EMAIL_APP_PASSWORD=orqkxmutwjgifekc
NODE_ENV=production
```

### 2. Test CORS (Optional)
```bash
cd backend
node test-cors.js
```
This will verify both domains are allowed.

### 3. Test Registration Flow
1. Go to https://www.mavrixfy.site/register
2. Fill in the form
3. Click "Create Account"
4. You should be redirected to /verify-email
5. Check your email for the 6-digit OTP
6. Enter the code
7. Account should be created successfully

## Troubleshooting

### Still Getting CORS Error?
- **Clear browser cache** (Ctrl+Shift+Delete)
- **Hard refresh** the page (Ctrl+Shift+R)
- Check Vercel deployment logs for errors
- Verify the deployment completed successfully

### Not Receiving Email?
- Check spam/junk folder
- Verify environment variables in Vercel dashboard
- Check Vercel function logs for email errors
- In development, OTP is shown in console

### Deployment Failed?
- Make sure you have Vercel CLI installed: `npm i -g vercel`
- Make sure you're logged in: `vercel login`
- Check for any error messages in the deployment output

## Expected Result
After deployment, you should see:
- ✅ No CORS errors in browser console
- ✅ OTP email received within seconds
- ✅ Account created successfully after verification
- ✅ Redirected to /home after login

## Need Help?
Check the deployment logs in Vercel dashboard:
https://vercel.com/dashboard → Your Project → Deployments → Latest → View Function Logs
