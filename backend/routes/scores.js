// Scores API Routes
// Handles user scores, statistics, and profile management

const express = require('express');
const router = express.Router();

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate user achievements based on stats
 */
async function getUserAchievements(username, userStats) {
  const achievements = [];

  try {
    // Games Played Achievements
    if (userStats.total_games >= 10) {
      achievements.push({
        id: 'ten_games',
        title: 'Getting Warmed Up! 🔥',
        description: 'Played 10 games',
        icon: '🎯',
        rarity: 'common',
        unlockedAt: userStats.last_played,
      });
    }

    if (userStats.total_games >= 50) {
      achievements.push({
        id: 'fifty_games',
        title: 'Memory Enthusiast! 🤓',
        description: 'Played 50 games',
        icon: '🏅',
        rarity: 'uncommon',
        unlockedAt: userStats.last_played,
      });
    }

    if (userStats.total_games >= 100) {
      achievements.push({
        id: 'hundred_games',
        title: 'Memory Addict! 🧠',
        description: 'Played 100 games',
        icon: '🏆',
        rarity: 'rare',
        unlockedAt: userStats.last_played,
      });
    }

    // Score Achievements
    if (userStats.best_score >= 100) {
      achievements.push({
        id: 'score_100',
        title: 'Century Club! 💯',
        description: 'Scored 100 points in a single game',
        icon: '💯',
        rarity: 'common',
        unlockedAt: userStats.last_played,
      });
    }

    if (userStats.best_score >= 200) {
      achievements.push({
        id: 'score_200',
        title: 'Double Century! 🎊',
        description: 'Scored 200 points in a single game',
        icon: '🌟',
        rarity: 'uncommon',
        unlockedAt: userStats.last_played,
      });
    }

    if (userStats.best_score >= 300) {
      achievements.push({
        id: 'score_300',
        title: 'Memory Master! 👑',
        description: 'Scored 300 points in a single game',
        icon: '👑',
        rarity: 'legendary',
        unlockedAt: userStats.last_played,
      });
    }

    // Speed Achievements
    if (userStats.best_time && userStats.best_time <= 60000) {
      // 1 minute
      achievements.push({
        id: 'speed_demon',
        title: 'Speed Demon! ⚡',
        description: 'Completed a game in under 1 minute',
        icon: '⚡',
        rarity: 'rare',
        unlockedAt: userStats.last_played,
      });
    }

    if (userStats.best_time && userStats.best_time <= 30000) {
      // 30 seconds
      achievements.push({
        id: 'lightning_fast',
        title: 'Lightning Fast! 🌩️',
        description: 'Completed a game in under 30 seconds',
        icon: '🌩️',
        rarity: 'legendary',
        unlockedAt: userStats.last_played,
      });
    }

    // Ranking Achievements
    if (userStats.rank <= 10) {
      achievements.push({
        id: 'top_ten',
        title: 'Top 10 Player! 🏆',
        description: 'Reached the top 10 on the leaderboard',
        icon: '🏆',
        rarity: 'epic',
        unlockedAt: userStats.last_played,
      });
    }

    if (userStats.rank <= 3) {
      achievements.push({
        id: 'podium',
        title: 'Podium Finisher! 🥇',
        description: 'Reached the top 3 on the leaderboard',
        icon: '🥇',
        rarity: 'legendary',
        unlockedAt: userStats.last_played,
      });
    }

    if (userStats.rank === 1) {
      achievements.push({
        id: 'champion',
        title: 'Champion! 👑',
        description: 'Reached #1 on the leaderboard',
        icon: '👑',
        rarity: 'legendary',
        unlockedAt: userStats.last_played,
      });
    }

    // Check for perfect games (would need additional database query)
    const perfectGames = await database.query(
      `
            SELECT COUNT(*) as perfect_count 
            FROM games 
            WHERE username = $1 AND game_completed = true AND moves = cards_matched
        `,
      [username]
    );

    if (perfectGames.rows[0].perfect_count > 0) {
      achievements.push({
        id: 'perfect_game',
        title: 'Flawless Victory! 💎',
        description: 'Completed a game with perfect accuracy',
        icon: '💎',
        rarity: 'epic',
        unlockedAt: userStats.last_played,
      });
    }

    return achievements;
  } catch (error) {
    console.error('Error calculating achievements:', error);
    return achievements;
  }
}

