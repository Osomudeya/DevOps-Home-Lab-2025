// Game API Routes
// Handles game creation, card matching, and game completion

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../models/database');
const redisCache = require('../utils/redis');
const { GameDataGenerator, gameConfig } = require('../utils/gameData');
const {
  validateGameStart,
  validateCardMatch,
  validateGameComplete,
} = require('../middleware/validation');

const router = express.Router();

// ========================================
// START NEW GAME
// ========================================
// Import validation middleware
const {
  sanitizeInput,
  validateJsonContent,
} = require('../middleware/validation');

// Apply security middleware to all game routes
router.use(sanitizeInput);
router.use(validateJsonContent);

/**
 * POST /api/game/start
 * Start a new memory game session
 */
router.post('/start', validateGameStart, async (req, res) => {
  try {
    const { username, difficulty = 'easy', categories = null } = req.body;

    // Create or get user
    const user = await database.createOrGetUser(username);

    // Generate card set for the game
    const cards = GameDataGenerator.generateCardSet(difficulty, categories);

    // Create game record in database
    const gameData = {
      difficulty,
      categories,
      cards: cards.length,
      startTime: new Date().toISOString(),
    };

    const game = await database.createGame(user.id, username, difficulty);

    // Cache game session data
    await redisCache.cacheGameSession(game.id, {
      gameId: game.id,
      userId: user.id,
      username,
      difficulty,
      cards,
      startTime: Date.now(),
      matches: [],
      score: 0,
      moves: 0,
      isCompleted: false,
    });

    // Track daily game analytics
    await redisCache.incrementDailyGames();
    await redisCache.trackUserActivity(username, 'game_start');

    // Update user's last played time
    await database.updateLastPlayed(user.id);

    console.log(
      `🎮 New ${difficulty} game started by ${username} (Game ID: ${game.id})`
    );

    res.status(201).json({
      success: true,
      message: `🎯 Game started! Good luck, ${username}! 🍀`,
      game: {
        gameId: game.id,
        difficulty,
        cards: cards.map((card) => ({
          id: card.id,
          position: card.position,
          emoji: card.emoji,
          name: card.name,
          category: card.category,
          isFlipped: false,
          isMatched: false,
        })),
        config: gameConfig.difficulties[difficulty],
        startTime: game.started_at,
        successMessage: GameDataGenerator.getRandomSuccessMessage(),
      },
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
      },
    });
  } catch (error) {
    console.error('❌ Error starting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start game',
      message: 'Oops! The game got confused. Try again! 🤔',
    });
  }
});

// ========================================
// SUBMIT CARD MATCH
// ========================================

/**
 * POST /api/game/match
 * Submit a card match attempt
 */
