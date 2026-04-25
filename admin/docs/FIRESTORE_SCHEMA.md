# Mavrixfy Admin - Firestore Schema

Complete database architecture for the Mavrixfy admin dashboard.

## Collections Overview

```
firestore/
├── admins/                    # Admin user access control
├── songs/                     # Music catalog
├── albums/                    # Album metadata
├── playlists/                 # User and editorial playlists
├── users/                     # User accounts
├── artists/                   # Artist profiles
├── moderation_cases/          # Content moderation queue
├── feature_flags/             # Remote config flags
├── banners/                   # Homepage promotions
├── notifications/             # Push notification campaigns
├── audit_logs/                # Admin action tracking
├── search_weights/            # Discovery ranking config
├── import_jobs/               # Bulk upload tracking
└── analytics/                 # Aggregated metrics
    ├── daily_stats/
    ├── top_songs/
    └── top_playlists/
```

---

## 1. Admin Access Control

### `admins/{uid}`

Stores admin user permissions and roles.

```typescript
{
  uid: string;                    // Firebase Auth UID
  email: string;                  // Admin email
  name: string;                   // Display name
  role: 'super_admin' | 'content_editor' | 'moderator' | 'analyst';
  permissions: string[];          // Array of permission strings
  status: 'active' | 'disabled';  // Account status
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;              // UID of creator
}
```

**Indexes:**
- `status` (ASC)
- `role` (ASC), `status` (ASC)

**Security Rules:**
```javascript
match /admins/{uid} {
  allow read: if request.auth != null && 
    (request.auth.uid == uid || 
     get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'super_admin');
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'super_admin';
}
```

---

## 2. Music Catalog

### `songs/{songId}`

Main music catalog collection.

```typescript
{
  id: string;
  title: string;
  normalizedTitle: string;        // Lowercase for search
  artist: string;
  normalizedArtist: string;
  album: string;
  albumId: string | null;
  genre: string;
  language: string;
  artwork: string;                // Image URL
  audioUrl: string;               // Stream URL
  duration: number;               // Seconds
  popularityScore: number;        // 0-100
  releaseDate: string;            // ISO date
  explicit: boolean;
  state: 'draft' | 'review' | 'published' | 'scheduled';
  regions: string[];              // ['GLOBAL', 'IN', 'US']
  broken: boolean;                // Audio unavailable flag
  source: 'jiosaavn' | 'upload' | 'import';
  metadata: {
    bitrate?: number;
    format?: string;
    fileSize?: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;              // Admin UID
}
```

**Indexes:**
- `state` (ASC), `createdAt` (DESC)
- `normalizedTitle` (ASC)
- `normalizedArtist` (ASC)
- `genre` (ASC), `popularityScore` (DESC)
- `language` (ASC), `state` (ASC)
- `broken` (ASC), `state` (ASC)

---

### `albums/{albumId}`

Album metadata and grouping.

