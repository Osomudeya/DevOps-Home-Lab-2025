/**
 * Humor Memory Game - Frontend JavaScript
 */

// ========================================
// CONFIGURATION AND CONSTANTS
// ========================================

// API configuration - use environment variable or fallback
const API_BASE = window.API_BASE_URL || 'http://localhost:3001/api';
const CARD_FLIP_DELAY = 1500;
const MESSAGE_DISPLAY_TIME = 3000;

// ========================================
// GLOBAL STATE
// ========================================

let gameState = {
  currentUser: null,
  currentGame: null,
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  totalPairs: 0,
  score: 0,
  moves: 0,
  startTime: null,
  gameTimer: null,
  isGameActive: false,
  difficulty: 'easy',
};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🎮 Humor Memory Game Frontend Loading...');

  // Check API connectivity
  checkAPIConnection()
    .then(() => {
      setTimeout(() => {
        hideLoadingScreen();
        initializeGame();
      }, 2000);
    })
    .catch(() => {
      showAPIError();
    });
});

async function checkAPIConnection() {
  try {
    const response = await fetch(`${API_BASE}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('API not responding');
    }

    const result = await response.json();
    console.log('✅ API connection successful:', result.message);
    return true;
  } catch (error) {
    console.error('❌ API connection failed:', error);
    throw error;
  }
}

function showAPIError() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="error-emoji">🚨</div>
                <h2>Cannot Connect to Game Server</h2>
                <p>The backend API is not responding. Please check if the backend server is running.</p>
                <button class="btn btn-primary" onclick="location.reload()">🔄 Retry Connection</button>
                <div class="error-details">
                    <p>Expected API at: <code>${API_BASE}</code></p>
                    <p>Make sure your backend server is running on port 3001</p>
                </div>
            </div>
        `;
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  const gameContainer = document.getElementById('gameContainer');

  if (loadingScreen && gameContainer) {
    loadingScreen.style.display = 'none';
    gameContainer.style.display = 'block';
    console.log('✅ Frontend loaded successfully!');
  }
}

function initializeGame() {
  setupEventListeners();
  setupTabNavigation();
  loadLeaderboard();
  console.log('🎯 Frontend initialized and ready to play!');
}

// ========================================
// API COMMUNICATION FUNCTIONS
// ========================================

async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    console.log(
      `✅ API Response: ${endpoint}`,
      data.success ? 'Success' : 'Info'
    );
    return data;
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error);

    // Show user-friendly error message
    if (error.message.includes('Failed to fetch')) {
      showNotification(
        'Connection error! Is the backend server running? 🔌',
        'error'
      );
    } else {
      showNotification(error.message || 'API request failed! 😅', 'error');
    }

    throw error;
  }
}

// ========================================
// GAME MANAGEMENT FUNCTIONS
// ========================================

async function startNewGame() {
  try {
    const username = document.getElementById('usernameInput').value.trim();
    const difficulty = document.getElementById('difficultySelect').value;

    // Validate input
    if (!username || username.length < 3) {
      showNotification(
        'Username must be at least 3 characters long! 📝',
        'error'
      );
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      showNotification(
        'Username can only contain letters and numbers! 🔤',
        'error'
      );
      return;
    }

    // Get selected categories
    const selectedCategories = Array.from(
      document.querySelectorAll('.category-option input:checked')
    ).map((input) => input.value);

    // Disable start button
    const startBtn = document.getElementById('startGameBtn');
    startBtn.disabled = true;
    startBtn.textContent = '🎮 Starting Game...';

    // Create user first
    await apiRequest('/scores/user', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });

    // Start the game
    const gameData = {
      username,
      difficulty,
      categories: selectedCategories.length > 0 ? selectedCategories : null,
    };

    const result = await apiRequest('/game/start', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });

    // Initialize game state
    gameState = {
      ...gameState,
      currentUser: result.user,
      currentGame: result.game,
      cards: result.game.cards,
      totalPairs: result.game.cards.length / 2,
      score: 0,
      moves: 0,
      matchedPairs: 0,
      flippedCards: [],
      startTime: Date.now(),
      isGameActive: true,
      difficulty: difficulty,
    };

    // Setup UI
    setupGameBoard();
    startGameTimer();
    showGameBoard();

    showNotification(`🎯 Game started! Good luck, ${username}! 🍀`, 'success');
    console.log('🎮 Game started successfully:', result.game.gameId);
  } catch (error) {
    console.error('❌ Error starting game:', error);
  } finally {
    // Re-enable start button
    const startBtn = document.getElementById('startGameBtn');
    startBtn.disabled = false;
    startBtn.textContent = '🚀 Start Game!';
  }
}

