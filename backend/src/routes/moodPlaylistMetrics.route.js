/**
 * Mood Playlist Metrics API Routes
 * 
 * Endpoints for monitoring and alerting
 */

const express = require('express');
const router = express.Router();
const metricsCollector = require('../services/moodPlaylist/metricsCollector');
const { protectRoute } = require('../middleware/auth.middleware');

/**
 * GET /api/mood-playlist/metrics/dashboard
 * Get dashboard summary with metrics and alerts
 * Admin only
 */
router.get('/dashboard', protectRoute, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const timeWindowHours = parseInt(req.query.hours) || 24;
    const summary = await metricsCollector.getDashboardSummary(timeWindowHours);

    res.json(summary);
  } catch (error) {
    console.error('Failed to get dashboard summary:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve metrics dashboard'
    });
  }
});

/**
 * GET /api/mood-playlist/metrics
 * Get metrics for a specific time window
 * Admin only
 */
router.get('/', protectRoute, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const hours = parseInt(req.query.hours) || 24;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const metrics = await metricsCollector.getMetrics(startTime);

    res.json({
      timeWindow: `${hours} hours`,
      metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve metrics'
    });
  }
});

/**
 * GET /api/mood-playlist/metrics/alerts
 * Get recent alerts
 * Admin only
 */
router.get('/alerts', protectRoute, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const alerts = await metricsCollector.getRecentAlerts(limit);

    res.json({
      alerts,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to get alerts:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve alerts'
    });
  }
});

/**
 * POST /api/mood-playlist/metrics/alerts/:alertId/resolve
 * Mark an alert as resolved
 * Admin only
 */
router.post('/alerts/:alertId/resolve', protectRoute, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const { alertId } = req.params;
    await metricsCollector.resolveAlert(alertId);

    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resolve alert'
    });
  }
});

/**
 * POST /api/mood-playlist/metrics/check-alerts
 * Manually trigger alert check
 * Admin only
 */
router.post('/check-alerts', protectRoute, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const timeWindowMinutes = parseInt(req.query.minutes) || 60;
    const alerts = await metricsCollector.checkAlerts(timeWindowMinutes);

    res.json({
      alerts,
      count: alerts.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to check alerts:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check alerts'
    });
  }
});

module.exports = router;
