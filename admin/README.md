# Mavrixfy Admin Dashboard

Production-grade admin control center for managing the Mavrixfy music streaming platform.

## Architecture

This admin panel is built as a **Next.js 14+ standalone application** with:

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Custom glassmorphism components
- **Backend**: Firebase Admin SDK + Firestore
- **Auth**: Firebase Authentication with role-based access control
- **State**: Zustand for client state management
- **Charts**: Recharts for analytics visualization

## Features

### Core Modules

1. **Overview Dashboard** - Real-time metrics, growth charts, system health
2. **Song Management** - Full catalog CMS with metadata editor, bulk operations
3. **Playlist Management** - Editorial playlists, drag-drop ordering, homepage controls
4. **Artist Management** - Artist profiles, verification, discography
5. **Search & Discovery** - Ranking weights, trending keywords, curated boosts
6. **Content Moderation** - Reports queue, copyright tools, fraud detection
7. **User Management** - User list, premium stats, account moderation
8. **Analytics Center** - Streaming analytics, top content, retention metrics
9. **Feature Flags** - Remote config, beta rollouts, platform-specific flags
10. **Promotions Manager** - Banners, campaigns, scheduled placements
11. **Notifications** - Push notifications, segmentation, scheduling
12. **Admin Roles** - Permission management, audit logs, security

### Advanced Features

- **Global Command Palette** (⌘K / Ctrl+K)
- **Activity Timeline** with audit logs
- **Content Approval Workflow** (draft → review → published → scheduled)
- **Bulk Actions** across all modules
- **Internal Notes System** for collaboration
- **Media Upload Manager** with Cloudinary integration
- **Dark/Light Preview Simulator**
- **Real-time Firestore Sync**

## Project Structure

```
admin/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── charts/           # Chart components
│   ├── forms/            # Form components
│   └── modules/          # Feature-specific components
├── lib/                   # Utilities
│   ├── firebase-admin.ts # Firebase Admin SDK
│   ├── firestore.ts      # Firestore helpers
│   └── auth.ts           # Auth utilities
├── hooks/                 # Custom React hooks
├── stores/                # Zustand stores
├── types/                 # TypeScript types
├── styles/                # Global styles
└── public/                # Static assets
```

## Setup

### 1. Install Dependencies

```bash
cd admin
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=spotify-8fefc
FIREBASE_CLIENT_EMAIL=your-service-account@spotify-8fefc.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBWgv_mE8ZAnG2kUJSacCOUgkbo1RxxSpE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=spotify-8fefc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=spotify-8fefc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=spotify-8fefc.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=816396705670
NEXT_PUBLIC_FIREBASE_APP_ID=1:816396705670:web:005e724df7139772521607

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3001
NODE_ENV=development
```

### 3. Firebase Admin Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Add credentials to `.env.local`

### 4. Firestore Security Rules

Deploy the admin security rules:

```bash
firebase deploy --only firestore:rules
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

### Environment Variables

Add all `.env.local` variables to Vercel project settings.

## Admin Access Control

### Role Hierarchy

1. **Super Admin** - Full access to all modules
2. **Content Editor** - Catalog, playlists, artists
3. **Moderator** - Content moderation, user management
4. **Analyst** - Read-only analytics access

### Granting Admin Access

Create a Firestore document:

```
admins/{uid}
{
  role: "super_admin",
  status: "active",
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
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

## Firestore Schema

See `docs/FIRESTORE_SCHEMA.md` for complete database architecture.

## Development

### Adding a New Module

1. Create component in `components/modules/`
2. Add route in `app/(dashboard)/`
3. Define types in `types/`
4. Add permission in `lib/permissions.ts`
5. Update navigation in `components/Sidebar.tsx`

### Code Style

- Use TypeScript strict mode
- Follow Airbnb React style guide
- Use Tailwind utility classes
- Implement proper error boundaries
- Add loading states for all async operations

## Security

- All routes protected with Firebase Auth
- Role-based access control (RBAC)
- Firestore security rules enforce permissions
- Admin actions logged to audit trail
- Sensitive operations require confirmation

## Performance

- Server-side rendering for initial load
- Client-side caching with SWR
- Optimistic UI updates
- Lazy loading for heavy components
- Image optimization with Next.js Image

## License

Proprietary - Mavrixfy Internal Tool