async function checkForMatch() {
  const [card1, card2] = gameState.flippedCards;
  // const pairId1 = card1.dataset.pairId;
  // const pairId2 = card2.dataset.pairId;
  // const isMatch = pairId1 === pairId2;

  try {
    // Submit match to backend API
    const matchData = {
      gameId: gameState.currentGame.gameId,
      card1Id: card1.dataset.cardId,
      card2Id: card2.dataset.cardId,
      matchTime: Date.now() - gameState.startTime,
    };

    const result = await apiRequest('/game/match', {
      method: 'POST',
      body: JSON.stringify(matchData),
    });

    if (result.isMatch) {
      handleMatchSuccess(card1, card2, result);
    } else {
      handleMatchFailure(card1, card2, result);
    }

    // Update game state from server response
    if (result.game) {
      gameState.score = result.game.score;
      gameState.matchedPairs = result.game.matchesFound;
      updateGameInfo();

      // Check if game is complete
      if (result.game.isComplete) {
        setTimeout(() => completeGame(), 1000);
      }
    }
  } catch (error) {
    console.error('❌ Error checking match:', error);
    handleMatchFailure(card1, card2, { message: 'Connection error! 🔄' });
  }

  // Clear flipped cards array
  gameState.flippedCards = [];
}

async function completeGame() {
  if (!gameState.isGameActive) return;

  gameState.isGameActive = false;
  clearInterval(gameState.gameTimer);

  const finalTime = Date.now() - gameState.startTime;

  try {
    // Submit completion to backend API
    const completionData = {
      gameId: gameState.currentGame.gameId,
      timeElapsed: finalTime,
      finalScore: gameState.score,
    };

    const result = await apiRequest('/game/complete', {
      method: 'POST',
      body: JSON.stringify(completionData),
    });

    showGameCompleteModal(result.gameResult, result.achievements);
    playSound('complete');
    console.log('🏆 Game completed successfully!', result.gameResult);
  } catch (error) {
    console.error('❌ Error completing game:', error);
    showNotification("Game completed but couldn't save score! 😅", 'warning');

    // Show basic completion modal anyway
    const basicResult = {
      finalScore: gameState.score,
      timeElapsed: finalTime,
      totalMoves: gameState.moves,
      accuracy: ((gameState.matchedPairs / gameState.moves) * 100).toFixed(1),
    };
    showGameCompleteModal(basicResult, []);
  }
}

// ========================================
// LEADERBOARD FUNCTIONS
// ========================================

async function loadLeaderboard(fresh = false) {
  try {
    const leaderboardContent = document.getElementById('leaderboardContent');

    // Show loading state
    leaderboardContent.innerHTML =
      '<div class="loading-spinner">📊 Loading leaderboard...</div>';

    const endpoint = fresh ? '/leaderboard/fresh' : '/leaderboard';
    const result = await apiRequest(endpoint);

    renderLeaderboard(result.leaderboard, result.metadata);
    console.log(`🏆 Leaderboard loaded: ${result.leaderboard.length} players`);
  } catch (error) {
    console.error('❌ Error loading leaderboard:', error);
    document.getElementById('leaderboardContent').innerHTML = `
            <div class="error-state">
                <div class="error-emoji">😅</div>
                <p>Couldn't load leaderboard right now!</p>
                <button class="btn btn-primary" onclick="loadLeaderboard(true)">🔄 Try Again</button>
            </div>
        `;
  }
}

