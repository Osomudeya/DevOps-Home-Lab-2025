// Game Data and Content Generation
// Contains funny emojis, jokes, and game configuration data

// ========================================
// FUNNY EMOJI PAIRS FOR MEMORY GAME
// ========================================

const emojiPairs = [
  { id: 'laughing', emoji: '😂', name: 'Crying Laugh', category: 'classic' },
  { id: 'wink', emoji: '😉', name: 'Winking Face', category: 'classic' },
  { id: 'cool', emoji: '😎', name: 'Cool Dude', category: 'classic' },
  { id: 'heart_eyes', emoji: '😍', name: 'Heart Eyes', category: 'love' },
  {
    id: 'thinking',
    emoji: '🤔',
    name: 'Thinking Face',
    category: 'thoughtful',
  },
  { id: 'upside_down', emoji: '🙃', name: 'Upside Down', category: 'silly' },
  { id: 'rolling_eyes', emoji: '🙄', name: 'Eye Roll', category: 'sassy' },
  { id: 'zany', emoji: '🤪', name: 'Zany Face', category: 'silly' },
  { id: 'robot', emoji: '🤖', name: 'Robot Face', category: 'tech' },
  { id: 'ghost', emoji: '👻', name: 'Friendly Ghost', category: 'spooky' },
  { id: 'alien', emoji: '👽', name: 'Alien Friend', category: 'space' },
  { id: 'unicorn', emoji: '🦄', name: 'Magical Unicorn', category: 'fantasy' },
  { id: 'pizza', emoji: '🍕', name: 'Pizza Slice', category: 'food' },
  { id: 'taco', emoji: '🌮', name: 'Taco Tuesday', category: 'food' },
  { id: 'donut', emoji: '🍩', name: 'Donut Delight', category: 'food' },
  { id: 'rainbow', emoji: '🌈', name: 'Rainbow Magic', category: 'nature' },
  { id: 'rocket', emoji: '🚀', name: 'Blast Off', category: 'space' },
  { id: 'guitar', emoji: '🎸', name: 'Rock Star', category: 'music' },
  { id: 'sunglasses', emoji: '🕶️', name: 'Shades', category: 'cool' },
  { id: 'party', emoji: '🎉', name: 'Party Time', category: 'celebration' },
  { id: 'detective', emoji: '🕵️', name: 'Detective', category: 'mystery' },
  { id: 'ninja', emoji: '🥷', name: 'Stealth Ninja', category: 'action' },
  { id: 'pirate', emoji: '🏴‍☠️', name: 'Pirate Flag', category: 'adventure' },
  { id: 'fire', emoji: '🔥', name: 'On Fire', category: 'hot' },
  { id: 'lightning', emoji: '⚡', name: 'Lightning Bolt', category: 'energy' },
  { id: 'star', emoji: '⭐', name: 'Superstar', category: 'space' },
  { id: 'diamond', emoji: '💎', name: 'Precious Diamond', category: 'luxury' },
  { id: 'crown', emoji: '👑', name: 'Royal Crown', category: 'luxury' },
  {
    id: 'trophy',
    emoji: '🏆',
    name: 'Victory Trophy',
    category: 'achievement',
  },
  { id: 'magic_wand', emoji: '🪄', name: 'Magic Wand', category: 'fantasy' },
];

// ========================================
// FUNNY SUCCESS MESSAGES
// ========================================

const successMessages = [
  '🎉 Perfect match! Your memory is on fire! 🔥',
  "💫 Brilliant! You're basically a memory wizard! 🧙‍♂️",
  '🏆 Match made in heaven! Well, actually in your brain! 🧠',
  '⚡ Lightning fast! The cards are trembling! 😱',
  '🎯 Bulls-eye! Your memory skills are legendary! 📜',
  '🚀 To the moon! That match was astronomical! 🌙',
  "🔥 Hot streak! You're unstoppable! 💪",
  '💎 Diamond quality match! Sparkling performance! ✨',
  '🎪 Circus-level skills! The crowd goes wild! 👏',
  "🦸‍♀️ Super match! You're a memory superhero! 🦸‍♂️",
  '🎨 Masterpiece! Picasso would be proud! 🖼️',
  '🍕 Delicious match! Tastier than pizza! (Almost) 😋',
  '🎵 Music to our ears! That match was pitch perfect! 🎶',
  '🌟 Star quality! Hollywood is calling! 📞',
  '🏃‍♂️ Speed demon! Faster than a cheetah! 🐆',
];

// ========================================
// FUNNY FAILURE MESSAGES
// ========================================

const failureMessages = [
  '🤔 Oops! Those cards are just friends, not twins! 👯‍♀️',
  '😅 So close! But no cigar... or match! 🚭',
  '🙈 Miss! Even the cards are giggling! 🤭',
  "🎯 Almost! You're getting warmer... well, lukewarm! 🌡️",
  '🔍 Detective mode needed! Those cards are hiding! 🕵️‍♀️',
  '🎪 Plot twist! The cards decided to be different! 🎭',
  '🍀 Better luck next flip! The cards are feeling shy! 😊',
  '🎲 Roll again! Fortune favors the persistent! 🔄',
  "🌊 Wave goodbye to that attempt! Next one's the charm! 👋",
  "🎈 Pop! That wasn't a match, but don't deflate! 🎈",
  '🐾 Paws for thought... try a different pair! 🐱',
  '🎨 Abstract art! Beautiful attempt, wrong match! 🖌️',
  '🚂 All aboard the try-again train! Choo choo! 🚂',
  '🌙 Moonshot! Aim for the stars next time! ⭐',
  '🎃 Trick, not treat! But keep going! 🍬',
];

