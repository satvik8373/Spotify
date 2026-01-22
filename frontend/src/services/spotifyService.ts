import axios from 'axios';
import api from '@/lib/axios';

// Constants
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI_ENV = import.meta.env.VITE_REDIRECT_URI;
const REDIRECT_URI = (() => {
  if (REDIRECT_URI_ENV && typeof REDIRECT_URI_ENV === 'string' && REDIRECT_URI_ENV.trim()) return REDIRECT_URI_ENV;
  return 'https://mavrixfy.site/spotify-callback';
})();
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'user-library-modify',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
];

// Token storage keys
const ACCESS_TOKEN_KEY = 'spotify_access_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';

// Axios instance for Spotify API calls
const spotifyApi = axios.create({
  baseURL: SPOTIFY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add access token
spotifyApi.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle auth errors
spotifyApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 403) {
      logout();
    }
    return Promise.reject(error);
  }
);

// Authentication functions
export const getLoginUrl = (): string => {
  if (!CLIENT_ID) {
    throw new Error('Spotify CLIENT_ID is not configured');
  }
  
  if (!REDIRECT_URI || REDIRECT_URI === 'undefined') {
    throw new Error('Invalid redirect URI configuration');
  }
  
  const loginUrl = `${SPOTIFY_AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(SCOPES.join(' '))}&show_dialog=true`;
  
  return loginUrl;
};

export const handleCallback = async (code: string, userId?: string): Promise<boolean> => {
  try {
    const response = await api.post('/spotify/callback', {
      code,
      redirect_uri: REDIRECT_URI,
      userId
    });

    if (response.data && response.data.access_token) {
      const { access_token, refresh_token, expires_in } = response.data;
      const expiry = Date.now() + expires_in * 1000;
      
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
      
      try { window.dispatchEvent(new Event('spotify_auth_changed')); } catch {}
      return true;
    }
  } catch (error: any) {
    // Fallback to direct Spotify call if backend fails
    try {
      const response = await axios.post(
        SPOTIFY_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data && response.data.access_token) {
        const { access_token, refresh_token, expires_in } = response.data;
        const expiry = Date.now() + expires_in * 1000;
        
        localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
        
        try { window.dispatchEvent(new Event('spotify_auth_changed')); } catch {}
        return true;
      }
    } catch (fallbackError: any) {
      // Silent fallback failure
    }
  }
  
  return false;
};

export const logout = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem('spotify-liked-songs-last-sync');
  localStorage.removeItem('spotify_sync_prompt');
  
  try { window.dispatchEvent(new Event('spotify_auth_changed')); } catch {}
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!token || !expiry) {
    return false;
  }
  
  const isValid = Date.now() < parseInt(expiry, 10);
  
  if (!isValid) {
    logout();
  }
  
  return isValid;
};

const getAccessToken = async (): Promise<string | null> => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  
  if (!token || !expiry) {
    return null;
  }
  
  if (Date.now() < parseInt(expiry, 10)) {
    return token;
  }
  
  if (refreshToken) {
    try {
      const response = await api.post('/spotify/refresh-token', {
        refresh_token: refreshToken,
      });
      
      if (response.data && response.data.access_token) {
        const { access_token, expires_in } = response.data;
        const newExpiry = Date.now() + expires_in * 1000;
        
        localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, newExpiry.toString());
        
        if (response.data.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
        }
        
        return access_token;
      }
    } catch (error: any) {
      logout();
    }
  }
  
  return null;
};

// User related API calls
export const getCurrentUser = async () => {
  try {
    const response = await spotifyApi.get('/me');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Track related API calls
export const searchTracks = async (query: string, limit = 20) => {
  try {
    const response = await spotifyApi.get('/search', {
      params: {
        q: query,
        type: 'track',
        limit,
      },
    });
    return response.data.tracks.items;
  } catch (error) {
    throw error;
  }
};

export const getTrack = async (trackId: string) => {
  try {
    const response = await spotifyApi.get(`/tracks/${trackId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getRecommendations = async (seed_tracks: string[], limit = 20) => {
  try {
    const response = await spotifyApi.get('/recommendations', {
      params: {
        seed_tracks: seed_tracks.join(','),
        limit,
      },
    });
    return response.data.tracks;
  } catch (error) {
    throw error;
  }
};

// Playlist related API calls
export const getUserPlaylists = async (limit = 20, offset = 0) => {
  try {
    const response = await spotifyApi.get('/me/playlists', {
      params: {
        limit,
        offset,
      },
    });
    return response.data.items;
  } catch (error) {
    throw error;
  }
};

export const getPlaylist = async (playlistId: string) => {
  try {
    const response = await spotifyApi.get(`/playlists/${playlistId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createPlaylist = async (userId: string, name: string, description = '', isPublic = true) => {
  try {
    const response = await spotifyApi.post(`/users/${userId}/playlists`, {
      name,
      description,
      public: isPublic,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addTracksToPlaylist = async (playlistId: string, uris: string[]) => {
  try {
    const response = await spotifyApi.post(`/playlists/${playlistId}/tracks`, {
      uris,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Library related API calls
export const getSavedTracks = async (limit = 20, offset = 0) => {
  try {
    const response = await spotifyApi.get('/me/tracks', {
      params: {
        limit,
        offset,
      },
    });
    return response.data.items;
  } catch (error) {
    throw error;
  }
};

export const saveTrack = async (trackId: string) => {
  try {
    await spotifyApi.put('/me/tracks', {
      ids: [trackId],
    });
    return true;
  } catch (error) {
    throw error;
  }
};

export const removeTrack = async (trackId: string) => {
  try {
    await spotifyApi.delete('/me/tracks', {
      params: {
        ids: trackId,
      },
    });
    return true;
  } catch (error) {
    throw error;
  }
};

// Albums related API calls
export const getAlbum = async (albumId: string) => {
  try {
    const response = await spotifyApi.get(`/albums/${albumId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Artist related API calls
export const getArtist = async (artistId: string) => {
  try {
    const response = await spotifyApi.get(`/artists/${artistId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getArtistTopTracks = async (artistId: string, market = 'US') => {
  try {
    const response = await spotifyApi.get(`/artists/${artistId}/top-tracks`, {
      params: {
        market,
      },
    });
    return response.data.tracks;
  } catch (error) {
    throw error;
  }
};

// Player related API calls
export const transferPlayback = async (deviceId: string) => {
  try {
    await spotifyApi.put('/me/player', {
      device_ids: [deviceId],
      play: true,
    });
    return true;
  } catch (error) {
    throw error;
  }
};

export const getPlayerState = async () => {
  try {
    const response = await spotifyApi.get('/me/player');
    return response.status === 204 ? null : response.data;
  } catch (error) {
    throw error;
  }
};

export const playTrack = async (trackUri: string, deviceId?: string) => {
  try {
    const params = deviceId ? { device_id: deviceId } : {};
    await spotifyApi.put('/me/player/play', {
      uris: [trackUri],
    }, { params });
    return true;
  } catch (error) {
    throw error;
  }
};

export default {
  getLoginUrl,
  handleCallback,
  logout,
  isAuthenticated,
  getCurrentUser,
  searchTracks,
  getTrack,
  getRecommendations,
  getUserPlaylists,
  getPlaylist,
  createPlaylist,
  addTracksToPlaylist,
  getSavedTracks,
  saveTrack,
  removeTrack,
  getAlbum,
  getArtist,
  getArtistTopTracks,
  transferPlayback,
  getPlayerState,
  playTrack,
};