async function loadUserStats() {
  if (!gameState.currentUser?.username) {
    document.getElementById('userStatsContent').innerHTML = `
            <div class="stats-placeholder">
                <div class="placeholder-emoji">📈</div>
                <p>Play a game to see your stats here!</p>
                <button class="btn btn-primary" onclick="switchTab('game')">🎮 Start Playing</button>
            </div>
        `;
    return;
  }

  try {
    const result = await apiRequest(
      `/scores/${gameState.currentUser.username}?includeHistory=true`
    );
    renderUserStats(result);
    console.log(`📊 Stats loaded for ${gameState.currentUser.username}`);
  } catch (error) {
    console.error('❌ Error loading user stats:', error);
    document.getElementById('userStatsContent').innerHTML = `
            <div class="error-state">
                <div class="error-emoji">😅</div>
                <p>Couldn't load your stats right now!</p>
            </div>
        `;
  }
}

// ========================================
// UI HELPER FUNCTIONS
// ========================================

function setupEventListeners() {
  // User setup
  const startGameBtn = document.getElementById('startGameBtn');
  const usernameInput = document.getElementById('usernameInput');

  if (startGameBtn) startGameBtn.addEventListener('click', startNewGame);
  if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') startNewGame();
    });
  }

  // Game controls
  const newGameBtn = document.getElementById('newGameBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const quitBtn = document.getElementById('quitBtn');

  if (newGameBtn) newGameBtn.addEventListener('click', () => resetToSetup());
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  if (quitBtn) quitBtn.addEventListener('click', () => resetToSetup());

  // Modal controls
  const playAgainBtn = document.getElementById('playAgainBtn');
  const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');

  if (playAgainBtn)
    playAgainBtn.addEventListener('click', () => {
      closeModal('gameCompleteModal');
      resetToSetup();
    });

  if (viewLeaderboardBtn)
    viewLeaderboardBtn.addEventListener('click', () => {
      closeModal('gameCompleteModal');
      switchTab('leaderboard');
    });

  // Leaderboard controls
  const refreshLeaderboard = document.getElementById('refreshLeaderboard');
  if (refreshLeaderboard)
    refreshLeaderboard.addEventListener('click', () => loadLeaderboard(true));

  // Modal close handlers
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-close')) {
      const modal = e.target.closest('.modal');
      if (modal) closeModal(modal.id);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

function setupTabNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Update navigation buttons
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.classList.remove('active');
  });

  const targetTab = document.getElementById(`${tabName}Tab`);
  if (targetTab) {
    targetTab.classList.add('active');

    // Load content when switching to specific tabs
    if (tabName === 'leaderboard') {
      loadLeaderboard();
    } else if (tabName === 'stats' && gameState.currentUser) {
      loadUserStats();
    }
  }
}

function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  const messageEl = notification.querySelector('.notification-message');
  const emojiEl = notification.querySelector('.notification-emoji');

  if (!notification || !messageEl || !emojiEl) return;

  // Set content
  messageEl.textContent = message;

  const emojis = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };
  emojiEl.textContent = emojis[type] || emojis.info;

  // Show notification
  notification.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);

  console.log(`📢 Notification: ${message}`);
}

// ========================================
// COPY REMAINING FUNCTIONS FROM ORIGINAL
// (These functions remain the same)
// ========================================

function handleKeyboardShortcuts(e) {
  if (e.key === 'Escape') {
    const openModal = document.querySelector('.modal[style*="block"]');
    if (openModal) closeModal(openModal.id);
  }

  if (e.key === ' ' && gameState.isGameActive) {
    e.preventDefault();
    togglePause();
  }

  if (e.key === 'r' && gameState.isGameActive) {
    e.preventDefault();
    resetToSetup();
  }
}

