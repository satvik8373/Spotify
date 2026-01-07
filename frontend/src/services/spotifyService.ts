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
  // Hardcoded fallback for production
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
    // If we get a 403, the token is invalid - clear it
    if (error.response?.status === 403) {
      console.log('Spotify API returned 403 - clearing invalid tokens');
      logout();
    }
    return Promise.reject(error);
  }
);

// Authentication functions
export const getLoginUrl = (): string => {
  console.log('🔧 getLoginUrl called');
  console.log('🔑 CLIENT_ID present:', !!CLIENT_ID);
  console.log('🔑 CLIENT_SECRET present:', !!CLIENT_SECRET);
  console.log('🔗 REDIRECT_URI_ENV:', REDIRECT_URI_ENV);
  console.log('🔗 REDIRECT_URI (final):', REDIRECT_URI);
  console.log('🌍 Current origin:', window.location.origin);
  
  // Check if required values are present
  if (!CLIENT_ID) {
    console.error('❌ CLIENT_ID is missing!');
    throw new Error('Spotify CLIENT_ID is not configured');
  }
  
  if (!REDIRECT_URI || REDIRECT_URI === 'undefined') {
    console.error('❌ REDIRECT_URI is invalid!');
    throw new Error('Invalid redirect URI configuration');
  }
  
  const loginUrl = `${SPOTIFY_AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(SCOPES.join(' '))}&show_dialog=true`;
  
  console.log('🔗 Generated login URL:', loginUrl);
  return loginUrl;
};

export const handleCallback = async (code: string, userId?: string): Promise<boolean> => {
  console.log('=== Spotify Authentication Debug ===');
  console.log('Handling Spotify callback with code:', code ? 'present' : 'missing');
  console.log('Using REDIRECT_URI:', REDIRECT_URI);
  console.log('User ID:', userId);
  console.log('CLIENT_ID present:', !!CLIENT_ID);
  console.log('CLIENT_SECRET present:', !!CLIENT_SECRET);
  
  try {
    // Use backend route to exchange code for tokens (safer)
    console.log('🔄 Attempting backend token exchange...');
    const response = await api.post('/spotify/callback', {
      code,
      redirect_uri: REDIRECT_URI,
      userId
    });

    console.log('✅ Backend response received:', response.data);
    if (response.data && response.data.access_token) {
      const { access_token, refresh_token, expires_in, synced } = response.data;
      const expiry = Date.now() + expires_in * 1000;
      
      // Store tokens
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
      
      console.log('✅ Backend tokens stored successfully');
      console.log('✅ Initial sync completed:', synced);
      console.log('=== Authentication Success ===');
      
      // Notify app about auth change
      try { window.dispatchEvent(new Event('spotify_auth_changed')); } catch {}
      return true;
    } else {
      console.log('❌ Backend response missing access_token, trying fallback...');
      console.log('Backend response structure:', Object.keys(response.data || {}));
    }
  } catch (error: any) {
    console.error('❌ Backend token exchange failed:');
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.message);
    console.log('🔄 Attempting direct Spotify token exchange as fallback...');
  }
  
  // Fallback to direct Spotify call if backend fails
  try {
    console.log('🔄 Attempting direct Spotify token exchange...');
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

    console.log('✅ Direct Spotify response received:', response.data);
    if (response.data && response.data.access_token) {
      const { access_token, refresh_token, expires_in } = response.data;
      const expiry = Date.now() + expires_in * 1000;
      
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
      
      console.log('✅ Direct tokens stored successfully');
      console.log('=== Authentication Success (Fallback) ===');
      
      // Notify app about auth change
      try { window.dispatchEvent(new Event('spotify_auth_changed')); } catch {}
      return true;
    } else {
      console.error('❌ Direct Spotify response missing access_token');
      console.error('Response structure:', Object.keys(response.data || {}));
    }
  } catch (fallbackError: any) {
    console.error('❌ Fallback token exchange also failed:');
    console.error('Fallback error response:', fallbackError.response?.data);
    console.error('Fallback error status:', fallbackError.response?.status);
    console.error('Fallback error message:', fallbackError.message);
  }
  
  console.error('❌ All authentication methods failed');
  console.log('=== Authentication Failed ===');
  return false;
};

export const logout = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  // Clear any sync-related timestamps
  localStorage.removeItem('spotify-liked-songs-last-sync');
  localStorage.removeItem('spotify_sync_prompt');
  
  // Notify app about auth change
  try { window.dispatchEvent(new Event('spotify_auth_changed')); } catch {}
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!token || !expiry) {
    return false;
  }
  
  const isValid = Date.now() < parseInt(expiry, 10);
  
  // If token is expired, clear it
  if (!isValid) {
    console.log('Token expired, clearing...');
    logout();
  }
  
  return isValid;
};

