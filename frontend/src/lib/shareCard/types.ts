/**
 * Share Card System - Type Definitions
 * Production-grade types for Spotify-style share cards
 */

export type ShareContentType = 'song' | 'album' | 'playlist' | 'podcast' | 'wrapped';

export type SharePlatform = 
  | 'instagram-story'
  | 'instagram-feed'
  | 'whatsapp'
  | 'whatsapp-status'
  | 'facebook'
  | 'twitter'
  | 'snapchat'
  | 'telegram'
  | 'copy-link'
  | 'native-share';

export interface ShareCardDimensions {
  width: number;
  height: number;
  aspectRatio: string;
  safeZone: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface ShareCardContent {
  type: ShareContentType;
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  audioUrl?: string;
  metadata?: {
    duration?: number;
    trackCount?: number;
    year?: number;
    stats?: Record<string, any>;
    songs?: Array<{
      id: string;
      title: string;
      artist: string;
      duration: number;
    }>;
  };
}

export interface ShareCardTheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  gradient: string[];
  blur: number;
}

export interface ShareCardConfig {
  platform: SharePlatform;
  content: ShareCardContent;
  theme?: ShareCardTheme;
  branding: {
    logo: boolean;
    watermark: boolean;
    appName: string;
  };
  preview: {
    audio: boolean;
    duration: number; // seconds
  };
  deepLink: {
    url: string;
    fallbackUrl: string;
  };
}

export interface GeneratedShareCard {
  imageUrl: string;
  imageBlob: Blob;
  dimensions: ShareCardDimensions;
  shareUrl: string;
  metadata: {
    platform: SharePlatform;
    contentType: ShareContentType;
    generatedAt: number;
  };
}

// Platform-specific dimensions (Instagram Story: 1080x1920, Feed: 1080x1080, etc.)
export const PLATFORM_DIMENSIONS: Record<SharePlatform, ShareCardDimensions> = {
  'instagram-story': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    safeZone: { top: 200, bottom: 300, left: 80, right: 80 }
  },
  'instagram-feed': {
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    safeZone: { top: 80, bottom: 80, left: 80, right: 80 }
  },
  'whatsapp': {
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    safeZone: { top: 40, bottom: 40, left: 40, right: 40 }
  },
  'whatsapp-status': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    safeZone: { top: 200, bottom: 300, left: 80, right: 80 }
  },
  'facebook': {
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    safeZone: { top: 40, bottom: 40, left: 40, right: 40 }
  },
  'twitter': {
    width: 1200,
    height: 675,
    aspectRatio: '16:9',
    safeZone: { top: 40, bottom: 40, left: 40, right: 40 }
  },
  'snapchat': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    safeZone: { top: 200, bottom: 300, left: 80, right: 80 }
  },
  'telegram': {
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    safeZone: { top: 40, bottom: 40, left: 40, right: 40 }
  },
  'copy-link': {
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    safeZone: { top: 40, bottom: 40, left: 40, right: 40 }
  },
  'native-share': {
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    safeZone: { top: 40, bottom: 40, left: 40, right: 40 }
  }
};