function setupGameBoard() {
  const cardsGrid = document.getElementById('cardsGrid');
  const playerName = document.getElementById('playerName');
  const totalPairsEl = document.getElementById('totalPairs');

  if (!cardsGrid || !gameState.cards) return;

  if (playerName) playerName.textContent = gameState.currentUser.username;
  if (totalPairsEl) totalPairsEl.textContent = gameState.totalPairs;

  cardsGrid.className = `cards-grid ${gameState.difficulty}`;
  cardsGrid.innerHTML = '';

  gameState.cards.forEach((card, index) => {
    const cardElement = createCardElement(card, index);
    cardsGrid.appendChild(cardElement);
  });

  console.log(
    `🃏 Created ${gameState.cards.length} cards for ${gameState.difficulty} difficulty`
  );
}

function createCardElement(card, index) {
  const cardEl = document.createElement('div');
  cardEl.className = 'memory-card';
  cardEl.dataset.cardId = card.id;
  cardEl.dataset.pairId = card.pairId;
  cardEl.dataset.position = index;
  cardEl.tabIndex = 0;

  cardEl.innerHTML = `
        <div class="card-face card-back">🎮</div>
        <div class="card-face card-front">${card.emoji}</div>
    `;

  cardEl.addEventListener('click', () => handleCardClick(cardEl));
  cardEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(cardEl);
    }
  });

  return cardEl;
}

function handleCardClick(cardElement) {
  if (!gameState.isGameActive) return;
  if (
    cardElement.classList.contains('flipped') ||
    cardElement.classList.contains('matched')
  )
    return;
  if (gameState.flippedCards.length >= 2) return;

  flipCard(cardElement);
  gameState.flippedCards.push(cardElement);

  if (gameState.flippedCards.length === 2) {
    gameState.moves++;
    updateGameInfo();

    setTimeout(() => {
      checkForMatch();
    }, 600);
  }
}

function flipCard(cardElement) {
  cardElement.classList.add('flipped');
  playSound('flip');
}

function handleMatchSuccess(card1, card2, result) {
  card1.classList.add('matched');
  card2.classList.add('matched');

  const front1 = card1.querySelector('.card-front');
  const front2 = card2.querySelector('.card-front');
  front1.classList.add('matched');
  front2.classList.add('matched');

  showGameMessage(result.message || '🎉 Perfect match!', 'success');
  playSound('success');
  addCelebrationEffect([card1, card2]);

  console.log(
    `✅ Match found: ${result.match?.card1.emoji} + ${result.match?.card2.emoji}`
  );
}

function handleMatchFailure(card1, card2, result) {
  card1.classList.add('shake');
  card2.classList.add('shake');

  showGameMessage(result.message || '🤔 Not a match! Try again!', 'failure');
  playSound('failure');

  setTimeout(() => {
    card1.classList.remove('flipped', 'shake');
    card2.classList.remove('flipped', 'shake');
  }, CARD_FLIP_DELAY);

  console.log(`❌ No match: cards flipped back`);
}

function addCelebrationEffect(cards) {
  cards.forEach((card) => {
    const sparkles = document.createElement('div');
    sparkles.className = 'sparkles';
    sparkles.innerHTML = '✨';
    sparkles.style.position = 'absolute';
    sparkles.style.top = '50%';
    sparkles.style.left = '50%';
    sparkles.style.transform = 'translate(-50%, -50%)';
    sparkles.style.pointerEvents = 'none';
    sparkles.style.animation = 'sparkle 1s ease-out forwards';

    card.style.position = 'relative';
    card.appendChild(sparkles);

    setTimeout(() => {
      if (sparkles.parentNode) {
        sparkles.parentNode.removeChild(sparkles);
      }
    }, 1000);
  });
}

function showGameMessage(message, type = 'info') {
  const messageEl = document.getElementById('gameMessage');
  const textEl = messageEl.querySelector('.message-text');
  const emojiEl = messageEl.querySelector('.message-emoji');

  if (!messageEl || !textEl || !emojiEl) return;

  textEl.textContent = message;

  const emojis = {
    success: '🎉',
    failure: '😅',
    info: 'ℹ️',
    warning: '⚠️',
  };
  emojiEl.textContent = emojis[type] || emojis.info;

  messageEl.style.display = 'block';

  setTimeout(() => {
    messageEl.style.display = 'none';
  }, MESSAGE_DISPLAY_TIME);
}