/**
 * Check if achievement was unlocked today
 */
function isUnlockedToday(achievement) {
  if (!achievement.unlockedAt) return false;

  const today = new Date().toDateString();
  const unlockedDate = new Date(achievement.unlockedAt).toDateString();
  return today === unlockedDate;
}

/**
 * Get game performance rating
 */
function getGamePerformance(score, difficulty) {
  const thresholds = {
    easy: { excellent: 180, good: 140, average: 100 },
    medium: { excellent: 220, good: 180, average: 140 },
    hard: { excellent: 280, good: 220, average: 180 },
    expert: { excellent: 350, good: 280, average: 220 },
  };

  const threshold = thresholds[difficulty] || thresholds.easy;

  if (score >= threshold.excellent) {
    return { rating: 'Excellent', emoji: '🌟', color: '#FFD700' };
  } else if (score >= threshold.good) {
    return { rating: 'Good', emoji: '👍', color: '#90EE90' };
  } else if (score >= threshold.average) {
    return { rating: 'Average', emoji: '😊', color: '#87CEEB' };
  } else {
    return { rating: 'Keep Trying', emoji: '💪', color: '#FFA07A' };
  }
}

/**
 * Get motivational message based on user stats
 */
function getMotivationalMessage(userStats) {
  const messages = {
    rookie: [
      '🌱 Every expert was once a beginner! Keep playing!',
      "🎮 You're just getting started - the fun is ahead!",
      '🚀 Great start! Your memory skills are developing!',
    ],
    beginner: [
      "🎯 You're making progress! Keep up the good work!",
      '💪 Your memory is getting stronger with each game!',
      "⭐ Nice improvement! You're on the right track!",
    ],
    intermediate: [
      "🔥 You're getting good at this! Keep the momentum!",
      "🎪 Impressive skills! You're becoming a memory pro!",
      "🌟 Excellent progress! You're in the intermediate league!",
    ],
    advanced: [
      "🏆 Outstanding performance! You're almost a master!",
      '💎 Your memory skills are truly impressive!',
      "🚀 You're reaching expert levels! Keep pushing!",
    ],
    expert: [
      '🧠 Memory Master level achieved! Incredible!',
      "👑 You're among the elite players! Amazing work!",
      "🌟 Legendary performance! You're inspiring others!",
    ],
  };

  let level = 'rookie';
  if (userStats.best_score >= 300) level = 'expert';
  else if (userStats.best_score >= 200) level = 'advanced';
  else if (userStats.best_score >= 150) level = 'intermediate';
  else if (userStats.best_score >= 100) level = 'beginner';

  const levelMessages = messages[level];
  return levelMessages[Math.floor(Math.random() * levelMessages.length)];
}

/**
 * Calculate user accuracy across all games
 */
async function calculateUserAccuracy(username) {
  try {
    // const result = await database.query(`
    //     SELECT
    //         AVG(CASE WHEN moves > 0 THEN (cards_matched::float / moves) * 100 ELSE 0 END) as accuracy
    //     FROM games
    //     WHERE username = $1 AND game_completed = true
    // `, [username]);

    // return result.rows[0].accuracy ? parseFloat(result.rows[0].accuracy).toFixed(1) : '0.0';
    return '85.0'; // Placeholder
  } catch (error) {
    console.error('Error calculating accuracy:', error);
    return '0.0';
  }
}

/**
 * Get user's favorite emoji category
 */
async function getFavoriteCategory(username) {
  try {
    // This would require storing category data in game_data JSONB field
    // For now, return a fun placeholder
    const categories = ['classic', 'food', 'space', 'fantasy', 'tech'];
    return categories[Math.floor(Math.random() * categories.length)];
  } catch (error) {
    console.error('Error getting favorite category:', error);
    return 'classic';
  }
}

/**
 * Get recent games for a user
 */
