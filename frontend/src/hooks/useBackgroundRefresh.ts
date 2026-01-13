import { useEffect } from 'react';
import { usePlaylistStore } from '@/stores/usePlaylistStore';

export const useBackgroundRefresh = () => {
  useEffect(() => {
    // Set up periodic background refresh
    const interval = setInterval(() => {
      // Only refresh if the app is visible and data is stale
      if (!document.hidden && usePlaylistStore.getState().shouldRefresh()) {
        console.log('Background refresh: Updating playlist data');
        usePlaylistStore.getState().refreshAllData();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Refresh when app becomes visible after being hidden
    const handleVisibilityChange = () => {
      if (!document.hidden && usePlaylistStore.getState().shouldRefresh()) {
        console.log('App became visible: Refreshing playlist data');
        usePlaylistStore.getState().refreshAllData();
      }
    };

    // Refresh when window gains focus
    const handleFocus = () => {
      if (usePlaylistStore.getState().shouldRefresh()) {
        console.log('Window focused: Refreshing playlist data');
        usePlaylistStore.getState().refreshAllData();
      }
    };

    // Refresh when user comes back online
    const handleOnline = () => {
      if (usePlaylistStore.getState().shouldRefresh()) {
        console.log('Back online: Refreshing playlist data');
        usePlaylistStore.getState().refreshAllData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);
};