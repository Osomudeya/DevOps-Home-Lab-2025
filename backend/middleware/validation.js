// Validation Middleware
// Input validation and sanitization for API requests

const Joi = require('joi');

// ========================================
// VALIDATION SCHEMAS
// ========================================

const schemas = {
  // Game start validation
  gameStart: Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required().messages({
      'string.alphanum': 'Username must contain only letters and numbers',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must be less than 50 characters long',
      'any.required': 'Username is required',
    }),
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard', 'expert')
      .default('easy')
      .messages({
        'any.only': 'Difficulty must be one of: easy, medium, hard, expert',
      }),
    categories: Joi.array()
      .items(
        Joi.string().valid(
          'classic',
          'food',
          'space',
          'fantasy',
          'tech',
          'love',
          'thoughtful',
          'silly',
          'sassy',
          'spooky',
          'nature',
          'music',
          'cool',
          'celebration',
          'mystery',
          'action',
          'adventure',
          'hot',
          'energy',
          'luxury',
          'achievement'
        )
      )
      .max(10)
      .optional()
      .messages({
        'array.max': 'Cannot select more than 10 categories',
      }),
  }),

  // Card match validation
  cardMatch: Joi.object({
    gameId: Joi.string().uuid().required().messages({
      'string.uuid': 'Game ID must be a valid UUID',
      'any.required': 'Game ID is required',
    }),
    card1Id: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Card 1 ID is required',
      'string.max': 'Card 1 ID is too long',
      'any.required': 'Card 1 ID is required',
    }),
    card2Id: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Card 2 ID is required',
      'string.max': 'Card 2 ID is too long',
      'any.required': 'Card 2 ID is required',
    }),
    matchTime: Joi.number()
      .integer()
      .min(0)
      .max(600000) // 10 minutes max
      .optional()
      .messages({
        'number.integer': 'Match time must be an integer',
        'number.min': 'Match time cannot be negative',
        'number.max': 'Match time cannot exceed 10 minutes',
      }),
  }),

  // Game completion validation
  gameComplete: Joi.object({
    gameId: Joi.string().uuid().required().messages({
      'string.uuid': 'Game ID must be a valid UUID',
      'any.required': 'Game ID is required',
    }),
    timeElapsed: Joi.number()
      .integer()
      .min(1000) // At least 1 second
      .max(1800000) // 30 minutes max
      .required()
      .messages({
        'number.integer': 'Time elapsed must be an integer',
        'number.min': 'Time elapsed must be at least 1 second',
        'number.max': 'Time elapsed cannot exceed 30 minutes',
        'any.required': 'Time elapsed is required',
      }),
    finalScore: Joi.number().integer().min(0).max(1000).optional().messages({
      'number.integer': 'Final score must be an integer',
      'number.min': 'Final score cannot be negative',
      'number.max': 'Final score cannot exceed 1000',
    }),
  }),

  // User creation validation
  userCreation: Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required().messages({
      'string.alphanum': 'Username must contain only letters and numbers',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must be less than 50 characters long',
      'any.required': 'Username is required',
    }),
    email: Joi.string().email().max(100).optional().allow(null, '').messages({
      'string.email': 'Email must be a valid email address',
      'string.max': 'Email must be less than 100 characters long',
    }),
    displayName: Joi.string()
      .min(1)
      .max(100)
      .optional()
      .allow(null, '')
      .messages({
        'string.min': 'Display name cannot be empty if provided',
        'string.max': 'Display name must be less than 100 characters long',
      }),
  }),

  // Query parameter validation
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
    offset: Joi.number().integer().min(0).default(0).messages({
      'number.integer': 'Offset must be an integer',
      'number.min': 'Offset cannot be negative',
    }),
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard', 'expert')
      .optional()
      .messages({
        'any.only': 'Difficulty must be one of: easy, medium, hard, expert',
      }),
  }),
};

// ========================================
// VALIDATION MIDDLEWARE FUNCTIONS
// ========================================

/**
 * Create validation middleware for a specific schema
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Where to find data ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
function createValidator(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false, // Get all validation errors
      allowUnknown: false, // Don't allow extra fields
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      console.log(
        `❌ Validation failed for ${req.method} ${req.path}:`,
        validationErrors
      );

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Please check your input data! 🔍',
        details: validationErrors,
        example: getValidationExample(schema),
      });
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
}

/**
 * Sanitize and validate username
 * @param {string} username - Username to sanitize
 * @returns {string} Sanitized username
 */