async function getRecentGames(username, limit = 5) {
  try {
    // const games = await database.query(`
    //     SELECT score, difficulty_level, completed_at, time_elapsed
    //     FROM games
    //     WHERE username = $1 AND game_completed = true
    //     ORDER BY completed_at DESC
    //     LIMIT $2
    // `, [username, limit]);

    // return games.rows.map(game => ({
    //     score: game.score,
    //     difficulty: game.difficulty_level,
    //     completedAt: game.completed_at,
    //     duration: game.time_elapsed ? `${(game.time_elapsed / 1000).toFixed(1)}s` : null
    // }));
    return []; // Placeholder
  } catch (error) {
    console.error('Error getting recent games:', error);
    return [];
  }
}

/**
 * Get performance level based on best score
 */
function getPerformanceLevel(bestScore) {
  if (bestScore >= 300)
    return { level: 'Memory Master', emoji: '🧠', color: '#FFD700' };
  if (bestScore >= 250)
    return { level: 'Expert', emoji: '🏆', color: '#C0C0C0' };
  if (bestScore >= 200)
    return { level: 'Advanced', emoji: '⭐', color: '#CD7F32' };
  if (bestScore >= 150)
    return { level: 'Intermediate', emoji: '🎯', color: '#4169E1' };
  if (bestScore >= 100)
    return { level: 'Beginner', emoji: '🌱', color: '#32CD32' };
  return { level: 'Rookie', emoji: '🎮', color: '#808080' };
}

/**
 * Calculate progress to next level
 */
function getProgressToNextLevel(bestScore) {
  const levels = [100, 150, 200, 250, 300];
  const nextLevel = levels.find((level) => level > bestScore);

  if (!nextLevel) {
    return {
      isMaxLevel: true,
      message: "You've reached the highest level! 👑",
    };
  }

  const previousLevel = levels[levels.indexOf(nextLevel) - 1] || 0;
  const progress =
    ((bestScore - previousLevel) / (nextLevel - previousLevel)) * 100;

  return {
    isMaxLevel: false,
    currentLevel: previousLevel,
    nextLevel,
    progress: Math.max(0, Math.min(100, progress)),
    pointsNeeded: nextLevel - bestScore,
  };
}

// ========================================
// ROUTES
// ========================================

router.post('/user', (req, res) => {
  res.json({ success: true, message: 'User creation route working!' });
});

// router.get('/:username', (req, res) => {
//     res.json({ success: true, message: 'User stats route working!' });
// });

