/**
 * Alert Scheduler for AI Mood Playlist Generator
 * 
 * Periodically checks metrics and triggers alerts when thresholds are exceeded
 * 
 * Requirements: 2.6, 8.5, 14.1, 14.2
 */

import metricsCollector from './metricsCollector.js';
import axios from 'axios';

class AlertScheduler {
  constructor() {
    this.checkInterval = parseInt(process.env.MOOD_PLAYLIST_ALERT_CHECK_INTERVAL) || 15; // minutes
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start the alert scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('[AlertScheduler] Already running');
      return;
    }

    console.log(`[AlertScheduler] Starting with ${this.checkInterval} minute interval`);
    
    // Run immediately on start
    this.checkAlerts();
    
    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkAlerts();
    }, this.checkInterval * 60 * 1000);
    
    this.isRunning = true;
  }

  /**
   * Stop the alert scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('[AlertScheduler] Not running');
      return;
    }

    console.log('[AlertScheduler] Stopping');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }

  /**
   * Check for alerts
   */
  async checkAlerts() {
    try {
      console.log('[AlertScheduler] Checking alerts...');
      
      const alerts = await metricsCollector.checkAlerts(this.checkInterval);
      
      if (alerts.length > 0) {
        console.log(`[AlertScheduler] Found ${alerts.length} alerts:`, alerts);
        
        // Send notifications
        await this.sendNotifications(alerts);
      } else {
        console.log('[AlertScheduler] No alerts found');
      }
    } catch (error) {
      console.error('[AlertScheduler] Error checking alerts:', error);
    }
  }

  /**
   * Send notifications for alerts
   */
  async sendNotifications(alerts) {
    // Email notifications
    if (process.env.MOOD_PLAYLIST_ALERT_EMAIL) {
      await this.sendEmailNotification(alerts);
    }
    
    // Slack notifications
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackNotification(alerts);
    }
    
    // Console notification (always)
    this.logAlertsToConsole(alerts);
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(alerts) {
    try {
      // Import email service if available
      const { sendEmail } = await import('../email.service.js');
      
      const subject = `[ALERT] Mood Playlist Monitoring - ${alerts.length} alert(s)`;
      const body = this.formatEmailBody(alerts);
      
      await emailService.sendEmail({
        to: process.env.MOOD_PLAYLIST_ALERT_EMAIL,
        subject,
        text: body,
        html: this.formatEmailBodyHtml(alerts)
      });
      
      console.log('[AlertScheduler] Email notification sent');
    } catch (error) {
      console.error('[AlertScheduler] Failed to send email notification:', error);
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(alerts) {
    try {
      
      const message = {
        text: `🚨 Mood Playlist Alerts (${alerts.length})`,
        attachments: alerts.map(a => ({
          color: this.getSeverityColor(a.severity),
          text: a.message,
          fields: [
            { title: 'Type', value: a.type, short: true },
            { title: 'Severity', value: a.severity.toUpperCase(), short: true },
            { title: 'Value', value: this.formatValue(a.type, a.value), short: true },
            { title: 'Threshold', value: this.formatValue(a.type, a.threshold), short: true }
          ],
          footer: 'Mood Playlist Monitoring',
          ts: Math.floor(a.timestamp.getTime() / 1000)
        }))
      };
      
      await axios.post(process.env.SLACK_WEBHOOK_URL, message);
      
      console.log('[AlertScheduler] Slack notification sent');
    } catch (error) {
      console.error('[AlertScheduler] Failed to send Slack notification:', error);
    }
  }

  /**
   * Log alerts to console
   */
  logAlertsToConsole(alerts) {
    console.log('\n========================================');
    console.log('MOOD PLAYLIST ALERTS');
    console.log('========================================');
    
    alerts.forEach((alert, index) => {
      console.log(`\nAlert ${index + 1}:`);
      console.log(`  Type: ${alert.type}`);
      console.log(`  Severity: ${alert.severity.toUpperCase()}`);
      console.log(`  Message: ${alert.message}`);
      console.log(`  Value: ${this.formatValue(alert.type, alert.value)}`);
      console.log(`  Threshold: ${this.formatValue(alert.type, alert.threshold)}`);
      console.log(`  Time: ${alert.timestamp.toISOString()}`);
    });
    
    console.log('\n========================================\n');
  }

  /**
   * Format email body (plain text)
   */
  formatEmailBody(alerts) {
    let body = 'Mood Playlist Monitoring Alerts\n';
    body += '================================\n\n';
    
    alerts.forEach((alert, index) => {
      body += `Alert ${index + 1}:\n`;
      body += `  Type: ${alert.type}\n`;
      body += `  Severity: ${alert.severity.toUpperCase()}\n`;
      body += `  Message: ${alert.message}\n`;
      body += `  Value: ${this.formatValue(alert.type, alert.value)}\n`;
      body += `  Threshold: ${this.formatValue(alert.type, alert.threshold)}\n`;
      body += `  Time: ${alert.timestamp.toISOString()}\n\n`;
    });
    
    body += '\nPlease investigate and resolve these alerts.\n';
    body += 'View dashboard: https://mavrixfy.site/admin/mood-playlist-metrics\n';
    
    return body;
  }

  /**
   * Format email body (HTML)
   */
  formatEmailBodyHtml(alerts) {
    let html = '<h2>Mood Playlist Monitoring Alerts</h2>';
    html += '<table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">';
    html += '<tr><th>Type</th><th>Severity</th><th>Message</th><th>Value</th><th>Threshold</th><th>Time</th></tr>';
    
    alerts.forEach(alert => {
      const severityColor = this.getSeverityColor(alert.severity);
      html += '<tr>';
      html += `<td>${alert.type}</td>`;
      html += `<td style="background-color: ${severityColor}; color: white; font-weight: bold;">${alert.severity.toUpperCase()}</td>`;
      html += `<td>${alert.message}</td>`;
      html += `<td>${this.formatValue(alert.type, alert.value)}</td>`;
      html += `<td>${this.formatValue(alert.type, alert.threshold)}</td>`;
      html += `<td>${alert.timestamp.toISOString()}</td>`;
      html += '</tr>';
    });
    
    html += '</table>';
    html += '<p>Please investigate and resolve these alerts.</p>';
    html += '<p><a href="https://mavrixfy.site/admin/mood-playlist-metrics">View Dashboard</a></p>';
    
    return html;
  }

  /**
   * Get severity color for Slack/HTML
   */
  getSeverityColor(severity) {
    switch (severity) {
      case 'high':
        return '#d32f2f'; // Red
      case 'medium':
        return '#f57c00'; // Orange
      case 'low':
        return '#fbc02d'; // Yellow
      default:
        return '#757575'; // Gray
    }
  }

  /**
   * Format value based on alert type
   */
  formatValue(type, value) {
    if (type === 'response_time') {
      return `${(value / 1000).toFixed(2)}s`;
    } else if (type.includes('rate')) {
      return `${(value * 100).toFixed(2)}%`;
    }
    return value.toString();
  }
}

// Export singleton instance
export default new AlertScheduler();
