/**
 * Utility functions for URL manipulation
 */

/**
 * Ensures a URL uses HTTPS protocol instead of HTTP
 * This is crucial for production environments to avoid Mixed Content errors
 * @param url - The URL to convert
 * @returns The URL with HTTPS protocol
 */
export const ensureHttps = (url: string): string => {
  if (!url) return url;
  
  // If it's already HTTPS or a different protocol (blob:, data:, etc.), return as is
  if (!url.startsWith('http://')) {
    return url;
  }
  
  // Convert HTTP to HTTPS
  return url.replace('http://', 'https://');
};

/**
 * Checks if a URL is secure (HTTPS or other secure protocols)
 * @param url - The URL to check
 * @returns True if the URL is secure
 */
export const isSecureUrl = (url: string): boolean => {
  if (!url) return false;
  
  return (
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    url.startsWith('file:') ||
    url.startsWith('chrome-extension:') ||
    url.startsWith('moz-extension:')
  );
};

/**
 * Validates if a URL is safe to use in production
 * @param url - The URL to validate
 * @returns True if the URL is safe for production use
 */
export const isProductionSafeUrl = (url: string): boolean => {
  if (!url) return false;
  
  // In production, we need HTTPS for external resources
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return isSecureUrl(url);
  }
  
  // In development, allow HTTP
  return true;
};

/**
 * Logs a warning if an insecure URL is detected in production
 * @param url - The URL to check
 * @param context - Context information for debugging
 */
export const warnInsecureUrl = (url: string, context: string = 'Unknown'): void => {
  if (typeof window !== 'undefined' && 
      window.location.protocol === 'https:' && 
      url.startsWith('http://')) {
    console.warn(`[Mixed Content Warning] Insecure HTTP URL detected in production (${context}):`, url);
    console.warn('This may cause audio playback issues. URL has been converted to HTTPS.');
  }
};