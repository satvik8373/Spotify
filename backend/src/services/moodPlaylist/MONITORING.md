# AI Mood Playlist Generator - Monitoring and Alerting

## Overview

This document describes the monitoring and alerting infrastructure for the AI Mood → Auto Playlist Generator feature. The system tracks key performance indicators and automatically generates alerts when metrics exceed defined thresholds.

**Requirements**: 2.6, 8.5, 14.1, 14.2

## Metrics Tracked

### 1. Success Rate
- **Definition**: Percentage of playlist generation requests that complete successfully
- **Calculation**: `(successful_requests / total_requests) * 100`
- **Target**: > 95%
- **Collection**: Automatic on every request

### 2. Response Time
- **Definition**: Time from request initiation to response delivery (milliseconds)
- **Calculation**: `response_timestamp - request_timestamp`
- **Targets**:
  - Cache hit: < 1 second (1000ms)
  - Cache miss: < 10 seconds (10000ms)
  - Average: < 8 seconds (8000ms)
- **Alert Threshold**: Average > 8 seconds
- **Collection**: Automatic on every request

### 3. API Failure Rate
- **Definition**: Percentage of HuggingFace API calls that fail or timeout
- **Calculation**: `(api_failures / api_requests) * 100`
- **Target**: < 5%
- **Alert Threshold**: > 10%
- **Collection**: Tracked when emotion analyzer uses fallback

### 4. Cache Hit Rate
- **Definition**: Percentage of requests served from cache
- **Calculation**: `(cached_requests / total_requests) * 100`
- **Target**: > 50%
- **Alert Threshold**: < 50%
- **Collection**: Automatic on every request

### 5. Error Rate
- **Definition**: Percentage of requests that result in errors
- **Calculation**: `(error_requests / total_requests) * 100`
- **Target**: < 2%
- **Alert Threshold**: > 5%
- **Collection**: Automatic on every request

## Alert Thresholds

| Metric | Threshold | Severity | Action Required |
|--------|-----------|----------|-----------------|
| API Failure Rate | > 10% | High | Check HuggingFace API status, verify API key, review fallback system |
| Response Time | > 8s average | Medium | Investigate database performance, check API latency, review caching |
| Error Rate | > 5% | High | Review error logs, check database connectivity, verify service health |
| Cache Hit Rate | < 50% | Low | Review cache TTL settings, check cache key normalization, analyze usage patterns |

## Alert Severity Levels

### High Severity
- **API Failure Rate > 10%**: Indicates HuggingFace API issues or network problems
- **Error Rate > 5%**: Indicates systemic issues affecting user experience
- **Action**: Immediate investigation required

### Medium Severity
- **Response Time > 8s**: Indicates performance degradation
- **Action**: Investigate within 1 hour

### Low Severity
- **Cache Hit Rate < 50%**: Indicates suboptimal caching
- **Action**: Review and optimize when convenient

## Data Storage

### Metrics Collection
- **Collection**: `mood_playlist_metrics`
- **Document Structure**:
```javascript
{
  userId: "string",
  success: boolean,
  responseTime: number, // milliseconds
  cached: boolean,
  apiUsed: boolean,
  apiFailed: boolean,
  errorType: "validation" | "rate_limit" | "internal" | null,
  emotion: "sadness" | "joy" | "anger" | "love" | "fear" | "surprise" | null,
  timestamp: Timestamp,
  createdAt: Timestamp
}
```

### Alerts Collection
- **Collection**: `mood_playlist_alerts`
- **Document Structure**:
```javascript
{
  alerts: [
    {
      type: "api_failure_rate" | "response_time" | "error_rate" | "cache_hit_rate",
      severity: "high" | "medium" | "low",
      message: "string",
      value: number,
      threshold: number,
      timestamp: Timestamp
    }
  ],
  metrics: {
    totalRequests: number,
    successfulRequests: number,
    errors: number,
    successRate: number,
    errorRate: number,
    avgResponseTime: number,
    cacheHitRate: number,
    cachedRequests: number,
    apiRequests: number,
    apiFailures: number,
    apiFailureRate: number
  },
  timestamp: Timestamp,
  resolved: boolean,
  resolvedAt: Timestamp (optional)
}
```

## API Endpoints

### Dashboard Summary
```
GET /api/mood-playlist/metrics/dashboard?hours=24
```
**Authentication**: Admin only

