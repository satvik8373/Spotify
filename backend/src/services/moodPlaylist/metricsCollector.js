/**
 * Metrics Collector for AI Mood Playlist Generator
 * 
 * Tracks key performance indicators:
 * - Success rate
 * - Response time
 * - API failure rate
 * - Cache hit rate
 * - Error rate
 * 
 * Requirements: 2.6, 8.5, 14.1, 14.2
 */

import admin from '../../config/firebase.js';
const db = admin.firestore();

class MetricsCollector {
  constructor() {
    this.metricsCollection = 'mood_playlist_metrics';
    this.alertsCollection = 'mood_playlist_alerts';
    
    // Alert thresholds
    this.thresholds = {
      apiFailureRate: 0.10, // 10%
      responseTime: 8000, // 8 seconds
      errorRate: 0.05, // 5%
      cacheHitRate: 0.50 // 50%
    };
  }

  /**
   * Record a playlist generation request
   */
  async recordRequest(data) {
    const {
      userId,
      success,
      responseTime,
      cached,
      apiUsed,
      apiFailed,
      errorType,
      emotion,
      timestamp = new Date()
    } = data;

    try {
      await db.collection(this.metricsCollection).add({
        userId,
        success,
        responseTime,
        cached,
        apiUsed,
        apiFailed,
        errorType: errorType || null,
        emotion: emotion || null,
        timestamp,
        createdAt: timestamp
      });
    } catch (error) {
      console.error('Failed to record metrics:', error);
      // Don't throw - metrics collection should not break the main flow
    }
  }

  /**
   * Get metrics for a time window
   */
  async getMetrics(startTime, endTime = new Date()) {
    try {
      const snapshot = await db.collection(this.metricsCollection)
        .where('timestamp', '>=', startTime)
        .where('timestamp', '<=', endTime)
        .get();

      const metrics = snapshot.docs.map(doc => doc.data());
      return this.calculateAggregates(metrics);
    } catch (error) {
      console.error('Failed to retrieve metrics:', error);
      return null;
    }
  }

  /**
   * Calculate aggregate metrics
   */
  calculateAggregates(metrics) {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        errorRate: 0,
        avgResponseTime: 0,
        cacheHitRate: 0,
        apiFailureRate: 0
      };
    }

    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.success).length;
    const cachedRequests = metrics.filter(m => m.cached).length;
    const apiRequests = metrics.filter(m => m.apiUsed).length;
    const apiFailures = metrics.filter(m => m.apiFailed).length;
    const errors = metrics.filter(m => !m.success).length;

    const totalResponseTime = metrics.reduce((sum, m) => sum + (m.responseTime || 0), 0);
    const avgResponseTime = totalResponseTime / totalRequests;

    const successRate = successfulRequests / totalRequests;
    const errorRate = errors / totalRequests;
    const cacheHitRate = cachedRequests / totalRequests;
    const apiFailureRate = apiRequests > 0 ? apiFailures / apiRequests : 0;

    return {
      totalRequests,
      successfulRequests,
      errors,
      successRate,
      errorRate,
      avgResponseTime,
      cacheHitRate,
      cachedRequests,
      apiRequests,
      apiFailures,
      apiFailureRate
    };
  }

  /**
   * Check if metrics exceed alert thresholds
   */
  async checkAlerts(timeWindowMinutes = 60) {
    const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const metrics = await this.getMetrics(startTime);

    if (!metrics || metrics.totalRequests === 0) {
      return [];
    }

    const alerts = [];

    // Check API failure rate
    if (metrics.apiFailureRate > this.thresholds.apiFailureRate) {
      alerts.push({
        type: 'api_failure_rate',
        severity: 'high',
        message: `API failure rate (${(metrics.apiFailureRate * 100).toFixed(2)}%) exceeds threshold (${(this.thresholds.apiFailureRate * 100)}%)`,
        value: metrics.apiFailureRate,
        threshold: this.thresholds.apiFailureRate,
        timestamp: new Date()
      });
    }

    // Check average response time
    if (metrics.avgResponseTime > this.thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'medium',
        message: `Average response time (${(metrics.avgResponseTime / 1000).toFixed(2)}s) exceeds threshold (${this.thresholds.responseTime / 1000}s)`,
        value: metrics.avgResponseTime,
        threshold: this.thresholds.responseTime,
        timestamp: new Date()
      });
    }

    // Check error rate
    if (metrics.errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `Error rate (${(metrics.errorRate * 100).toFixed(2)}%) exceeds threshold (${(this.thresholds.errorRate * 100)}%)`,
        value: metrics.errorRate,
        threshold: this.thresholds.errorRate,
        timestamp: new Date()
      });
    }

    // Check cache hit rate (alert if BELOW threshold)
    if (metrics.cacheHitRate < this.thresholds.cacheHitRate) {
      alerts.push({
        type: 'cache_hit_rate',
        severity: 'low',
        message: `Cache hit rate (${(metrics.cacheHitRate * 100).toFixed(2)}%) is below threshold (${(this.thresholds.cacheHitRate * 100)}%)`,
        value: metrics.cacheHitRate,
        threshold: this.thresholds.cacheHitRate,
        timestamp: new Date()
      });
    }

    // Store alerts in database
    if (alerts.length > 0) {
      await this.storeAlerts(alerts, metrics);
    }

    return alerts;
  }

  /**
   * Store alerts in database
   */
  async storeAlerts(alerts, metrics) {
    try {
      const alertDoc = {
        alerts,
        metrics,
        timestamp: new Date(),
        resolved: false
      };

      await db.collection(this.alertsCollection).add(alertDoc);
    } catch (error) {
      console.error('Failed to store alerts:', error);
    }
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit = 10) {
    try {
      const snapshot = await db.collection(this.alertsCollection)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to retrieve alerts:', error);
      return [];
    }
  }

  /**
   * Mark alert as resolved
   */
  async resolveAlert(alertId) {
    try {
      await db.collection(this.alertsCollection).doc(alertId).update({
        resolved: true,
        resolvedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }

  /**
   * Get metrics summary for dashboard
   */
  async getDashboardSummary(timeWindowHours = 24) {
    const startTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const metrics = await this.getMetrics(startTime);
    const alerts = await this.getRecentAlerts(5);

    return {
      timeWindow: `${timeWindowHours} hours`,
      metrics,
      alerts: alerts.filter(a => !a.resolved),
      thresholds: this.thresholds,
      lastUpdated: new Date()
    };
  }
}

export default new MetricsCollector();