```typescript
{
  id: string;
  title: string;
  artist: string;
  artistId: string | null;
  artwork: string;
  releaseDate: string;
  genre: string;
  trackCount: number;
  songs: string[];                // Array of song IDs
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `artist` (ASC), `releaseDate` (DESC)

---

## 3. Playlists

### `playlists/{playlistId}`

User-created and editorial playlists.

```typescript
{
  id: string;
  name: string;
  searchableName: string;         // Lowercase
  description: string;
  curator: string;                // User ID or 'Mavrixfy Editorial'
  category: string;               // 'Pop', 'Workout', 'Chill', etc.
  songs: string[];                // Array of song IDs
  songCount: number;
  trendingScore: number;          // 0-100 for homepage ranking
  publishAt: Timestamp | null;    // Scheduled publish time
  homepageSlot: string | null;    // 'hero', 'featured', null
  state: 'draft' | 'review' | 'published' | 'scheduled';
  imageUrl: string;
  isPublic: boolean;
  source: 'user' | 'editorial' | 'mood';
  listeners: number;              // Follower count
  createdBy: {
    id: string;
    uid: string;
    name: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `state` (ASC), `trendingScore` (DESC)
- `category` (ASC), `state` (ASC)
- `source` (ASC), `isPublic` (ASC)
- `homepageSlot` (ASC), `trendingScore` (DESC)

---

## 4. Artists

### `artists/{artistId}`

Artist profile and metadata.

```typescript
{
  id: string;
  name: string;
  normalizedName: string;
  bio: string;
  imageUrl: string;
  verified: boolean;
  monthlyListeners: number;
  topMarket: string;              // 'IN', 'US', etc.
  genres: string[];
  discographyCount: number;
  socialLinks: {
    spotify?: string;
    instagram?: string;
    twitter?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `verified` (ASC), `monthlyListeners` (DESC)
- `normalizedName` (ASC)

---

## 5. Users

### `users/{uid}`

User account information (read from main app schema).

```typescript
{
  uid: string;
  email: string;
  emailLower: string;
  displayName: string;
  fullName: string;
  imageUrl: string;
  provider: 'google' | 'facebook' | 'email';
  plan: 'free' | 'premium';
  country: string;
  language: string;
  reports: number;                // Moderation report count
  status: 'healthy' | 'watch' | 'restricted';
  lastActiveAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `status` (ASC), `reports` (DESC)
- `plan` (ASC), `createdAt` (DESC)
- `emailLower` (ASC)

---

## 6. Moderation

### `moderation_cases/{caseId}`

Content moderation queue.

```typescript
{
  id: string;
  entity: string;                 // Song title, user name, etc.
  entityId: string;               // Document ID
  entityType: 'song' | 'playlist' | 'user' | 'comment';
  reason: string;                 // 'copyright', 'explicit', 'spam'
  reporterType: string;           // 'user', 'automated', 'admin'
  reporterId: string | null;
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'investigating' | 'escalated' | 'resolved';
  assignedTo: string | null;      // Admin UID
  notes: string;
  resolution: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt: Timestamp | null;
}
```

**Indexes:**
- `status` (ASC), `severity` (DESC), `createdAt` (DESC)
- `entityType` (ASC), `status` (ASC)
- `assignedTo` (ASC), `status` (ASC)

---

## 7. Feature Flags

### `feature_flags/{flagId}`

Remote configuration and feature toggles.

```typescript
{
  id: string;
  name: string;                   // 'mood_playlist', 'social_sharing'
  description: string;
  enabled: boolean;
  rollout: number;                // 0-100 percentage
  targets: ('web' | 'android' | 'ios')[];
  conditions: {
    minVersion?: string;
    countries?: string[];
    userSegment?: 'all' | 'premium' | 'free';
  };
  owner: string;                  // Admin UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `enabled` (ASC), `name` (ASC)

---

## 8. Promotions

### `banners/{bannerId}`

Homepage banners and promotional content.

```typescript
{
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  placement: 'hero' | 'featured' | 'sidebar';
  state: 'draft' | 'review' | 'published' | 'scheduled';
  audience: string;               // 'all', 'premium', 'free'
  startAt: Timestamp;
  endAt: Timestamp;
  accent: string;                 // Hex color
  clickUrl: string;               // Deep link or URL
  impressions: number;
  clicks: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**Indexes:**
- `state` (ASC), `startAt` (DESC)
- `placement` (ASC), `state` (ASC)

---

## 9. Notifications

### `notifications/{campaignId}`

Push notification campaigns.

```typescript
{
  id: string;
  title: string;
  body: string;
  segment: string;                // 'all', 'premium', 'inactive_7d'
  channel: 'push' | 'in-app';
  status: 'draft' | 'scheduled' | 'sent';
  scheduledAt: Timestamp;
  sentAt: Timestamp | null;
  recipients: number;
  delivered: number;
  opened: number;
  data: {
    action?: string;
    url?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**Indexes:**
- `status` (ASC), `scheduledAt` (DESC)
- `segment` (ASC), `status` (ASC)

---

## 10. Audit Logs

### `audit_logs/{logId}`

Track all admin actions for compliance.

```typescript
{
  id: string;
  actor: string;                  // Admin name
  actorUid: string;               // Admin UID
  actorRole: string;
  action: string;                 // 'create', 'update', 'delete'
  entity: string;                 // 'song', 'playlist', 'user'
  entityId: string;
  changes: Record<string, any>;   // Before/after values
  ipAddress: string;
  userAgent: string;
  timestamp: Timestamp;
}
```

**Indexes:**
- `actorUid` (ASC), `timestamp` (DESC)
- `entity` (ASC), `timestamp` (DESC)
- `action` (ASC), `timestamp` (DESC)

---

## 11. Search Configuration

### `search_weights/{weightId}`

Discovery and search ranking configuration.

```typescript
{
  id: string;
  label: string;                  // 'Title Match', 'Artist Match'
  field: string;                  // 'title', 'artist', 'genre'
  value: number;                  // Weight multiplier
  hint: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 12. Import Jobs

### `import_jobs/{jobId}`

Track bulk upload and import operations.

```typescript
{
  id: string;
  label: string;
  source: string;                 // 'csv', 'api', 'jiosaavn'
  status: 'queued' | 'processing' | 'blocked' | 'completed';
  progress: number;               // 0-100
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**Indexes:**
- `status` (ASC), `createdAt` (DESC)

---

## 13. Analytics

### `analytics/daily_stats/{date}`

Daily aggregated metrics.

```typescript
{
  date: string;                   // 'YYYY-MM-DD'
  totalStreams: number;
  uniqueListeners: number;
  newUsers: number;
  premiumConversions: number;
  topSongs: Array<{ id: string; plays: number }>;
  topPlaylists: Array<{ id: string; plays: number }>;
  createdAt: Timestamp;
}
```

---

## Security Rules Summary

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAdmin() {
      return request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    function isSuperAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'super_admin';
    }
    
    // Admin-only collections
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

---

## Deployment

### Deploy Rules

```bash
firebase deploy --only firestore:rules
```

### Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

### Backup Strategy

- Daily automated backups via Firebase
- Export to Cloud Storage bucket
- 30-day retention policy
- Point-in-time recovery available

---

## Performance Optimization

1. **Composite Indexes**: All query patterns have dedicated indexes
2. **Denormalization**: Store computed values (songCount, listeners)
3. **Pagination**: Use `limit()` and `startAfter()` for large collections
4. **Caching**: Implement client-side caching for static data
5. **Batch Operations**: Use batch writes for bulk updates

---

## Migration Scripts

See `/admin/scripts/migrations/` for data migration utilities.
