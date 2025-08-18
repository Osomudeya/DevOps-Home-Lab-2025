// Leaderboard API Routes for Backend
// Handles global leaderboards, rankings, and competitive features

const express = require('express');

const router = express.Router();

// Mock leaderboard data
const mockLeaderboard = [
  {
    username: 'memorymaster42',
    display_name: '🧠 Memory Master',
    best_score: 280,
    total_games: 25,
    best_time: 42000,
    avg_score: 195.5,
    last_played: new Date(Date.now() - 3600000),
  },
  {
    username: 'cardshark_jenny',
    display_name: '🦈 Card Shark Jenny',
    best_score: 265,
    total_games: 18,
    best_time: 38000,
    avg_score: 188.2,
    last_played: new Date(Date.now() - 7200000),
  },
  {
    username: 'emoji_ninja',
    display_name: '🥷 Emoji Ninja',
    best_score: 245,
    total_games: 22,
    best_time: 45000,
    avg_score: 175.8,
    last_played: new Date(Date.now() - 1800000),
  },
  {
    username: 'laugh_machine',
    display_name: '😂 Laugh Machine',
    best_score: 230,
    total_games: 31,
    best_time: 52000,
    avg_score: 168.9,
    last_played: new Date(Date.now() - 900000),
  },
  {
    username: 'puzzle_pirate',
    display_name: '🏴‍☠️ Puzzle Pirate',
    best_score: 215,
    total_games: 14,
    best_time: 48000,
    avg_score: 162.3,
    last_played: new Date(Date.now() - 86400000),
  },
  {
    username: 'memory_mango',
    display_name: '🥭 Memory Mango',
    best_score: 200,
    total_games: 19,
    best_time: 55000,
    avg_score: 155.7,
    last_played: new Date(Date.now() - 3600000),
  },
  {
    username: 'giggle_guru',
    display_name: '🤓 Giggle Guru',
    best_score: 185,
    total_games: 27,
    best_time: 49000,
    avg_score: 148.1,
    last_played: new Date(Date.now() - 1800000),
  },
  {
    username: 'chuckle_champ',
    display_name: '🏆 Chuckle Champ',
    best_score: 170,
    total_games: 16,
    best_time: 58000,
    avg_score: 142.5,
    last_played: new Date(Date.now() - 7200000),
  },
];

function getPlayerBadge(score, rank) {
  if (rank === 1) return { emoji: '👑', title: 'Champion', color: '#FFD700' };
  if (rank === 2) return { emoji: '🥈', title: '2nd Place', color: '#C0C0C0' };
  if (rank === 3) return { emoji: '🥉', title: '3rd Place', color: '#CD7F32' };
  if (rank <= 10) return { emoji: '🏆', title: 'Top 10', color: '#4169E1' };
  if (rank <= 25) return { emoji: '⭐', title: 'Top 25', color: '#32CD32' };
  if (score >= 300)
    return { emoji: '🧠', title: 'Memory Master', color: '#9932CC' };
  if (score >= 250) return { emoji: '🎯', title: 'Expert', color: '#FF6347' };
  if (score >= 200) return { emoji: '🎪', title: 'Advanced', color: '#FF8C00' };
  if (score >= 150) return { emoji: '🎮', title: 'Skilled', color: '#20B2AA' };
  if (score >= 100)
    return { emoji: '🌱', title: 'Rising Star', color: '#90EE90' };
  return { emoji: '🎲', title: 'Player', color: '#808080' };
}

function getPerformanceRating(score) {
  if (score >= 300) return { level: 'Legendary', color: '#FFD700' };
  if (score >= 250) return { level: 'Excellent', color: '#C0C0C0' };
  if (score >= 200) return { level: 'Great', color: '#CD7F32' };
  if (score >= 150) return { level: 'Good', color: '#4169E1' };
  if (score >= 100) return { level: 'Average', color: '#32CD32' };
  return { level: 'Beginner', color: '#808080' };
}

function isRecentlyActive(lastPlayed) {
  if (!lastPlayed) return false;
  const daysSinceLastPlayed =
    (Date.now() - new Date(lastPlayed)) / (1000 * 60 * 60 * 24);
  return daysSinceLastPlayed <= 7;
}

function generateInsights(overallStats, difficultyStats, records) {
  const insights = [];
  const completionRate = parseFloat(overallStats.completionRate);
  if (completionRate >= 90) {
    insights.push('🎯 Excellent completion rate! Players are really engaged!');
  } else if (completionRate >= 70) {
    insights.push('👍 Good completion rate! Most players finish their games.');
  } else {
    insights.push('📈 Room for improvement in game completion rates.');
  }
  const popularDifficulty = difficultyStats.reduce((prev, current) =>
    prev.gamesPlayed > current.gamesPlayed ? prev : current
  );
  insights.push(
    `🎮 Most popular difficulty: ${popularDifficulty.difficulty} (${popularDifficulty.gamesPlayed} games)`
  );
  if (records.highest_score && records.highest_score.value >= 300) {
    insights.push(
      `🏆 Incredible high score of ${records.highest_score.value} points by ${records.highest_score.username}!`
    );
  }
  if (records.fastest_time && records.fastest_time.value < 60000) {
    insights.push(
      `⚡ Lightning fast completion in ${records.fastest_time.formatted} by ${records.fastest_time.username}!`
    );
  }
  if (overallStats.activeUsers24h >= 5) {
    insights.push(
      `🔥 Active community with ${overallStats.activeUsers24h} players in the last 24 hours!`
    );
  }
  return insights;
}