**Response**:
```json
{
  "timeWindow": "24 hours",
  "metrics": {
    "totalRequests": 1250,
    "successfulRequests": 1198,
    "errors": 52,
    "successRate": 0.9584,
    "errorRate": 0.0416,
    "avgResponseTime": 3245,
    "cacheHitRate": 0.68,
    "cachedRequests": 850,
    "apiRequests": 400,
    "apiFailures": 12,
    "apiFailureRate": 0.03
  },
  "alerts": [
    {
      "type": "cache_hit_rate",
      "severity": "low",
      "message": "Cache hit rate (48.50%) is below threshold (50%)",
      "value": 0.485,
      "threshold": 0.50,
      "timestamp": "2026-03-03T10:30:00Z"
    }
  ],
  "thresholds": {
    "apiFailureRate": 0.10,
    "responseTime": 8000,
    "errorRate": 0.05,
    "cacheHitRate": 0.50
  },
  "lastUpdated": "2026-03-03T12:00:00Z"
}
```

### Get Metrics
```
GET /api/mood-playlist/metrics?hours=24
```
**Authentication**: Admin only

**Response**:
```json
{
  "timeWindow": "24 hours",
  "metrics": {
    "totalRequests": 1250,
    "successRate": 0.9584,
    "errorRate": 0.0416,
    "avgResponseTime": 3245,
    "cacheHitRate": 0.68,
    "apiFailureRate": 0.03
  },
  "timestamp": "2026-03-03T12:00:00Z"
}
```

### Get Alerts
```
GET /api/mood-playlist/metrics/alerts?limit=10
```
**Authentication**: Admin only

**Response**:
```json
{
  "alerts": [
    {
      "id": "alert_id_123",
      "alerts": [...],
      "metrics": {...},
      "timestamp": "2026-03-03T10:30:00Z",
      "resolved": false
    }
  ],
  "timestamp": "2026-03-03T12:00:00Z"
}
```

### Resolve Alert
```
POST /api/mood-playlist/metrics/alerts/:alertId/resolve
```
**Authentication**: Admin only

**Response**:
```json
{
  "success": true,
  "message": "Alert resolved successfully"
}
```

### Manual Alert Check
```
POST /api/mood-playlist/metrics/check-alerts?minutes=60
```
**Authentication**: Admin only

**Response**:
```json
{
  "alerts": [...],
  "count": 2,
  "timestamp": "2026-03-03T12:00:00Z"
}
```

## Dashboard Setup

### Recommended Dashboard Layout

#### Overview Panel
- Total requests (24h)
- Success rate (24h)
- Average response time (24h)
- Active alerts count

#### Performance Metrics
- **Response Time Chart**: Line chart showing average response time over time
- **Success Rate Chart**: Line chart showing success rate percentage over time
- **Cache Hit Rate Chart**: Line chart showing cache hit rate over time

#### API Health
- **API Failure Rate**: Gauge showing current API failure rate
- **API Requests**: Counter showing total API requests
- **Fallback Usage**: Counter showing fallback system invocations

#### Error Tracking
- **Error Rate**: Gauge showing current error rate
- **Error Types**: Pie chart showing distribution of error types
- **Recent Errors**: Table showing last 10 errors with timestamps

#### Alerts Panel
- Active alerts with severity indicators
- Alert history (last 24 hours)
- Alert resolution status

### Firestore Indexes Required

Create the following indexes in Firebase Console:

1. **mood_playlist_metrics**
   - Composite index: `timestamp (ascending)`
   - Single field: `userId`
   - Single field: `success`
   - Single field: `cached`
   - Single field: `apiFailed`

2. **mood_playlist_alerts**
   - Composite index: `timestamp (descending)`
   - Single field: `resolved`

### Query Examples

#### Get metrics for last 24 hours
```javascript
const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
const metrics = await metricsCollector.getMetrics(startTime);
```

#### Check for alerts
```javascript
const alerts = await metricsCollector.checkAlerts(60); // Last 60 minutes
```

#### Get dashboard summary
```javascript
const summary = await metricsCollector.getDashboardSummary(24); // Last 24 hours
```

## Automated Alert Checking

### Scheduled Alert Checks

Set up a cron job or scheduled function to check alerts periodically:

```javascript
// Example: Check alerts every 15 minutes
const cron = require('node-cron');
const metricsCollector = require('./services/moodPlaylist/metricsCollector');

cron.schedule('*/15 * * * *', async () => {
  console.log('Running scheduled alert check...');
  const alerts = await metricsCollector.checkAlerts(15);
  
  if (alerts.length > 0) {
    console.log(`Found ${alerts.length} alerts:`, alerts);
    // Send notifications (email, Slack, etc.)
  }
});
```

### Integration with Notification Services

