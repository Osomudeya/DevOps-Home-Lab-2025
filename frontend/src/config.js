// Configuration for the Humor Memory Game Frontend
// This script sets up environment-specific variables

// Set API base URL from environment or use intelligent defaults
function getApiBaseUrl() {
  // Check for environment variable first (set by Docker/K8s)
  if (window.API_BASE_URL && window.API_BASE_URL !== 'undefined') {
    return window.API_BASE_URL;
  }
  
  // Check for build-time environment variable
  if (typeof process !== 'undefined' && process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // Intelligent fallback based on current location
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development - use nginx proxy
    return '/api';
  } else if (hostname === 'gameapp.games') {
    // Production domain
    return `${protocol}//${hostname}:8443/api`;
  } else {
    // Container/K8s environment - use nginx proxy
    return '/api';
  }
}

window.API_BASE_URL = getApiBaseUrl();

// Log configuration for debugging
console.log('🔧 Frontend Configuration:', {
  API_BASE_URL: window.API_BASE_URL,
  NODE_ENV: typeof process !== 'undefined' ? process.env.NODE_ENV : 'browser',
  timestamp: new Date().toISOString(),
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  port: window.location.port
});
