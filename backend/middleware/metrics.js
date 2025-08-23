const prometheus = require('prom-client');

// Create a Registry to register the metrics
const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// ========================================
// HTTP PERFORMANCE METRICS
// ========================================

// HTTP Request Duration Histogram
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'endpoint_type'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10]
});

// HTTP Request Counter
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'endpoint_type']
});

// HTTP Error Rate
const httpErrorsTotal = new prometheus.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (4xx, 5xx)',
  labelNames: ['method', 'route', 'status_code', 'error_type']
});

// ========================================
// BUSINESS METRICS
// ========================================

// Game Performance Metrics
const gameScoresTotal = new prometheus.Counter({
  name: 'game_scores_total',
  help: 'Total number of game scores submitted',
  labelNames: ['difficulty', 'username', 'score_range']
});

const activeGamesGauge = new prometheus.Gauge({
  name: 'active_games_current',
  help: 'Current number of active games',
  labelNames: ['difficulty', 'status']
});

const gameCompletionTime = new prometheus.Histogram({
  name: 'game_completion_time_seconds',
  help: 'Time taken to complete games',
  labelNames: ['difficulty', 'completion_status'],
  buckets: [30, 60, 120, 300, 600, 1200, 1800]
});

const gameAccuracyRate = new prometheus.Gauge({
  name: 'game_accuracy_rate',
  help: 'Average game accuracy percentage',
  labelNames: ['difficulty']
});

// User Engagement Metrics
const uniqueUsersGauge = new prometheus.Gauge({
  name: 'unique_users_total',
  help: 'Total number of unique users',
  labelNames: ['user_type']
});

const userSessionDuration = new prometheus.Histogram({
  name: 'user_session_duration_seconds',
  help: 'User session duration',
  labelNames: ['user_type'],
  buckets: [60, 300, 900, 1800, 3600, 7200]
});

// ========================================
// INFRASTRUCTURE METRICS
// ========================================

// Database Performance
const databaseConnectionsGauge = new prometheus.Gauge({
  name: 'database_connections_current',
  help: 'Current number of database connections',
  labelNames: ['connection_type']
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const databaseErrorsTotal = new prometheus.Counter({
  name: 'database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['error_type', 'operation']
});

// Redis Performance
const redisConnectionsGauge = new prometheus.Gauge({
  name: 'redis_connections_current',
  help: 'Current number of Redis connections',
  labelNames: ['connection_type']
});

const redisOperationDuration = new prometheus.Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Redis operation execution time',
  labelNames: ['operation_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
});

const redisCacheHitRate = new prometheus.Gauge({
  name: 'redis_cache_hit_rate',
  help: 'Redis cache hit rate percentage',
  labelNames: ['cache_type']
});

// ========================================
// SYSTEM HEALTH METRICS
// ========================================

// Application Health
const appHealthGauge = new prometheus.Gauge({
  name: 'app_health_status',
  help: 'Application health status (1=healthy, 0=unhealthy)',
  labelNames: ['service', 'component']
});

const appUptimeSeconds = new prometheus.Counter({
  name: 'app_uptime_seconds_total',
  help: 'Total application uptime in seconds'
});

// Resource Utilization
const memoryUsageBytes = new prometheus.Gauge({
  name: 'app_memory_usage_bytes',
  help: 'Application memory usage in bytes',
  labelNames: ['component']
});

const cpuUsagePercent = new prometheus.Gauge({
  name: 'app_cpu_usage_percent',
  help: 'Application CPU usage percentage',
  labelNames: ['component']
});

// ========================================
// ALERTING METRICS
// ========================================

// Error Rate Thresholds
const errorRateThreshold = new prometheus.Gauge({
  name: 'error_rate_threshold',
  help: 'Error rate threshold for alerting',
  labelNames: ['service', 'threshold_type']
});

// Performance Thresholds
const responseTimeThreshold = new prometheus.Gauge({
  name: 'response_time_threshold_seconds',
  help: 'Response time threshold for alerting',
  labelNames: ['service', 'threshold_type']
});

// Register all metrics
const metrics = [
  httpRequestDurationMicroseconds, httpRequestsTotal, httpErrorsTotal,
  gameScoresTotal, activeGamesGauge, gameCompletionTime, gameAccuracyRate,
  uniqueUsersGauge, userSessionDuration,
  databaseConnectionsGauge, databaseQueryDuration, databaseErrorsTotal,
  redisConnectionsGauge, redisOperationDuration, redisCacheHitRate,
  appHealthGauge, appUptimeSeconds, memoryUsageBytes, cpuUsagePercent,
  errorRateThreshold, responseTimeThreshold
];

metrics.forEach(metric => register.registerMetric(metric));

// ========================================
// ENHANCED MIDDLEWARE
// ========================================

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Override res.end to capture comprehensive metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = (Date.now() - start) / 1000;
    
    // Get route and endpoint type
    const route = req.route?.path || req.path || 'unknown';
    const endpointType = getEndpointType(route);
    const errorType = getErrorType(res.statusCode);
    
    // Record HTTP metrics
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString(), endpointType)
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString(), endpointType)
      .inc();
    
    // Record errors
    if (res.statusCode >= 400) {
      httpErrorsTotal
        .labels(req.method, route, res.statusCode.toString(), errorType)
        .inc();
    }
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Helper functions
const getEndpointType = (route) => {
  if (route.includes('/api/game')) return 'game';
  if (route.includes('/api/scores')) return 'scores';
  if (route.includes('/api/leaderboard')) return 'leaderboard';
  if (route === '/health') return 'health';
  if (route === '/metrics') return 'metrics';
  return 'other';
};

