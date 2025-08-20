// Fixed Database Connection with Retry Logic
const { Pool } = require('pg');

// Database configuration with better retry settings
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'humor_memory_game',
  user: process.env.DB_USER || 'gameuser',
  password: process.env.DB_PASSWORD || 'gamepass123',
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000, // Increased from 2000
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  // Add retry configuration
  query_timeout: 60000,
  statement_timeout: 60000,
  // Connection retry settings
  acquire_timeout_millis: 60000,
  create_timeout_millis: 30000,
  destroy_timeout_millis: 5000,
  reap_interval_millis: 1000,
  create_retry_interval_millis: 200,
};

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres', // Kubernetes service name, not localhost
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'humor_memory_game',
  user: process.env.DB_USER || 'gameuser',
  password: process.env.DB_PASSWORD, // No fallback - fail if not provided
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
});

// Enhanced error handling
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database pool error:', err);
  // Log but don't exit - let the retry logic handle it
});

pool.on('connect', (client) => {
  console.log('🔌 New database client connected');
});

pool.on('remove', (client) => {
  console.log('🔌 Database client removed from pool');
});

pool.on('acquire', () => {
  console.log('📦 Database client acquired from pool');
});

// Unified Database Class with Retry Logic
class HumorGameDatabase {
  constructor() {
    this.pool = pool;
    this.isConnected = false;
  }

  /**
   * Execute a query with retry logic
   */
  async query(text, params = []) {
    const maxRetries = 3;
    const retryDelay = 1000;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const start = Date.now();
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;

        if (duration > 100) {
          console.warn(
            `🐌 Slow query detected (${duration}ms):`,
            text.substring(0, 100)
          );
        }

        // Mark as connected on successful query
        this.isConnected = true;
        return result;
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Database query error (attempt ${attempt}/${maxRetries}):`,
          error.message
        );

        if (attempt < maxRetries) {
          console.log(`⏳ Retrying query in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          console.error('Query:', text);
          console.error('Params:', params);
          this.isConnected = false;
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Test database connection with retry
   */
  async testConnection() {
    try {
      const result = await this.query(
        'SELECT NOW() as current_time, version() as version'
      );
      console.log('✅ Database connection test successful');
      console.log(`⏰ Current time: ${result.rows[0].current_time}`);
      console.log(
        `🐘 PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`
      );
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  async isHealthy() {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create or get user by username
   */
  async createOrGetUser(username, email = null, displayName = null) {
    try {
      console.log(`🔍 Looking for user: ${username}`);

      // First, try to get existing user
      const existingUser = await this.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        console.log(`✅ Found existing user: ${username}`);
        return existingUser.rows[0];
      }

      // Create new user if doesn't exist
      console.log(`🆕 Creating new user: ${username}`);
      const newUser = await this.query(
        `
                INSERT INTO users (username, email, display_name)
                VALUES ($1, $2, $3)
                RETURNING *
            `,
        [username, email, displayName || username]
      );

      console.log(`🎉 New player joined: ${username}!`);
      return newUser.rows[0];
    } catch (error) {
      console.error('❌ Error creating/getting user:', error);
      throw error;
    }
  }

  /**
   * Create a new game session
   */
  async createGame(userId, username, difficulty = 'easy') {
    try {
      const game = await this.query(
        `
                INSERT INTO games (user_id, username, difficulty_level, game_data, time_elapsed, cards_matched)
                VALUES ($1, $2, $3, $4, 0, 0)
                RETURNING *
            `,
        [
          userId,
          username,
          difficulty,
          JSON.stringify({ difficulty, started: new Date() }),
        ]
      );

      console.log(`🎮 New game started by ${username} (${difficulty})`);
      return game.rows[0];
    } catch (error) {
      console.error('❌ Error creating game:', error);
      throw error;
    }
  }

  /**
   * Complete a game
   */
  async completeGame(gameId, score, moves, timeElapsed, cardsMatched) {
    try {
      const game = await this.query(
        `
                UPDATE games 
                SET 
                    score = $2,
                    moves = $3,
                    time_elapsed = $4,
                    cards_matched = $5,
                    game_completed = true,
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `,
        [gameId, score, moves, timeElapsed, cardsMatched]
      );

      if (game.rows.length === 0) {
        throw new Error('Game not found');
      }

      console.log(`🏆 Game completed! Score: ${score}, Time: ${timeElapsed}ms`);
      return game.rows[0];
    } catch (error) {
      console.error('❌ Error completing game:', error);
      throw error;
    }
  }

  /**
   * Record a card match
   */
  async recordMatch(
    gameId,
    card1Id,
    card2Id,
    matchTime,
    points = 10,
    bonusPoints = 0
  ) {
    try {
      const match = await this.query(
        `
                INSERT INTO game_matches (game_id, card1_id, card2_id, match_time, points_earned, bonus_points)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `,
        [gameId, card1Id, card2Id, matchTime, points, bonusPoints]
      );

      return match.rows[0];
    } catch (error) {
      console.error('❌ Error recording match:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(username) {
    try {
      const stats = await this.query(
        `
                SELECT 
                    u.username,
                    u.total_games,
                    u.total_score,
                    u.best_score,
                    u.best_time,
                    CASE 
                        WHEN u.total_games > 0 THEN ROUND(u.total_score::decimal / u.total_games, 2)
                        ELSE 0 
                    END as avg_score,
                    u.last_played,
                    (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.best_score > u.best_score) as rank
                FROM users u
                WHERE u.username = $1
            `,
        [username]
      );

      return stats.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Update user's last played time
   */
  async updateLastPlayed(userId) {
    try {
      await this.query(
        'UPDATE users SET last_played = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
    } catch (error) {
      console.error('❌ Error updating last played:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit = 10) {
    try {
      const leaderboard = await this.query(
        `
                SELECT 
                    u.username,
                    u.display_name,
                    u.total_games,
                    u.total_score,
                    u.best_score,
                    u.best_time,
                    u.last_played,
                    CASE 
                        WHEN u.total_games > 0 THEN ROUND(u.total_score::decimal / u.total_games, 2)
                        ELSE 0 
                    END as avg_score,
                    ROW_NUMBER() OVER (ORDER BY u.best_score DESC, u.best_time ASC) as rank
                FROM users u
                WHERE u.is_active = true AND u.total_games > 0
                ORDER BY u.best_score DESC, u.best_time ASC
                LIMIT $1
            `,
        [limit]
      );

      return leaderboard.rows;
    } catch (error) {
      console.error('❌ Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Close database connections
   */
  async close() {
    try {
      await this.pool.end();
      console.log('🔌 Database connection pool closed');
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Error closing database connections:', error);
      throw error;
    }
  }

  /**
   * Get connection pool status
   */
  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected,
    };
  }
}

// Export singleton instance
const database = new HumorGameDatabase();

module.exports = database;
