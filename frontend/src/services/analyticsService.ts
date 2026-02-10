/**
 * Analytics Service for Google Tag Manager
 * Tracks user interactions and sends events to GTM dataLayer
 */

// Declare dataLayer for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
  }
}

// Initialize dataLayer if it doesn't exist
if (typeof window !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
}

/**
 * Push event to dataLayer
 */
const pushToDataLayer = (data: any) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push(data);
  }
};

/**
 * Track page view
 */
export const trackPageView = (pagePath: string, pageTitle: string) => {
  pushToDataLayer({
    event: 'pageview',
    page: {
      path: pagePath,
      title: pageTitle,
      url: window.location.href
    }
  });
};

/**
 * Track song play
 */
export const trackSongPlay = (song: {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
}) => {
  pushToDataLayer({
    event: 'musicPlay',
    songId: song.id,
    songTitle: song.title,
    artistName: song.artist,
    albumName: song.album || 'Unknown',
    duration: song.duration || 0,
    timestamp: new Date().toISOString()
  });

  // Also track as GA4 event
  pushToDataLayer({
    event: 'select_content',
    content_type: 'song',
    item_id: song.id,
    item_name: song.title,
    item_category: 'Music',
    item_brand: song.artist
  });
};

/**
 * Track playlist creation
 */
export const trackPlaylistCreated = (playlist: {
  id: string;
  name: string;
  songCount: number;
  isPublic: boolean;
}) => {
  pushToDataLayer({
    event: 'playlistCreated',
    playlistId: playlist.id,
    playlistName: playlist.name,
    songCount: playlist.songCount,
    isPublic: playlist.isPublic,
    timestamp: new Date().toISOString()
  });
};

/**
 * Track playlist play
 */
export const trackPlaylistPlay = (playlist: {
  id: string;
  name: string;
  songCount: number;
}) => {
  pushToDataLayer({
    event: 'playlistPlay',
    playlistId: playlist.id,
    playlistName: playlist.name,
    songCount: playlist.songCount,
    timestamp: new Date().toISOString()
  });
};

/**
 * Track search query
 */
export const trackSearch = (searchTerm: string, resultCount: number) => {
  pushToDataLayer({
    event: 'searchPerformed',
    searchTerm: searchTerm,
    resultCount: resultCount,
    timestamp: new Date().toISOString()
  });

  // Also track as GA4 search event
  pushToDataLayer({
    event: 'search',
    search_term: searchTerm
  });
};

/**
 * Track content share
 */
export const trackShare = (content: {
  type: 'song' | 'playlist' | 'album';
  id: string;
  name: string;
  method: 'facebook' | 'twitter' | 'whatsapp' | 'copy' | 'native';
}) => {
  pushToDataLayer({
    event: 'contentShared',
    contentType: content.type,
    contentId: content.id,
    contentName: content.name,
    shareMethod: content.method,
    timestamp: new Date().toISOString()
  });

  // Also track as GA4 share event
  pushToDataLayer({
    event: 'share',
    content_type: content.type,
    item_id: content.id,
    method: content.method
  });
};

/**
 * Track user signup
 */
export const trackSignup = (method: 'email' | 'google' | 'facebook') => {
  pushToDataLayer({
    event: 'signup',
    method: method,
    timestamp: new Date().toISOString()
  });

  // Also track as GA4 sign_up event
  pushToDataLayer({
    event: 'sign_up',
    method: method
  });
};

/**
 * Track user login
 */
export const trackLogin = (method: 'email' | 'google' | 'facebook') => {
  pushToDataLayer({
    event: 'login',
    method: method,
    timestamp: new Date().toISOString()
  });

  // Also track as GA4 login event
  pushToDataLayer({
    event: 'login',
    method: method
  });
};

/**
 * Track song like/unlike
 */
export const trackSongLike = (song: {
  id: string;
  title: string;
  artist: string;
  action: 'like' | 'unlike';
}) => {
  pushToDataLayer({
    event: 'songLike',
    songId: song.id,
    songTitle: song.title,
    artistName: song.artist,
    action: song.action,
    timestamp: new Date().toISOString()
  });
};

/**
 * Track Spotify sync
 */
export const trackSpotifySync = (data: {
  action: 'connect' | 'sync' | 'disconnect';
  itemCount?: number;
}) => {
  pushToDataLayer({
    event: 'spotifySync',
    action: data.action,
    itemCount: data.itemCount || 0,
    timestamp: new Date().toISOString()
  });
};

/**
 * Track song impression (for trending analysis)
 */
export const trackSongImpression = (songs: Array<{
  id: string;
  title: string;
  artist: string;
  position: number;
}>) => {
  pushToDataLayer({
    event: 'view_item_list',
    ecommerce: {
      items: songs.map(song => ({
        item_id: song.id,
        item_name: song.title,
        item_category: 'Music',
        item_brand: song.artist,
        index: song.position,
        price: 0.00
      }))
    }
  });
};

/**
 * Track user engagement time
 */
export const trackEngagement = (data: {
  page: string;
  timeSpent: number; // in seconds
  songsPlayed: number;
}) => {
  pushToDataLayer({
    event: 'userEngagement',
    page: data.page,
    timeSpent: data.timeSpent,
    songsPlayed: data.songsPlayed,
    timestamp: new Date().toISOString()
  });

  // Also track as GA4 engagement event
  pushToDataLayer({
    event: 'user_engagement',
    engagement_time_msec: data.timeSpent * 1000
  });
};

/**
 * Track error
 */
export const trackError = (error: {
  message: string;
  page: string;
  action?: string;
}) => {
  pushToDataLayer({
    event: 'error',
    errorMessage: error.message,
    errorPage: error.page,
    errorAction: error.action || 'unknown',
    timestamp: new Date().toISOString()
  });
};

/**
 * Track PWA install
 */
export const trackPWAInstall = () => {
  pushToDataLayer({
    event: 'pwaInstall',
    timestamp: new Date().toISOString()
  });
};

/**
 * Track offline mode
 */
export const trackOfflineMode = (isOffline: boolean) => {
  pushToDataLayer({
    event: 'offlineMode',
    isOffline: isOffline,
    timestamp: new Date().toISOString()
  });
};

export default {
  trackPageView,
  trackSongPlay,
  trackPlaylistCreated,
  trackPlaylistPlay,
  trackSearch,
  trackShare,
  trackSignup,
  trackLogin,
  trackSongLike,
  trackSpotifySync,
  trackSongImpression,
  trackEngagement,
  trackError,
  trackPWAInstall,
  trackOfflineMode
};
