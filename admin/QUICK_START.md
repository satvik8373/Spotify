# Mavrixfy Admin - Quick Start Guide

Get the admin dashboard running in 5 minutes.

## Prerequisites

- Node.js 20.x or higher
- Firebase project access
- Admin credentials

---

## Step 1: Install Dependencies

```bash
cd admin
npm install
```

---

## Step 2: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase credentials:

```env
# Firebase Admin SDK (from Firebase Console → Service Accounts)
FIREBASE_PROJECT_ID=spotify-8fefc
FIREBASE_CLIENT_EMAIL=your-service-account@spotify-8fefc.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client Config (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBWgv_mE8ZAnG2kUJSacCOUgkbo1RxxSpE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=spotify-8fefc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=spotify-8fefc
```

---

## Step 3: Create Admin User

### Option A: Firebase Console (Easiest)

1. Go to Firebase Console → Authentication
2. Add a new user with email/password
3. Copy the UID
4. Go to Firestore Database
5. Create collection `admins`
6. Add document with ID = UID:

```json
{
  "uid": "your-user-uid",
  "email": "admin@mavrixfy.com",
  "name": "Admin User",
  "role": "super_admin",
  "permissions": [
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
  ],
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "createdBy": "system"
}
```

### Option B: Using Script

Create `scripts/create-admin.js` and run:

```bash
node scripts/create-admin.js
```

---

## Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

---

## Step 5: Sign In

Use the credentials you created:
- Email: `admin@mavrixfy.com`
- Password: Your password

---

## What's Next?

### Explore the Dashboard

- **Overview**: Real-time metrics and activity feed
- **Songs**: Manage music catalog
- **Playlists**: Create editorial playlists
- **Artists**: Manage artist profiles
- **Discovery**: Configure search rankings
- **Moderation**: Review reported content
- **Users**: Manage user accounts
- **Analytics**: View streaming analytics
- **Feature Flags**: Toggle platform features
- **Promotions**: Manage banners
- **Notifications**: Send push notifications
- **Admin Roles**: Manage permissions

### Try the Command Palette

Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) to open the command palette for quick navigation.

### Read the Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Firestore Schema](docs/FIRESTORE_SCHEMA.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

---

## Common Issues

### "Firebase Admin SDK initialization failed"

**Solution**: Check that `FIREBASE_PRIVATE_KEY` is properly formatted with `\n` newlines.

### "Admin access denied"

**Solution**: Verify the `admins/{uid}` document exists in Firestore with correct permissions.

### Port 3001 already in use

**Solution**: Change port in `package.json`:

```json
"dev": "next dev -p 3002"
```

---

## Production Deployment

### Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add environment variables in Vercel dashboard.

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Support

- Documentation: `/admin/docs/`
- Email: admin@mavrixfy.com

---

## Features Checklist

- [x] Authentication with Firebase
- [x] Role-based access control
- [x] Overview dashboard with metrics
- [x] Song management (CRUD)
- [x] Playlist management
- [x] Artist management
- [x] Search & discovery controls
- [x] Content moderation
- [x] User management
- [x] Analytics center
- [x] Feature flags
- [x] Promotions manager
- [x] Notifications
- [x] Admin roles & permissions
- [x] Command palette (⌘K)
- [x] Audit logging
- [x] Dark theme UI
- [x] Responsive design
- [x] Real-time updates

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment
3. ✅ Create admin user
4. ✅ Run dev server
5. ✅ Sign in
6. 🚀 Start managing your platform!

---

**Welcome to Mavrixfy Admin Dashboard!** 🎵
