# AI Mood Playlist Generator - Configuration Guide

## Environment Variables

### Required Variables

#### 1. HuggingFace API Configuration

```bash
# HuggingFace API Key for emotion classification
HUGGINGFACE_API_KEY=your_api_key_here
```

**How to obtain**:
1. Create account at https://huggingface.co/
2. Go to Settings → Access Tokens
3. Create new token with "Read" permission
4. Copy token value

**Note**: The current model endpoint (`j-hartmann/emotion-english-distilroberta-base`) may be deprecated. Consider updating to a newer emotion classification model.

#### 2. Firebase Configuration (Existing)

```bash
# Firebase Admin SDK credentials
FIREBASE_PROJECT_ID=spotify-8fefc
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@spotify-8fefc.iam.gserviceaccount.com
```

**How to obtain**:
1. Go to Firebase Console → Project Settings
2. Service Accounts tab
3. Generate new private key
4. Extract values from downloaded JSON file

#### 3. Frontend URL (Existing)

```bash
# Frontend URL for CORS and share links
FRONTEND_URL=https://mavrixfy.site
```

### Optional Configuration Variables

#### 4. Feature Flags

```bash
# Enable/disable mood playlist feature
MOOD_PLAYLIST_ENABLED=true

# Cache TTL in hours (default: 24)
MOOD_PLAYLIST_CACHE_TTL_HOURS=24

# Free user daily limit (default: 3)
MOOD_PLAYLIST_FREE_LIMIT=3
```

#### 5. Performance Tuning

```bash
# HuggingFace API timeout in milliseconds (default: 5000)
HUGGINGFACE_TIMEOUT_MS=5000

# Maximum songs to query for randomization (default: 100)
PLAYLIST_QUERY_LIMIT=100
```

---

## Firebase Firestore Configuration

### Required Collections

The following Firestore collections must exist:

1. **`mood_playlist_cache`**
   - Purpose: Store cached playlists
   - TTL: 24 hours (automatic cleanup)
   - Indexes: `moodText` (unique), `expiresAt`

2. **`mood_playlist_rate_limits`**
   - Purpose: Track user generation counts
   - Indexes: `userId` (primary key), `resetAt`

3. **`mood_playlist_analytics`**
   - Purpose: Store analytics events
   - Indexes: `userId`, `eventType`, `timestamp`, composite: `userId + eventType + timestamp`

4. **`playlist_shares`**
   - Purpose: Store share link mappings
   - Indexes: `shareId` (primary key), `playlistId`

5. **`songs`** (Existing collection)
   - New field: `moodTags` (array of strings)
   - New index: Composite `genre + moodTags`

6. **`playlists`** (Existing collection)
   - New fields: `moodGenerated`, `emotion`, `moodText`, `generatedAt`

### Firestore Indexes

Create the following composite indexes:

```javascript
// songs collection
{
  collectionGroup: "songs",
  queryScope: "COLLECTION",
  fields: [
    { fieldPath: "genre", order: "ASCENDING" },
    { fieldPath: "moodTags", arrayConfig: "CONTAINS" }
  ]
}

// mood_playlist_analytics collection
{
  collectionGroup: "mood_playlist_analytics",
  queryScope: "COLLECTION",
  fields: [
    { fieldPath: "userId", order: "ASCENDING" },
    { fieldPath: "eventType", order: "ASCENDING" },
    { fieldPath: "timestamp", order: "DESCENDING" }
  ]
}
```

### Firestore Security Rules

Add the following rules to `firestore.rules`:

```javascript
// Mood playlist cache (server-side only)
match /mood_playlist_cache/{cacheId} {
  allow read, write: if false; // Server-side only
}

// Rate limits (server-side only)
match /mood_playlist_rate_limits/{userId} {
  allow read, write: if false; // Server-side only
}

// Analytics (server-side only)
match /mood_playlist_analytics/{eventId} {
  allow read, write: if false; // Server-side only
}

// Playlist shares (public read, server-side write)
match /playlist_shares/{shareId} {
  allow read: if true; // Public access for share links
  allow write: if false; // Server-side only
}

// Playlists (existing rules + mood-generated playlists)
match /playlists/{playlistId} {
  allow read: if request.auth != null && 
    (resource.data.createdBy.uid == request.auth.uid || resource.data.isPublic == true);
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null && 
    resource.data.createdBy.uid == request.auth.uid;
}
```

---

## Database Migration

### Step 1: Add moodTags field to songs collection

Run this migration script to add empty `moodTags` array to existing songs:

