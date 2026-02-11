/**
 * Platform-Specific Share Handlers
 * Handles sharing logic for each social platform with mobile-safe error handling
 */

import { SharePlatform, GeneratedShareCard } from './types';
import { trackShare } from '@/utils/shareTracking';
import { safeLocalStorage } from '@/utils/iosStorageHandler';

export interface ShareOptions {
  platform: SharePlatform;
  card: GeneratedShareCard;
  title: string;
  text: string;
  contentId: string;
  contentType: string;
}

/**
 * Main share handler - routes to platform-specific handlers
 * Wrapped in try-catch to prevent mobile crashes
 */
export const handlePlatformShare = async (options: ShareOptions): Promise<void> => {
  const { platform } = options;
  
  try {
    // Track share event
    trackShare(
      options.contentType as any,
      options.contentId,
      platform,
      undefined
    );
  } catch (e) {
    // Tracking failed, continue anyway
    console.warn('Share tracking failed:', e);
  }
  
  try {
    switch (platform) {
      case 'instagram-story':
        return await handleInstagramStory(options);
      case 'instagram-feed':
        return await handleInstagramFeed(options);
      case 'whatsapp':
        return await handleWhatsApp(options);
      case 'whatsapp-status':
        return await handleWhatsAppStatus(options);
      case 'facebook':
        return await handleFacebook(options);
      case 'twitter':
        return await handleTwitter(options);
      case 'snapchat':
        return await handleSnapchat(options);
      case 'telegram':
        return await handleTelegram(options);
      case 'copy-link':
        return await handleCopyLink(options);
      case 'native-share':
        return await handleNativeShare(options);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error(`Share failed for ${platform}:`, error);
    // Don't throw - let the UI handle the error gracefully
    throw error;
  }
};

/**
 * Instagram Story - Opens Instagram with deep link
 * Simplified: No image generation, just share URL
 */
const handleInstagramStory = async (options: ShareOptions) => {
  try {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try to open Instagram app with deep link
      const instagramUrl = `instagram://story-camera`;
      window.location.href = instagramUrl;
    } else {
      // Desktop: Just copy link
      await handleCopyLink(options);
    }
  } catch (error) {
    console.error('Instagram story share failed:', error);
    throw error;
  }
};

/**
 * Instagram Feed - Simplified to just copy link
 */
const handleInstagramFeed = async (options: ShareOptions) => {
  try {
    await handleCopyLink(options);
  } catch (error) {
    console.error('Instagram feed share failed:', error);
    throw error;
  }
};

/**
 * WhatsApp - Share with link (no image generation)
 * Mobile-safe with proper error handling
 */
const handleWhatsApp = async (options: ShareOptions) => {
  const { text, card } = options;
  
  try {
    // Try Web Share API first (without heavy image)
    if (navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: text,
          url: card.shareUrl
        });
        return;
      } catch (error: any) {
        // User cancelled or share failed - fall through to URL method
        if (error.name !== 'AbortError') {
          console.warn('Web Share API failed:', error);
        }
      }
    }
    
    // Fallback: WhatsApp URL with text only
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + card.shareUrl)}`;
    window.open(whatsappUrl, '_blank');
  } catch (error) {
    console.error('WhatsApp share failed:', error);
    throw error;
  }
};

/**
 * WhatsApp Status - Simplified to just copy link
 */
const handleWhatsAppStatus = async (options: ShareOptions) => {
  try {
    await handleCopyLink(options);
  } catch (error) {
    console.error('WhatsApp status share failed:', error);
    throw error;
  }
};

/**
 * Facebook - Share with link
 */
const handleFacebook = async (options: ShareOptions) => {
  const { card } = options;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(card.shareUrl)}`;
  window.open(facebookUrl, '_blank', 'width=600,height=400');
};

/**
 * Twitter - Share with text and link
 */
const handleTwitter = async (options: ShareOptions) => {
  const { text, card } = options;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(card.shareUrl)}`;
  window.open(twitterUrl, '_blank', 'width=600,height=400');
};

/**
 * Snapchat - Simplified to just copy link
 */
const handleSnapchat = async (options: ShareOptions) => {
  try {
    await handleCopyLink(options);
  } catch (error) {
    console.error('Snapchat share failed:', error);
    throw error;
  }
};

/**
 * Telegram - Share with link
 */
const handleTelegram = async (options: ShareOptions) => {
  const { text, card } = options;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(card.shareUrl)}&text=${encodeURIComponent(text)}`;
  window.open(telegramUrl, '_blank');
};

/**
 * Copy Link - Copy to clipboard
 * Mobile-safe with proper error handling
 */
const handleCopyLink = async (options: ShareOptions) => {
  const { card } = options;
  
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(card.shareUrl);
      return;
    }
  } catch (error) {
    console.warn('Clipboard API failed, trying fallback:', error);
  }
  
  // Fallback for older browsers or when clipboard API fails
  try {
    const textArea = document.createElement('textarea');
    textArea.value = card.shareUrl;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    throw new Error('Failed to copy link');
  }
};

/**
 * Native Share - Use Web Share API (without heavy image)
 * Mobile-safe with proper error handling
 */
const handleNativeShare = async (options: ShareOptions) => {
  const { title, text, card } = options;
  
  if (!navigator.share) {
    // Fallback to copy link
    return handleCopyLink(options);
  }
  
  try {
    // Share without image (much lighter and more reliable)
    await navigator.share({
      title,
      text,
      url: card.shareUrl
    });
  } catch (error: any) {
    // Don't throw on user cancellation
    if (error.name === 'AbortError') {
      console.log('Share cancelled by user');
      return;
    }
    console.error('Native share failed:', error);
    throw error;
  }
};

/**
 * Helper: Download image - REMOVED, no longer needed
 * Keeping stub for compatibility
 */
const downloadImage = (_blob: Blob, _filename: string) => {
  // No-op: We don't generate images anymore
  console.log('Image download skipped - using lightweight sharing');
};

/**
 * Check if platform is available
 */
export const isPlatformAvailable = (platform: SharePlatform): boolean => {
  switch (platform) {
    case 'native-share':
      return !!navigator.share;
    case 'copy-link':
      return !!navigator.clipboard;
    default:
      return true; // All other platforms work via URLs
  }
};

/**
 * Get platform display name
 */
export const getPlatformName = (platform: SharePlatform): string => {
  const names: Record<SharePlatform, string> = {
    'instagram-story': 'Instagram Story',
    'instagram-feed': 'Instagram Feed',
    'whatsapp': 'WhatsApp',
    'whatsapp-status': 'WhatsApp Status',
    'facebook': 'Facebook',
    'twitter': 'Twitter',
    'snapchat': 'Snapchat',
    'telegram': 'Telegram',
    'copy-link': 'Copy Link',
    'native-share': 'Share'
  };
  
  return names[platform] || platform;
};

/**
 * Get platform icon name (for Lucide React)
 */
export const getPlatformIcon = (platform: SharePlatform): string => {
  const icons: Record<SharePlatform, string> = {
    'instagram-story': 'Instagram',
    'instagram-feed': 'Instagram',
    'whatsapp': 'MessageCircle',
    'whatsapp-status': 'MessageCircle',
    'facebook': 'Facebook',
    'twitter': 'Twitter',
    'snapchat': 'Ghost',
    'telegram': 'Send',
    'copy-link': 'Link',
    'native-share': 'Share2'
  };
  
  return icons[platform] || 'Share2';
};