function showGameBoard() {
  document.getElementById('userSetup').style.display = 'none';
  document.getElementById('gameBoard').style.display = 'block';
}

function resetToSetup() {
  gameState.isGameActive = false;
  if (gameState.gameTimer) {
    clearInterval(gameState.gameTimer);
  }

  gameState = {
    currentUser: null,
    currentGame: null,
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 0,
    score: 0,
    moves: 0,
    startTime: null,
    gameTimer: null,
    isGameActive: false,
    difficulty: 'easy',
  };

  document.getElementById('gameBoard').style.display = 'none';
  document.getElementById('userSetup').style.display = 'block';

  document.getElementById('usernameInput').value = '';
  document.getElementById('difficultySelect').value = 'easy';

  document.querySelectorAll('.category-option input').forEach((input) => {
    input.checked = false;
  });

  console.log('🔄 Game reset to setup screen');
}

function togglePause() {
  const pauseBtn = document.getElementById('pauseBtn');

  if (gameState.isGameActive) {
    gameState.isGameActive = false;
    clearInterval(gameState.gameTimer);
    pauseBtn.textContent = '▶️ Resume';

    document.querySelectorAll('.memory-card').forEach((card) => {
      card.style.pointerEvents = 'none';
    });

    showNotification('⏸️ Game paused', 'info');
  } else {
    gameState.isGameActive = true;
    startGameTimer();
    pauseBtn.textContent = '⏸️ Pause';

    document.querySelectorAll('.memory-card').forEach((card) => {
      card.style.pointerEvents = 'auto';
    });

    showNotification('▶️ Game resumed', 'info');
  }
}

function startGameTimer() {
  gameState.gameTimer = setInterval(() => {
    if (gameState.isGameActive && gameState.startTime) {
      const elapsed = Date.now() - gameState.startTime;
      document.getElementById('gameTime').textContent = formatTime(elapsed);
    }
  }, 1000);
}

