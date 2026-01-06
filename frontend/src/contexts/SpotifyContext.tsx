import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import spotifyService, { isAuthenticated, logout } from '../services/spotifyService';
import { setupAutoSyncTriggers, performQuickSync } from '../services/robustSpotifySync';

interface SpotifyContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: any | null;
  playlists: any[];
  savedTracks: any[];
  logout: () => void;
  fetchUserPlaylists: (limit?: number) => Promise<any[]>;
  fetchSavedTracks: (limit?: number) => Promise<any[]>;
  searchTracks: (query: string, limit?: number) => Promise<any[]>;
  playTrack: (trackUri: string, deviceId?: string) => Promise<boolean>;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const SpotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [savedTracks, setSavedTracks] = useState<any[]>([]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const isLoggedIn = isAuthenticated();
        setAuthenticated(isLoggedIn);
        
        if (isLoggedIn) {
          // Get user profile if authenticated
          const userProfile = await spotifyService.getCurrentUser();
          setUser(userProfile);
          
          // Fetch initial user playlists
          const userPlaylists = await spotifyService.getUserPlaylists();
          setPlaylists(userPlaylists);
          
          // Fetch initial saved tracks
          const userSavedTracks = await spotifyService.getSavedTracks();
          setSavedTracks(userSavedTracks);
        }
      } catch (error) {
        console.error('Error checking Spotify authentication:', error);
        // If there's an error, assume user is not authenticated
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
    
    // Setup auto-sync triggers for re-syncing on focus/visibility
    const cleanupAutoSync = setupAutoSyncTriggers();
    
    // Listen for auth changes
    const handleAuthChange = () => {
      checkAuthStatus();
    };
    window.addEventListener('spotify_auth_changed', handleAuthChange);
    
    return () => {
      cleanupAutoSync();
      window.removeEventListener('spotify_auth_changed', handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setUser(null);
    setPlaylists([]);
    setSavedTracks([]);
  };

  const fetchUserPlaylists = async (limit = 50) => {
    try {
      const userPlaylists = await spotifyService.getUserPlaylists(limit);
      setPlaylists(userPlaylists);
      return userPlaylists;
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      return [];
    }
  };

  const fetchSavedTracks = async (limit = 50) => {
    try {
      const tracks = await spotifyService.getSavedTracks(limit);
      setSavedTracks(tracks);
      return tracks;
    } catch (error) {
      console.error('Error fetching saved tracks:', error);
      return [];
    }
  };

  const searchTracks = async (query: string, limit = 20) => {
    try {
      return await spotifyService.searchTracks(query, limit);
    } catch (error) {
      console.error('Error searching tracks:', error);
      return [];
    }
  };

  const playTrack = async (trackUri: string, deviceId?: string) => {
    try {
      return await spotifyService.playTrack(trackUri, deviceId);
    } catch (error) {
      console.error('Error playing track:', error);
      return false;
    }
  };

  const contextValue: SpotifyContextType = {
    isAuthenticated: authenticated,
    loading,
    user,
    playlists,
    savedTracks,
    logout: handleLogout,
    fetchUserPlaylists,
    fetchSavedTracks,
    searchTracks,
    playTrack
  };

  return (
    <SpotifyContext.Provider value={contextValue}>
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotify = (): SpotifyContextType => {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
};

export default SpotifyContext; 