#### Email Notifications
```javascript
const sendAlertEmail = async (alerts) => {
  const emailService = require('./services/email.service');
  
  const subject = `[ALERT] Mood Playlist Monitoring - ${alerts.length} alerts`;
  const body = alerts.map(a => 
    `${a.severity.toUpperCase()}: ${a.message}`
  ).join('\n');
  
  await emailService.sendEmail({
    to: 'admin@mavrixfy.site',
    subject,
    body
  });
};
```

#### Slack Notifications
```javascript
const sendSlackAlert = async (alerts) => {
  const axios = require('axios');
  
  const message = {
    text: `🚨 Mood Playlist Alerts (${alerts.length})`,
    attachments: alerts.map(a => ({
      color: a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warning' : 'good',
      text: a.message,
      fields: [
        { title: 'Type', value: a.type, short: true },
        { title: 'Severity', value: a.severity, short: true }
      ]
    }))
  };
  
  await axios.post(process.env.SLACK_WEBHOOK_URL, message);
};
```

## Troubleshooting

### High API Failure Rate

**Possible Causes**:
- HuggingFace API service outage
- Invalid or expired API key
- Network connectivity issues
- Rate limiting from HuggingFace

**Actions**:
1. Check HuggingFace API status: https://status.huggingface.co/
2. Verify API key in environment variables
3. Check network connectivity from server
4. Review HuggingFace account usage limits
5. Verify fallback system is working correctly

### High Response Time

**Possible Causes**:
- Database query performance issues
- HuggingFace API latency
- High server load
- Network latency

**Actions**:
1. Check database query performance
2. Verify Firestore indexes are created
3. Monitor HuggingFace API response times
4. Check server CPU and memory usage
5. Review cache hit rate (low cache hit = more API calls)

### High Error Rate

**Possible Causes**:
- Database connectivity issues
- Service configuration errors
- Code bugs
- Invalid data

**Actions**:
1. Review error logs for patterns
2. Check database connectivity
3. Verify environment variables
4. Test with sample requests
5. Check for recent code deployments

### Low Cache Hit Rate

**Possible Causes**:
- Cache TTL too short
- High variety in mood text inputs
- Cache key normalization issues
- Cache storage failures

**Actions**:
1. Review cache TTL settings (default: 24 hours)
2. Analyze mood text patterns
3. Verify cache key normalization logic
4. Check cache storage success rate
5. Consider increasing cache TTL

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Success Rate | > 95% | - | Monitor |
| Cache Hit Response Time | < 1s | - | Monitor |
| Cache Miss Response Time | < 10s | - | Monitor |
| API Failure Rate | < 5% | - | Monitor |
| Cache Hit Rate | > 50% | - | Monitor |
| Error Rate | < 2% | - | Monitor |

## Maintenance

### Regular Tasks

**Daily**:
- Review dashboard for anomalies
- Check active alerts
- Monitor success rate

**Weekly**:
- Analyze trends in metrics
- Review error patterns
- Optimize cache settings if needed

**Monthly**:
- Review alert thresholds
- Analyze long-term performance trends
- Update documentation

### Data Retention

- **Metrics**: Retain for 90 days
- **Alerts**: Retain for 180 days
- **Resolved Alerts**: Archive after 30 days

Set up Firestore TTL policies or scheduled cleanup functions to manage data retention.

## Environment Variables

Add to `.env`:
```bash
# Monitoring Configuration
MOOD_PLAYLIST_METRICS_ENABLED=true
MOOD_PLAYLIST_ALERT_CHECK_INTERVAL=15 # minutes
MOOD_PLAYLIST_ALERT_EMAIL=admin@mavrixfy.site
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Integration with Existing Backend

Add the metrics route to your main Express app:

```javascript
// backend/src/index.js
import moodPlaylistMetricsRoute from './routes/moodPlaylistMetrics.route.js';

app.use('/api/mood-playlist/metrics', moodPlaylistMetricsRoute);
```

## Testing

Test the monitoring system:

```bash
# Generate test requests
curl -X POST http://localhost:5000/api/playlists/mood-generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"moodText": "feeling happy today"}'

# Check metrics
curl -X GET http://localhost:5000/api/mood-playlist/metrics/dashboard?hours=1 \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Trigger alert check
curl -X POST http://localhost:5000/api/mood-playlist/metrics/check-alerts?minutes=60 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Summary

The monitoring and alerting system provides comprehensive visibility into the AI Mood Playlist Generator's performance and health. By tracking key metrics and automatically generating alerts, the system enables proactive issue detection and resolution, ensuring a high-quality user experience.

For questions or issues, contact the development team.
