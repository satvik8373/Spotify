/**
 * Audio debugging utilities for production troubleshooting
 */

export interface AudioDebugInfo {
  url: string;
  isValid: boolean;
  protocol: string;
  domain: string;
  hasCORS: boolean;
  isProxied: boolean;
  error?: string;
}

/**
 * Analyze an audio URL for potential issues
 */
export const analyzeAudioUrl = (url: string): AudioDebugInfo => {
  const info: AudioDebugInfo = {
    url,
    isValid: false,
    protocol: '',
    domain: '',
    hasCORS: false,
    isProxied: false,
  };

  try {
    if (!url) {
      info.error = 'Empty URL';
      return info;
    }

    // Check if it's a proxied URL
    info.isProxied = url.includes('/audio-proxy?url=');

    // Parse the actual URL (decode if proxied)
    const actualUrl = info.isProxied ? 
      decodeURIComponent(url.split('url=')[1]) : url;

    const urlObj = new URL(actualUrl);
    info.protocol = urlObj.protocol;
    info.domain = urlObj.hostname;
    info.isValid = true;

    // Check for CORS issues
    info.hasCORS = info.domain.includes('saavncdn.com') || 
                   info.domain.includes('jiosaavn') ||
                   (info.protocol === 'http:' && window.location.protocol === 'https:');

  } catch (error) {
    info.error = error instanceof Error ? error.message : 'Invalid URL';
  }

  return info;
};

/**
 * Test if an audio URL can be loaded
 */
export const testAudioUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    
    const cleanup = () => {
      audio.removeEventListener('canplay', onSuccess);
      audio.removeEventListener('error', onError);
      audio.src = '';
    };

    const onSuccess = () => {
      cleanup();
      resolve(true);
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    audio.addEventListener('canplay', onSuccess);
    audio.addEventListener('error', onError);
    
    // Set crossOrigin for CORS handling
    audio.crossOrigin = 'anonymous';
    audio.src = url;
    
    // Timeout after 10 seconds
    setTimeout(() => {
      cleanup();
      resolve(false);
    }, 10000);
  });
};

/**
 * Log audio debugging information to console
 */
export const logAudioDebug = (url: string, context: string = 'Audio Debug') => {
  if (process.env.NODE_ENV === 'development') {
    const info = analyzeAudioUrl(url);
    console.group(`🎵 ${context}`);
    console.log('URL:', info.url);
    console.log('Valid:', info.isValid);
    console.log('Protocol:', info.protocol);
    console.log('Domain:', info.domain);
    console.log('Has CORS Issues:', info.hasCORS);
    console.log('Is Proxied:', info.isProxied);
    if (info.error) console.error('Error:', info.error);
    console.groupEnd();
  }
};

/**
 * Get suggested fix for audio URL issues
 */
export const getSuggestedFix = (url: string): string => {
  const info = analyzeAudioUrl(url);
  
  if (!info.isValid) {
    return 'Invalid URL - check URL format';
  }
  
  if (info.protocol === 'http:' && window.location.protocol === 'https:') {
    return 'Mixed content issue - convert to HTTPS';
  }
  
  if (info.hasCORS && !info.isProxied) {
    return 'CORS issue detected - use audio proxy';
  }
  
  return 'URL appears to be valid';
};