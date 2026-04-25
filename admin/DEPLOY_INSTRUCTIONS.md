# 🚀 Deploy Instructions - Admin Dashboard

## ⚠️ CRITICAL: Deploy Firestore Security Rules First

The admin dashboard **will not work** until you deploy the Firestore security rules.

### Step 1: Deploy Security Rules

Open your terminal in the `Mavrixfy-web` directory and run:

```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔ Deploy complete!
```

If you get an error about Firebase CLI not being installed:
```bash
npm install -g firebase-tools
firebase login
```

---

## Step 2: Grant Admin Access to Your Account

You need to add admin fields to your existing Mavrixfy user account.

### Option A: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **spotify-8fefc**
3. Go to **Firestore Database**
4. Find the `users` collection
5. Find YOUR user document (use your email to identify it)
6. Click the document to open it
7. Click **Add field** and add these THREE fields:

| Field Name    | Type    | Value        |
|---------------|---------|--------------|
| `role`        | string  | `admin`      |
| `isAdmin`     | boolean | `true`       |
| `adminRole`   | string  | `super_admin`|

8. Click **Update**

### Option B: Using Firebase CLI

If you prefer command line, create a script:

```javascript
// grant-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function grantAdminAccess(email) {
  // Find user by email
  const userRecord = await admin.auth().getUserByEmail(email);
  const uid = userRecord.uid;
  
  // Update user document
  await db.collection('users').doc(uid).update({
    role: 'admin',
    isAdmin: true,
    adminRole: 'super_admin'
  });
  
  console.log(`✅ Admin access granted to ${email} (${uid})`);
}

// Replace with your email
grantAdminAccess('your-email@example.com');
```

---

## Step 3: Test Login

1. Make sure the dev server is running:
   ```bash
   cd Mavrixfy-web/admin
   npm run dev
   ```

2. Open http://localhost:3001/login

3. Sign in with your **existing Mavrixfy credentials**:
   - Email: (your Mavrixfy account email)
   - Password: (your Mavrixfy account password)

4. You should now see the admin dashboard! 🎉

---

## Troubleshooting

### Error: "auth/invalid-credential"
**Cause**: Wrong email or password  
**Solution**: Use your existing Mavrixfy app credentials

### Error: "Missing or insufficient permissions"
**Cause**: Firestore rules not deployed OR admin fields not added  
**Solution**: 
1. Deploy rules: `firebase deploy --only firestore:rules`
2. Add admin fields to your user document (see Step 2)

### Error: "Admin access denied"
**Cause**: Admin fields not added to your user document  
**Solution**: Add these fields to `users/{your-uid}`:
- `role: "admin"`
- `isAdmin: true`
- `adminRole: "super_admin"`

### Still not working?
1. Check Firebase Console → Authentication → Users (verify your account exists)
2. Check Firestore → users collection (verify your user document exists)
3. Clear browser cache and try again
4. Check browser console for detailed error messages

---

## What Credentials to Use?

**Use your existing Mavrixfy app credentials!**

The admin dashboard connects to the same Firebase project as your main Mavrixfy app. You don't need to create new accounts.

If you don't remember your password:
1. Go to Firebase Console → Authentication → Users
2. Find your user
3. Click the three dots → Reset password
4. Or use the "Forgot password" flow in your main Mavrixfy app

---

## Creating Additional Admin Users

To give admin access to other team members:

1. They sign up in the main Mavrixfy app first
2. You add admin fields to their user document in Firestore:
   ```
   role: "admin"
   isAdmin: true
   adminRole: "content_editor"  // or "moderator", "analyst"
   ```
3. They can now login to the admin dashboard

---

## Security Notes

- Only users with `role: "admin"` or `isAdmin: true` can access the dashboard
- Firestore security rules enforce this server-side
- All admin actions are protected by role-based permissions
- The dashboard checks admin status on every page load

---

## Next Steps After Login

Once you successfully login:

1. ✅ Explore the dashboard modules
2. ✅ Test song management
3. ✅ Test playlist management
4. ✅ Check analytics
5. ✅ Configure feature flags
6. ✅ Set up promotions

---

**Need help?** Check `GRANT_ADMIN_ACCESS.md` for detailed admin access instructions.