const getAccessToken = async (): Promise<string | null> => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  
  // If no token, we're not authenticated
  if (!token || !expiry) {
    return null;
  }
  
  // If token is valid, return it
  if (Date.now() < parseInt(expiry, 10)) {
    return token;
  }
  
  // If token expired but we have refresh token, try to refresh via backend
  if (refreshToken) {
    try {
      console.log('🔄 Token expired, refreshing via backend...');
      const response = await api.post('/spotify/refresh-token', {
        refresh_token: refreshToken,
      });
      
      if (response.data && response.data.access_token) {
        const { access_token, expires_in } = response.data;
        const newExpiry = Date.now() + expires_in * 1000;
        
        localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, newExpiry.toString());
        
        // If backend returns a new refresh token, update it
        if (response.data.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
        }
        
        console.log('✅ Token refreshed successfully');
        return access_token;
      }
    } catch (error: any) {
      console.error('❌ Error refreshing token via backend:', error.response?.data || error.message);
      // Clear invalid tokens
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
    console.error('Error getting user profile:', error);
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
    console.error('Error searching tracks:', error);
    throw error;
  }
};

export const getTrack = async (trackId: string) => {
  try {
    const response = await spotifyApi.get(`/tracks/${trackId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting track ${trackId}:`, error);
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
    console.error('Error getting recommendations:', error);
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
    console.error('Error getting user playlists:', error);
    throw error;
  }
};

export const getPlaylist = async (playlistId: string) => {
  try {
    const response = await spotifyApi.get(`/playlists/${playlistId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting playlist ${playlistId}:`, error);
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
    console.error('Error creating playlist:', error);
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
    console.error(`Error adding tracks to playlist ${playlistId}:`, error);
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
    console.error('Error getting saved tracks:', error);
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
    console.error(`Error saving track ${trackId}:`, error);
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
    console.error(`Error removing track ${trackId}:`, error);
    throw error;
  }
};

// Albums related API calls
export const getAlbum = async (albumId: string) => {
  try {
    const response = await spotifyApi.get(`/albums/${albumId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting album ${albumId}:`, error);
    throw error;
  }
};

// Artist related API calls
export const getArtist = async (artistId: string) => {
  try {
    const response = await spotifyApi.get(`/artists/${artistId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting artist ${artistId}:`, error);
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
    console.error(`Error getting top tracks for artist ${artistId}:`, error);
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
    console.error('Error transferring playback:', error);
    throw error;
  }
};

export const getPlayerState = async () => {
  try {
    const response = await spotifyApi.get('/me/player');
    return response.status === 204 ? null : response.data;
  } catch (error) {
    console.error('Error getting player state:', error);
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
    console.error('Error playing track:', error);
    throw error;
  }
};

// Debug function to check token state
export const debugTokenState = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  
  console.log('Token state:', {
    hasToken: !!token,
    hasExpiry: !!expiry,
    hasRefreshToken: !!refreshToken,
    expiryTime: expiry ? new Date(parseInt(expiry, 10)).toISOString() : 'none',
    isExpired: expiry ? Date.now() > parseInt(expiry, 10) : true,
    tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
  });
};

// Debug function to check authentication state
export const debugAuthenticationState = (): void => {
  console.log('=== Spotify Authentication State Debug ===');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('- VITE_SPOTIFY_CLIENT_ID:', CLIENT_ID ? 'present' : 'missing');
  console.log('- VITE_SPOTIFY_CLIENT_SECRET:', CLIENT_SECRET ? 'present' : 'missing');
  console.log('- VITE_REDIRECT_URI:', REDIRECT_URI_ENV ? 'present' : 'missing');
  console.log('- Computed REDIRECT_URI:', REDIRECT_URI);
  
  // Check stored tokens
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  console.log('Stored Tokens:');
  console.log('- Access Token:', accessToken ? 'present' : 'missing');
  console.log('- Refresh Token:', refreshToken ? 'present' : 'missing');
  console.log('- Token Expiry:', tokenExpiry ? 'present' : 'missing');
  
  if (tokenExpiry) {
    const expiryDate = new Date(parseInt(tokenExpiry));
    const now = new Date();
    const isExpired = expiryDate <= now;
    console.log('- Token Expiry Date:', expiryDate.toISOString());
    console.log('- Current Time:', now.toISOString());
    console.log('- Token Expired:', isExpired);
  }
  
  // Check authentication status
  const isAuth = isAuthenticated();
  console.log('- Is Authenticated:', isAuth);
  
  // Check current URL
  console.log('Current URL:', window.location.href);
  console.log('Current Origin:', window.location.origin);
  
  console.log('=== End Debug ===');
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
  debugTokenState,
  debugAuthenticationState,
}; 