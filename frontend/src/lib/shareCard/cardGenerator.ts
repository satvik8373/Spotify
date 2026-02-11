/**
 * Share Card Generator - Lightweight Mobile-First Approach
 * Uses simple URL sharing instead of heavy canvas operations
 */

import { ShareCardConfig, GeneratedShareCard } from './types';

/**
 * Generate share card - SIMPLIFIED for mobile performance
 * Instead of generating heavy canvas images, we create lightweight share data
 */
export const generateShareCard = async (
  config: ShareCardConfig
): Promise<GeneratedShareCard> => {
  // Skip canvas generation entirely - too heavy for mobile
  // Just prepare the share URL and metadata
  
  const shareUrl = config.deepLink.url;
  
  // Create a minimal placeholder blob (1x1 transparent pixel)
  // Only used if platform absolutely requires an image
  const placeholderBlob = createPlaceholderBlob();
  const imageUrl = config.content.imageUrl; // Use original image instead of generating
  
  return {
    imageUrl, // Use original content image
    imageBlob: placeholderBlob,
    dimensions: { width: 1200, height: 630, aspectRatio: '1.91:1', safeZone: { top: 0, bottom: 0, left: 0, right: 0 } },
    shareUrl,
    metadata: {
      platform: config.platform,
      contentType: config.content.type,
      generatedAt: Date.now()
    }
  };
};

/**
 * Create a minimal placeholder blob (1x1 transparent pixel)
 * Only used as fallback - most platforms don't need it
 */
const createPlaceholderBlob = (): Blob => {
  // 1x1 transparent PNG (smallest possible)
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: 'image/png' });
};

/**
 * Cleanup - no-op since we're not creating object URLs anymore
 */
export const cleanupCardUrl = (_url: string) => {
  // No cleanup needed with simplified approach
};