function sanitizeUsername(username) {
  if (!username) return '';

  return username
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .substring(0, 50); // Limit length
}

/**
 * Validate and sanitize game ID
 * @param {string} gameId - Game ID to validate
 * @returns {boolean} True if valid UUID
 */
function isValidGameId(gameId) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(gameId);
}

/**
 * Rate limiting validation (check if user is making too many requests)
 * @param {string} identifier - User identifier (username or IP)
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware function
 */
function createRateLimiter(identifier, maxRequests = 10, windowMs = 60000) {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.body[identifier] || req.ip;
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Slow down there, speed demon! Too many requests! ⏰',
        retryAfter: Math.ceil(windowMs / 1000),
        limit: maxRequests,
        window: `${windowMs / 1000} seconds`,
      });
    }

    validRequests.push(now);
    requests.set(key, validRequests);

    next();
  };
}

/**
 * Get example data for validation schema (for error responses)
 * @param {Object} schema - Joi schema
 * @returns {Object} Example valid data
 */
function getValidationExample(schema) {
  // Simple examples for common schemas
  const examples = {
    gameStart: {
      username: 'player123',
      difficulty: 'easy',
      categories: ['classic', 'food'],
    },
    cardMatch: {
      gameId: '550e8400-e29b-41d4-a716-446655440000',
      card1Id: 'laughing_1',
      card2Id: 'laughing_2',
      matchTime: 5000,
    },
    gameComplete: {
      gameId: '550e8400-e29b-41d4-a716-446655440000',
      timeElapsed: 120000,
      finalScore: 180,
    },
    userCreation: {
      username: 'newplayer',
      email: 'player@example.com',
      displayName: 'New Player',
    },
  };

  // Try to match schema to example
  for (const [key, example] of Object.entries(examples)) {
    if (schema === schemas[key]) {
      return example;
    }
  }

  return null;
}

// ========================================
// MIDDLEWARE EXPORTS
// ========================================

module.exports = {
  // Schema validation middleware
  validateGameStart: createValidator(schemas.gameStart, 'body'),
  validateCardMatch: createValidator(schemas.cardMatch, 'body'),
  validateGameComplete: createValidator(schemas.gameComplete, 'body'),
  validateUserCreation: createValidator(schemas.userCreation, 'body'),
  validatePagination: createValidator(schemas.pagination, 'query'),

  // Utility functions
  sanitizeUsername,
  isValidGameId,
  createValidator,
  createRateLimiter,

  // Raw schemas (for testing or custom validation)
  schemas,

  // Custom validation middleware
  validateUsername: (req, res, next) => {
    const { username } = req.params;

    if (!username || username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username',
        message: 'Username must be 3-50 characters long! 📝',
      });
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username format',
        message: 'Username can only contain letters and numbers! 🔤',
      });
    }

    next();
  },

  validateGameId: (req, res, next) => {
    const { gameId } = req.params;

    if (!isValidGameId(gameId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID',
        message: 'Game ID must be a valid UUID! 🆔',
      });
    }

    next();
  },

  // Security middleware
  sanitizeInput: (req, res, next) => {
    // Basic XSS protection - strip HTML tags from string inputs
    function stripHtml(obj) {
      if (typeof obj === 'string') {
        return obj.replace(/<[^>]*>/g, '').trim();
      }
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            obj[key] = stripHtml(obj[key]);
          }
        }
      } else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          obj[i] = stripHtml(obj[i]);
        }
      }
      return obj;
    }

    if (req.body) req.body = stripHtml(req.body);
    if (req.query) req.query = stripHtml(req.query);
    if (req.params) req.params = stripHtml(req.params);

    next();
  },

  // Content validation
  validateJsonContent: (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
      const contentType = req.get('Content-Type');

      if (!contentType || !contentType.includes('application/json')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid content type',
          message: 'Content-Type must be application/json! 📦',
        });
      }
    }

    next();
  },

  // Game-specific validation
  validateGameInProgress: async (req, res, next) => {
    // This would check if a game is actually in progress
    // Implementation would depend on your game state management
    next();
  },
};
