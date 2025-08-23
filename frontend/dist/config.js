// Configuration for the Humor Memory Game Frontend
// This script sets up environment-specific variables

// Set API base URL from environment or use default
window.API_BASE_URL = window.API_BASE_URL || 'http://backend:3001/api';

// Log configuration for debugging
console.log('🔧 Frontend Configuration:', {
  API_BASE_URL: window.API_BASE_URL,
  NODE_ENV: 'development',
  timestamp: new Date().toISOString()
});