const getErrorType = (statusCode) => {
  if (statusCode >= 500) return 'server_error';
  if (statusCode >= 400) return 'client_error';
  return 'success';
};

// ========================================
// METRICS ENDPOINT
// ========================================

const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
};

// ========================================
// BUSINESS METRICS HELPERS
// ========================================

const updateGameMetrics = {
  recordScore: (difficulty, username, score, timeSeconds) => {
    const scoreRange = getScoreRange(score);
    gameScoresTotal.labels(difficulty, username, scoreRange).inc();
    gameCompletionTime.labels(difficulty, 'completed').observe(timeSeconds);
  },
  
  setActiveGames: (difficulty, count, status = 'active') => {
    activeGamesGauge.labels(difficulty, status).set(count);
  },
  
  recordGameAccuracy: (difficulty, accuracy) => {
    gameAccuracyRate.labels(difficulty).set(accuracy);
  },
  
  recordGameFailure: (difficulty, timeSeconds) => {
    gameCompletionTime.labels(difficulty, 'failed').observe(timeSeconds);
  }
};

const updateUserMetrics = {
  setUniqueUsers: (count, userType = 'registered') => {
    uniqueUsersGauge.labels(userType).set(count);
  },
  
  recordSessionDuration: (userType, durationSeconds) => {
    userSessionDuration.labels(userType).observe(durationSeconds);
  }
};

const updateDatabaseMetrics = {
  setConnections: (count, connectionType = 'active') => {
    databaseConnectionsGauge.labels(connectionType).set(count);
  },
  
  recordQueryDuration: (queryType, table, durationSeconds) => {
    databaseQueryDuration.labels(queryType, table).observe(durationSeconds);
  },
  
  recordError: (errorType, operation) => {
    databaseErrorsTotal.labels(errorType, operation).inc();
  }
};

const updateRedisMetrics = {
  setConnections: (count, connectionType = 'active') => {
    redisConnectionsGauge.labels(connectionType).set(count);
  },
  
  recordOperationDuration: (operationType, durationSeconds) => {
    redisOperationDuration.labels(operationType).observe(durationSeconds);
  },
  
  setCacheHitRate: (rate, cacheType = 'general') => {
    redisCacheHitRate.labels(cacheType).set(rate);
  }
};

const updateSystemMetrics = {
  setHealthStatus: (service, component, isHealthy) => {
    appHealthGauge.labels(service, component).set(isHealthy ? 1 : 0);
  },
  
  setMemoryUsage: (component, bytes) => {
    memoryUsageBytes.labels(component).set(bytes);
  },
  
  setCpuUsage: (component, percent) => {
    cpuUsagePercent.labels(component).set(percent);
  },
  
  setThresholds: (service, thresholdType, value) => {
    if (thresholdType === 'error_rate') {
      errorRateThreshold.labels(service, thresholdType).set(value);
    } else if (thresholdType === 'response_time') {
      responseTimeThreshold.labels(service, thresholdType).set(value);
    }
  }
};

// Helper function for score ranges
const getScoreRange = (score) => {
  if (score >= 1000) return 'expert';
  if (score >= 500) return 'advanced';
  if (score >= 100) return 'intermediate';
  return 'beginner';
};

// Start uptime counter
setInterval(() => {
  appUptimeSeconds.inc(1);
}, 1000);

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  updateGameMetrics,
  updateUserMetrics,
  updateDatabaseMetrics,
  updateRedisMetrics,
  updateSystemMetrics,
  register
};