// ========================================
// GAME CONFIGURATION
// ========================================

const gameConfig = {
  difficulties: {
    easy: {
      cardCount: 16, // 8 pairs
      timeLimit: 300000, // 5 minutes in milliseconds
      pointsPerMatch: 10,
      bonusTimeThreshold: 10000, // 10 seconds for bonus
      bonusPoints: 5,
      gridSize: '4x4',
    },
    medium: {
      cardCount: 20, // 10 pairs
      timeLimit: 480000, // 8 minutes in milliseconds
      pointsPerMatch: 15,
      bonusTimeThreshold: 8000, // 8 seconds for bonus
      bonusPoints: 8,
      gridSize: '5x4',
    },
    hard: {
      cardCount: 24, // 12 pairs
      timeLimit: 600000, // 10 minutes in milliseconds
      pointsPerMatch: 20,
      bonusTimeThreshold: 6000, // 6 seconds for bonus
      bonusPoints: 12,
      gridSize: '6x4',
    },
    expert: {
      cardCount: 30, // 15 pairs
      timeLimit: 900000, // 15 minutes in milliseconds
      pointsPerMatch: 25,
      bonusTimeThreshold: 5000, // 5 seconds for bonus
      bonusPoints: 15,
      gridSize: '6x5',
    },
  },

  animation: {
    cardFlipDuration: 300, // milliseconds
    matchSuccessDelay: 800, // milliseconds
    mismatchHideDelay: 1500, // milliseconds
    celebrationDuration: 2000, // milliseconds
  },

  scoring: {
    perfectGameBonus: 50, // bonus for no wrong matches
    speedBonusMultiplier: 1.5, // multiplier for fast games
    streakBonus: 3, // bonus points per consecutive match
    maxStreakBonus: 30, // maximum streak bonus
  },
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

class GameDataGenerator {
  /**
   * Generate a shuffled array of card pairs for a game
   * @param {string} difficulty - Game difficulty level
   * @param {Array} categories - Optional array of categories to include
   * @returns {Array} Array of card objects with positions
   */
  static generateCardSet(difficulty = 'easy', categories = null) {
    const config = gameConfig.difficulties[difficulty];
    if (!config) {
      throw new Error(`Invalid difficulty: ${difficulty}`);
    }

    const pairCount = config.cardCount / 2;

    // Filter emojis by categories if specified
    let availableEmojis = emojiPairs;
    if (categories && categories.length > 0) {
      availableEmojis = emojiPairs.filter((emoji) =>
        categories.includes(emoji.category)
      );
    }

    // Ensure we have enough emojis
    if (availableEmojis.length < pairCount) {
      availableEmojis = emojiPairs; // Fall back to all emojis
    }

    // Randomly select emojis for this game
    const selectedEmojis = this.shuffleArray([...availableEmojis]).slice(
      0,
      pairCount
    );

    // Create pairs of cards
    const cards = [];
    selectedEmojis.forEach((emoji, index) => {
      // Create two cards for each emoji (a pair)
      cards.push({
        id: `${emoji.id}_1`,
        pairId: emoji.id,
        emoji: emoji.emoji,
        name: emoji.name,
        category: emoji.category,
        isFlipped: false,
        isMatched: false,
        position: null, // Will be set when shuffled
      });

      cards.push({
        id: `${emoji.id}_2`,
        pairId: emoji.id,
        emoji: emoji.emoji,
        name: emoji.name,
        category: emoji.category,
        isFlipped: false,
        isMatched: false,
        position: null, // Will be set when shuffled
      });
    });

    // Shuffle cards and assign positions
    const shuffledCards = this.shuffleArray(cards);
    shuffledCards.forEach((card, index) => {
      card.position = index;
    });

    return shuffledCards;
  }

  /**
   * Get a random success message
   * @returns {string} Random success message
   */
  static getRandomSuccessMessage() {
    return successMessages[Math.floor(Math.random() * successMessages.length)];
  }

  /**
   * Get a random failure message
   * @returns {string} Random failure message
   */
  static getRandomFailureMessage() {
    return failureMessages[Math.floor(Math.random() * failureMessages.length)];
  }

  /**
   * Get a random emoji from a specific category
   * @param {string} category - Category name
   * @returns {Object|null} Random emoji object or null if category not found
   */
  static getRandomEmojiByCategory(category) {
    const categoryEmojis = emojiPairs.filter(
      (emoji) => emoji.category === category
    );
    if (categoryEmojis.length === 0) return null;

    return categoryEmojis[Math.floor(Math.random() * categoryEmojis.length)];
  }

  /**
   * Calculate game score based on performance
   * @param {Object} gameStats - Game statistics
   * @returns {Object} Score breakdown
   */
  static calculateScore(gameStats) {
    const {
      matches,
      wrongMoves,
      timeElapsed,
      difficulty = 'easy',
      consecutiveMatches = 0,
    } = gameStats;

    const config = gameConfig.difficulties[difficulty];
    const scoring = gameConfig.scoring;

    let totalScore = 0;
    const breakdown = {
      baseScore: 0,
      bonusPoints: 0,
      speedBonus: 0,
      perfectGameBonus: 0,
      streakBonus: 0,
      penalties: 0,
    };

    // Base score from matches
    breakdown.baseScore = matches * config.pointsPerMatch;
    totalScore += breakdown.baseScore;

    // Speed bonus for fast matches
    if (timeElapsed < config.timeLimit * 0.5) {
      // Finished in less than half the time limit
      breakdown.speedBonus = Math.floor(
        breakdown.baseScore * scoring.speedBonusMultiplier
      );
      totalScore += breakdown.speedBonus;
    }

    // Perfect game bonus (no wrong moves)
    if (wrongMoves === 0) {
      breakdown.perfectGameBonus = scoring.perfectGameBonus;
      totalScore += breakdown.perfectGameBonus;
    }

    // Streak bonus
    if (consecutiveMatches >= 3) {
      breakdown.streakBonus = Math.min(
        consecutiveMatches * scoring.streakBonus,
        scoring.maxStreakBonus
      );
      totalScore += breakdown.streakBonus;
    }

    // Penalty for wrong moves (optional)
    breakdown.penalties = Math.max(0, wrongMoves - 2) * 2; // Penalty after 2 wrong moves
    totalScore -= breakdown.penalties;

    // Ensure score is not negative
    totalScore = Math.max(0, totalScore);

    return {
      totalScore,
      breakdown,
      rating: this.getPerformanceRating(totalScore, difficulty),
    };
  }

  /**
   * Get performance rating based on score
   * @param {number} score - Total score
   * @param {string} difficulty - Game difficulty
   * @returns {Object} Rating information
   */
  static getPerformanceRating(score, difficulty) {
    const config = gameConfig.difficulties[difficulty];
    const maxPossibleScore =
      (config.cardCount / 2) * config.pointsPerMatch +
      config.bonusPoints +
      gameConfig.scoring.perfectGameBonus;

    const percentage = Math.min(100, (score / maxPossibleScore) * 100);

    if (percentage >= 90) {
      return { level: 'Legendary', emoji: '🏆', message: 'Memory Master!' };
    } else if (percentage >= 80) {
      return { level: 'Excellent', emoji: '⭐', message: 'Outstanding!' };
    } else if (percentage >= 70) {
      return { level: 'Great', emoji: '🎯', message: 'Well done!' };
    } else if (percentage >= 60) {
      return { level: 'Good', emoji: '👍', message: 'Nice job!' };
    } else if (percentage >= 50) {
      return { level: 'Average', emoji: '😊', message: 'Keep trying!' };
    } else {
      return { level: 'Practice', emoji: '💪', message: "You'll get it!" };
    }
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get available emoji categories
   * @returns {Array} Array of unique categories
   */
  static getCategories() {
    const categories = [...new Set(emojiPairs.map((emoji) => emoji.category))];
    return categories.sort();
  }

  /**
   * Generate a daily challenge configuration
   * @returns {Object} Daily challenge config
   */
  static generateDailyChallenge() {
    const today = new Date().toISOString().split('T')[0];
    const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);

    // Use date as seed for consistent daily challenge
    Math.seedrandom = seed;

    const difficulties = Object.keys(gameConfig.difficulties);
    const categories = this.getCategories();

    const challenge = {
      date: today,
      difficulty: difficulties[seed % difficulties.length],
      requiredCategories: categories.slice(0, 3 + (seed % 3)), // 3-5 categories
      targetTime: gameConfig.difficulties.medium.timeLimit * 0.7, // 70% of medium time
      bonusMultiplier: 1.5 + (seed % 10) / 10, // 1.5-2.4x multiplier
      specialRule: this.getDailySpecialRule(seed),
    };

    return challenge;
  }

  /**
   * Get special rule for daily challenge
   * @param {number} seed - Random seed
   * @returns {Object} Special rule configuration
   */
  static getDailySpecialRule(seed) {
    const rules = [
      {
        name: 'Speed Demon',
        description: 'Double points for matches under 5 seconds',
        type: 'speed',
      },
      {
        name: 'Category Master',
        description: 'Bonus points for matching specific categories in order',
        type: 'category',
      },
      {
        name: 'Perfect Memory',
        description: 'No wrong moves allowed!',
        type: 'perfect',
      },
      {
        name: 'Chain Reaction',
        description: 'Consecutive matches give increasing bonuses',
        type: 'streak',
      },
      {
        name: 'Time Crunch',
        description: 'Half the usual time limit',
        type: 'time',
      },
    ];

    return rules[seed % rules.length];
  }
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  emojiPairs,
  successMessages,
  failureMessages,
  gameConfig,
  GameDataGenerator,
};
