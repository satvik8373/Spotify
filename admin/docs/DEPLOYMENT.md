# Mavrixfy Admin - Deployment Guide

Complete deployment instructions for production environments.

## Prerequisites

- Node.js 20.x or higher
- Firebase project with Firestore enabled
- Firebase Admin SDK service account
- Vercel account (recommended) or any Node.js hosting

---

## 1. Environment Setup

### Create `.env.local`

```bash
cp .env.example .env.local
```

### Configure Firebase Admin SDK

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`spotify-8fefc`)
3. Navigate to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Extract credentials:

```env
FIREBASE_PROJECT_ID=spotify-8fefc
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@spotify-8fefc.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Configure Firebase Client SDK

Use the existing Firebase config from the main app:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBWgv_mE8ZAnG2kUJSacCOUgkbo1RxxSpE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=spotify-8fefc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=spotify-8fefc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=spotify-8fefc.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=816396705670
NEXT_PUBLIC_FIREBASE_APP_ID=1:816396705670:web:005e724df7139772521607
```

---

## 2. Install Dependencies

```bash
cd admin
npm install
```

---

## 3. Firestore Setup

### Deploy Security Rules

Create `firestore.rules` in project root:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    function isSuperAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'super_admin';
    }
    
    match /admins/{uid} {
      allow read: if isAdmin();
      allow write: if isSuperAdmin();
    }
    
    match /songs/{songId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /playlists/{playlistId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /artists/{artistId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /users/{uid} {
      allow read: if isAdmin();
      allow write: if false;
    }
    
    match /moderation_cases/{caseId} {
      allow read, write: if isAdmin();
    }
    
    match /feature_flags/{flagId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /banners/{bannerId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /notifications/{campaignId} {
      allow read, write: if isAdmin();
    }
    
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow create: if isAdmin();
      allow update, delete: if false;
    }
  }
}
```

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

### Deploy Indexes

Create `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "songs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "state", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "songs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "genre", "order": "ASCENDING" },
        { "fieldPath": "popularityScore", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "playlists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "state", "order": "ASCENDING" },
        { "fieldPath": "trendingScore", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "moderation_cases",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "severity", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actorUid", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy indexes:

```bash
firebase deploy --only firestore:indexes
```

---

## 4. Create First Admin User

### Option A: Using Firebase Console

1. Create a user in Firebase Authentication
2. Note the UID
3. Create a document in Firestore:

```
Collection: admins
Document ID: {user-uid}
Data:
{
  uid: "{user-uid}",
  email: "admin@mavrixfy.com",
  name: "Admin User",
  role: "super_admin",
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
  ],
  status: "active",
  createdAt: {serverTimestamp},
  updatedAt: {serverTimestamp},
  createdBy: "system"
}
```

### Option B: Using Firebase Admin SDK Script

Create `scripts/create-admin.js`:

```javascript
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./service-account-key.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createAdmin(email, name) {
  try {
    // Create auth user
    const userRecord = await admin.auth().createUser({
      email,
      password: 'ChangeMe123!',
      displayName: name,
    });

    // Create admin document
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

    console.log('✅ Admin user created:', userRecord.uid);
    console.log('📧 Email:', email);
    console.log('🔑 Temporary password: ChangeMe123!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAdmin('admin@mavrixfy.com', 'Admin User');
```

Run:

```bash
node scripts/create-admin.js
```

---

## 5. Local Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

---

## 6. Production Deployment

### Vercel (Recommended)

#### Install Vercel CLI

```bash
npm i -g vercel
```

#### Deploy

```bash
vercel --prod
```

#### Configure Environment Variables

In Vercel Dashboard:

1. Go to **Project Settings** → **Environment Variables**
2. Add all variables from `.env.local`
3. Ensure `FIREBASE_PRIVATE_KEY` is properly escaped

#### Custom Domain

```bash
vercel domains add admin.mavrixfy.com
```

### Alternative: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT 3001

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t mavrixfy-admin .
docker run -p 3001:3001 --env-file .env.local mavrixfy-admin
```

---

## 7. Post-Deployment Checklist

- [ ] Verify Firebase connection
- [ ] Test admin login
- [ ] Check all module permissions
- [ ] Verify Firestore security rules
- [ ] Test CRUD operations
- [ ] Check audit logging
- [ ] Verify command palette (⌘K)
- [ ] Test responsive design
- [ ] Check error boundaries
- [ ] Verify analytics tracking
- [ ] Test bulk operations
- [ ] Check file uploads (if applicable)

---

## 8. Monitoring & Maintenance

### Error Tracking

Integrate Sentry:

```bash
npm install @sentry/nextjs
```

### Performance Monitoring

Use Vercel Analytics or Firebase Performance Monitoring.

### Backup Strategy

- Enable Firebase automated backups
- Export Firestore data weekly
- Store backups in Cloud Storage

### Security Audits

- Review admin access logs monthly
- Rotate service account keys quarterly
- Update dependencies regularly

---

## 9. Troubleshooting

### Firebase Admin SDK Errors

**Error**: "Failed to initialize Firebase Admin SDK"

**Solution**: Check that `FIREBASE_PRIVATE_KEY` is properly formatted with `\n` newlines.

### Authentication Issues

**Error**: "Admin access denied"

**Solution**: Verify the `admins/{uid}` document exists and has correct permissions.

### Firestore Permission Errors

**Error**: "Missing or insufficient permissions"

**Solution**: Deploy latest security rules with `firebase deploy --only firestore:rules`

### Build Errors

**Error**: "Module not found"

**Solution**: Clear cache and reinstall:

```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## 10. Scaling Considerations

### Performance Optimization

- Enable Next.js caching
- Use CDN for static assets
- Implement Redis for session storage
- Use Firestore query pagination

### High Availability

- Deploy to multiple regions
- Use load balancer
- Implement health checks
- Set up failover strategy

### Cost Optimization

- Monitor Firestore read/write operations
- Implement client-side caching
- Use Firestore bundle for initial data
- Optimize image delivery

---

## Support

For issues or questions:
- Check documentation: `/admin/docs/`
- Review Firestore schema: `/admin/docs/FIRESTORE_SCHEMA.md`
- Contact: admin@mavrixfy.com
