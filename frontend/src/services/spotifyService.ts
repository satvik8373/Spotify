import axios from 'axios';

// Constants
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
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

// Authentication functions
export const getLoginUrl = (): string => {
  return `${SPOTIFY_AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(SCOPES.join(' '))}&show_dialog=true`;
};

export const handleCallback = async (code: string): Promise<boolean> => {
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

    if (response.data) {
      const { access_token, refresh_token, expires_in } = response.data;
      const expiry = Date.now() + expires_in * 1000;
      
      // Store tokens
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error getting access token:', error);
    return false;
  }
};

export const logout = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!token || !expiry) {
    return false;
  }
  
  return Date.now() < parseInt(expiry, 10);
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
  
  // If token expired but we have refresh token, try to refresh
  if (refreshToken) {
    try {
      const response = await axios.post(
        SPOTIFY_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.data) {
        const { access_token, expires_in } = response.data;
        const newExpiry = Date.now() + expires_in * 1000;
        
        localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, newExpiry.toString());
        
        return access_token;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout(); // Clear invalid tokens
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