router.get('/:username', async (req, res) => {
  try {
    const username = req.params.username;

    // Placeholder: Replace with actual DB call
    const userStats = {
      best_score: 193,
      total_games: 1,
      best_time: 108393,
      last_played: new Date(),
      rank: 42,
    };

    const user = {
      username,
      bestScore: userStats.best_score,
      totalGames: userStats.total_games,
    };

    const statistics = {
      fastestTime: `${(userStats.best_time / 1000).toFixed(1)}s`,
      averageScore: userStats.best_score,
      globalRank: userStats.rank,
    };

    const performance = {
      level: getPerformanceLevel(userStats.best_score),
      rating: getGamePerformance(userStats.best_score, 'easy'),
    };

    const gameHistory = await getRecentGames(username);
    const achievements = await getUserAchievements(username, userStats);
    const message = getMotivationalMessage(userStats);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      user,
      statistics,
      performance,
      gameHistory,
      achievements,
      message,
    });
  } catch (error) {
    console.error('Error loading stats:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { includeHistory = false } = req.query;

    const user = mockUsers.get(username);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: `User "${username}" hasn't played any games yet! 🎮`,
        suggestion: 'Start your first game to see stats here! 🚀',
      });
    }

    // Mock user statistics
    const userStats = {
      username: user.username,
      total_games: user.total_games,
      total_score: user.total_games * 85, // Mock total score
      best_score: user.best_score || 120,
      best_time: 45000, // Mock best time
      avg_score: user.total_games > 0 ? 85 : 0,
      rank: Math.floor(Math.random() * 100) + 1, // Mock rank
      last_played: user.last_played,
    };

    const responseData = {
      success: true,
      user: {
        username: userStats.username,
        totalGames: userStats.total_games,
        totalScore: userStats.total_score,
        bestScore: userStats.best_score,
        bestTime: userStats.best_time,
        averageScore: userStats.avg_score,
        rank: userStats.rank,
        lastPlayed: userStats.last_played,
      },
      statistics: {
        gamesPlayed: userStats.total_games,
        totalPoints: userStats.total_score,
        highScore: userStats.best_score,
        fastestTime: userStats.best_time
          ? `${(userStats.best_time / 1000).toFixed(1)}s`
          : null,
        averageScore: userStats.avg_score,
        globalRank: userStats.rank,
        accuracy: '85.5', // Mock accuracy
        favoriteCategory: 'classic', // Mock category
      },
      performance: {
        level: {
          level:
            userStats.best_score >= 200
              ? 'Advanced'
              : userStats.best_score >= 100
                ? 'Intermediate'
                : 'Beginner',
          emoji:
            userStats.best_score >= 200
              ? '⭐'
              : userStats.best_score >= 100
                ? '🎯'
                : '🌱',
          color:
            userStats.best_score >= 200
              ? '#4169E1'
              : userStats.best_score >= 100
                ? '#32CD32'
                : '#808080',
        },
        progressToNext: {
          isMaxLevel: userStats.best_score >= 300,
          pointsNeeded: Math.max(0, 200 - userStats.best_score),
        },
        achievements: [
          {
            id: 'first_game',
            title: 'First Steps! 👶',
            description: 'Completed your first memory game',
            icon: '🎮',
            rarity: 'common',
          },
        ],
      },
      message: getMotivationalMessage(userStats),
    };

    // Include mock game history if requested
    if (includeHistory === 'true') {
      responseData.gameHistory = [
        {
          score: 120,
          difficulty: 'easy',
          completedAt: new Date(Date.now() - 86400000), // 1 day ago
          duration: '1:15',
        },
        {
          score: 95,
          difficulty: 'easy',
          completedAt: new Date(Date.now() - 172800000), // 2 days ago
          duration: '1:45',
        },
      ].slice(0, userStats.total_games);
    }

    console.log(
      `📊 Stats retrieved for ${username}: ${userStats.total_games} games`
    );

    res.json(responseData);
  } catch (error) {
    console.error('❌ Error getting user scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user scores',
      message: "Couldn't load your stats right now! 📊",
    });
  }
});

router.get('/:username/history', async (req, res) => {
  try {
    const { username } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const user = mockUsers.get(username);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found! 🔍',
      });
    }

    // Mock game history
    const gameHistory = [];
    for (let i = 0; i < Math.min(user.total_games, parseInt(limit)); i++) {
      gameHistory.push({
        gameId: uuidv4(),
        score: Math.floor(Math.random() * 200) + 50,
        moves: Math.floor(Math.random() * 20) + 16,
        timeElapsed: Math.floor(Math.random() * 180000) + 30000,
        cardsMatched: 8,
        difficulty: 'easy',
        startedAt: new Date(Date.now() - (i + 1) * 86400000),
        completedAt: new Date(Date.now() - (i + 1) * 86400000 + 120000),
        duration: `${Math.floor(Math.random() * 3) + 1}:${Math.floor(
          Math.random() * 60
        )
          .toString()
          .padStart(2, '0')}`,
        accuracy: (Math.random() * 30 + 70).toFixed(1),
      });
    }

    res.json({
      success: true,
      gameHistory,
      pagination: {
        total: user.total_games,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < user.total_games,
      },
      summary: {
        totalGames: gameHistory.length,
        averageScore:
          gameHistory.length > 0
            ? Math.round(
                gameHistory.reduce((sum, game) => sum + game.score, 0) /
                  gameHistory.length
              )
            : 0,
        bestGame:
          gameHistory.length > 0
            ? gameHistory.reduce((best, game) =>
                game.score > best.score ? game : best
              )
            : null,
      },
    });
  } catch (error) {
    console.error('❌ Error getting game history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game history',
      message: "Couldn't load your game history! 📚",
    });
  }
});

module.exports = router;