router.get('/', async (req, res) => {
  try {
    const { limit = 25, difficulty = null, timeframe = 'all' } = req.query;
    console.log(
      `🏆 Fetching leaderboard (limit: ${limit}, timeframe: ${timeframe})`
    );
    let filteredLeaderboard = [...mockLeaderboard];
    if (timeframe === 'week') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filteredLeaderboard = filteredLeaderboard.filter(
        (player) => new Date(player.last_played) > oneWeekAgo
      );
    } else if (timeframe === 'month') {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filteredLeaderboard = filteredLeaderboard.filter(
        (player) => new Date(player.last_played) > oneMonthAgo
      );
    }
    filteredLeaderboard.sort((a, b) => {
      if (b.best_score !== a.best_score) {
        return b.best_score - a.best_score;
      }
      return a.best_time - b.best_time;
    });
    filteredLeaderboard = filteredLeaderboard.slice(0, parseInt(limit));
    const formattedLeaderboard = filteredLeaderboard.map((player, index) => ({
      rank: index + 1,
      username: player.username,
      displayName: player.display_name || player.username,
      totalGames: player.total_games,
      totalScore: player.total_games * Math.floor(player.avg_score),
      bestScore: player.best_score,
      bestTime: player.best_time,
      averageScore: parseFloat(player.avg_score),
      lastPlayed: player.last_played,
      badge: getPlayerBadge(player.best_score, index + 1),
      performance: getPerformanceRating(player.best_score),
      timeFormatted: player.best_time
        ? `${(player.best_time / 1000).toFixed(1)}s`
        : 'N/A',
      isActive: isRecentlyActive(player.last_played),
      isCurrentUser: false,
    }));
    res.json({
      success: true,
      leaderboard: formattedLeaderboard,
      metadata: {
        totalPlayers: formattedLeaderboard.length,
        timeframe,
        difficulty: difficulty || 'all',
        lastUpdated: new Date().toISOString(),
        topScore:
          formattedLeaderboard.length > 0
            ? formattedLeaderboard[0].bestScore
            : 0,
        averageScore:
          formattedLeaderboard.length > 0
            ? Math.round(
                formattedLeaderboard.reduce((sum, p) => sum + p.bestScore, 0) /
                  formattedLeaderboard.length
              )
            : 0,
      },
      message:
        formattedLeaderboard.length > 0
          ? `🏆 Top ${formattedLeaderboard.length} memory champions! 🧠`
          : '🎮 Be the first to claim your spot on the leaderboard! 🚀',
    });
    console.log(`🏆 Leaderboard sent: ${formattedLeaderboard.length} players`);
  } catch (error) {
    console.error('❌ Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      message: 'Leaderboard is taking a memory break! 😅',
    });
  }
});

router.get('/fresh', async (req, res) => {
  try {
    const { limit = 25 } = req.query;
    console.log('🔄 Fetching fresh leaderboard data...');
    const formattedLeaderboard = mockLeaderboard
      .slice(0, parseInt(limit))
      .map((player, index) => ({
        rank: index + 1,
        username: player.username,
        displayName: player.display_name || player.username,
        totalGames: player.total_games,
        bestScore: player.best_score,
        bestTime: player.best_time,
        averageScore: parseFloat(player.avg_score),
        lastPlayed: player.last_played,
        badge: getPlayerBadge(player.best_score, index + 1),
        performance: getPerformanceRating(player.best_score),
        timeFormatted: player.best_time
          ? `${(player.best_time / 1000).toFixed(1)}s`
          : 'N/A',
        isActive: isRecentlyActive(player.last_played),
      }));
    res.json({
      success: true,
      leaderboard: formattedLeaderboard,
      metadata: {
        totalPlayers: formattedLeaderboard.length,
        dataSource: 'fresh',
        lastUpdated: new Date().toISOString(),
        cacheCleared: true,
      },
      message: `✨ Fresh leaderboard data loaded! 🎯`,
    });
  } catch (error) {
    console.error('❌ Error getting fresh leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fresh leaderboard',
      message: "Couldn't refresh the leaderboard! 🔄",
    });
  }
});

