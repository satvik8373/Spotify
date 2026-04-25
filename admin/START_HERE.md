# 🚀 START HERE - Admin Dashboard Setup

Your admin dashboard is **built and ready**, but needs 2 quick setup steps before you can login.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Deploy Firestore Security Rules

Open terminal in `Mavrixfy-web` directory:

```bash
firebase deploy --only firestore:rules
```

**Don't have Firebase CLI?** Install it:
```bash
npm install -g firebase-tools
firebase login
```

---

### Step 2: Grant Admin Access to Your Account

You have **3 options** (choose the easiest for you):

#### Option A: Firebase Console (Easiest - No Code)

1. Go to https://console.firebase.google.com/
2. Select project: **spotify-8fefc**
3. Click **Firestore Database** in left menu
4. Click **users** collection
5. Find YOUR user document (look for your email)
6. Click the document to open it
7. Click **Add field** button THREE times to add:

```
Field: role          Type: string    Value: admin
Field: isAdmin       Type: boolean   Value: true
Field: adminRole     Type: string    Value: super_admin
```

8. Click **Update**
9. Done! ✅

---

#### Option B: Using the Script (Automated)

1. Download your Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `service-account.json` in the `admin` folder

2. Run the script:
```bash
cd Mavrixfy-web/admin
npm install firebase-admin
node grant-admin-access.js your-email@example.com
```

---

#### Option C: Manual Firestore Update

If you have direct Firestore access, update your user document:

```javascript
// In Firestore: users/{your-uid}
{
  "role": "admin",
  "isAdmin": true,
  "adminRole": "super_admin"
}
```

---

## Step 3: Login

1. Start the dev server (if not running):
```bash
cd Mavrixfy-web/admin
npm run dev
```

2. Open http://localhost:3001/login

3. Sign in with your **existing Mavrixfy credentials**:
   - Email: (your Mavrixfy app email)
   - Password: (your Mavrixfy app password)

4. 🎉 You're in!

---

## ❓ What Credentials Do I Use?

**Use your existing Mavrixfy app credentials!**

The admin dashboard uses the same Firebase project as your main app. You don't need to create new accounts.

- ✅ Same email you use in the Mavrixfy app
- ✅ Same password you use in the Mavrixfy app
- ❌ No need to create new admin accounts

---

## 🐛 Troubleshooting

### "auth/invalid-credential" error
- **Cause**: Wrong email or password
- **Fix**: Use your existing Mavrixfy app credentials

### "Missing or insufficient permissions" error
- **Cause**: Firestore rules not deployed OR admin fields not added
- **Fix**: 
  1. Deploy rules: `firebase deploy --only firestore:rules`
  2. Add admin fields to your user document (see Step 2)

### "Admin access denied" after login
- **Cause**: Admin fields not added to your user document
- **Fix**: Add these 3 fields to `users/{your-uid}`:
  - `role: "admin"`
  - `isAdmin: true`
  - `adminRole: "super_admin"`

### Can't find my user document in Firestore
- **Cause**: You haven't signed in to the Mavrixfy app yet
- **Fix**: Sign in to the main Mavrixfy app first to create your user profile

---

## 📚 Additional Resources

- **DEPLOY_INSTRUCTIONS.md** - Detailed deployment guide
- **GRANT_ADMIN_ACCESS.md** - Complete admin access documentation
- **QUICK_START.md** - Full setup walkthrough
- **README.md** - Project overview and features

---

## 🎯 What's Next?

Once you login successfully:

1. ✅ Explore the 12 dashboard modules
2. ✅ Add songs to the catalog
3. ✅ Create editorial playlists
4. ✅ Manage artists
5. ✅ View analytics
6. ✅ Configure feature flags
7. ✅ Set up promotions

---

## 🔐 Security Notes

- Only users with `role: "admin"` can access the dashboard
- Firestore security rules enforce this server-side
- All admin actions are protected by role-based permissions
- The dashboard checks admin status on every page load

---

## 👥 Adding More Admins

To give admin access to team members:

1. They sign up in the main Mavrixfy app
2. You add admin fields to their user document:
   ```
   role: "admin"
   isAdmin: true
   adminRole: "content_editor"  // or "moderator", "analyst"
   ```
3. They can now login to the admin dashboard

Use the `grant-admin-access.js` script to automate this!

---

**Need help?** Check the documentation files or open an issue.

**Ready to start?** Follow Step 1 and Step 2 above, then login! 🚀
