# Monitoring Integration Guide

## Step 1: Add Metrics Route to Main App

Add the metrics route to your main Express application:

```javascript
// backend/src/index.js

// Import the metrics route
import moodPlaylistMetricsRoute from './routes/moodPlaylistMetrics.route.js';

// Register the route (add after other routes)
app.use('/api/mood-playlist/metrics', moodPlaylistMetricsRoute);
```

## Step 2: Start Alert Scheduler (Optional)

To enable automatic alert checking, add the alert scheduler to your server startup:

```javascript
// backend/src/index.js

import alertScheduler from './services/moodPlaylist/alertScheduler.js';

// Start the alert scheduler after server starts
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start alert scheduler if metrics are enabled
  if (process.env.MOOD_PLAYLIST_METRICS_ENABLED === 'true') {
    alertScheduler.start();
    console.log('Alert scheduler started');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  alertScheduler.stop();
  process.exit(0);
});
```

## Step 3: Create Firestore Indexes

Create the following indexes in Firebase Console:

### mood_playlist_metrics collection
1. Go to Firebase Console → Firestore Database → Indexes
2. Create composite index:
   - Collection: `mood_playlist_metrics`
   - Fields: `timestamp` (Ascending)
   - Query scope: Collection

### mood_playlist_alerts collection
1. Create composite index:
   - Collection: `mood_playlist_alerts`
   - Fields: `timestamp` (Descending)
   - Query scope: Collection

## Step 4: Configure Environment Variables

Add to your `.env` file:

```bash
# Monitoring Configuration
MOOD_PLAYLIST_METRICS_ENABLED=true
MOOD_PLAYLIST_ALERT_CHECK_INTERVAL=15
MOOD_PLAYLIST_ALERT_EMAIL=admin@mavrixfy.site
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Step 5: Test the Integration

### Test Metrics Collection
```bash
# Generate a test request
curl -X POST http://localhost:5000/api/playlists/mood-generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"moodText": "feeling happy today"}'

# Check if metrics were recorded
curl -X GET http://localhost:5000/api/mood-playlist/metrics?hours=1 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Test Alert System
```bash
# Manually trigger alert check
curl -X POST http://localhost:5000/api/mood-playlist/metrics/check-alerts?minutes=60 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Test Dashboard
```bash
# Get dashboard summary
curl -X GET http://localhost:5000/api/mood-playlist/metrics/dashboard?hours=24 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Step 6: Set Up Admin Access

Ensure your admin middleware checks for admin users. Update if needed:

```javascript
// backend/src/middleware/auth.middleware.js

export const protectRoute = async (req, res, next) => {
  try {
    // ... existing auth logic ...
    
    // Add admin check (example)
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    
    req.user = {
      ...user,
      isAdmin: userData?.isAdmin || false,
      isPremium: userData?.isPremium || false
    };
    
    next();
  } catch (error) {
    // ... error handling ...
  }
};
```

## Step 7: Create Admin Dashboard (Frontend)

Create a simple admin dashboard to view metrics:

```typescript
// frontend/src/pages/AdminMoodPlaylistMetrics.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminMoodPlaylistMetrics = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get('/api/mood-playlist/metrics/dashboard?hours=24');
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!dashboard) return <div>No data available</div>;

  return (
    <div className="admin-metrics">
      <h1>Mood Playlist Metrics</h1>
      
      <div className="metrics-overview">
        <div className="metric-card">
          <h3>Total Requests</h3>
          <p>{dashboard.metrics.totalRequests}</p>
        </div>
        
        <div className="metric-card">
          <h3>Success Rate</h3>
          <p>{(dashboard.metrics.successRate * 100).toFixed(2)}%</p>
        </div>
        
        <div className="metric-card">
          <h3>Avg Response Time</h3>
          <p>{(dashboard.metrics.avgResponseTime / 1000).toFixed(2)}s</p>
        </div>
        
        <div className="metric-card">
          <h3>Cache Hit Rate</h3>
          <p>{(dashboard.metrics.cacheHitRate * 100).toFixed(2)}%</p>
        </div>
      </div>
      
      {dashboard.alerts.length > 0 && (
        <div className="alerts-section">
          <h2>Active Alerts</h2>
          {dashboard.alerts.map((alert, index) => (
            <div key={index} className={`alert alert-${alert.severity}`}>
              <strong>{alert.type}</strong>: {alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMoodPlaylistMetrics;
```

## Verification Checklist

- [ ] Metrics route added to main app
- [ ] Alert scheduler started (optional)
- [ ] Firestore indexes created
- [ ] Environment variables configured
- [ ] Test requests generate metrics
- [ ] Dashboard endpoint returns data
- [ ] Alerts trigger when thresholds exceeded
- [ ] Admin access configured
- [ ] Frontend dashboard created (optional)

## Troubleshooting

### Metrics not being recorded
- Check that `MOOD_PLAYLIST_METRICS_ENABLED=true` in .env
- Verify metricsCollector is imported in moodPlaylist.route.js
- Check console for errors during metric recording

### Alerts not triggering
- Verify alert scheduler is started
- Check `MOOD_PLAYLIST_ALERT_CHECK_INTERVAL` setting
- Ensure thresholds are being exceeded
- Check console for scheduler errors

### Dashboard returns 403 Forbidden
- Verify user has admin privileges
- Check admin middleware implementation
- Ensure proper authentication token

## Next Steps

1. Set up email service for alert notifications
2. Configure Slack webhook for real-time alerts
3. Create custom dashboard visualizations
4. Set up data retention policies
5. Configure backup and archival

For more details, see MONITORING.md
