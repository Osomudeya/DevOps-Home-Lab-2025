// Backend API Server - Humor Memory Game
// API-only server for separated frontend/backend architecture

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import custom modules
const database = require('./models/database');
const redisClient = require('./utils/redis');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// MIDDLEWARE SETUP
// ========================================

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Let frontend handle CSP
  })
);

// CORS configuration for separated frontend
// Parse CORS_ORIGIN environment variable - support both string and array formats
let corsOrigins = [
  'http://localhost:3000', // For local development
  'http://localhost:3002', // For local development
  'http://localhost:80',   // For local development
  'http://frontend',       // Kubernetes service name
  'https://gameapp.games:8443',  // Add your domain for production
];

if (process.env.CORS_ORIGIN) {
  // If CORS_ORIGIN is set, parse it (support comma-separated strings)
  if (process.env.CORS_ORIGIN.includes(',')) {
    corsOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  } else {
    corsOrigins = [process.env.CORS_ORIGIN];
  }
}

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Compression for better performance
app.use(compression());

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later! 🐌',
    hint: 'Take a break and come back for more memory fun! 😄',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================

app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await database.query('SELECT 1 as healthy');

    // Check Redis connection
    const redisCheck = await redisClient.ping();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbCheck.rows[0].healthy === 1 ? 'connected' : 'error',
        redis: redisCheck === 'PONG' ? 'connected' : 'error',
        api: 'running',
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
      message: 'The game API is taking a short break! 🎮💤',
    });
  }
});

// ========================================
// PROMETHEUS METRICS ENDPOINT
// ========================================

// Simple metrics for Prometheus
let requestCount = 0;
let activeGames = 0;

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/metrics"} ${requestCount}

# HELP humor_game_active_games Current number of active games
# TYPE humor_game_active_games gauge
humor_game_active_games ${activeGames}

# HELP up Service health status
# TYPE up gauge
up 1
`);
});

// Increment request counter for all requests
app.use((req, res, next) => {
  requestCount++;
  next();
});

// ========================================
// API ROUTES
// ========================================

// API welcome endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the Humor Memory Game API! 🎮😂',
    version: '1.0.0',
    endpoints: {
      game: {
        'POST /api/game/start': 'Start a new game session',
        'POST /api/game/match': 'Submit a card match',
        'POST /api/game/complete': 'Complete a game and save score',
        'GET /api/game/:gameId': 'Get game details',
      },
      scores: {
        'GET /api/scores/:username': 'Get user scores and stats',
        'POST /api/scores/user': 'Create or update user',
      },
      leaderboard: {
        'GET /api/leaderboard': 'Get top players (cached)',
        'GET /api/leaderboard/fresh': 'Get fresh leaderboard data',
      },
    },
    health: '/health',
    documentation: 'API-only backend for separated architecture! 🎯',
  });
});

// Import and mount API routes (moved after other middleware to avoid conflicts)
let gameRoutes;
let scoreRoutes;
let leaderboardRoutes;

try {
  gameRoutes = require('./routes/game');
  scoreRoutes = require('./routes/scores');
  leaderboardRoutes = require('./routes/leaderboard');

  // Mount API routes
  app.use('/api/game', gameRoutes);
  app.use('/api/scores', scoreRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
} catch (error) {
  console.error('❌ Error loading route modules:', error);
  console.log(
    '🔧 Server starting in limited mode - some routes may not be available'
  );
}

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'API endpoint not found! 🔍',
    path: req.path,
    suggestion: 'Check /api for available endpoints',
  });
});

// Handle non-API routes (since this is API-only)
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API Server Only',
    message: 'This is an API-only server. Frontend is served separately! 🎮',
    suggestion: 'Access the game at your frontend URL',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment
      ? err.message
      : 'Something went wrong! Our devs are probably laughing at this bug right now! 😅',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});

app.disable('etag'); // disable ETag caching completely

// ========================================
// DATABASE AND REDIS INITIALIZATION
// ========================================

async function initializeServices() {
  try {
    console.log('🔌 Connecting to database...');
    await database.testConnection();
    console.log('✅ Database connected successfully!');

    console.log('🔗 Connecting to Redis...');
    await redisClient.connect();
    console.log('✅ Redis connected successfully!');

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    return false;
  }
}

// ========================================
// SERVER STARTUP
// ========================================

async function startServer() {
  try {
    // Initialize database and Redis connections
    const servicesReady = await initializeServices();

    if (!servicesReady) {
      console.error('❌ Cannot start server - services not ready');
      process.exit(1);
    }

    // Start the HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🎮 ========================================');
      console.log('🎯 HUMOR MEMORY GAME API SERVER STARTED! 😂');
      console.log('🎮 ========================================');
      console.log(`🌐 API Server running on port: ${PORT}`);
      console.log(`🔧 API Endpoints: /api`);
      console.log(`💊 Health Check: /health`);
      console.log(`📊 Metrics Endpoint: /metrics`);
      console.log(`🚀 Ready to serve game requests!`);
      console.log('🎮 ========================================\n');
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

async function gracefulShutdown(server) {
  console.log('\n🛑 Received shutdown signal. Starting graceful shutdown...');

  server.close(async () => {
    console.log('🔌 HTTP server closed.');

    try {
      await database.close();
      console.log('🗄️  Database connections closed.');

      await redisClient.quit();
      console.log('🔗 Redis connection closed.');

      console.log('✅ Graceful shutdown completed. Goodbye! 👋');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error(
      '❌ Could not close connections in time, forcefully shutting down'
    );
    process.exit(1);
  }, 10000);
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await database.query('SELECT 1');

    // Check Redis connection
    await redisClient.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'healthy',
        redis: 'healthy',
        api: 'healthy',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = app;
