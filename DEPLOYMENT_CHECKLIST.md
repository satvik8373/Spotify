# Deployment Checklist - Email OTP Verification

## Current Status
The email OTP verification system is fully implemented but needs deployment to work in production.

## What's Been Done ✅
1. Backend OTP controller with 6-digit codes and 10-minute expiry
2. Email service using Nodemailer with Gmail configuration
3. Professional HTML email template for OTP delivery
4. Frontend VerifyEmail page with 6-digit input and auto-focus
5. CORS configuration updated to allow both mavrixfy.site and www.mavrixfy.site
6. Registration flow: Form → Email Verification → Account Creation
7. Added nodemailer to package.json dependencies

## What You Need to Do 🚀

### Step 1: Install Dependencies (Backend)
```bash
cd backend
npm install
```
This will install nodemailer which is required for sending emails.

### Step 2: Verify Environment Variables (Backend)
Check that `backend/.env` has these values:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=mavrixesports22@gmail.com
EMAIL_APP_PASSWORD=orqkxmutwjgifekc
NODE_ENV=production
```
✅ Already configured correctly

### Step 3: Deploy Backend to Vercel
The CORS configuration changes MUST be deployed for the fix to work.

**Option A: Using the deployment script (Recommended)**
```bash
cd backend
# On Windows:
deploy.bat

# On Mac/Linux:
chmod +x deploy.sh
./deploy.sh
```

**Option B: Manual deployment**
```bash
cd backend
npm install
vercel --prod
```

**Option C: Git push (if auto-deploy is configured)**
```bash
git add .
git commit -m "Fix CORS for www.mavrixfy.site and add email OTP"
git push
```

**CRITICAL:** Make sure your Vercel environment variables include:
- `EMAIL_SERVICE=gmail`
- `EMAIL_USER=mavrixesports22@gmail.com`
- `EMAIL_APP_PASSWORD=orqkxmutwjgifekc`
- `NODE_ENV=production`

To check/add environment variables:
1. Go to https://vercel.com/dashboard
2. Select your backend project
3. Go to Settings → Environment Variables
4. Add the variables above if missing

### Step 4: Test the Flow
1. Go to https://www.mavrixfy.site/register
2. Fill in the registration form
3. Click "Create Account"
4. You should be redirected to /verify-email
5. Check your email for the 6-digit OTP code
6. Enter the code and click "Verify & Create Account"
7. Your account should be created and you'll be logged in

## Troubleshooting

### If you don't receive the email:
1. Check spam/junk folder
2. Check backend logs in Vercel dashboard for email errors
3. Verify Gmail credentials are correct in Vercel environment variables

### If you get CORS errors:
1. Make sure backend is deployed with the latest changes
2. Check that you're accessing from www.mavrixfy.site or mavrixfy.site
3. Check browser console for the exact error message

### If OTP verification fails:
1. Make sure you enter the code within 10 minutes
2. You have maximum 5 attempts per OTP
3. Use the "Resend Code" button if needed (60 second cooldown)

## Files Modified
- `backend/package.json` - Added nodemailer dependency
- `backend/src/index.js` - CORS configuration for both domains
- `backend/src/controllers/otp.controller.js` - OTP logic
- `backend/src/services/email.service.js` - Email sending
- `backend/src/routes/otp.route.js` - API routes
- `frontend/src/pages/VerifyEmail.tsx` - OTP input UI
- `frontend/src/pages/Register.tsx` - Redirect to verification
- `frontend/src/services/hybridAuthService.ts` - Updated registration flow

## Next Steps After Deployment
Once deployed and tested, you can:
1. Monitor email delivery success rate
2. Add email verification banner for existing users
3. Add "Resend verification email" feature for unverified accounts
4. Consider adding SMS OTP as backup verification method