router.post('/match', validateCardMatch, async (req, res) => {
  try {
    const { gameId, card1Id, card2Id, matchTime } = req.body;

    // Get game session from cache
    const gameSession = await redisCache.getCachedGameSession(gameId);

    if (!gameSession) {
      return res.status(404).json({
        success: false,
        error: 'Game session not found',
        message: "This game session has expired or doesn't exist! 🕐",
      });
    }

    if (gameSession.isCompleted) {
      return res.status(400).json({
        success: false,
        error: 'Game already completed',
        message: 'This game is already finished! Start a new one! 🎮',
      });
    }

    // Find the cards in the game session
    const card1 = gameSession.cards.find((card) => card.id === card1Id);
    const card2 = gameSession.cards.find((card) => card.id === card2Id);

    if (!card1 || !card2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card IDs',
        message: "Those cards don't exist in this game! 🃏",
      });
    }

    if (card1.isMatched || card2.isMatched) {
      return res.status(400).json({
        success: false,
        error: 'Cards already matched',
        message: 'These cards are already matched! 🎯',
      });
    }

    // Check if it's a valid match (same pairId)
    const isMatch = card1.pairId === card2.pairId;
    const config = gameConfig.difficulties[gameSession.difficulty];

    // Calculate points
    let pointsEarned = 0;
    let bonusPoints = 0;
    let isSpeedBonus = false;

    if (isMatch) {
      pointsEarned = config.pointsPerMatch;

      // Check for speed bonus
      if (matchTime && matchTime < config.bonusTimeThreshold) {
        bonusPoints = config.bonusPoints;
        isSpeedBonus = true;
      }

      // Mark cards as matched
      card1.isMatched = true;
      card2.isMatched = true;

      // Record the match in database
      await database.recordMatch(
        gameId,
        card1Id,
        card2Id,
        matchTime || 0,
        pointsEarned,
        bonusPoints
      );

      // Update game session
      gameSession.matches.push({
        card1Id,
        card2Id,
        matchTime: matchTime || 0,
        pointsEarned,
        bonusPoints,
        timestamp: Date.now(),
      });

      gameSession.score += pointsEarned + bonusPoints;
    }

    // Increment moves counter
    gameSession.moves++;

    // Update cache
    await redisCache.cacheGameSession(gameId, gameSession);

    // Track user activity
    await redisCache.trackUserActivity(gameSession.username, 'match_attempt');

    // Check if game is completed (all cards matched)
    const totalPairs = gameSession.cards.length / 2;
    const matchedPairs = gameSession.matches.length;
    const isGameComplete = matchedPairs === totalPairs;

    const response = {
      success: true,
      isMatch,
      pointsEarned: pointsEarned + bonusPoints,
      message: isMatch
        ? GameDataGenerator.getRandomSuccessMessage()
        : GameDataGenerator.getRandomFailureMessage(),
      game: {
        gameId,
        score: gameSession.score,
        moves: gameSession.moves,
        matchesFound: matchedPairs,
        totalPairs,
        isComplete: isGameComplete,
      },
      match: isMatch
        ? {
            card1: { id: card1Id, emoji: card1.emoji, name: card1.name },
            card2: { id: card2Id, emoji: card2.emoji, name: card2.name },
            pointsEarned,
            bonusPoints,
            isSpeedBonus,
            matchTime,
          }
        : null,
    };

    if (isGameComplete) {
      response.message = `🎉 Congratulations! Game completed! Final score: ${gameSession.score}! 🏆`;
      response.completionBonus = {
        message: 'Amazing memory skills! 🧠✨',
        suggestion: 'Ready for the next challenge? 🚀',
      };
    }

    console.log(
      `${isMatch ? '✅' : '❌'} Match attempt by ${gameSession.username}: ${card1.emoji} + ${card2.emoji} = ${isMatch ? 'SUCCESS' : 'MISS'}`
    );

    res.json(response);
  } catch (error) {
    console.error('❌ Error processing match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process match',
      message: 'Something went wrong with that match! Try again! 🔄',
    });
  }
});

// ========================================
// COMPLETE GAME
// ========================================

/**
 * POST /api/game/complete
 * Complete a game and save final score
 */
router.post('/complete', validateGameComplete, async (req, res) => {
  try {
    const { gameId, timeElapsed, finalScore } = req.body;

    // Get game session from cache
    const gameSession = await redisCache.getCachedGameSession(gameId);

    if (!gameSession) {
      return res.status(404).json({
        success: false,
        error: 'Game session not found',
        message: 'Game session not found! 🔍',
      });
    }

    if (gameSession.isCompleted) {
      return res.status(400).json({
        success: false,
        error: 'Game already completed',
        message: 'This game is already completed! 🏁',
      });
    }

    // Calculate final score based on game performance
    const gameStats = {
      matches: gameSession.matches.length,
      wrongMoves: gameSession.moves - gameSession.matches.length,
      timeElapsed,
      difficulty: gameSession.difficulty,
      consecutiveMatches: calculateConsecutiveMatches(gameSession.matches),
    };

    const scoreBreakdown = GameDataGenerator.calculateScore(gameStats);
    const totalCardsMatched = gameSession.matches.length;

    // Complete game in database
    const completedGame = await database.completeGame(
      gameId,
      scoreBreakdown.totalScore,
      gameSession.moves,
      timeElapsed,
      totalCardsMatched
    );

    // Mark session as completed
    gameSession.isCompleted = true;
    gameSession.finalScore = scoreBreakdown.totalScore;
    gameSession.completedAt = Date.now();

    // Update cache
    await redisCache.cacheGameSession(gameId, gameSession);

    // Clear user stats cache to force refresh
    await redisCache.del(`user:stats:${gameSession.username}`);

    // Clear leaderboard cache to force refresh
    await redisCache.del('leaderboard:top');

    // Track completion analytics
    await redisCache.trackUserActivity(gameSession.username, 'game_complete');

    console.log(
      `🏆 Game completed by ${gameSession.username}! Score: ${scoreBreakdown.totalScore}, Time: ${timeElapsed}ms`
    );

    res.json({
      success: true,
      message: `🎉 Game completed successfully! Well done! 🏆`,
      gameResult: {
        gameId,
        finalScore: scoreBreakdown.totalScore,
        scoreBreakdown: scoreBreakdown.breakdown,
        performance: scoreBreakdown.rating,
        timeElapsed,
        totalMoves: gameSession.moves,
        matchesFound: totalCardsMatched,
        accuracy: ((totalCardsMatched / gameSession.moves) * 100).toFixed(1),
        difficulty: gameSession.difficulty,
      },
      achievements: checkAchievements(gameSession, scoreBreakdown),
      nextSteps: {
        playAgain: 'Ready for another round? 🎮',
        leaderboard: 'Check the leaderboard to see your rank! 🏆',
        difficulty:
          gameSession.difficulty === 'easy'
            ? 'Try medium difficulty for more challenge! 💪'
            : "You're getting good at this! 🌟",
      },
    });
  } catch (error) {
    console.error('❌ Error completing game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete game',
      message: "Couldn't save your awesome score! Try again! 💾",
    });
  }
});