function updateGameInfo() {
  document.getElementById('gameScore').textContent = gameState.score;
  document.getElementById('gameMoves').textContent = gameState.moves;
  document.getElementById('foundPairs').textContent = gameState.matchedPairs;
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

function showGameCompleteModal(gameResult, achievements) {
  document.getElementById('finalScore').textContent =
    gameResult.finalScore || 0;
  document.getElementById('finalTime').textContent = formatTime(
    gameResult.timeElapsed || 0
  );
  document.getElementById('finalMoves').textContent =
    gameResult.totalMoves || 0;
  document.getElementById('finalAccuracy').textContent =
    `${gameResult.accuracy || 0}%`;

  const ratingEl = document.getElementById('performanceRating');
  if (gameResult.performance) {
    ratingEl.querySelector('.rating-emoji').textContent =
      gameResult.performance.level === 'Legendary' ? '👑' : '⭐';
    ratingEl.querySelector('.rating-text').textContent =
      gameResult.performance.level;
  }

  const achievementsList = document.getElementById('achievementsList');
  if (achievements && achievements.length > 0) {
    const container = achievementsList.querySelector('.achievements-container');
    container.innerHTML = achievements
      .map(
        (achievement) => `
            <div class="achievement-item">
                <div class="achievement-emoji">${achievement.icon}</div>
                <div class="achievement-details">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                </div>
            </div>
        `
      )
      .join('');
    achievementsList.style.display = 'block';
  } else {
    achievementsList.style.display = 'none';
  }

  showModal('gameCompleteModal');
}

function renderLeaderboard(players, metadata) {
  const container = document.getElementById('leaderboardContent');

  if (!players || players.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="placeholder-emoji">🎮</div>
                <p>No players yet! Be the first to join the leaderboard!</p>
            </div>
        `;
    return;
  }

  const table = document.createElement('table');
  table.className = 'leaderboard-table';

  table.innerHTML = `
        <thead>
            <tr>
                <th>🏆 Rank</th>
                <th>👤 Player</th>
                <th>🎯 Best Score</th>
                <th>⏱️ Best Time</th>
                <th>🎮 Games</th>
                <th>📊 Avg Score</th>
            </tr>
        </thead>
        <tbody>
            ${players
              .map(
                (player) => `
                <tr class="${player.isCurrentUser ? 'current-user' : ''}">
                    <td>
                        <span class="rank-badge ${getRankClass(player.rank)}">
                            ${player.badge.emoji} #${player.rank}
                        </span>
                    </td>
                    <td>
                        <strong>${player.displayName}</strong>
                        ${player.isActive ? '<span class="activity-indicator">🟢</span>' : ''}
                    </td>
                    <td><strong>${player.bestScore}</strong></td>
                    <td>${player.timeFormatted}</td>
                    <td>${player.totalGames}</td>
                    <td>${player.averageScore.toFixed(1)}</td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    `;

  container.innerHTML = `
        <div class="leaderboard-header">
            <p>🎯 Showing top ${players.length} players | Last updated: ${new Date(metadata.lastUpdated).toLocaleTimeString()}</p>
        </div>
    `;
  container.appendChild(table);
}

function getRankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return '';
}

function renderUserStats(statsData) {
  const container = document.getElementById('userStatsContent');
  const { user, statistics, performance, gameHistory } = statsData;

  container.innerHTML = `
        <div class="user-stats-grid">
            <div class="stats-card">
                <div class="stats-card-emoji">🎮</div>
                <div class="stats-card-value">${user.totalGames}</div>
                <div class="stats-card-label">Games Played</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-emoji">🏆</div>
                <div class="stats-card-value">${user.bestScore}</div>
                <div class="stats-card-label">Best Score</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-emoji">⚡</div>
                <div class="stats-card-value">${statistics.fastestTime || 'N/A'}</div>
                <div class="stats-card-label">Fastest Time</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-emoji">📊</div>
                <div class="stats-card-value">${statistics.averageScore.toFixed(1)}</div>
                <div class="stats-card-label">Average Score</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-emoji">🎯</div>
                <div class="stats-card-value">#${statistics.globalRank}</div>
                <div class="stats-card-label">Global Rank</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-emoji">${performance.level.emoji}</div>
                <div class="stats-card-value">${performance.level.level}</div>
                <div class="stats-card-label">Performance Level</div>
            </div>
        </div>
        
        ${
          gameHistory && gameHistory.length > 0
            ? `
            <div class="recent-games">
                <h3>📈 Recent Games</h3>
                <div class="games-list">
                    ${gameHistory
                      .slice(0, 5)
                      .map(
                        (game) => `
                        <div class="game-history-item">
                            <div class="game-info">
                                <span class="game-score">🎯 ${game.score}</span>
                                <span class="game-difficulty">${game.difficulty}</span>
                                <span class="game-time">⏱️ ${game.duration}</span>
                            </div>
                            <div class="game-date">${new Date(game.completedAt).toLocaleDateString()}</div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        `
            : ''
        }
        
        <div class="motivational-message">
            <p>${statsData.message}</p>
        </div>
    `;
}

function playSound(type) {
  const sounds = {
    flip: '🔊 Card flip sound',
    success: '🎉 Success sound',
    failure: '😅 Failure sound',
    complete: '🏆 Game complete fanfare',
  };

  console.log(sounds[type] || '🔊 Unknown sound');
}

// ========================================
// ERROR HANDLING
// ========================================

window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error);
  showNotification(
    'Something went wrong! Please refresh the page. 🔄',
    'error'
  );
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
  showNotification('Connection error! Please check your internet. 🌐', 'error');
});

// ========================================
// DEBUG INTERFACE
// ========================================

window.gameDebug = {
  gameState,
  API_BASE,
  resetToSetup,
  loadLeaderboard,
  showNotification,
  switchTab,
  apiRequest,
};

console.log('🎮 Humor Memory Game Frontend loaded successfully!');
console.log('🔧 Debug functions available at window.gameDebug');
console.log(`🌐 API Base URL: ${API_BASE}`);
