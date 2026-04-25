# Admin Dashboard Setup Instructions

## ✅ Current Status

- Dependencies installed
- Environment file created (`.env.local`)
- Firebase client config ready
- Dev server ready to run

---

## 🔧 Required: Firebase Admin SDK Setup

The admin dashboard needs Firebase Admin SDK credentials for server-side operations.

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **spotify-8fefc**
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file

### Step 2: Update `.env.local`

Open `Mavrixfy-web/admin/.env.local` and update these lines:

```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@spotify-8fefc.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

Replace with values from the downloaded JSON:
- `FIREBASE_CLIENT_EMAIL` → `client_email` from JSON
- `FIREBASE_PRIVATE_KEY` → `private_key` from JSON (keep the quotes and \n)

**Important**: The private key must keep the `\n` characters for newlines.

---

## 👤 Create Your First Admin User

### Option 1: Using Firebase Console (Easiest)

1. **Create Auth User**:
   - Go to Firebase Console → Authentication → Users
   - Click "Add User"
   - Email: `admin@mavrixfy.com` (or your email)
   - Password: Create a strong password
   - Click "Add User"
   - **Copy the UID** (you'll need this)

2. **Create Admin Document**:
   - Go to Firebase Console → Firestore Database
   - Click "Start Collection"
   - Collection ID: `admins`
   - Document ID: Paste the UID from step 1
   - Add these fields:

```
uid: "paste-your-uid-here"
email: "admin@mavrixfy.com"
name: "Admin User"
role: "super_admin"
permissions: [
  "overview.view",
  "catalog.manage",
  "playlists.manage",
  "artists.manage",
  "discovery.manage",
  "moderation.manage",
  "users.manage",
  "analytics.view",
  "flags.manage",
  "promotions.manage",
  "notifications.manage",
  "roles.manage"
]
status: "active"
createdAt: (use Firestore timestamp)
updatedAt: (use Firestore timestamp)
createdBy: "system"
```

### Option 2: Using Script

Create `scripts/create-admin.js`:

```javascript
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./firebase-service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createAdmin(email, password, name) {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection('admins').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      role: 'super_admin',
      permissions: [
        'overview.view',
        'catalog.manage',
        'playlists.manage',
        'artists.manage',
        'discovery.manage',
        'moderation.manage',
        'users.manage',
        'analytics.view',
        'flags.manage',
        'promotions.manage',
        'notifications.manage',
        'roles.manage',
      ],
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
    });

    console.log('✅ Admin created:', userRecord.uid);
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit();
}

createAdmin('admin@mavrixfy.com', 'YourSecurePassword123!', 'Admin User');
```

Run: `node scripts/create-admin.js`

---

## 🚀 Start the Admin Dashboard

```bash
cd admin
npm run dev
```

Open: http://localhost:3001

---

## 🔐 Sign In

Use the credentials you created:
- Email: `admin@mavrixfy.com`
- Password: Your password

---

## ✅ Verification Checklist

- [ ] Firebase service account key added to `.env.local`
- [ ] Admin user created in Firebase Auth
- [ ] Admin document created in Firestore `admins` collection
- [ ] Dev server starts without errors
- [ ] Can access http://localhost:3001
- [ ] Can sign in successfully
- [ ] Dashboard loads with metrics

---

## 🐛 Troubleshooting

### Error: "Firebase: Error (auth/invalid-api-key)"

**Solution**: The `.env.local` file is now created with the correct Firebase config. Just restart the dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Error: "Admin access denied"

**Solution**: Make sure you created the `admins/{uid}` document in Firestore with the correct structure.

### Error: "Missing or insufficient permissions"

**Solution**: Check that the `admins/{uid}` document has:
- `role: "super_admin"`
- `status: "active"`
- `permissions` array with all permissions

### Can't sign in

**Solution**: 
1. Verify the user exists in Firebase Auth
2. Verify the `admins/{uid}` document exists in Firestore
3. Check that the UID matches between Auth and Firestore

---

## 📚 Next Steps

Once you're signed in:

1. **Explore the Dashboard**
   - Overview with real-time metrics
   - All 12 admin modules

2. **Try the Command Palette**
   - Press `⌘K` (Mac) or `Ctrl+K` (Windows)
   - Quick navigation to any module

3. **Read the Documentation**
   - `README.md` - Project overview
   - `docs/ARCHITECTURE.md` - System design
   - `docs/FIRESTORE_SCHEMA.md` - Database schema
   - `docs/DEPLOYMENT.md` - Production deployment

4. **Deploy to Production**
   - Follow `docs/DEPLOYMENT.md`
   - Deploy to Vercel
   - Set up Firestore rules

---

## 🎉 You're All Set!

The admin dashboard is now ready to manage your Mavrixfy platform.

**Need Help?**
- Check documentation in `/admin/docs/`
- Review `STATUS.md` for build status
- See `QUICK_START.md` for quick reference
