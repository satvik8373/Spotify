import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import analyticsService from '@/services/analyticsService';

/**
 * Hook to track page views automatically
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    const pageTitle = document.title;
    analyticsService.trackPageView(location.pathname, pageTitle);
  }, [location]);
};

/**
 * Hook to track user engagement time
 */
export const useEngagementTracking = (pageName: string) => {
  useEffect(() => {
    const startTime = Date.now();
    let songsPlayed = 0;

    // Listen for song play events
    const handleSongPlay = () => {
      songsPlayed++;
    };

    window.addEventListener('songPlayed', handleSongPlay);

    // Track engagement on unmount
    return () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      // Only track if user spent more than 5 seconds
      if (timeSpent > 5) {
        analyticsService.trackEngagement({
          page: pageName,
          timeSpent,
          songsPlayed
        });
      }

      window.removeEventListener('songPlayed', handleSongPlay);
    };
  }, [pageName]);
};

/**
 * Hook to track offline/online status
 */
export const useOfflineTracking = () => {
  useEffect(() => {
    const handleOnline = () => {
      analyticsService.trackOfflineMode(false);
    };

    const handleOffline = () => {
      analyticsService.trackOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
};

/**
 * Hook to track PWA install
 */
export const usePWATracking = () => {
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // User saw the install prompt
      analyticsService.trackPWAInstall();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
};

export default {
  usePageTracking,
  useEngagementTracking,
  useOfflineTracking,
  usePWATracking
};
