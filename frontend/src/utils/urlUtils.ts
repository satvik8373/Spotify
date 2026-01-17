/**
 * Utility functions for URL processing
 */

/**
 * Convert HTTP URLs to HTTPS for production to avoid Mixed Content issues
 * @param url - The URL to convert
 * @returns The HTTPS version of the URL
 */
export function ensureHttps(url: string): string {
  if (!url) return url;
  
  // Convert HTTP to HTTPS for production
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  return url;
}

/**
 * Convert multiple URLs to HTTPS
 * @param urls - Array of URLs to convert
 * @returns Array of HTTPS URLs
 */
export function ensureHttpsMultiple(urls: string[]): string[] {
  return urls.map(ensureHttps);
}

/**
 * Check if a URL is secure (HTTPS)
 * @param url - The URL to check
 * @returns True if the URL is HTTPS or relative, false if HTTP
 */
export function isSecureUrl(url: string): boolean {
  if (!url) return true; // Empty URLs are considered safe
  
  // Relative URLs are safe
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }
  
  // Data URLs are safe
  if (url.startsWith('data:')) {
    return true;
  }
  
  // Blob URLs are safe
  if (url.startsWith('blob:')) {
    return true;
  }
  
  // Check if it's HTTPS
  return url.startsWith('https://');
}

/**
 * Validate and fix audio URL for production use
 * @param audioUrl - The audio URL to validate
 * @returns The fixed audio URL or empty string if invalid
 */
export function validateAudioUrl(audioUrl: string): string {
  if (!audioUrl) return '';
  
  // Convert to HTTPS if needed
  const httpsUrl = ensureHttps(audioUrl);
  
  // Additional validation can be added here
  return httpsUrl;
}

/**
 * Validate and fix image URL for production use
 * @param imageUrl - The image URL to validate
 * @returns The fixed image URL or placeholder if invalid
 */
export function validateImageUrl(imageUrl: string, placeholder = '/placeholder-song.jpg'): string {
  if (!imageUrl) return placeholder;
  
  // Convert to HTTPS if needed
  const httpsUrl = ensureHttps(imageUrl);
  
  // Additional validation can be added here
  return httpsUrl;
}