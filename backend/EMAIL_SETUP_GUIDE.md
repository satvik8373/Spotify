# Email Service Setup Guide

This guide will help you set up real email sending for OTP verification.

## Option 1: Gmail (Recommended for Development)

### Step 1: Install nodemailer
```bash
npm install nodemailer
```

### Step 2: Enable 2-Factor Authentication on Gmail
1. Go to your Google Account: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", enable "2-Step Verification"

### Step 3: Generate App Password
1. After enabling 2FA, go back to Security settings
2. Under "Signing in to Google", click "App passwords"
3. Select "Mail" and "Other (Custom name)"
4. Name it "Mavrixfy" and click "Generate"
5. Copy the 16-character password (remove spaces)

### Step 4: Add to .env file
Add these variables to your `backend/.env` file:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-char-app-password
NODE_ENV=production
```

**Important:** 
- Use your Gmail address for `EMAIL_USER`
- Use the App Password (not your regular Gmail password) for `EMAIL_APP_PASSWORD`
- Set `NODE_ENV=production` to stop showing OTP in API response

---

## Option 2: Custom SMTP Server

If you have a custom email server or use services like:
- Outlook/Office 365
- Yahoo Mail
- Custom domain email
- Other SMTP providers

### Step 1: Get SMTP Credentials
Get these details from your email provider:
- SMTP Host (e.g., smtp.office365.com)
- SMTP Port (usually 587 or 465)
- Username
- Password

### Step 2: Add to .env file
```env
# Email Configuration
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
NODE_ENV=production
```

---

## Testing the Setup

### 1. Start your backend server
```bash
cd backend
npm start
```

### 2. Check the console
You should see: `Email service is ready to send emails`

### 3. Test registration
1. Go to your frontend
2. Try to register with a real email address
3. Check your email inbox for the OTP

---

## Troubleshooting

### "Invalid login" error with Gmail
- Make sure you're using an App Password, not your regular password
- Verify 2-Factor Authentication is enabled
- Check that the email address is correct

### "Connection timeout" error
- Check your internet connection
- Verify SMTP host and port are correct
- Some networks block SMTP ports (try a different network)

### Email not received
- Check spam/junk folder
- Verify the email address is correct
- Check backend console for error messages
- Make sure `NODE_ENV=production` is set

### Still showing OTP in console
- Set `NODE_ENV=production` in your .env file
- Restart your backend server

---

## Security Best Practices

1. **Never commit .env file** - It's already in .gitignore
2. **Use App Passwords** - Never use your main Gmail password
3. **Rotate passwords** - Change App Password if compromised
4. **Monitor usage** - Check for unusual email sending activity
5. **Rate limiting** - The OTP system has built-in rate limiting

---

## Production Recommendations

For production, consider using dedicated email services:

### SendGrid (Recommended)
- Free tier: 100 emails/day
- Easy setup
- Good deliverability
- Install: `npm install @sendgrid/mail`

### AWS SES
- Very cheap ($0.10 per 1000 emails)
- Requires AWS account
- Good for high volume

### Mailgun
- Free tier: 5,000 emails/month
- Good API
- Easy integration

### Resend
- Modern alternative
- Developer-friendly
- Good documentation

---

## Email Template Customization

The email template is in `backend/src/services/email.service.js`

You can customize:
- Colors and styling
- Logo (add your logo URL)
- Text content
- Footer information

---

## Need Help?

If you encounter issues:
1. Check the backend console for error messages
2. Verify all environment variables are set correctly
3. Test with a different email address
4. Try a different email service (Gmail vs SMTP)
