/**
 * Input Validator Service for Mood Playlist Generator
 * Validates and sanitizes mood text input
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

const MIN_LENGTH = 3;
const MAX_LENGTH = 200;

/**
 * SQL injection patterns to detect and remove
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(--|;|\/\*|\*\/|xp_|sp_)/gi,
  /('|('')|;|--|\/\*|\*\/)/gi
];

/**
 * Validates mood text input
 * @param {string} moodText - The mood text to validate
 * @returns {{isValid: boolean, sanitized: string, error?: string}} Validation result
 */
function validateMoodInput(moodText) {
  try {
    // Check if input is provided
    if (!moodText || typeof moodText !== 'string') {
      console.warn('[Validator] Invalid input type:', {
        type: typeof moodText,
        timestamp: new Date().toISOString()
      });
      return {
        isValid: false,
        sanitized: '',
        error: 'Please enter a mood description between 3 and 200 characters'
      };
    }

    // Trim whitespace first
    const trimmed = moodText.trim();

    // Check if empty after trimming
    if (trimmed.length === 0) {
      console.warn('[Validator] Empty mood text after trimming:', {
        timestamp: new Date().toISOString()
      });
      return {
        isValid: false,
        sanitized: '',
        error: 'Please enter a mood description between 3 and 200 characters'
      };
    }

    // Check minimum length
    if (trimmed.length < MIN_LENGTH) {
      console.warn('[Validator] Mood text too short:', {
        length: trimmed.length,
        minLength: MIN_LENGTH,
        timestamp: new Date().toISOString()
      });
      return {
        isValid: false,
        sanitized: trimmed,
        error: 'Please enter a mood description between 3 and 200 characters'
      };
    }

    // Check maximum length
    if (trimmed.length > MAX_LENGTH) {
      console.warn('[Validator] Mood text too long:', {
        length: trimmed.length,
        maxLength: MAX_LENGTH,
        timestamp: new Date().toISOString()
      });
      return {
        isValid: false,
        sanitized: trimmed,
        error: 'Please enter a mood description between 3 and 200 characters'
      };
    }

    // Sanitize input
    const sanitized = sanitizeInput(trimmed);

    console.log('[Validator] Validation successful:', {
      originalLength: moodText.length,
      sanitizedLength: sanitized.length,
      timestamp: new Date().toISOString()
    });

    return {
      isValid: true,
      sanitized,
      error: undefined
    };
  } catch (error) {
    // Log error details internally for debugging
    console.error('[Validator] Unexpected error during validation:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Return user-friendly error message (Requirement 13.5)
    return {
      isValid: false,
      sanitized: '',
      error: 'Please enter a mood description between 3 and 200 characters'
    };
  }
}

/**
 * Sanitizes input text by removing SQL injection patterns and normalizing
 * @param {string} text - The text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeInput(text) {
  try {
    let sanitized = text;

    // Remove SQL injection patterns
    SQL_INJECTION_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove excessive special characters (keep basic punctuation)
    sanitized = sanitized.replace(/[<>{}[\]\\]/g, '');

    // Normalize: lowercase
    sanitized = sanitized.toLowerCase();

    // Collapse multiple spaces into single space
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Trim again after sanitization
    sanitized = sanitized.trim();

    return sanitized;
  } catch (error) {
    // Log error details internally
    console.error('[Validator] Error during sanitization:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Return original text if sanitization fails
    return text.toLowerCase().trim();
  }
}

/**
 * Normalizes mood text for cache key generation
 * @param {string} moodText - The mood text to normalize
 * @returns {string} Normalized text
 */
function normalizeMoodText(moodText) {
  if (!moodText || typeof moodText !== 'string') {
    return '';
  }

  return moodText
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export {
  validateMoodInput,
  sanitizeInput,
  normalizeMoodText,
  MIN_LENGTH,
  MAX_LENGTH
};
