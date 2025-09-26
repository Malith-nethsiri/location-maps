const fs = require('fs').promises;
const path = require('path');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      aiRequests: 0,
      aiCosts: 0,
      pdfGenerations: 0,
      responseTimeSum: 0,
      responseTimeCount: 0
    };

    this.alerts = [];
    this.performanceLogs = [];
    this.errorLogs = [];
    this.auditLogs = [];

    // Initialize log directory
    this.initializeLogDirectory();
  }

  async initializeLogDirectory() {
    const logDir = path.join(__dirname, '../logs');
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  // Performance monitoring
  trackRequest(req, res, next) {
    const start = Date.now();
    this.metrics.requests++;

    // Track request details
    const requestLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null
    };

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.metrics.responseTimeSum += duration;
      this.metrics.responseTimeCount++;

      requestLog.duration = duration;
      requestLog.statusCode = res.statusCode;

      // Log slow requests
      if (duration > 5000) { // 5 seconds
        this.logSlowRequest(requestLog);
      }

      // Track errors
      if (res.statusCode >= 400) {
        this.metrics.errors++;
        this.logError({
          ...requestLog,
          type: 'HTTP_ERROR',
          statusCode: res.statusCode
        });
      }

      this.performanceLogs.push(requestLog);
      this.cleanupLogs();
    });

    next();
  }

  // AI usage monitoring
  trackAIUsage(model, tokens, cost, contentType, userId = null) {
    this.metrics.aiRequests++;
    this.metrics.aiCosts += cost;

    const aiLog = {
      timestamp: new Date().toISOString(),
      model,
      tokens,
      cost,
      contentType,
      userId,
      type: 'AI_USAGE'
    };

    this.auditLogs.push(aiLog);

    // Alert if AI costs are getting high
    if (this.metrics.aiCosts > 100) { // $100 threshold
      this.createAlert('HIGH_AI_COSTS', `AI costs have exceeded $100: $${this.metrics.aiCosts.toFixed(2)}`);
    }

    this.logToFile('ai-usage.log', aiLog);
  }

  // PDF generation monitoring
  trackPDFGeneration(reportId, userId, duration, success = true, error = null) {
    this.metrics.pdfGenerations++;

    const pdfLog = {
      timestamp: new Date().toISOString(),
      reportId,
      userId,
      duration,
      success,
      error: error?.message || null,
      type: 'PDF_GENERATION'
    };

    this.auditLogs.push(pdfLog);

    if (!success) {
      this.logError({
        ...pdfLog,
        type: 'PDF_GENERATION_ERROR'
      });
    }

    this.logToFile('pdf-generation.log', pdfLog);
  }

  // Database performance monitoring
  trackDatabaseQuery(query, duration, success = true, error = null) {
    const dbLog = {
      timestamp: new Date().toISOString(),
      query: query.substring(0, 200), // Truncate long queries
      duration,
      success,
      error: error?.message || null,
      type: 'DATABASE_QUERY'
    };

    // Alert on slow queries
    if (duration > 10000) { // 10 seconds
      this.createAlert('SLOW_DATABASE_QUERY', `Slow database query detected: ${duration}ms`);
    }

    if (!success) {
      this.logError({
        ...dbLog,
        type: 'DATABASE_ERROR'
      });
    }

    this.logToFile('database.log', dbLog);
  }

  // Error logging and tracking
  logError(error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message || error.toString(),
      stack: error.stack || null,
      type: error.type || 'GENERAL_ERROR',
      statusCode: error.statusCode || null,
      userId: error.userId || null,
      path: error.path || null,
      method: error.method || null,
      ip: error.ip || null
    };

    this.errorLogs.push(errorLog);
    this.logToFile('errors.log', errorLog);

    // Create alert for critical errors
    if (error.statusCode >= 500 || error.type === 'CRITICAL_ERROR') {
      this.createAlert('CRITICAL_ERROR', `Critical error: ${error.message}`);
    }
  }

  // Audit logging for sensitive operations
  logAudit(action, userId, details = {}) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      type: 'AUDIT'
    };

    this.auditLogs.push(auditLog);
    this.logToFile('audit.log', auditLog);
  }

  // Alert management
  createAlert(type, message, severity = 'medium') {
    const alert = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type,
      message,
      severity,
      acknowledged: false
    };

    this.alerts.push(alert);

    // In production, you might want to send alerts to external services
    console.warn(`[ALERT ${severity.toUpperCase()}] ${type}: ${message}`);

    // Auto-acknowledge low-severity alerts after 1 hour
    if (severity === 'low') {
      setTimeout(() => {
        this.acknowledgeAlert(alert.id);
      }, 60 * 60 * 1000);
    }

    return alert.id;
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
    }
  }

  // Log slow requests
  logSlowRequest(requestLog) {
    this.createAlert('SLOW_REQUEST', `Slow request detected: ${requestLog.method} ${requestLog.path} - ${requestLog.duration}ms`);
    this.logToFile('slow-requests.log', requestLog);
  }

  // Health check
  getHealthStatus() {
    const avgResponseTime = this.metrics.responseTimeCount > 0
      ? this.metrics.responseTimeSum / this.metrics.responseTimeCount
      : 0;

    const errorRate = this.metrics.requests > 0
      ? (this.metrics.errors / this.metrics.requests) * 100
      : 0;

    const status = errorRate > 10 || avgResponseTime > 5000 ? 'unhealthy' : 'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      metrics: {
        ...this.metrics,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      },
      alerts: this.alerts.filter(a => !a.acknowledged).length,
      uptime: process.uptime()
    };
  }

  // Get detailed metrics
  getMetrics() {
    return {
      performance: {
        totalRequests: this.metrics.requests,
        totalErrors: this.metrics.errors,
        avgResponseTime: this.metrics.responseTimeCount > 0
          ? Math.round(this.metrics.responseTimeSum / this.metrics.responseTimeCount)
          : 0,
        errorRate: this.metrics.requests > 0
          ? Math.round((this.metrics.errors / this.metrics.requests) * 10000) / 100
          : 0
      },
      ai: {
        totalRequests: this.metrics.aiRequests,
        totalCost: Math.round(this.metrics.aiCosts * 100) / 100
      },
      pdf: {
        totalGenerations: this.metrics.pdfGenerations
      },
      alerts: this.alerts.filter(a => !a.acknowledged),
      recentErrors: this.errorLogs.slice(-10),
      recentRequests: this.performanceLogs.slice(-20)
    };
  }

  // File logging
  async logToFile(filename, data) {
    try {
      const logPath = path.join(__dirname, '../logs', filename);
      const logEntry = `${JSON.stringify(data)}\n`;
      await fs.appendFile(logPath, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Cleanup old logs to prevent memory issues
  cleanupLogs() {
    const maxLogs = 1000;

    if (this.performanceLogs.length > maxLogs) {
      this.performanceLogs = this.performanceLogs.slice(-maxLogs);
    }

    if (this.errorLogs.length > maxLogs) {
      this.errorLogs = this.errorLogs.slice(-maxLogs);
    }

    if (this.auditLogs.length > maxLogs) {
      this.auditLogs = this.auditLogs.slice(-maxLogs);
    }

    // Remove old acknowledged alerts
    this.alerts = this.alerts.filter(alert =>
      !alert.acknowledged ||
      new Date() - new Date(alert.acknowledgedAt) < 24 * 60 * 60 * 1000 // Keep for 24 hours
    );
  }

  // Generate daily reports
  async generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = this.performanceLogs.filter(log =>
      log.timestamp.startsWith(today)
    );

    const report = {
      date: today,
      totalRequests: todayLogs.length,
      avgResponseTime: todayLogs.length > 0
        ? todayLogs.reduce((sum, log) => sum + log.duration, 0) / todayLogs.length
        : 0,
      errors: this.errorLogs.filter(log => log.timestamp.startsWith(today)).length,
      aiRequests: this.auditLogs.filter(log =>
        log.timestamp.startsWith(today) && log.type === 'AI_USAGE'
      ).length,
      pdfGenerations: this.auditLogs.filter(log =>
        log.timestamp.startsWith(today) && log.type === 'PDF_GENERATION'
      ).length
    };

    await this.logToFile(`daily-report-${today}.log`, report);
    return report;
  }

  // Reset metrics (useful for testing or periodic resets)
  resetMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      aiRequests: 0,
      aiCosts: 0,
      pdfGenerations: 0,
      responseTimeSum: 0,
      responseTimeCount: 0
    };
  }
}

// Export singleton instance
module.exports = new MonitoringService();