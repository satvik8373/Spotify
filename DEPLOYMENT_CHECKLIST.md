# Spotify Sync - Deployment Checklist

## Pre-Deployment Setup

### 1. Spotify Developer Account
- [ ] Create/access Spotify Developer account at https://developer.spotify.com/dashboard
- [ ] Create new app or use existing app
- [ ] Note down Client ID
- [ ] Note down Client Secret
- [ ] Add redirect URIs:
  - [ ] Development: `http://localhost:5173/spotify-callback`
  - [ ] Production: `https://your-domain.com/spotify-callback`
- [ ] Verify app settings and scopes

### 2. Firebase Setup
- [ ] Firebase project created
- [ ] Firestore database enabled
- [ ] Firebase Authentication enabled
- [ ] Firebase Admin SDK credentials available
- [ ] Project ID noted: `spotify-8fefc`

### 3. Environment Variables

#### Backend (.env)
- [ ] `SPOTIFY_CLIENT_ID` - From Spotify Dashboard
- [ ] `SPOTIFY_CLIENT_SECRET` - From Spotify Dashboard
- [ ] `SPOTIFY_REDIRECT_URI` - Your callback URL
- [ ] `FIREBASE_PROJECT_ID` - Firebase project ID
- [ ] `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- [ ] `FIREBASE_DATABASE_URL` - Firebase database URL
- [ ] `FRONTEND_URL` - Your frontend URL
- [ ] `PORT` - Backend port (default: 5000)

#### Frontend (.env)
- [ ] `VITE_SPOTIFY_CLIENT_ID` - From Spotify Dashboard
- [ ] `VITE_SPOTIFY_CLIENT_SECRET` - From Spotify Dashboard
- [ ] `VITE_REDIRECT_URI` - Your callback URL
- [ ] `VITE_API_URL` - Your backend URL
- [ ] Firebase config variables (if not hardcoded)

## Code Integration

### 4. Backend Integration
- [ ] Backend routes exist: `backend/src/routes/spotify.route.js`
- [ ] Backend services exist:
  - [ ] `backend/src/services/spotify.service.js`
  - [ ] `backend/src/services/spotifyTokenService.js`
  - [ ] `backend/src/services/spotifySyncService.js`
- [ ] Routes registered in `backend/src/index.js`
- [ ] Firebase Admin initialized in `backend/src/config/firebase.js`
- [ ] CORS configured for your frontend domain

### 5. Frontend Integration

#### Web App
- [ ] `SpotifySyncManager` component added to dashboard/settings
- [ ] Spotify callback route exists: `/spotify-callback`
- [ ] Services imported and working:
  - [ ] `spotifyService.ts`
  - [ ] `spotifySync.ts`
- [ ] Firebase initialized in `lib/firebase.ts`

#### Mobile App
- [ ] `MobileSyncedSongs` component added to liked songs page
- [ ] `mobileLikedSongsService.ts` imported
- [ ] Firebase Auth working
- [ ] Firestore listeners set up

### 6. Firestore Security Rules
- [ ] Rules file updated: `firestore.rules`
- [ ] Rules include:
  - [ ] User data isolation
  - [ ] Spotify tokens protection
  - [ ] Liked songs access control
  - [ ] Sync metadata access control
- [ ] Rules deployed: `firebase deploy --only firestore:rules`
- [ ] Rules tested in Firebase Console

## Testing

### 7. Local Testing

#### Backend Tests
- [ ] Backend starts without errors
- [ ] `/api/spotify/login` returns auth URL
- [ ] Environment variables loaded correctly
- [ ] Firebase connection working
- [ ] Spotify API credentials valid

#### Frontend Tests
- [ ] Frontend starts without errors
- [ ] Can navigate to Spotify sync page
- [ ] "Connect Spotify" button appears
- [ ] Environment variables loaded correctly
- [ ] Firebase connection working

#### Integration Tests
- [ ] Click "Connect Spotify" redirects to Spotify
- [ ] After authorization, redirects back to app
- [ ] Tokens stored in Firestore
- [ ] Initial sync completes successfully
- [ ] Songs appear in Firestore
- [ ] Mobile app can read songs
- [ ] Real-time updates work

### 8. Browser Console Tests
- [ ] Run `testSpotifySync.quick()` - passes
- [ ] Run `testSpotifySync.web()` - passes
- [ ] Run `testSpotifySync.mobile()` - passes
- [ ] Run `testSpotifySync.fullSync()` - passes
- [ ] No console errors

### 9. Manual Testing Checklist

#### Web App Flow
- [ ] User can click "Connect Spotify"
- [ ] Redirects to Spotify OAuth
- [ ] User can authorize app
- [ ] Redirects back to app successfully
- [ ] Sync status shows "completed"
- [ ] Song count matches Spotify
- [ ] Manual sync button works
- [ ] Disconnect button works
- [ ] Error messages display correctly
- [ ] Loading states work

#### Mobile App Flow
- [ ] User can login with Firebase Auth
- [ ] Songs load automatically
- [ ] Song count matches web app
- [ ] Search functionality works
- [ ] Sync status displays correctly
- [ ] Real-time updates work
- [ ] Offline mode works (cached data)
- [ ] Song click handlers work
- [ ] Pull-to-refresh works (if implemented)

## Production Deployment

### 10. Backend Deployment

#### Vercel/Netlify
- [ ] Environment variables set in dashboard
- [ ] Build command configured
- [ ] Start command configured
- [ ] Domain configured
- [ ] HTTPS enabled
- [ ] CORS configured for production domain

#### Other Platforms
- [ ] Environment variables set
- [ ] Node.js version specified (20.x)
- [ ] Dependencies installed
- [ ] Build successful
- [ ] Health check endpoint working

### 11. Frontend Deployment

#### Vercel/Netlify
- [ ] Environment variables set in dashboard
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Domain configured
- [ ] HTTPS enabled
- [ ] Redirects configured for SPA

#### Other Platforms
- [ ] Environment variables set
- [ ] Build successful
- [ ] Static files served correctly
- [ ] Routing works (SPA mode)

### 12. Firebase Deployment
- [ ] Firestore rules deployed
- [ ] Security rules tested
- [ ] Indexes created (if needed)
- [ ] Billing enabled (if needed)
- [ ] Quotas checked

### 13. Spotify App Configuration
- [ ] Production redirect URI added
- [ ] App status: Development or Extended Quota Mode
- [ ] Rate limits understood
- [ ] Terms of Service accepted

## Post-Deployment Verification

### 14. Production Testing

#### Smoke Tests
- [ ] Backend health check: `GET /`
- [ ] Frontend loads without errors
- [ ] Can access Spotify sync page
- [ ] "Connect Spotify" button works
- [ ] OAuth flow completes successfully
- [ ] Tokens stored in Firestore
- [ ] Sync completes successfully
- [ ] Mobile app can read songs

#### End-to-End Tests
- [ ] Create new test user
- [ ] Connect Spotify account
- [ ] Verify songs sync
- [ ] Check mobile app shows songs
- [ ] Test search functionality
- [ ] Test manual sync
- [ ] Test disconnect
- [ ] Test reconnect

### 15. Performance Checks
- [ ] Initial sync time acceptable (<10s for 100 songs)
- [ ] Mobile app loads instantly
- [ ] Search is responsive (<100ms)
- [ ] Real-time updates work (<1s delay)
- [ ] No memory leaks
- [ ] No excessive API calls

### 16. Security Verification
- [ ] Client Secret not exposed in frontend
- [ ] Tokens stored securely in Firestore
- [ ] User data isolated (test with multiple users)
- [ ] Firestore rules prevent unauthorized access
- [ ] HTTPS enforced everywhere
- [ ] No sensitive data in logs

## Monitoring Setup

### 17. Logging
- [ ] Backend logs configured
- [ ] Frontend error tracking (Sentry, etc.)
- [ ] Firestore audit logs enabled
- [ ] Spotify API errors logged
- [ ] Sync failures logged

### 18. Metrics
- [ ] Track sync success rate
- [ ] Track sync duration
- [ ] Track API error rates
- [ ] Track user adoption
- [ ] Track token refresh rate

### 19. Alerts
- [ ] Alert on sync failures
- [ ] Alert on high error rates
- [ ] Alert on quota limits
- [ ] Alert on token refresh failures

## Documentation

### 20. User Documentation
- [ ] How to connect Spotify
- [ ] How to sync songs
- [ ] How to disconnect
- [ ] Troubleshooting guide
- [ ] FAQ

### 21. Developer Documentation
- [ ] API endpoints documented
- [ ] Data structure documented
- [ ] Security model documented
- [ ] Deployment process documented
- [ ] Testing procedures documented

## Maintenance

### 22. Regular Tasks
- [ ] Monitor sync success rates
- [ ] Review error logs weekly
- [ ] Check Spotify API quota usage
- [ ] Update dependencies monthly
- [ ] Review security rules quarterly

### 23. Backup & Recovery
- [ ] Firestore backup enabled
- [ ] Recovery procedure documented
- [ ] Test restore process
- [ ] User data export available

## Rollback Plan

### 24. Rollback Preparation
- [ ] Previous version tagged in git
- [ ] Rollback procedure documented
- [ ] Database migration reversible
- [ ] Environment variables backed up

## Launch Checklist

### 25. Pre-Launch
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Team trained

### 26. Launch
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Deploy Firestore rules
- [ ] Update Spotify app settings
- [ ] Verify production works
- [ ] Monitor for issues

### 27. Post-Launch
- [ ] Monitor logs for 24 hours
- [ ] Check error rates
- [ ] Verify user adoption
- [ ] Collect feedback
- [ ] Address issues promptly

## Success Criteria

### 28. Metrics to Track
- [ ] Sync success rate > 95%
- [ ] Average sync time < 5 seconds
- [ ] Mobile load time < 1 second
- [ ] Error rate < 1%
- [ ] User satisfaction > 4/5

## Support

### 29. Support Resources
- [ ] Support email configured
- [ ] FAQ page created
- [ ] Troubleshooting guide available
- [ ] Contact form working
- [ ] Response time SLA defined

## Compliance

### 30. Legal & Compliance
- [ ] Spotify Terms of Service reviewed
- [ ] Privacy policy updated
- [ ] User consent obtained
- [ ] Data retention policy defined
- [ ] GDPR compliance (if applicable)

---

## Quick Deployment Commands

```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
npm run preview

# Firebase
firebase deploy --only firestore:rules

# Test
npm test
```

## Emergency Contacts

- Spotify Developer Support: https://developer.spotify.com/support
- Firebase Support: https://firebase.google.com/support
- Team Lead: [Your contact]
- DevOps: [Your contact]

---

**Deployment Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

Last Updated: [Date]
Deployed By: [Name]
Version: [Version Number]