router.get('/rank/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { context = 5 } = req.query;
    const userIndex = mockLeaderboard.findIndex(
      (player) => player.username === username
    );
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: `User "${username}" not found on leaderboard! 🔍`,
      });
    }
    const user = mockLeaderboard[userIndex];
    const userRank = userIndex + 1;
    const contextSize = parseInt(context);
    const startIndex = Math.max(0, userIndex - contextSize);
    const endIndex = Math.min(
      mockLeaderboard.length - 1,
      userIndex + contextSize
    );
    const contextPlayers = mockLeaderboard
      .slice(startIndex, endIndex + 1)
      .map((player, idx) => ({
        rank: startIndex + idx + 1,
        username: player.username,
        displayName: player.display_name || player.username,
        bestScore: player.best_score,
        bestTime: player.best_time,
        timeFormatted: player.best_time
          ? `${(player.best_time / 1000).toFixed(1)}s`
          : 'N/A',
        badge: getPlayerBadge(player.best_score, startIndex + idx + 1),
        isCurrentUser: player.username === username,
        pointsToNext:
          startIndex + idx > 0
            ? mockLeaderboard[startIndex + idx - 1].best_score -
              player.best_score
            : 0,
      }));
    res.json({
      success: true,
      userRank: {
        username: user.username,
        displayName: user.display_name || user.username,
        currentRank: userRank,
        bestScore: user.best_score,
        totalGames: user.total_games,
        badge: getPlayerBadge(user.best_score, userRank),
        performance: getPerformanceRating(user.best_score),
      },
      context: contextPlayers,
      statistics: {
        totalRankedPlayers: mockLeaderboard.length,
        percentile: (
          ((mockLeaderboard.length - userRank + 1) / mockLeaderboard.length) *
          100
        ).toFixed(1),
        playersAbove: userRank - 1,
        playersBelow: mockLeaderboard.length - userRank,
      },
      message:
        userRank <= 10
          ? `🏆 Amazing! You're in the top 10! (Rank #${userRank}) 🌟`
          : userRank <= 100
            ? `🎯 Great job! You're in the top 100! (Rank #${userRank}) 💪`
            : `🎮 Keep playing to climb higher! (Rank #${userRank}) 🚀`,
    });
  } catch (error) {
    console.error('❌ Error getting user ranking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user ranking',
      message: "Couldn't find your ranking! 📊",
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalPlayers = mockLeaderboard.length;
    const totalGames = mockLeaderboard.reduce(
      (sum, player) => sum + player.total_games,
      0
    );
    const highestScore = Math.max(...mockLeaderboard.map((p) => p.best_score));
    const averageScore =
      mockLeaderboard.reduce((sum, p) => sum + p.best_score, 0) / totalPlayers;
    const fastestTime = Math.min(...mockLeaderboard.map((p) => p.best_time));
    const activeUsers24h = mockLeaderboard.filter(
      (player) =>
        new Date(player.last_played) >
        new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    const statistics = {
      overall: {
        totalUsers: totalPlayers,
        totalGames: totalGames,
        completedGames: totalGames,
        totalMatches: totalGames * 8,
        highestScore: highestScore,
        activeUsers24h: activeUsers24h,
        completionRate: '100.0',
      },
      byDifficulty: [
        {
          difficulty: 'easy',
          gamesPlayed: Math.floor(totalGames * 0.6),
          averageScore: Math.floor(averageScore * 0.8),
          maxScore: Math.floor(highestScore * 0.8),
          averageTime: '1.2s',
        },
        {
          difficulty: 'medium',
          gamesPlayed: Math.floor(totalGames * 0.3),
          averageScore: Math.floor(averageScore * 0.9),
          maxScore: Math.floor(highestScore * 0.9),
          averageTime: '1.8s',
        },
        {
          difficulty: 'hard',
          gamesPlayed: Math.floor(totalGames * 0.1),
          averageScore: averageScore,
          maxScore: highestScore,
          averageTime: '2.5s',
        },
      ],
      records: {
        highest_score: {
          username: mockLeaderboard[0].username,
          value: mockLeaderboard[0].best_score,
          unit: 'points',
          formatted: `${mockLeaderboard[0].best_score} points`,
        },
        fastest_time: {
          username: mockLeaderboard.find((p) => p.best_time === fastestTime)
            ?.username,
          value: fastestTime,
          unit: 'ms',
          formatted: `${(fastestTime / 1000).toFixed(1)}s`,
        },
        most_games: {
          username: mockLeaderboard.reduce((prev, current) =>
            prev.total_games > current.total_games ? prev : current
          ).username,
          value: Math.max(...mockLeaderboard.map((p) => p.total_games)),
          unit: 'games',
          formatted: `${Math.max(...mockLeaderboard.map((p) => p.total_games))} games`,
        },
      },
      activity: [],
    };
    const insights = generateInsights(
      statistics.overall,
      statistics.byDifficulty,
      statistics.records
    );
    res.json({
      success: true,
      statistics,
      insights,
      message: '📊 Complete leaderboard statistics loaded! 📈',
    });
  } catch (error) {
    console.error('❌ Error getting leaderboard statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: 'Statistics are taking a break! 📊',
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    console.log('🗑️ Clearing leaderboard cache (mock)');
    res.json({
      success: true,
      message: '✨ Leaderboard cache refreshed! 🔄',
      clearedKeys: {
        leaderboard: 5,
        userStats: 8,
        total: 13,
      },
    });
  } catch (error) {
    console.error('❌ Error refreshing leaderboard cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache',
      message: 'Cache refresh failed! 🔄',
    });
  }
});

module.exports = router;
