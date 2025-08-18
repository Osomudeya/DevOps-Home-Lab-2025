// API Tests for Humor Memory Game
// Comprehensive test suite for backend API endpoints

const request = require('supertest');
const app = require('../backend/server');

// Mock database and Redis for testing
jest.mock('../backend/models/database');
jest.mock('../backend/utils/redis');

const database = require('../backend/models/database');
const redisClient = require('../backend/utils/redis');

// Test data
const testUser = {
  username: 'testplayer',
  email: 'talk2osomudeya@gmail.com',
  displayName: 'Test Player',
};

const testGame = {
  gameId: '550e8400-e29b-41d4-a716-446655440000',
  difficulty: 'easy',
  cards: [
    {
      id: 'laughing_1',
      pairId: 'laughing',
      emoji: '😂',
      name: 'Laughing',
      category: 'classic',
    },
    {
      id: 'laughing_2',
      pairId: 'laughing',
      emoji: '😂',
      name: 'Laughing',
      category: 'classic',
    },
  ],
};

describe('🎮 Humor Memory Game API Tests', () => {
  // ========================================
  // SETUP AND TEARDOWN
  // ========================================

  beforeAll(async () => {
    // Mock database connection
    database.testConnection.mockResolvedValue(true);
    database.query.mockResolvedValue({ rows: [{ healthy: 1 }] });

    // Mock Redis connection
    redisClient.connect.mockResolvedValue(true);
    redisClient.ping.mockResolvedValue('PONG');
  });

  afterAll(async () => {
    // Clean up any connections
    jest.clearAllMocks();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // ========================================
  // HEALTH CHECK TESTS
  // ========================================

  describe('🏥 Health Check Endpoint', () => {
    test('should return healthy status when all services are up', async () => {
      database.query.mockResolvedValue({ rows: [{ healthy: 1 }] });
      redisClient.ping.mockResolvedValue('PONG');

      const response = await request(app).get('/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        services: {
          database: 'connected',
          redis: 'connected',
          api: 'running',
        },
      });
    });

    test('should return unhealthy status when database is down', async () => {
      database.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/health').expect(503);

      expect(response.body.status).toBe('unhealthy');
    });
  });

  // ========================================
  // API INFO TESTS
  // ========================================

  describe('📋 API Info Endpoint', () => {
    test('should return API information', async () => {
      const response = await request(app).get('/api').expect(200);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('Humor Memory Game API'),
        version: '1.0.0',
        endpoints: expect.any(Object),
      });
    });
  });

  // ========================================
  // USER MANAGEMENT TESTS
  // ========================================

  describe('👤 User Management', () => {
    describe('POST /api/scores/user', () => {
      test('should create a new user successfully', async () => {
        database.createOrGetUser.mockResolvedValue({
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: testUser.username,
          email: testUser.email,
          display_name: testUser.displayName,
          created_at: new Date(),
          updated_at: new Date(),
        });

        const response = await request(app)
          .post('/api/scores/user')
          .send(testUser)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.user.username).toBe(testUser.username);
        expect(response.body.message).toContain('Welcome');
      });

      test('should reject invalid username', async () => {
        const invalidUser = { username: 'a' }; // Too short

        const response = await request(app)
          .post('/api/scores/user')
          .send(invalidUser)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
      });

      test('should reject username with special characters', async () => {
        const invalidUser = { username: 'test@user!' };

        const response = await request(app)
          .post('/api/scores/user')
          .send(invalidUser)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/scores/:username', () => {
      test('should return user statistics', async () => {
        const mockStats = {
          username: testUser.username,
          total_games: 5,
          total_score: 450,
          best_score: 120,
          best_time: 45000,
          avg_score: 90,
          rank: 1,
          last_played: new Date(),
        };

        database.getUserStats.mockResolvedValue(mockStats);
        redisClient.getCachedUserStats.mockResolvedValue(null);
        redisClient.cacheUserStats.mockResolvedValue('OK');

        const response = await request(app)
          .get(`/api/scores/${testUser.username}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.username).toBe(testUser.username);
        expect(response.body.statistics.gamesPlayed).toBe(5);
      });

      test('should return 404 for non-existent user', async () => {
        database.getUserStats.mockResolvedValue(null);
        redisClient.getCachedUserStats.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/scores/nonexistentuser')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User not found');
      });
    });
  });

  // ========================================
  // GAME MANAGEMENT TESTS
  // ========================================

  describe('🎮 Game Management', () => {
    describe('POST /api/game/start', () => {
      test('should start a new game successfully', async () => {
        database.createOrGetUser.mockResolvedValue({
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: testUser.username,
        });

        database.createGame.mockResolvedValue({
          id: testGame.gameId,
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          username: testUser.username,
          difficulty_level: 'easy',
          started_at: new Date(),
        });

        redisClient.cacheGameSession.mockResolvedValue('OK');
        redisClient.incrementDailyGames.mockResolvedValue(1);
        redisClient.trackUserActivity.mockResolvedValue(1);
        database.updateLastPlayed.mockResolvedValue();

        const gameRequest = {
          username: testUser.username,
          difficulty: 'easy',
          categories: ['classic', 'food'],
        };

        const response = await request(app)
          .post('/api/game/start')
          .send(gameRequest)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.game.gameId).toBe(testGame.gameId);
        expect(response.body.game.difficulty).toBe('easy');
        expect(response.body.game.cards).toHaveLength(16); // Easy mode has 16 cards
      });

      test('should reject invalid difficulty', async () => {
        const invalidRequest = {
          username: testUser.username,
          difficulty: 'impossible',
        };

        const response = await request(app)
          .post('/api/game/start')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('POST /api/game/match', () => {
      test('should process a successful match', async () => {
        const mockGameSession = {
          gameId: testGame.gameId,
          userId: '123e4567-e89b-12d3-a456-426614174000',
          username: testUser.username,
          cards: [
            {
              id: 'laughing_1',
              pairId: 'laughing',
              emoji: '😂',
              isMatched: false,
            },
            {
              id: 'laughing_2',
              pairId: 'laughing',
              emoji: '😂',
              isMatched: false,
            },
          ],
          score: 0,
          moves: 0,
          matches: [],
          isCompleted: false,
        };

        redisClient.getCachedGameSession.mockResolvedValue(mockGameSession);
        database.recordMatch.mockResolvedValue({
          id: 'match123',
          game_id: testGame.gameId,
          card1_id: 'laughing_1',
          card2_id: 'laughing_2',
        });
        redisClient.cacheGameSession.mockResolvedValue('OK');
        redisClient.trackUserActivity.mockResolvedValue(1);

        const matchRequest = {
          gameId: testGame.gameId,
          card1Id: 'laughing_1',
          card2Id: 'laughing_2',
          matchTime: 5000,
        };

        const response = await request(app)
          .post('/api/game/match')
          .send(matchRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.isMatch).toBe(true);
        expect(response.body.pointsEarned).toBeGreaterThan(0);
      });

      test('should handle non-matching cards', async () => {
        const mockGameSession = {
          gameId: testGame.gameId,
          cards: [
            {
              id: 'laughing_1',
              pairId: 'laughing',
              emoji: '😂',
              isMatched: false,
            },
            { id: 'wink_1', pairId: 'wink', emoji: '😉', isMatched: false },
          ],
          score: 0,
          moves: 0,
          matches: [],
          isCompleted: false,
        };

        redisClient.getCachedGameSession.mockResolvedValue(mockGameSession);
        redisClient.cacheGameSession.mockResolvedValue('OK');
        redisClient.trackUserActivity.mockResolvedValue(1);

        const matchRequest = {
          gameId: testGame.gameId,
          card1Id: 'laughing_1',
          card2Id: 'wink_1',
          matchTime: 5000,
        };

        const response = await request(app)
          .post('/api/game/match')
          .send(matchRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.isMatch).toBe(false);
        expect(response.body.pointsEarned).toBe(0);
      });

      test('should return 404 for non-existent game', async () => {
        redisClient.getCachedGameSession.mockResolvedValue(null);

        const matchRequest = {
          gameId: 'nonexistent-game-id',
          card1Id: 'card1',
          card2Id: 'card2',
        };

        const response = await request(app)
          .post('/api/game/match')
          .send(matchRequest)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Game session not found');
      });
    });

    describe('POST /api/game/complete', () => {
      test('should complete a game successfully', async () => {
        const mockGameSession = {
          gameId: testGame.gameId,
          username: testUser.username,
          difficulty: 'easy',
          matches: [
            { card1Id: 'laughing_1', card2Id: 'laughing_2' },
            { card1Id: 'wink_1', card2Id: 'wink_2' },
          ],
          moves: 4,
          score: 20,
          isCompleted: false,
        };

        redisClient.getCachedGameSession.mockResolvedValue(mockGameSession);
        database.completeGame.mockResolvedValue({
          id: testGame.gameId,
          score: 180,
          moves: 16,
          time_elapsed: 60000,
          cards_matched: 8,
        });
        redisClient.cacheGameSession.mockResolvedValue('OK');
        redisClient.del.mockResolvedValue(1);
        redisClient.trackUserActivity.mockResolvedValue(1);

        const completeRequest = {
          gameId: testGame.gameId,
          timeElapsed: 60000,
          finalScore: 180,
        };

        const response = await request(app)
          .post('/api/game/complete')
          .send(completeRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.gameResult.finalScore).toBe(180);
        expect(response.body.gameResult.timeElapsed).toBe(60000);
      });
    });
  });

  // ========================================
  // LEADERBOARD TESTS
  // ========================================

  describe('🏆 Leaderboard', () => {
    describe('GET /api/leaderboard', () => {
      test('should return leaderboard data', async () => {
        const mockLeaderboard = [
          {
            username: 'player1',
            display_name: 'Player One',
            best_score: 200,
            total_games: 10,
            best_time: 45000,
            avg_score: 150,
          },
          {
            username: 'player2',
            display_name: 'Player Two',
            best_score: 180,
            total_games: 8,
            best_time: 50000,
            avg_score: 140,
          },
        ];

        redisClient.get.mockResolvedValue(null); // Cache miss
        database.query.mockResolvedValue({ rows: mockLeaderboard });
        redisClient.set.mockResolvedValue('OK');

        const response = await request(app).get('/api/leaderboard').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.leaderboard).toHaveLength(2);
        expect(response.body.leaderboard[0].rank).toBe(1);
        expect(response.body.leaderboard[0].username).toBe('player1');
      });

      test('should return cached leaderboard data', async () => {
        const cachedLeaderboard = [
          { username: 'cached_player', rank: 1, bestScore: 250 },
        ];

        redisClient.get.mockResolvedValue(cachedLeaderboard);

        const response = await request(app).get('/api/leaderboard').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.leaderboard).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ username: 'cached_player' }),
          ])
        );
      });
    });

    describe('GET /api/leaderboard/fresh', () => {
      test('should return fresh leaderboard data', async () => {
        const mockLeaderboard = [
          { username: 'fresh_player', best_score: 300, total_games: 15 },
        ];

        database.getLeaderboard.mockResolvedValue(mockLeaderboard);
        redisClient.keys.mockResolvedValue([
          'leaderboard:cache1',
          'leaderboard:cache2',
        ]);
        redisClient.del.mockResolvedValue(1);

        const response = await request(app)
          .get('/api/leaderboard/fresh')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.metadata.dataSource).toBe('fresh');
        expect(response.body.metadata.cacheCleared).toBe(true);
      });
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('❌ Error Handling', () => {
    test('should return 404 for non-existent API endpoints', async () => {
      const response = await request(app).get('/api/nonexistent').expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toContain('API endpoint not found');
    });

    test('should return 404 for non-API routes', async () => {
      const response = await request(app).get('/some-random-route').expect(404);

      expect(response.body.error).toBe('API Server Only');
      expect(response.body.message).toContain('API-only server');
    });

    test('should handle database connection errors gracefully', async () => {
      database.query.mockRejectedValue(new Error('Database connection lost'));

      const response = await request(app).get('/health').expect(503);

      expect(response.body.status).toBe('unhealthy');
    });
  });

  // ========================================
  // VALIDATION TESTS
  // ========================================

  describe('✅ Input Validation', () => {
    test('should validate game start request', async () => {
      const invalidRequest = {
        username: '', // Empty username
        difficulty: 'easy',
      };

      const response = await request(app)
        .post('/api/game/start')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    test('should validate match request', async () => {
      const invalidRequest = {
        gameId: 'invalid-uuid', // Invalid UUID format
        card1Id: 'card1',
        card2Id: 'card2',
      };

      const response = await request(app)
        .post('/api/game/match')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  // ========================================
  // RATE LIMITING TESTS
  // ========================================

  describe('🚦 Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      const response = await request(app).get('/api').expect(200);

      expect(response.body.message).toContain('Welcome');
    });

    // Note: Testing actual rate limiting would require multiple requests
    // This is a basic structure for rate limit testing
  });
});

// ========================================
// INTEGRATION TESTS
// ========================================

describe('🔗 Integration Tests', () => {
  test('complete game flow: create user -> start game -> make matches -> complete game', async () => {
    // Mock all dependencies
    database.createOrGetUser.mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: testUser.username,
    });

    database.createGame.mockResolvedValue({
      id: testGame.gameId,
      username: testUser.username,
      difficulty_level: 'easy',
    });

    const mockGameSession = {
      gameId: testGame.gameId,
      username: testUser.username,
      cards: testGame.cards,
      matches: [],
      score: 0,
      moves: 0,
      isCompleted: false,
    };

    redisClient.cacheGameSession.mockResolvedValue('OK');
    redisClient.getCachedGameSession.mockResolvedValue(mockGameSession);
    redisClient.incrementDailyGames.mockResolvedValue(1);
    redisClient.trackUserActivity.mockResolvedValue(1);
    database.updateLastPlayed.mockResolvedValue();
    database.recordMatch.mockResolvedValue({ id: 'match1' });
    database.completeGame.mockResolvedValue({
      id: testGame.gameId,
      score: 20,
      moves: 2,
      time_elapsed: 10000,
    });

    // 1. Create user
    const userResponse = await request(app)
      .post('/api/scores/user')
      .send(testUser)
      .expect(201);

    expect(userResponse.body.success).toBe(true);

    // 2. Start game
    const gameResponse = await request(app)
      .post('/api/game/start')
      .send({
        username: testUser.username,
        difficulty: 'easy',
      })
      .expect(201);

    expect(gameResponse.body.success).toBe(true);
    const gameId = gameResponse.body.game.gameId;

    // 3. Make a match
    const matchResponse = await request(app)
      .post('/api/game/match')
      .send({
        gameId,
        card1Id: 'laughing_1',
        card2Id: 'laughing_2',
        matchTime: 5000,
      })
      .expect(200);

    expect(matchResponse.body.success).toBe(true);

    // 4. Complete game
    const completeResponse = await request(app)
      .post('/api/game/complete')
      .send({
        gameId,
        timeElapsed: 10000,
        finalScore: 20,
      })
      .expect(200);

    expect(completeResponse.body.success).toBe(true);
  });
});

// ========================================
// PERFORMANCE TESTS
// ========================================

describe('⚡ Performance Tests', () => {
  test('health check should respond quickly', async () => {
    database.query.mockResolvedValue({ rows: [{ healthy: 1 }] });
    redisClient.ping.mockResolvedValue('PONG');

    const start = Date.now();

    await request(app).get('/health').expect(200);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should respond in under 100ms
  });
});