```javascript
// backend/scripts/migrate-songs-moodtags.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const db = admin.firestore();

async function migrateSongs() {
  console.log('Starting songs migration...');
  
  const songsRef = db.collection('songs');
  const snapshot = await songsRef.get();
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach((doc) => {
    if (!doc.data().moodTags) {
      batch.update(doc.ref, { moodTags: [] });
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`✅ Updated ${count} songs with moodTags field`);
  } else {
    console.log('✅ All songs already have moodTags field');
  }
}

migrateSongs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
```

Run with:
```bash
cd backend
node scripts/migrate-songs-moodtags.js
```

### Step 2: Create Firestore collections

Collections are created automatically on first write. No manual action needed.

### Step 3: Create Firestore indexes

1. Go to Firebase Console → Firestore → Indexes
2. Click "Create Index"
3. Add the composite indexes listed above
4. Wait for index creation to complete (5-10 minutes)

---

## Application Configuration

### Backend Configuration

**File**: `backend/src/config/moodPlaylist.js`

```javascript
export const MOOD_PLAYLIST_CONFIG = {
  // Feature flag
  enabled: process.env.MOOD_PLAYLIST_ENABLED === 'true',
  
  // Cache configuration
  cacheTTLHours: parseInt(process.env.MOOD_PLAYLIST_CACHE_TTL_HOURS || '24'),
  
  // Rate limiting
  freeDailyLimit: parseInt(process.env.MOOD_PLAYLIST_FREE_LIMIT || '3'),
  
  // HuggingFace API
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
  huggingfaceTimeout: parseInt(process.env.HUGGINGFACE_TIMEOUT_MS || '5000'),
  huggingfaceModel: 'j-hartmann/emotion-english-distilroberta-base',
  
  // Playlist generation
  playlistSize: 20,
  queryLimit: parseInt(process.env.PLAYLIST_QUERY_LIMIT || '100'),
  
  // Performance targets
  performance: {
    cacheHitTarget: 1000,      // 1 second
    cacheMissTarget: 10000,    // 10 seconds
    genreMappingTarget: 100,   // 100ms
    fallbackTarget: 500,       // 500ms
    saveTarget: 2000,          // 2 seconds
    shareTarget: 1000          // 1 second
  }
};
```

### Frontend Configuration

**File**: `frontend/src/config/moodPlaylist.ts`

```typescript
export const MOOD_PLAYLIST_CONFIG = {
  // Input validation
  minMoodTextLength: 3,
  maxMoodTextLength: 200,
  
  // UI configuration
  loadingMessage: 'Analyzing your vibe…',
  
  // Rate limit display
  showRateLimitWarning: true,
  rateLimitWarningThreshold: 1, // Show warning when 1 generation remaining
  
  // Error messages
  errors: {
    validation: 'Please enter a mood description between 3 and 200 characters',
    rateLimit: 'You\'ve reached your daily limit. Upgrade to premium for unlimited generations!',
    server: 'Something went wrong. Please try again.',
    timeout: 'Request timed out. Please try again.',
    network: 'Network error. Please check your connection.'
  }
};
```

---

## Monitoring Configuration

### Metrics to Track

Configure your monitoring system (e.g., Firebase Performance Monitoring, Datadog, New Relic) to track:

1. **Response Time Metrics**
   - `mood_playlist.response_time.cache_hit`
   - `mood_playlist.response_time.cache_miss`
   - `mood_playlist.response_time.save`
   - `mood_playlist.response_time.share`

2. **Success Rate Metrics**
   - `mood_playlist.success_rate`
   - `mood_playlist.huggingface_api.success_rate`
   - `mood_playlist.fallback_usage_rate`

3. **Cache Metrics**
   - `mood_playlist.cache.hit_rate`
   - `mood_playlist.cache.miss_rate`
   - `mood_playlist.cache.size`

4. **Rate Limiting Metrics**
   - `mood_playlist.rate_limit.hits`
   - `mood_playlist.rate_limit.free_users`
   - `mood_playlist.rate_limit.premium_conversions`

5. **Error Metrics**
   - `mood_playlist.errors.validation`
   - `mood_playlist.errors.api`
   - `mood_playlist.errors.database`
   - `mood_playlist.errors.timeout`

### Alert Configuration

Set up alerts for:

```yaml
alerts:
  - name: "High Response Time (Cache Miss)"
    condition: "mood_playlist.response_time.cache_miss > 10s"
    severity: "warning"
    
  - name: "Critical Response Time (Cache Miss)"
    condition: "mood_playlist.response_time.cache_miss > 15s"
    severity: "critical"
    
  - name: "Low Cache Hit Rate"
    condition: "mood_playlist.cache.hit_rate < 50%"
    severity: "warning"
    
  - name: "HuggingFace API Failure Rate"
    condition: "mood_playlist.huggingface_api.success_rate < 90%"
    severity: "warning"
    
  - name: "High Error Rate"
    condition: "mood_playlist.errors.total > 5%"
    severity: "critical"
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Set all required environment variables
- [ ] Run database migration script
- [ ] Create Firestore indexes
- [ ] Update Firestore security rules
- [ ] Test HuggingFace API key
- [ ] Verify Firebase credentials
- [ ] Run all tests (`npm test`)
- [ ] Build frontend and backend
- [ ] Test in staging environment

### Deployment

- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Verify environment variables in production
- [ ] Test API endpoints in production
- [ ] Monitor error logs for first hour
- [ ] Check performance metrics

### Post-Deployment

- [ ] Verify all 14 requirements working
- [ ] Test rate limiting with free user
- [ ] Test unlimited access with premium user
- [ ] Generate test playlists
- [ ] Test save and share functionality
- [ ] Monitor analytics events
- [ ] Check cache hit rate after 24 hours
- [ ] Review performance metrics

---

## Troubleshooting

### Common Issues

#### 1. HuggingFace API 410 Error

**Symptom**: Emotion detection always uses fallback  
**Cause**: Model endpoint deprecated  
**Solution**: Update `HUGGINGFACE_MODEL` to newer emotion classification model

#### 2. Firebase Permission Denied

**Symptom**: Firestore operations fail with permission-denied  
**Cause**: Security rules not updated or service account lacks permissions  
**Solution**: 
- Update Firestore security rules
- Verify service account has Firestore permissions

#### 3. Cache Not Working

**Symptom**: All requests are cache misses  
**Cause**: Cache normalization issue or TTL expired  
**Solution**:
- Check `mood_playlist_cache` collection in Firestore
- Verify `expiresAt` field is set correctly
- Check cache key normalization logic

#### 4. Rate Limiting Not Working

**Symptom**: Free users can generate unlimited playlists  
**Cause**: Premium status check failing or rate limit collection not created  
**Solution**:
- Verify `mood_playlist_rate_limits` collection exists
- Check user's premium status in Firebase
- Review rate limiter logs

#### 5. Slow Response Times

**Symptom**: Requests taking > 10 seconds  
**Cause**: HuggingFace API slow, database queries slow, or network issues  
**Solution**:
- Check HuggingFace API response time
- Verify Firestore indexes are created
- Monitor network latency
- Consider increasing timeout values

---

## Configuration Examples

### Development Environment

```bash
# .env.development
HUGGINGFACE_API_KEY=hf_dev_key_123
FIREBASE_PROJECT_ID=spotify-8fefc-dev
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-dev@...
FRONTEND_URL=http://localhost:3000
MOOD_PLAYLIST_ENABLED=true
MOOD_PLAYLIST_CACHE_TTL_HOURS=1
MOOD_PLAYLIST_FREE_LIMIT=10
```

### Staging Environment

```bash
# .env.staging
HUGGINGFACE_API_KEY=hf_staging_key_456
FIREBASE_PROJECT_ID=spotify-8fefc-staging
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-staging@...
FRONTEND_URL=https://staging.mavrixfy.site
MOOD_PLAYLIST_ENABLED=true
MOOD_PLAYLIST_CACHE_TTL_HOURS=24
MOOD_PLAYLIST_FREE_LIMIT=3
```

### Production Environment

```bash
# .env.production
HUGGINGFACE_API_KEY=hf_prod_key_789
FIREBASE_PROJECT_ID=spotify-8fefc
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FRONTEND_URL=https://mavrixfy.site
MOOD_PLAYLIST_ENABLED=true
MOOD_PLAYLIST_CACHE_TTL_HOURS=24
MOOD_PLAYLIST_FREE_LIMIT=3
```

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Rotate API keys** regularly (every 90 days)
3. **Use different Firebase projects** for dev/staging/production
4. **Limit service account permissions** to minimum required
5. **Enable Firebase App Check** to prevent API abuse
6. **Monitor API usage** to detect anomalies
7. **Set up rate limiting** at infrastructure level (e.g., Cloudflare)
8. **Encrypt sensitive environment variables** in CI/CD pipelines

---

## Support

For configuration issues:
- Check logs in Firebase Console → Functions → Logs
- Review Firestore security rules
- Verify environment variables are set correctly
- Contact: devops@mavrixfy.site