// ========================================
// GET GAME DETAILS
// ========================================

/**
 * GET /api/game/:gameId
 * Get current game session details
 */
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    // Try to get from cache first
    let gameSession = await redisCache.getCachedGameSession(gameId);

    if (!gameSession) {
      // Fallback to database
      const gameRecord = await database.query(
        'SELECT * FROM games WHERE id = $1',
        [gameId]
      );

      if (gameRecord.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Game not found',
          message: "This game doesn't exist! 🔍",
        });
      }

      const game = gameRecord.rows[0];
      gameSession = {
        gameId: game.id,
        username: game.username,
        difficulty: game.difficulty_level,
        score: game.score,
        moves: game.moves,
        isCompleted: game.game_completed,
        startTime: game.started_at,
        completedAt: game.completed_at,
      };
    }

    res.json({
      success: true,
      game: gameSession,
      config:
        gameConfig.difficulties[gameSession.difficulty] ||
        gameConfig.difficulties.easy,
    });
  } catch (error) {
    console.error('❌ Error getting game details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game details',
      message: "Couldn't load game details! 📱",
    });
  }
});

// ========================================
// GET DAILY CHALLENGE
// ========================================

/**
 * GET /api/game/daily-challenge
 * Get today's daily challenge configuration
 */
router.get('/daily-challenge', async (req, res) => {
  try {
    // Check if daily challenge is cached
    const cachedChallenge = await redisCache.get('daily_challenge');

    if (cachedChallenge) {
      return res.json({
        success: true,
        challenge: cachedChallenge,
        message: "Today's challenge is ready! 🌟",
      });
    }

    // Generate new daily challenge
    const challenge = GameDataGenerator.generateDailyChallenge();

    // Cache until end of day
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const ttl = Math.floor((endOfDay - now) / 1000);

    await redisCache.set('daily_challenge', challenge, ttl);

    res.json({
      success: true,
      challenge,
      message: 'Fresh daily challenge generated! 🎯',
    });
  } catch (error) {
    console.error('❌ Error getting daily challenge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily challenge',
      message: 'Daily challenge is taking a break! 😴',
    });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate consecutive matches for streak bonus
 * @param {Array} matches - Array of match objects
 * @returns {number} Maximum consecutive matches
 */
function calculateConsecutiveMatches(matches) {
  if (matches.length === 0) return 0;

  // Sort matches by timestamp
  const sortedMatches = matches.sort((a, b) => a.timestamp - b.timestamp);

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedMatches.length; i++) {
    const timeDiff =
      sortedMatches[i].timestamp - sortedMatches[i - 1].timestamp;

    // Consider consecutive if within 30 seconds
    if (timeDiff <= 30000) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Check for achievements based on game performance
 * @param {Object} gameSession - Game session data
 * @param {Object} scoreBreakdown - Score calculation results
 * @returns {Array} Array of achieved accomplishments
 */
function checkAchievements(gameSession, scoreBreakdown) {
  const achievements = [];

  // Perfect game achievement
  if (scoreBreakdown.breakdown.perfectGameBonus > 0) {
    achievements.push({
      title: 'Perfect Memory! 🧠',
      description: 'Completed without any wrong moves!',
      icon: '🏆',
      rarity: 'legendary',
    });
  }

  // Speed demon achievement
  if (scoreBreakdown.breakdown.speedBonus > 0) {
    achievements.push({
      title: 'Speed Demon! ⚡',
      description: 'Completed in record time!',
      icon: '🚀',
      rarity: 'rare',
    });
  }

  // Streak master achievement
  if (scoreBreakdown.breakdown.streakBonus > 0) {
    achievements.push({
      title: 'Streak Master! 🔥',
      description: 'Amazing consecutive matches!',
      icon: '🌟',
      rarity: 'epic',
    });
  }

  // First game achievement
  if (gameSession.moves <= gameSession.matches.length + 2) {
    achievements.push({
      title: 'Sharp Mind! 🎯',
      description: 'Excellent accuracy on this game!',
      icon: '💎',
      rarity: 'uncommon',
    });
  }

  return achievements;
}

module.exports = router;
